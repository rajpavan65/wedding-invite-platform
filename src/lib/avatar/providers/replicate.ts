// src/lib/avatar/providers/replicate.ts
//
// ReplicatePhotoMakerProvider — real (credentialed) avatar provider backed by
// Replicate PhotoMaker. Selected by the resolver (task 3.3) when
// REPLICATE_API_TOKEN is present and no FAL_API_KEY is set. Implements the
// AvatarProvider seam (Req 1.1, 1.4, 1.6, 1.10).
//
// ──────────────────────────────────────────────────────────────────────────
// ⚠️  PLACEHOLDER-SAFE INTEGRATION — what must be confirmed when the Replicate
//     account is connected (we do NOT have credentials wired yet):
//
//   1. REPLICATE_MODEL_VERSION — the exact PhotoMaker model `version` hash.
//      There is no usable default; the call THROWS a typed credentials error
//      until REPLICATE_MODEL_VERSION is set.
//   2. AUTH HEADER — confirm `Authorization: Bearer <REPLICATE_API_TOKEN>`
//      (Replicate also historically accepted the `Token <token>` scheme).
//   3. REQUEST BODY — confirm the PhotoMaker `input` field names
//      (reference image field, prompt, negative prompt, output count, style).
//   4. RESPONSE SHAPE — confirm where output image URL(s) live. We send
//      `Prefer: wait` for a synchronous response; if the account returns
//      `status: "starting"/"processing"` instead, add a poll loop on the
//      prediction `urls.get` endpoint (still under the 120s budget).
//   5. IDENTITY SCORE — PhotoMaker does not return one; the placeholder score
//      from ./shared is used (see PLACEHOLDER_IDENTITY_SCORE).
//
// Behaviour contract: on missing key/version, non-OK HTTP, empty result,
// malformed payload, or timeout this THROWS a typed AvatarProviderError. It
// never silently falls back to mock and never invents fake success — the
// resolver owns the no-credentials fallback.
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
 * PLACEHOLDER — Replicate predictions endpoint. Override via REPLICATE_ENDPOINT.
 * TODO(provider-wiring): confirm; the public default is stable.
 */
const REPLICATE_ENDPOINT =
  process.env.REPLICATE_ENDPOINT ?? "https://api.replicate.com/v1/predictions";

/** Shape we expect back from Replicate. PLACEHOLDER — confirm field names. */
interface ReplicatePrediction {
  status?: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  /** PhotoMaker returns a string[] of output image URLs. */
  output?: string[] | string | null;
  error?: string | null;
}

const PROVIDER_NAME = "replicate-photomaker";

export class ReplicatePhotoMakerProvider implements AvatarProvider {
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

    const apiKey = requireApiKey(PROVIDER_NAME, "REPLICATE_API_TOKEN");

    // PLACEHOLDER — the PhotoMaker model version hash is required and has no
    // safe default. Treat its absence as a credentials error.
    const modelVersion = process.env.REPLICATE_MODEL_VERSION;
    if (!modelVersion || modelVersion.trim().length === 0) {
      throw new AvatarProviderError(
        PROVIDER_NAME,
        "credentials",
        `${PROVIDER_NAME} requires REPLICATE_MODEL_VERSION (the PhotoMaker model version hash) to be set.`,
        { pose },
      );
    }

    if (referencePhotos.length === 0) {
      throw new AvatarProviderError(
        PROVIDER_NAME,
        "empty",
        `No reference photos supplied for pose "${pose}".`,
        { pose },
      );
    }

    // PLACEHOLDER request body — confirm PhotoMaker `input` field names.
    // TODO(provider-wiring): verify `input_image`, `prompt`, `negative_prompt`,
    //   `num_outputs`, and any `style_name`/transparency options.
    const requestBody = {
      version: modelVersion,
      input: {
        input_image: referencePhotos[0],
        // Extra reference faces where the model supports multi-image input.
        input_image2: referencePhotos[1],
        input_image3: referencePhotos[2],
        prompt: buildAvatarPrompt(pose),
        negative_prompt: AVATAR_NEGATIVE_PROMPT,
        num_outputs: variants,
      },
    };

    const response = await abortableFetch(
      PROVIDER_NAME,
      pose,
      REPLICATE_ENDPOINT,
      {
        method: "POST",
        headers: {
          // PLACEHOLDER — confirm Replicate auth scheme (Bearer vs Token).
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          // Ask Replicate to hold the connection open until the prediction
          // resolves so we get output synchronously (within the 120s budget).
          Prefer: "wait",
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
        `Replicate PhotoMaker returned HTTP ${response.status} for pose "${pose}".${detail}`,
        { pose },
      );
    }

    let prediction: ReplicatePrediction;
    try {
      prediction = (await response.json()) as ReplicatePrediction;
    } catch (err) {
      throw new AvatarProviderError(
        PROVIDER_NAME,
        "malformed",
        `Replicate PhotoMaker returned a non-JSON response for pose "${pose}".`,
        { pose, cause: err },
      );
    }

    if (prediction.status === "failed" || prediction.status === "canceled") {
      throw new AvatarProviderError(
        PROVIDER_NAME,
        "http",
        `Replicate PhotoMaker prediction ${prediction.status} for pose "${pose}": ${prediction.error ?? "unknown error"}.`,
        { pose },
      );
    }

    // PLACEHOLDER — if the account does not honour `Prefer: wait`, the status
    // will still be starting/processing here. Wiring note: add a poll loop on
    // the prediction's `urls.get` endpoint under the same timeout budget.
    // TODO(provider-wiring): confirm `Prefer: wait` returns a terminal status.
    if (prediction.status === "starting" || prediction.status === "processing") {
      throw new AvatarProviderError(
        PROVIDER_NAME,
        "malformed",
        `Replicate PhotoMaker did not return a completed prediction synchronously for pose "${pose}" (status "${prediction.status}"). A polling loop must be wired when credentials are connected.`,
        { pose },
      );
    }

    const outputUrls = normalizeOutput(prediction.output);
    if (outputUrls.length === 0) {
      throw new AvatarProviderError(
        PROVIDER_NAME,
        "empty",
        `Replicate PhotoMaker returned no output images for pose "${pose}".`,
        { pose },
      );
    }

    // Normalize each returned image to a 1024x1024 transparent PNG (Req 1.6).
    return Promise.all(
      outputUrls.map(async (url, index) => {
        const imageData = await normalizeToTransparentPng(
          PROVIDER_NAME,
          pose,
          url,
          timeoutMs,
        );
        return {
          index,
          imageData,
          // PhotoMaker does not return an identity score — use placeholder.
          identityScore: PLACEHOLDER_IDENTITY_SCORE,
        } satisfies AvatarVariant;
      }),
    );
  }
}

/** Coerce Replicate's `output` (string | string[] | null) into a URL list. */
function normalizeOutput(output: ReplicatePrediction["output"]): string[] {
  if (Array.isArray(output)) {
    return output.filter((u): u is string => typeof u === "string" && u.length > 0);
  }
  if (typeof output === "string" && output.length > 0) {
    return [output];
  }
  return [];
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
