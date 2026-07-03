// src/lib/avatar/qa.ts
//
// Avatar QA Service — the automated + admin-assisted gate that validates avatar
// assets before they may be used in a render (Design §Components/2).
//
// This module is the I/O-bound counterpart to the PURE state machine in
// `qa-state.ts`: it runs the automatic image checks (transparency + face),
// orchestrates the lifecycle transitions, and persists the QA sub-state on the
// order. All *gating decisions* are delegated to the pure helpers in
// `qa-state.ts`, which keeps the highest-value behaviour property-testable.
//
// Requirements covered:
//   - 2.1 — generation completes → set order avatar state to Pending_Review
//   - 2.2 — auto-verify transparent background within 30s per asset
//   - 2.3 — auto-verify a detectable face within 30s per asset
//   - 2.4 — mark a failed asset and identify the failed check
//   - 2.6 — admin approves → Approved + assets available to the Compositing Engine
//   - 2.7 — admin rejects → Rejected, regenerate up to 2 attempts
//   - 2.9 — only Approved orders may be used in a render
//
// ─────────────────────────────────────────────────────────────────────────────
// FACE DETECTION — PLACEHOLDER (Req 2.3)
//
// A production-grade face check needs an external/vision capability (a real face
// detector or hosted model). That integration is intentionally NOT implemented
// here. Instead the face check is hidden behind the small `FaceDetector`
// interface below, with a deterministic placeholder implementation
// (`heuristicFaceDetector`) that treats an asset containing a visible (opaque)
// subject region as "face present". This NEVER blocks a real avatar in local /
// CI runs. Swap `defaultFaceDetector` for a real `FaceDetector` once a
// face-detection provider is wired in — no caller changes required.
// ─────────────────────────────────────────────────────────────────────────────

import sharp from "sharp";
import type { OrderAvatarQa } from "../types";
import type { AvatarAsset, CeremonyPose } from "./types";
import {
  approve as approveState,
  beginReview as beginReviewState,
  canRender as canRenderState,
  createInitialRecord,
  evaluateAvatarChecks,
  rejectAndRegenerate,
  type AutoCheckOutcome,
  type AvatarCheckResult,
  type AvatarQaRecord,
} from "./qa-state";

/** The automatic checks run with a 30-second budget per asset (Req 2.2, 2.3). */
export const AUTO_CHECK_BUDGET_MS = 30_000;

// ─── Face detection seam (PLACEHOLDER) ───────────────────────────────────────

/**
 * Pluggable face-detection capability. A real implementation would call a vision
 * model / face-detection API and return `true` when at least one face box is
 * found. See the PLACEHOLDER note at the top of this file.
 */
export interface FaceDetector {
  readonly name: string;
  /** Resolves `true` when the image contains at least one detectable face. */
  detect(image: Buffer): Promise<boolean>;
}

/**
 * PLACEHOLDER face detector (Req 2.3).
 *
 * Deterministic heuristic: an avatar that contains a visible subject — i.e. a
 * non-trivial fraction of sufficiently-opaque pixels — is treated as
 * "face present". A fully-transparent / empty image reports no face. This is a
 * stand-in for a real face-detection integration and is intentionally permissive
 * so it never blocks a genuine generated avatar.
 */
export const heuristicFaceDetector: FaceDetector = {
  name: "placeholder-heuristic",
  async detect(image: Buffer): Promise<boolean> {
    const opaqueFraction = await opaquePixelFraction(image);
    // A real subject occupies a meaningful portion of the frame.
    return opaqueFraction > 0.01;
  },
};

/** The face detector used by default until a real provider is integrated. */
export const defaultFaceDetector: FaceDetector = heuristicFaceDetector;

// ─── Image analysis primitives ───────────────────────────────────────────────

/**
 * Transparency check (Req 2.2): an avatar PNG has a transparent background when
 * at least one fully-transparent pixel (alpha === 0) lies along its border.
 * Returns `true` when a transparent background is detected.
 */
export async function checkTransparency(image: Buffer): Promise<boolean> {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  if (width === 0 || height === 0) return false;

  const alphaAt = (x: number, y: number): number =>
    data[(y * width + x) * channels + (channels - 1)];

  // Scan the top and bottom rows.
  for (let x = 0; x < width; x++) {
    if (alphaAt(x, 0) === 0) return true;
    if (alphaAt(x, height - 1) === 0) return true;
  }
  // Scan the left and right columns.
  for (let y = 0; y < height; y++) {
    if (alphaAt(0, y) === 0) return true;
    if (alphaAt(width - 1, y) === 0) return true;
  }
  return false;
}

/** Fraction of pixels whose alpha is meaningfully opaque (used by the placeholder). */
async function opaquePixelFraction(image: Buffer): Promise<number> {
  const { data, info } = await sharp(image)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;
  const total = width * height;
  if (total === 0) return 0;

  let opaque = 0;
  for (let i = 0; i < total; i++) {
    const alpha = data[i * channels + (channels - 1)];
    if (alpha > 200) opaque++;
  }
  return opaque / total;
}

/**
 * Face check (Req 2.3) — delegates to the pluggable (placeholder) `FaceDetector`.
 * Returns `true` when a face is detected.
 */
export async function checkFace(
  image: Buffer,
  detector: FaceDetector = defaultFaceDetector,
): Promise<boolean> {
  return detector.detect(image);
}

// ─── Auto-check orchestration ────────────────────────────────────────────────

/** Reject a per-asset check that exceeds its time budget so the asset fails safe. */
function withBudget<T>(work: Promise<T>, budgetMs: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} exceeded ${budgetMs}ms budget`)),
      budgetMs,
    );
    work.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Dependencies for {@link runAutoChecks}, all overridable for testing. */
export interface AutoCheckDeps {
  /** Load the raw image bytes for an asset URL (defaults to `fetch`). */
  loadImage: (url: string) => Promise<Buffer>;
  /** Face detector to use (defaults to the PLACEHOLDER heuristic). */
  faceDetector: FaceDetector;
  /** Per-check time budget in ms (defaults to 30s — Req 2.2, 2.3). */
  budgetMs: number;
}

async function defaultLoadImage(url: string): Promise<Buffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to load avatar asset: ${url} (${res.status})`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Run the automatic transparency + face checks for each avatar asset, each
 * bounded by a 30s budget (Req 2.2, 2.3), and fold the outcomes into per-asset
 * results that mark a failed asset and identify the failed check (Req 2.4).
 *
 * Any check that throws or exceeds its budget is treated as a failure (fail-safe).
 */
export async function runAutoChecks(
  assets: AvatarAsset[],
  deps: Partial<AutoCheckDeps> = {},
): Promise<AvatarCheckResult[]> {
  const loadImage = deps.loadImage ?? defaultLoadImage;
  const faceDetector = deps.faceDetector ?? defaultFaceDetector;
  const budgetMs = deps.budgetMs ?? AUTO_CHECK_BUDGET_MS;

  const outcomes: AutoCheckOutcome[] = await Promise.all(
    assets.map(async (asset): Promise<AutoCheckOutcome> => {
      let image: Buffer | undefined;
      try {
        image = await withBudget(loadImage(asset.url), budgetMs, `load:${asset.pose}`);
      } catch {
        // Could not even load the asset → both checks fail.
        return { pose: asset.pose, transparencyPassed: false, facePassed: false };
      }

      const transparencyPassed = await safeCheck(
        () => withBudget(checkTransparency(image!), budgetMs, `transparency:${asset.pose}`),
      );
      const facePassed = await safeCheck(
        () => withBudget(checkFace(image!, faceDetector), budgetMs, `face:${asset.pose}`),
      );

      return { pose: asset.pose, transparencyPassed, facePassed };
    }),
  );

  return evaluateAvatarChecks(outcomes);
}

async function safeCheck(run: () => Promise<boolean>): Promise<boolean> {
  try {
    return await run();
  } catch {
    return false;
  }
}

// ─── Persistence seam ─────────────────────────────────────────────────────────

/** Minimal persistence contract for the QA sub-state, overridable for testing. */
export interface QaStore {
  load(orderId: string): Promise<OrderAvatarQa | undefined>;
  save(orderId: string, qa: OrderAvatarQa): Promise<void>;
}

/**
 * Default store backed by the Supabase `orders.avatar_qa` JSONB column. The `db`
 * module (and its Supabase client) is imported lazily so this service can be
 * unit-tested with an injected store without requiring database credentials.
 */
export const dbQaStore: QaStore = {
  async load(orderId) {
    const { db } = await import("../db");
    const order = await db.orders.findUnique(orderId);
    return order?.avatarQa;
  },
  async save(orderId, qa) {
    const { db } = await import("../db");
    await db.orders.update(orderId, { avatarQa: qa, status: "AVATAR_QA" });
  },
};

// ─── Record ⇄ persisted sub-state conversions ────────────────────────────────

function recordToQa(record: AvatarQaRecord, assets: AvatarAsset[]): OrderAvatarQa {
  return {
    state: record.state,
    attempts: record.attempts,
    assets: assets.map((a) => ({ pose: a.pose, url: a.url, identityScore: a.identityScore })),
    checks: record.checks.map((c) => ({
      pose: c.pose,
      passed: c.passed,
      ...(c.failedCheck ? { failedCheck: c.failedCheck } : {}),
    })),
    ...(record.downgradeReason ? { downgradeReason: record.downgradeReason } : {}),
    updatedAt: new Date().toISOString(),
  };
}

function qaToRecord(orderId: string, qa: OrderAvatarQa | undefined): AvatarQaRecord {
  if (!qa) return createInitialRecord(orderId);
  return {
    orderId,
    state: qa.state,
    attempts: qa.attempts,
    checks: qa.checks.map((c) => ({
      pose: c.pose,
      passed: c.passed,
      ...(c.failedCheck ? { failedCheck: c.failedCheck } : {}),
    })),
    ...(qa.downgradeReason ? { downgradeReason: qa.downgradeReason } : {}),
  };
}

function qaAssets(qa: OrderAvatarQa | undefined): AvatarAsset[] {
  return (qa?.assets ?? []).map((a) => ({
    pose: a.pose,
    url: a.url,
    identityScore: a.identityScore,
  }));
}

// ─── Order-level QA lifecycle service ─────────────────────────────────────────

/** Default downgrade reason recorded when regeneration is exhausted (Req 2.8). */
export const DEFAULT_DOWNGRADE_REASON =
  "Avatars failed quality checks after the maximum of 2 regeneration attempts; downgraded to Standard tier.";

/**
 * The order-level QA gate. Each method loads the order's persisted QA sub-state,
 * applies a pure transition (plus auto-checks where relevant), and persists the
 * result. The persistence layer is injectable so the lifecycle can be tested
 * without a live database.
 */
export const avatarQa = {
  /**
   * Generation completed for an order: run the automatic checks, attach the
   * results, and move the order into review (Req 2.1, 2.2, 2.3, 2.4).
   */
  async beginReview(
    orderId: string,
    assets: AvatarAsset[],
    opts: { store?: QaStore; checkDeps?: Partial<AutoCheckDeps> } = {},
  ): Promise<AvatarQaRecord> {
    const store = opts.store ?? dbQaStore;
    const checks = await runAutoChecks(assets, opts.checkDeps);
    const prior = qaToRecord(orderId, await store.load(orderId));
    const next = beginReviewState(prior, checks);
    await store.save(orderId, recordToQa(next, assets));
    return next;
  },

  /**
   * Run the automatic transparency + face checks for an order's assets without
   * changing its lifecycle state (Req 2.2, 2.3, 2.4).
   */
  async runAutoChecks(
    assets: AvatarAsset[],
    deps: Partial<AutoCheckDeps> = {},
  ): Promise<AvatarCheckResult[]> {
    return runAutoChecks(assets, deps);
  },

  /** Admin approves the order's avatars → Approved (Req 2.6). */
  async approve(orderId: string, opts: { store?: QaStore } = {}): Promise<AvatarQaRecord> {
    const store = opts.store ?? dbQaStore;
    const qa = await store.load(orderId);
    const next = approveState(qaToRecord(orderId, qa));
    await store.save(orderId, recordToQa(next, qaAssets(qa)));
    return next;
  },

  /**
   * Admin rejects the order's avatars → Rejected and a regeneration attempt is
   * consumed; once the 2-attempt budget is spent the order is downgraded to
   * Standard tier with a recorded reason (Req 2.7, 2.8).
   *
   * When the resulting state is `Rejected` and an optional `regenerate` callback
   * is supplied, it is invoked to kick off the next generation attempt.
   */
  async reject(
    orderId: string,
    opts: {
      store?: QaStore;
      reason?: string;
      regenerate?: (orderId: string, attempt: number) => Promise<void>;
    } = {},
  ): Promise<AvatarQaRecord> {
    const store = opts.store ?? dbQaStore;
    const reason = opts.reason ?? DEFAULT_DOWNGRADE_REASON;
    const qa = await store.load(orderId);
    const next = rejectAndRegenerate(qaToRecord(orderId, qa), reason);
    await store.save(orderId, recordToQa(next, qaAssets(qa)));
    if (next.state === "Rejected" && opts.regenerate) {
      await opts.regenerate(orderId, next.attempts);
    }
    return next;
  },

  /** Single render-gate authority: avatars are usable only when Approved (Req 2.9). */
  canRender: canRenderState,
};
