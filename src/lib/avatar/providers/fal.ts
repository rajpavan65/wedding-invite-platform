// src/lib/avatar/providers/fal.ts
//
// FalInstantIdProvider — real (credentialed) avatar provider backed by
// fal.ai InstantID. Selected by the resolver (task 3.3) when FAL_API_KEY is
// present. Implements the AvatarProvider seam (Req 1.1, 1.4, 1.6, 1.10).
//
// ──────────────────────────────────────────────────────────────────────────
// ⚠️  PLACEHOLDER-SAFE INTEGRATION — what must be confirmed when the fal.ai
//     account is connected (we do NOT have credentials wired yet):
//
//   1. FAL_ENDPOINT — the exact fal.ai InstantID model slug / run URL. The
//      value below is a best-guess placeholder.
//   2. AUTH HEADER — confirm the scheme is `Authorization: Key <FAL_API_KEY>`
//      (fal.ai's documented scheme) and not a bearer token.
//   3. REQUEST BODY — confirm the field names InstantID expects
//      (face image input field, prompt, negative prompt, image count, output
//      format/transparency flags).
//   4. RESPONSE SHAPE — confirm where the generated image URL(s) live in the
//      response and whether an identity/similarity score is returned (see
//      PLACEHOLDER_IDENTITY_SCORE in ./shared).
//   5. SYNC vs QUEUE — `https://fal.run/...` is synchronous; if the account
//      uses the queue API instead, add the submit→poll loop here (still under
//      the same 120s AbortController budget).
//
// Behaviour contract: on missing key, non-OK HTTP, empty result, malformed
// payload, or timeout this THROWS a typed AvatarProviderError. It never
// silently falls back to mock and never invents fake success — the resolver
// owns the no-credentials fallback.
// ──────────────────────────────────────────────────────────────────────────

import type { AvatarProvider, AvatarVariant, CeremonyPose } from "../types";
import {
  AVATAR_NEGATIVE_PROMPT,
  AvatarProviderError,
  DEFAULT_TIMEOUT_MS,
  PLACEHOLDER_IDENTITY_SCORE,
  abortableFetch,
  buildAvatarPrompt,
  normalizeToTransparentPng,
  requireApiKey,
} from "./shared";

/**
 * PLACEHOLDER — exact fal.ai InstantID endpoint. Override via FAL_ENDPOINT.
 * TODO(provider-wiring): confirm the real model slug / run URL.
 */
const FAL_ENDPOINT =
  process.env.FAL_ENDPOINT ?? "https://fal.run/fal-ai/flux-pulid";

/** Shape we expect back from fal.ai. PLACEHOLDER — confirm field names. */
interface FalImage {
  url?: string;
  /** TODO(provider-wiring): confirm whether InstantID returns a score field. */
  identity_score?: number;
}
interface FalResponse {
  images?: FalImage[];
}

const PROVIDER_NAME = "fal-instant-id";

export class FalInstantIdProvider implements AvatarProvider {
  readonly name = PROVIDER_NAME;

  async generatePose(input: {
    referencePhotos: string[];
    pose: CeremonyPose;
    variants: number;
    timeoutMs: number;
  }): Promise<AvatarVariant[]> {
    const { pose, referencePhotos } = input;
    const timeoutMs = input.timeoutMs > 0 ? input.timeoutMs : DEFAULT_TIMEOUT_MS;
    const variants = Math.max(1, Math.floor(input.variants));

    const apiKey = requireApiKey(PROVIDER_NAME, "FAL_API_KEY");

    if (referencePhotos.length === 0) {
      throw new AvatarProviderError(
        PROVIDER_NAME,
        "empty",
        `No reference photos supplied for pose "${pose}".`,
        { pose },
      );
    }

    // fal-ai/flux-pulid expects an array of objects for reference images
    const requestBody = {
      prompt: buildAvatarPrompt(pose),
      reference_images: referencePhotos.map((url) => ({ image_url: url })),
      num_images: variants,
      image_size: "square_hd",
      num_inference_steps: 25,
      guidance_scale: 3.5,
      output_format: "png",
    };

    const response = await abortableFetch(
      PROVIDER_NAME,
      pose,
      FAL_ENDPOINT,
      {
        method: "POST",
        headers: {
          // PLACEHOLDER — confirm fal.ai auth scheme is `Key <token>`.
          Authorization: `Key ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(requestBody),
      },
      timeoutMs,
    );

    if (!response.ok) {
      const detail = await safeReadText(response);
      throw new AvatarProviderError(
        PROVIDER_NAME,
        "http",
        `fal.ai InstantID returned HTTP ${response.status} for pose "${pose}".${detail}`,
        { pose },
      );
    }

    let payload: FalResponse;
    try {
      payload = (await response.json()) as FalResponse;
    } catch (err) {
      throw new AvatarProviderError(
        PROVIDER_NAME,
        "malformed",
        `fal.ai InstantID returned a non-JSON response for pose "${pose}".`,
        { pose, cause: err },
      );
    }

    // PLACEHOLDER — confirm the array path that holds generated images.
    const images = (payload.images ?? []).filter((img): img is Required<Pick<FalImage, "url">> & FalImage =>
      typeof img.url === "string" && img.url.length > 0,
    );
    if (images.length === 0) {
      throw new AvatarProviderError(
        PROVIDER_NAME,
        "empty",
        `fal.ai InstantID returned no images for pose "${pose}".`,
        { pose },
      );
    }

    // Normalize each returned image to a 1024x1024 transparent PNG (Req 1.6).
    return Promise.all(
      images.map(async (img, index) => {
        const imageData = await normalizeToTransparentPng(
          PROVIDER_NAME,
          pose,
          img.url,
          timeoutMs,
        );
        return {
          index,
          imageData,
          // PLACEHOLDER — real identity score wiring (Req 1.4/1.11).
          identityScore:
            typeof img.identity_score === "number"
              ? img.identity_score
              : PLACEHOLDER_IDENTITY_SCORE,
        } satisfies AvatarVariant;
      }),
    );
  }
}

/** Best-effort body read for richer HTTP error messages (never throws). */
async function safeReadText(response: Response): Promise<string> {
  try {
    const text = await response.text();
    return text ? ` ${text.slice(0, 500)}` : "";
  } catch {
    return "";
  }
}
