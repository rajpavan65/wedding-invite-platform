/**
 * AI Generation Service — avatar generation orchestration (task 4.2).
 *
 * `generateAvatars` is the order-oriented entry point for real personalised
 * avatar generation. It validates input, resolves the configured provider
 * (fal.ai / Replicate / mock), generates each requested ceremony pose with a
 * 120s timeout, selects the best variant, uploads the chosen transparent PNG to
 * `avatars/{clientId}/{ceremonyType}.png`, and returns resolvable URLs.
 *
 * Requirements: 1.1, 1.5, 1.8, 1.9, 1.10, 1.11 — Design §Components/1
 */

import { cloudStorage } from "./cloud-storage";
import { validateAvatarRequest } from "./avatar/validate";
import { selectBestVariant } from "./avatar/select";
import { AVATAR_BUCKET, AVATAR_EXTENSION } from "./avatar/storage-path";
import { isMockMode, resolveAvatarProvider } from "./avatar/providers";
import type {
  AvatarAsset,
  AvatarRequest,
  AvatarResult,
  AvatarVariant,
} from "./avatar/types";

/** Default number of candidate variants requested per pose (Req 1.11). */
export const DEFAULT_VARIANTS_PER_POSE = 3;

/** Per-pose generation timeout budget in milliseconds (Req 1.10). */
export const AVATAR_TIMEOUT_MS = 120_000;

/**
 * Race a per-pose generation promise against a hard timeout (Req 1.10).
 *
 * Even if a provider hangs (never resolving / never honouring its own internal
 * abort), the orchestrator guarantees the 120s bound and rejects with a
 * descriptive, pose-named timeout error. The timer is always cleared so a
 * settled promise never leaves a dangling handle.
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  pose: string,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          `Avatar generation timed out after ${timeoutMs}ms for pose "${pose}".`,
        ),
      );
    }, timeoutMs);

    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * Orchestrate avatar generation for an order (Req 1.1, 1.5, 1.8–1.11).
 *
 * Flow:
 *   1. Validate the reference-photo count (1–3) BEFORE any provider call
 *      (Req 1.2, 1.3) — throws a descriptive range error on failure.
 *   2. Resolve the provider from the environment (Req 1.1, 1.7).
 *   3. For each requested pose, generate `variantsPerPose` variants (default 3)
 *      under a 120s timeout (Req 1.5, 1.10).
 *   4. Select the best variant by identity score, ties → lowest index (Req 1.11).
 *   5. Upload the chosen PNG to `avatars/{clientId}/{pose}.png` and collect the
 *      resolvable URL (Req 1.8).
 *
 * Failure isolation (Req 1.9, 1.10): if a pose errors, returns empty, or times
 * out, the function throws a descriptive error naming that pose and stores NO
 * partial asset for it — the upload is only attempted after a variant has been
 * successfully selected.
 */
export async function generateAvatars(req: AvatarRequest): Promise<AvatarResult> {
  // 1. Validate before touching any (billable) provider (Req 1.2, 1.3).
  const validation = validateAvatarRequest(req);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  // 2. Resolve provider + mock flag from the environment (Req 1.1, 1.7).
  const provider = resolveAvatarProvider();
  const mock = isMockMode();

  const variantsPerPose =
    typeof req.variantsPerPose === "number" && req.variantsPerPose > 0
      ? Math.floor(req.variantsPerPose)
      : DEFAULT_VARIANTS_PER_POSE;

  const assets: AvatarAsset[] = [];

  for (const pose of req.poses) {
    // 3. Generate candidate variants under a hard 120s timeout (Req 1.5, 1.10).
    let variants: AvatarVariant[];
    try {
      variants = await withTimeout(
        provider.generatePose({
          referencePhotos: req.referencePhotos,
          pose,
          variants: variantsPerPose,
          timeoutMs: AVATAR_TIMEOUT_MS,
        }),
        AVATAR_TIMEOUT_MS,
        pose,
      );
    } catch (err) {
      // Provider error or timeout — name the pose, store no partial asset (Req 1.9, 1.10).
      throw new Error(
        `Avatar generation failed for pose "${pose}": ${(err as Error).message}`,
        { cause: err },
      );
    }

    // 4. Select the best variant; an empty result is a failure (Req 1.9, 1.11).
    const best = selectBestVariant(variants);
    if (!best) {
      throw new Error(
        `Avatar generation returned no image for pose "${pose}"; no asset was stored.`,
      );
    }

    // 5. Upload only after a successful selection so no partial asset is stored
    //    for a failed pose (Req 1.8, 1.9).
    const filename = `${pose}.${AVATAR_EXTENSION}`;
    const url = await cloudStorage.uploadFile(
      AVATAR_BUCKET,
      req.clientId,
      filename,
      best.imageData,
    );

    assets.push({ pose, url, identityScore: best.identityScore });
  }

  return { clientId: req.clientId, assets, mock };
}

// generate3DAvatar (the legacy per-scene shim that fed process-photos) has been
// retired. The active avatar entry point is generateAvatars() above.

