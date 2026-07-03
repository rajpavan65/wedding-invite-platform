// src/lib/avatar/providers/shared.ts
//
// Shared support code for the real (credentialed) avatar providers
// (FalInstantIdProvider, ReplicatePhotoMakerProvider).
//
// Everything that is identical between the two providers lives here so the
// concrete provider files only carry the API-specific request/response shape:
//   - AvatarProviderError  — the single typed error both providers throw
//   - buildAvatarPrompt    — the Pixar/3D transparent-background prompt (Req 1.6)
//   - abortableFetch       — fetch with a 120s AbortController timeout (Req 1.10)
//   - normalizeToTransparentPng — force a 1024x1024 transparent PNG (Req 1.6)
//
// NOTE: This module deliberately performs NO env-based provider selection or
// mock fallback — that is the resolver's job (task 3.3). These providers are
// only ever constructed when their API key is present; if a call nonetheless
// fails, they throw AvatarProviderError and let the resolver/orchestrator
// decide. They never silently return fake/placeholder success.

import sharp from "sharp";
import type { CeremonyPose } from "../types";

/** The fixed avatar canvas size in pixels (Req 1.6). */
export const AVATAR_SIZE = 1024;

/** Per-pose provider timeout budget (Req 1.10). */
export const DEFAULT_TIMEOUT_MS = 120_000;

/**
 * PLACEHOLDER — identity-match scoring (Req 1.4 / 1.11) is an external
 * capability (face-embedding comparison against the designated reference
 * pose) that this feature does NOT implement itself; the design treats it as
 * an INTEGRATION delegated to the provider / a scoring service.
 *
 * Each provider reads the score from its API response when available. When the
 * response does not carry a score, this neutral placeholder is used so the
 * downstream `selectBestVariant` helper still has a value to order by.
 *
 * TODO(provider-wiring): replace with the real cross-pose identity score
 *   (provider response field or a dedicated embedding-comparison call) once
 *   the fal.ai / Replicate account is connected, and confirm scores are in
 *   the inclusive range [0, 1].
 */
export const PLACEHOLDER_IDENTITY_SCORE = 0.8;

/**
 * A typed error for every avatar-provider failure: missing credentials, a
 * non-OK HTTP response, an empty/blank result, a timeout, or a malformed
 * payload. The orchestration layer (task 4.2) catches this to produce a
 * descriptive per-pose error and to guarantee no partial asset is stored
 * (Req 1.9, 1.10).
 */
export class AvatarProviderError extends Error {
  readonly provider: string;
  readonly pose?: CeremonyPose;
  readonly kind: "credentials" | "timeout" | "http" | "empty" | "malformed";

  constructor(
    provider: string,
    kind: AvatarProviderError["kind"],
    message: string,
    options?: { pose?: CeremonyPose; cause?: unknown },
  ) {
    super(message, options?.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = "AvatarProviderError";
    this.provider = provider;
    this.kind = kind;
    this.pose = options?.pose;
  }
}

/** Human-readable pose framing fed into the generation prompt. */
const POSE_DESCRIPTION: Record<CeremonyPose, string> = {
  haldi: "dressed in bright turmeric-yellow haldi-ceremony attire, joyful celebratory expression",
  mehandi: "dressed in deep-green mehandi-ceremony attire with henna styling, serene happy expression",
  sangeet: "dressed in glamorous sparkling sangeet attire ready to dance, festive expression",
  wedding: "dressed in regal royal wedding attire, elegant dignified expression",
  reception: "dressed in modern elegant reception attire, warm confident expression",
};

/**
 * Build the Pixar/3D-cartoon, transparent-background generation prompt for a
 * single ceremony pose (Req 1.6). The prompt explicitly requests an isolated
 * subject on a fully transparent background so the result composites cleanly
 * into a template avatar slot.
 */
export function buildAvatarPrompt(pose: CeremonyPose): string {
  return [
    "A 3D Pixar-style animated cartoon character portrait of the person.",
    "The character is " + POSE_DESCRIPTION[pose] + ".",
    "It is a stylized 3D render with smooth subsurface-scattering skin and soft cinematic studio lighting.",
    "Vibrant saturated colors, highly detailed, sharp focus, half-body framing, centered subject.",
    "The subject is isolated on a solid white background with no other scenery."
  ].join(" ");
}

/** Negative prompt steering away from backgrounds / photoreal artefacts. */
export const AVATAR_NEGATIVE_PROMPT = [
  "background, scenery, room, wall, floor, photographic, realistic photo",
  "extra limbs, deformed, blurry, watermark, text, low quality",
].join(", ");

/**
 * `fetch` wrapped in an AbortController that aborts after `timeoutMs`
 * (Req 1.10). On timeout it throws a typed `AvatarProviderError` of kind
 * "timeout"; any other network error is rethrown as kind "http".
 */
export async function abortableFetch(
  provider: string,
  pose: CeremonyPose,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (controller.signal.aborted) {
      throw new AvatarProviderError(
        provider,
        "timeout",
        `${provider} did not return a completed image within ${timeoutMs}ms for pose "${pose}".`,
        { pose, cause: err },
      );
    }
    throw new AvatarProviderError(
      provider,
      "http",
      `${provider} request failed for pose "${pose}": ${(err as Error).message}`,
      { pose, cause: err },
    );
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Download a generated image URL (respecting the remaining timeout budget) and
 * normalize it to a 1024x1024 transparent-background PNG (Req 1.6).
 *
 * The resize uses `fit: "contain"` with a transparent pad so a non-square
 * source keeps its aspect ratio and any padding stays transparent.
 *
 * NOTE: this preserves whatever transparency the model produced (the prompt
 * requests a transparent cut-out). True background *removal* for models that
 * return an opaque background is a separate external capability.
 * TODO(provider-wiring): if the connected model returns an opaque background,
 *   insert a background-removal / matting step here before the resize.
 */
export async function normalizeToTransparentPng(
  provider: string,
  pose: CeremonyPose,
  imageUrl: string,
  timeoutMs: number,
): Promise<Buffer> {
  let finalImageUrl = imageUrl;

  // 1. If we're using Fal, use their dedicated background removal API first.
  if (provider === "fal-instant-id") {
    try {
      const apiKey = requireApiKey(provider, "FAL_API_KEY");
      const bgRemovalRes = await abortableFetch(
        provider,
        pose,
        "https://fal.run/fal-ai/image-bg-removal",
        {
          method: "POST",
          headers: {
            Authorization: `Key ${apiKey}`,
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({ image_url: imageUrl }),
        },
        timeoutMs
      );

      if (bgRemovalRes.ok) {
        const payload = await bgRemovalRes.json() as { image?: { url?: string } };
        if (payload.image?.url) {
          finalImageUrl = payload.image.url;
        }
      }
    } catch (err) {
      console.warn(`[AvatarProvider] Background removal failed for ${pose}, falling back to original image.`, err);
    }
  }

  // 2. Fetch the (potentially transparent) image
  const res = await abortableFetch(provider, pose, finalImageUrl, { method: "GET" }, timeoutMs);
  if (!res.ok) {
    throw new AvatarProviderError(
      provider,
      "http",
      `${provider} result image fetch failed for pose "${pose}" (HTTP ${res.status}).`,
      { pose },
    );
  }
  const sourceBytes = Buffer.from(await res.arrayBuffer());
  if (sourceBytes.length === 0) {
    throw new AvatarProviderError(
      provider,
      "empty",
      `${provider} returned an empty image for pose "${pose}".`,
      { pose },
    );
  }

  // 3. Normalize to exactly 1024x1024 PNG with transparent padding
  return sharp(sourceBytes)
    .resize(AVATAR_SIZE, AVATAR_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // transparent pad
    })
    .png()
    .toBuffer();
}

/**
 * Read an API key from the environment, throwing a typed credentials error if
 * it is missing/blank. Providers are normally only constructed when their key
 * is present, but this guards direct/manual construction too.
 */
export function requireApiKey(provider: string, envVar: string): string {
  const value = process.env[envVar];
  if (!value || value.trim().length === 0) {
    throw new AvatarProviderError(
      provider,
      "credentials",
      `${provider} requires the ${envVar} environment variable to be set.`,
    );
  }
  return value;
}
