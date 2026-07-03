import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { OrderData, WeddingVideoProps, MUSIC_TRACKS, SceneType, TEMPLATE_CONFIGS, type TemplateId } from "@/lib/types";
import { validateInviteProps } from "@/lib/schemas";
import { isValidTemplateId, getTemplateMetadata } from "@/lib/template-metadata";
import { resolveThumbnailFrame } from "@/remotion/render/thumbnail";
import { RENDER_CONFIG } from "@/remotion/render/config";
import { renderOnLambda, isLambdaModeEnabled } from "@/lib/remotion-lambda";
import { renderQueue } from "@/lib/sqs";
import { getTemplateOverride } from "@/lib/template-overrides.db";
import { canRender } from "@/lib/avatar/qa-state";
import type { CeremonyPose } from "@/lib/avatar/types";
import { supabaseAdmin } from "@/lib/supabase";
import path from "path";
import fs from "fs";
import { cloudStorage } from "@/lib/cloud-storage";

// Force Node.js runtime — @remotion/renderer uses native binaries
export const runtime = "nodejs";


// ─────────────────────────────────────────────────────────────
// Bundle cache — we bundle once and reuse across renders.
// Invalidated on server restart.
// ─────────────────────────────────────────────────────────────
let cachedBundleUrl: string | null = null;

async function getBundleUrl(): Promise<string> {
  if (cachedBundleUrl) {
    console.log("[Render] Using cached bundle:", cachedBundleUrl);
    return cachedBundleUrl;
  }

  console.log("[Render] Bundling Remotion project…");

  // Dynamic import to avoid loading these heavy modules during Next.js boot
  const { bundle } = await import("@remotion/bundler");

  const entryPoint = path.resolve(
    process.cwd(),
    "src/remotion/index.ts"
  );

  cachedBundleUrl = await bundle({
    entryPoint,
    onProgress: (p) =>
      process.stdout.write(`\r[Render] Bundle progress: ${p.toFixed(0)}%`),
  });

  console.log("\n[Render] Bundle complete:", cachedBundleUrl);
  return cachedBundleUrl;
}

// ─────────────────────────────────────────────────────────────
// Avatar approval gate (Req 2.9, 3.4)
//
// An order's generated avatars may be composited into a render ONLY when its
// persisted avatar QA sub-state is Approved (`canRender`). For any other state
// — None, Pending_Review, Rejected, Downgraded, or no QA record at all — we
// pass NO avatar URLs, so the Compositing_Engine renders the slot region as
// Standard tier (background only). The bride/groom URLs are resolved from the
// approved assets, matching the order's ceremony pose where available.
// ─────────────────────────────────────────────────────────────
function resolveApprovedAvatarUrls(
  order: OrderData,
): { brideAvatarUrl?: string; groomAvatarUrl?: string } {
  const qa = order.avatarQa;
  if (!qa) return {};

  // Single gate authority — only Approved orders may use their avatars.
  const approved = canRender({
    orderId: order.id,
    state: qa.state,
    attempts: qa.attempts,
    checks: qa.checks,
  });
  if (!approved) return {};

  const assets = qa.assets ?? [];
  if (assets.length === 0) return {};

  // Prefer the asset for this order's ceremony pose; fall back to the first.
  const ceremony = TEMPLATE_CONFIGS[order.style as TemplateId]?.functionType;
  const poseAsset =
    assets.find((a) => a.pose === (ceremony as CeremonyPose)) ?? assets[0];
  if (!poseAsset?.url) return {};

  // The persisted QA sub-state carries one resolvable URL per ceremony pose
  // (no separate bride/groom entries), so the same approved couple avatar URL
  // populates both slots; AvatarPair flips the groom slot horizontally.
  return { brideAvatarUrl: poseAsset.url, groomAvatarUrl: poseAsset.url };
}

// ─────────────────────────────────────────────────────────────
// Build the WeddingVideoProps from an OrderData
// ─────────────────────────────────────────────────────────────
function buildVideoProps(order: OrderData): WeddingVideoProps {
  const track = MUSIC_TRACKS.find((t) => t.id === order.musicTrack);
  let musicUrl = "";

  const port = process.env.PORT || "3000";
  const baseUrl = `http://localhost:${port}`;

  if (track) {
    const musicAbsPath = path.join(process.cwd(), "public", track.file);
    if (fs.existsSync(musicAbsPath)) {
      musicUrl = `${baseUrl}${track.file}`;
    }
  }

  // photos[] — CDN URLs stored on the order at upload time. Used only by the
  // legacy RoyalRajasthani scenes (firstmeet, proposal, wedding, family). The
  // styled-photo preprocessing step has been retired; raw upload URLs are used
  // directly. All new compositions use brideAvatarUrl/groomAvatarUrl instead.
  const photos = (order.photos ?? []).map((url: string) => {
    if (url && url.startsWith("/")) return `${baseUrl}${url}`;
    return url || "";
  });

  return {
    // ── New canonical InviteProps fields ──────────────────────
    brideFirstName: order.details.brideName,
    groomFirstName: order.details.groomName,
    eventDate: order.details.weddingDate,
    venueName: order.details.venue || "",
    venueCity: order.details.brideCity || "",
    audioUrl: musicUrl || "https://example.com/placeholder.mp3",
    avatarType: "png" as const,
    templateId: order.style || "royal-rajasthani",
    // Derive functionType from templateId via TEMPLATE_CONFIGS, fallback to "wedding"
    functionType: (TEMPLATE_CONFIGS[order.style as TemplateId]?.functionType ?? "wedding") as "haldi" | "mehandi" | "sangeet" | "wedding" | "reception" | "baraat",
    tier: (order.tier === "premium" ? "premium" : "standard") as "standard" | "premium",
    voiceoverEnabled: false,
    // ── Avatar layer — populated ONLY for Approved orders ──
    ...resolveApprovedAvatarUrls(order),
    // ── Legacy compat fields (used by RoyalRajasthani) ──
    groomName: order.details.groomName,
    brideName: order.details.brideName,
    weddingDate: order.details.weddingDate,
    venue: order.details.venue || "",
    groomCity: order.details.groomCity || "",
    brideCity: order.details.brideCity || "",
    style: order.style,
    scenes: order.scenes,
    photos,
    musicUrl,
  };
}

// ─────────────────────────────────────────────────────────────
// Fetch a dynamic template from Supabase for universal rendering
// ─────────────────────────────────────────────────────────────
async function fetchCustomTemplate(id: string): Promise<Record<string, unknown> | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("custom_templates")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      status: data.status,
      ceremony: data.ceremony,
      emoji: data.emoji,
      palette: data.palette,
      scenes: data.scenes ?? [],
    };
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Resolve Remotion composition ID from the order
// Falls back to royal-rajasthani for legacy orders
// ─────────────────────────────────────────────────────────────
function resolveCompositionId(order: OrderData): string {
  // New orders set templateId explicitly via the create form
  const templateId = (order as unknown as { templateId?: string }).templateId;
  if (templateId === "universal-template") return "universal-template";
  if (templateId && TEMPLATE_CONFIGS[templateId as TemplateId]) {
    return templateId;
  }
  // Legacy: style field maps to composition ID
  if (order.style && TEMPLATE_CONFIGS[order.style as TemplateId]) {
    return order.style;
  }
  // Final fallback
  return "royal-rajasthani";
}

// ─────────────────────────────────────────────────────────────
// Compute total frames from template or per-scene list
// ─────────────────────────────────────────────────────────────
function calcTotalFrames(scenes: SceneType[], order?: OrderData): number {
  const durations: Record<string, number> = {
    intro: 150, haldi: 150, sangeet: 150, varmala: 180,
    outro: 150, wedding: 210, firstmeet: 150, proposal: 150, family: 150,
  };
  const sceneFrames = scenes.reduce((sum, s) => sum + (durations[s] ?? 150), 0);
  const transitionFrames = Math.max(0, scenes.length - 1) * 15;
  return sceneFrames + transitionFrames;
}

// ─────────────────────────────────────────────────────────────
// The actual render — runs in the background after API responds
// ─────────────────────────────────────────────────────────────
export async function executeRender(orderId: string, order: OrderData, fromWorker = false): Promise<void> {
  // Tracks the local output file so a failed render publishes NO partial
  // output (Req 8.5) — the catch block deletes it if the render aborts.
  let partialOutputPath: string | null = null;
  try {
    const { selectComposition, renderMedia, renderStill } = await import("@remotion/renderer");
    const port = process.env.PORT || "3000";

    // ── Step 0: Validate InviteProps with Zod before any render starts ──
    const rawProps = buildVideoProps(order);
    let inputProps: WeddingVideoProps;
    try {
      inputProps = validateInviteProps(rawProps) as WeddingVideoProps;
    } catch (zodErr: unknown) {
      const msg = zodErr instanceof Error ? zodErr.message : String(zodErr);
      console.error(`[Render] ❌ Zod validation failed for order ${orderId}:`, msg);
      await db.orders.update(orderId, { status: "PENDING" });
      return;
    }

    // ── Step 0b: Verify template ID is registered ──
    const compositionId = resolveCompositionId(order);
    // universal-template is always valid (registered in Root.tsx)
    if (compositionId !== "universal-template" && !isValidTemplateId(compositionId)) {
      console.error(`[Render] ❌ Unknown template ID: "${compositionId}"`);
      await db.orders.update(orderId, { status: "PENDING" });
      return;
    }

    // ── Step 0c: If universal-template, inject the DynamicTemplate data ──
    let finalInputProps: WeddingVideoProps & { dynamicTemplate?: Record<string, unknown> } = inputProps;
    if (compositionId === "universal-template") {
      const customTemplateId = (order as unknown as { customTemplateId?: string }).customTemplateId;
      if (customTemplateId) {
        const dynTpl = await fetchCustomTemplate(customTemplateId);
        if (dynTpl) {
          finalInputProps = { ...inputProps, dynamicTemplate: dynTpl };
          console.log(`[Render] 🎨 Universal template: "${customTemplateId}" (${(dynTpl.scenes as unknown[]).length} scenes)`);
        } else {
          console.warn(`[Render] ⚠️ Custom template "${customTemplateId}" not found — falling back to empty scenes`);
        }
      }
    }

    // ── Step 0d: Enqueue to SQS for visibility (non-blocking) ──
    if (!fromWorker) {
      await renderQueue.enqueue({
        orderId,
        compositionId,
        timestamp: new Date().toISOString(),
      }).catch((e) => console.warn("[SQS] Enqueue failed (non-fatal):", e.message));
    }

    // ── Step 1: Render — Lambda or local mode ──
    if (isLambdaModeEnabled()) {
      // ───────── CLOUD RENDER via Remotion Lambda ─────────
      console.log(`[Render] 🚀 Lambda mode — dispatching ${compositionId} to AWS Lambda`);

      const tplConfig = TEMPLATE_CONFIGS[compositionId as TemplateId];
      const totalFrames = tplConfig && compositionId !== "royal-rajasthani"
        ? tplConfig.durationInFrames
        : calcTotalFrames(order.scenes);

      const result = await renderOnLambda({
        compositionId,
        inputProps: finalInputProps as Record<string, unknown>,
        durationInFrames: totalFrames,
      });

      // Upload to our S3 bucket and get CloudFront URL
      const response = await fetch(result.outputUrl);
      const videoBuffer = Buffer.from(await response.arrayBuffer());
      const videoUrl = await cloudStorage.uploadFile("renders", orderId, "output.mp4", videoBuffer);

      await db.orders.update(orderId, { status: "COMPLETE", videoUrl });
      console.log(`[Render] ✅ Lambda render complete → ${videoUrl}`);
      return;
    }

    const serveUrl = await getBundleUrl();

    console.log(`[Render] Selecting composition for order ${orderId}…`);
    const tplConfig = TEMPLATE_CONFIGS[compositionId as TemplateId];

    // For universal-template: compute total frames from DynamicTemplate scenes
    let totalFrames: number;
    if (compositionId === "universal-template" && finalInputProps.dynamicTemplate) {
      const scenes = (finalInputProps.dynamicTemplate.scenes as Array<{ durationSeconds: number }>) ?? [];
      totalFrames = scenes.reduce((sum, s) => sum + Math.round(s.durationSeconds * 30), 0);
      totalFrames = Math.max(totalFrames, 30); // minimum 1s
    } else {
      // Use template's fixed duration for new compositions; fall back to per-scene calc for royal-rajasthani
      totalFrames = tplConfig && compositionId !== "royal-rajasthani"
        ? tplConfig.durationInFrames
        : calcTotalFrames(order.scenes);
    }

    console.log(`[Render] Composition: ${compositionId} (${totalFrames} frames)`);
    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps: finalInputProps as Record<string, unknown>,
    });

    // Override duration to match the selected scenes / template
    composition.durationInFrames = totalFrames;

    // ── Fixed output config: 1080×1920 / 9:16 / 30fps (Req 8.1) ──
    // Force the canonical render dimensions and frame rate regardless of what
    // the registered composition reports, so every invitation meets the
    // defined output-quality standard.
    composition.width = RENDER_CONFIG.width;
    composition.height = RENDER_CONFIG.height;
    composition.fps = RENDER_CONFIG.fps;

    // Ensure output directory exists
    const rendersDir = path.join(process.cwd(), "public", "renders");
    fs.mkdirSync(rendersDir, { recursive: true });
    const outputLocation = path.join(rendersDir, `${orderId}.mp4`);
    partialOutputPath = outputLocation;

    console.log(`[Render] Rendering ${totalFrames} frames → ${outputLocation}`);

    await renderMedia({
      composition,
      serveUrl,
      codec: RENDER_CONFIG.videoCodec,
      outputLocation,
      inputProps: finalInputProps as Record<string, unknown>,
      onProgress: ({ progress }) => {
        const pct = (progress * 100).toFixed(1);
        process.stdout.write(`\r[Render] ${orderId}: ${pct}%`);
      },
    });

    console.log(`\n[Render] ✅ Done! ${orderId}`);

    // The render produced a complete file — it is no longer "partial".
    partialOutputPath = null;

    // ── Thumbnail (Req 8.3, 8.4): renderStill at the template's configured
    //    thumbnailFrame, clamped into [0, durationInFrames-1] by the pure
    //    resolveThumbnailFrame. Thumbnail failure must NOT fail the render —
    //    it falls back to the first frame and records the cause. ──
    let thumbnailUrl: string | undefined;
    try {
      // universal-template has no static metadata entry — use frame 0 as thumbnail
      const requestedFrame = compositionId === "universal-template"
        ? 0
        : getTemplateMetadata(compositionId as TemplateId).thumbnailFrame;
      // Apply an admin thumbnail-frame override for built-in templates, if any
      // (graceful: returns undefined when no override / table absent).
      let effectiveFrame = requestedFrame;
      try {
        const override = await getTemplateOverride(compositionId);
        if (override?.thumbnailFrame !== undefined) {
          effectiveFrame = override.thumbnailFrame;
        }
      } catch { /* non-fatal — use the metadata default */ }
      let stillFrame = resolveThumbnailFrame(effectiveFrame, totalFrames);
      const thumbOutput = path.join(rendersDir, `${orderId}-thumbnail.jpg`);

      const renderThumbnailAt = async (frame: number) => {
        await renderStill({
          composition,
          serveUrl,
          output: thumbOutput,
          frame,
          imageFormat: RENDER_CONFIG.thumbnailImageFormat,
          inputProps: finalInputProps as Record<string, unknown>,
        });
      };

      try {
        await renderThumbnailAt(stillFrame);
      } catch (stillErr) {
        // Thumbnail generation failed at the configured frame — fall back to
        // the first frame and record the cause (Req 8.4), without aborting
        // the (already successful) render.
        const cause = stillErr instanceof Error ? stillErr.message : String(stillErr);
        console.warn(
          `[Render] ⚠️ Thumbnail at frame ${stillFrame} failed (${cause}); falling back to first frame`,
        );
        stillFrame = 0;
        await renderThumbnailAt(0);
      }

      const thumbBuffer = fs.readFileSync(thumbOutput);
      thumbnailUrl = await cloudStorage.uploadFile(
        "renders",
        orderId,
        "thumbnail.jpg",
        thumbBuffer,
      );
      console.log(`[Render] 🖼️ Thumbnail (frame ${stillFrame}) → ${thumbnailUrl}`);
    } catch (thumbErr) {
      // Any failure in the thumbnail pipeline is non-fatal to the render.
      const cause = thumbErr instanceof Error ? thumbErr.message : String(thumbErr);
      console.warn(`[Render] ⚠️ Thumbnail generation skipped: ${cause}`);
    }

    // --- PHASE 2: CLOUD STORAGE UPLOAD ---
    const videoBuffer = fs.readFileSync(outputLocation);
    const cloudVideoUrl = await cloudStorage.uploadFile("renders", orderId, `${orderId}.mp4`, videoBuffer);

    await db.orders.update(orderId, {
      status: "COMPLETE",
      videoUrl: cloudVideoUrl,
      ...(thumbnailUrl ? { thumbnailUrl } : {}),
    });

    // Fire off WhatsApp auto-delivery if phone exists
    if (order.customerPhone) {
      // Need to dynamically import to avoid top-level issues if any
      const { sendWhatsAppMessage } = await import("@/lib/whatsapp");
      const previewUrl = `http://localhost:${port}/preview/${orderId}`;
      const message = `💍 *${order.details.groomName} & ${order.details.brideName}* — Your wedding video invite is ready!\n\nWatch and download it here 👇\n${previewUrl}`;
      
      await sendWhatsAppMessage(order.customerPhone, message);
    }
  } catch (err) {
    console.error(`\n[Render] ❌ Failed for order ${orderId}:`, err);
    const cause = err instanceof Error ? err.message : String(err);

    // Req 8.5: a failed render must NOT publish a partial output file. Delete
    // any incomplete local artifact before recording the failure.
    if (partialOutputPath) {
      try {
        if (fs.existsSync(partialOutputPath)) {
          fs.rmSync(partialOutputPath, { force: true });
          console.warn(`[Render] 🧹 Removed partial output: ${partialOutputPath}`);
        }
      } catch (cleanupErr) {
        console.warn(`[Render] ⚠️ Failed to remove partial output:`, cleanupErr);
      }
    }

    // Invalidate bundle cache on failure so next attempt re-bundles
    cachedBundleUrl = null;
    // Record the render failure cause (Req 8.5) and reset status for retry.
    await db.orders.update(orderId, {
      status: "PENDING",
      notes: `Render failed: ${cause}`,
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Watermarked low-res preview render (PRD §10.1)
//
// Renders the selected composition with previewWatermark=true at reduced
// resolution and quality, stores it at renders/{orderId}/preview-watermarked.mp4
// (and public/renders/{orderId}-preview.mp4 in local mode), and deliberately
// does NOT touch order.status / videoUrl / thumbnail / WhatsApp delivery — it is
// a throwaway pre-payment artifact. The final paid render never carries the
// watermark.
// ─────────────────────────────────────────────────────────────
async function executePreviewRender(orderId: string, order: OrderData): Promise<void> {
  let partialOutputPath: string | null = null;
  try {
    const { selectComposition, renderMedia } = await import("@remotion/renderer");

    // Build props and force the preview watermark flag on (read by the
    // self-gating <PreviewWatermark /> overlay in every composition).
    const rawProps = { ...buildVideoProps(order), previewWatermark: true };
    let inputProps: WeddingVideoProps;
    try {
      inputProps = validateInviteProps(rawProps) as WeddingVideoProps;
    } catch (zodErr: unknown) {
      const msg = zodErr instanceof Error ? zodErr.message : String(zodErr);
      console.error(`[Preview] ❌ Zod validation failed for order ${orderId}:`, msg);
      return;
    }

    const compositionId = resolveCompositionId(order);
    if (compositionId !== "universal-template" && !isValidTemplateId(compositionId)) {
      console.error(`[Preview] ❌ Unknown template ID: "${compositionId}"`);
      return;
    }

    let finalInputProps: WeddingVideoProps & { dynamicTemplate?: Record<string, unknown> } = inputProps;
    if (compositionId === "universal-template") {
      const customTemplateId = (order as unknown as { customTemplateId?: string }).customTemplateId;
      if (customTemplateId) {
        const dynTpl = await fetchCustomTemplate(customTemplateId);
        if (dynTpl) finalInputProps = { ...inputProps, dynamicTemplate: dynTpl };
      }
    }

    const tplConfig = TEMPLATE_CONFIGS[compositionId as TemplateId];
    let totalFrames: number;
    if (compositionId === "universal-template" && finalInputProps.dynamicTemplate) {
      const scenes = (finalInputProps.dynamicTemplate.scenes as Array<{ durationSeconds: number }>) ?? [];
      totalFrames = Math.max(scenes.reduce((s, sc) => s + Math.round(sc.durationSeconds * 30), 0), 30);
    } else {
      totalFrames = tplConfig && compositionId !== "royal-rajasthani"
        ? tplConfig.durationInFrames
        : calcTotalFrames(order.scenes);
    }

    // Lambda mode: dispatch the watermarked render to Lambda (full-res, still
    // clearly watermarked) and store it as the preview artifact.
    if (isLambdaModeEnabled()) {
      const result = await renderOnLambda({
        compositionId,
        inputProps: finalInputProps as Record<string, unknown>,
        durationInFrames: totalFrames,
      });
      const response = await fetch(result.outputUrl);
      const buf = Buffer.from(await response.arrayBuffer());
      const previewUrl = await cloudStorage.uploadFile("renders", orderId, "preview-watermarked.mp4", buf);
      console.log(`[Preview] ✅ Lambda preview ready → ${previewUrl}`);
      return;
    }

    const serveUrl = await getBundleUrl();
    const composition = await selectComposition({
      serveUrl,
      id: compositionId,
      inputProps: finalInputProps as Record<string, unknown>,
    });
    composition.durationInFrames = totalFrames;
    composition.width = RENDER_CONFIG.width;
    composition.height = RENDER_CONFIG.height;
    composition.fps = RENDER_CONFIG.fps;

    const rendersDir = path.join(process.cwd(), "public", "renders");
    fs.mkdirSync(rendersDir, { recursive: true });
    const outputLocation = path.join(rendersDir, `${orderId}-preview.mp4`);
    partialOutputPath = outputLocation;

    console.log(`[Preview] Rendering watermarked preview (540×960) → ${outputLocation}`);
    await renderMedia({
      composition,
      serveUrl,
      codec: RENDER_CONFIG.videoCodec,
      outputLocation,
      inputProps: finalInputProps as Record<string, unknown>,
      // Low-res, lower-quality pre-payment preview: 1080×1920 → 540×960.
      scale: 0.5,
      crf: 28,
      onProgress: ({ progress }) => {
        process.stdout.write(`\r[Preview] ${orderId}: ${(progress * 100).toFixed(0)}%`);
      },
    });
    partialOutputPath = null;

    const buf = fs.readFileSync(outputLocation);
    const previewUrl = await cloudStorage.uploadFile("renders", orderId, "preview-watermarked.mp4", buf);
    console.log(`\n[Preview] ✅ Watermarked preview ready → ${previewUrl}`);
  } catch (err) {
    console.error(`\n[Preview] ❌ Failed for order ${orderId}:`, err);
    if (partialOutputPath) {
      try {
        if (fs.existsSync(partialOutputPath)) fs.rmSync(partialOutputPath, { force: true });
      } catch { /* best-effort cleanup */ }
    }
    // Preview failures are non-fatal and never mutate order state.
    cachedBundleUrl = null;
  }
}

// ─────────────────────────────────────────────────────────────
// POST /api/render — kicks off the render and returns immediately
// ─────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const { orderId, preview } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 }
      );
    }

    const order = await db.orders.findUnique(orderId);
    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    // ── Watermarked preview render (PRD §10.1) ──
    // Runs independently of the full render: no status mutation, no delivery.
    if (preview === true) {
      executePreviewRender(orderId, order).catch((e) => {
        console.error("[Preview] Unhandled error:", e);
      });
      return NextResponse.json({
        message: "Preview render started",
        orderId,
        preview: true,
      });
    }

    if (order.status === "RENDERING") {
      return NextResponse.json(
        { error: "Render already in progress" },
        { status: 409 }
      );
    }

    // Mark as rendering immediately so the UI updates
    await db.orders.update(orderId, { status: "RENDERING" });

    if (isLambdaModeEnabled()) {
      // Epic 3: Enqueue to SQS and let the external worker handle it.
      const compositionId = resolveCompositionId(order);
      await renderQueue.enqueue({
        orderId,
        compositionId,
        timestamp: new Date().toISOString(),
      }).catch((e) => console.warn("[SQS] Enqueue failed (non-fatal):", e.message));
    } else {
      // Fire-and-forget: the local render runs in the background.
      executeRender(orderId, order).catch((e) => {
        console.error("[Render] Unhandled error:", e);
      });
    }

    return NextResponse.json({
      message: isLambdaModeEnabled() ? "Render queued in SQS" : "Render started",
      orderId,
      status: "RENDERING",
    });
  } catch (error) {
    console.error("[Render] POST handler error:", error);
    return NextResponse.json(
      { error: "Failed to start render" },
      { status: 500 }
    );
  }
}

// GET /api/render?orderId=XXX — check render status
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const orderId = searchParams.get("orderId");

  if (!orderId) {
    return NextResponse.json({ error: "orderId required" }, { status: 400 });
  }

  const order = await db.orders.findUnique(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Watermarked preview URL (PRD §10.1) — deterministic location, surfaced when
  // the local preview artifact exists (dev) so the UI can show it pre-payment.
  const previewLocal = path.join(process.cwd(), "public", "renders", `${orderId}-preview.mp4`);
  const previewUrl = fs.existsSync(previewLocal) ? `/renders/${orderId}-preview.mp4` : null;

  return NextResponse.json({
    orderId,
    status: order.status,
    videoUrl: order.videoUrl ?? null,
    previewUrl,
  });
}

