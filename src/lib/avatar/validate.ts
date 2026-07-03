// src/lib/avatar/validate.ts
//
// Pure, total reference-photo count validation for avatar generation.
//
// This runs BEFORE any Avatar_Provider call so an invalid request never
// reaches the (potentially expensive / billable) provider integration.
//
// Designed as a pure function returning a result object — never throws — so
// the validation logic can be exercised exhaustively by property-based tests.
//
// Requirements: 1.2, 1.3 — Design §Error Handling/Avatar

import type { AvatarRequest } from "./types";

/** Inclusive lower bound on the number of reference photos. */
export const MIN_REFERENCE_PHOTOS = 1;

/** Inclusive upper bound on the number of reference photos. */
export const MAX_REFERENCE_PHOTOS = 3;

/**
 * Result of validating an {@link AvatarRequest}.
 *
 * `ok: true`  — the request may proceed to provider generation.
 * `ok: false` — the request is rejected; `error` describes why and the valid
 *               1–3 range. No provider call should be made.
 */
export type AvatarRequestValidation =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Validate the reference-photo count of an avatar request.
 *
 * Pure and total: for any input it returns a result object and never throws.
 *
 * - Rejects when `referencePhotos.length < 1` (Req 1.2): the error indicates
 *   that at least one reference photo is required.
 * - Rejects when `referencePhotos.length > 3` (Req 1.3): the error indicates
 *   the reference-photo count must be between 1 and 3 inclusive.
 * - Otherwise accepts.
 *
 * Rejection happens before any provider invocation by virtue of being a pure
 * pre-check that callers run first.
 */
export function validateAvatarRequest(req: AvatarRequest): AvatarRequestValidation {
  // Be defensive about a missing/non-array field so the function stays total.
  const count = Array.isArray(req?.referencePhotos) ? req.referencePhotos.length : 0;

  if (count < MIN_REFERENCE_PHOTOS) {
    return {
      ok: false,
      error:
        `At least one reference photo is required (received ${count}). ` +
        `The reference photo count must be between ${MIN_REFERENCE_PHOTOS} and ${MAX_REFERENCE_PHOTOS} inclusive.`,
    };
  }

  if (count > MAX_REFERENCE_PHOTOS) {
    return {
      ok: false,
      error:
        `Too many reference photos (received ${count}). ` +
        `The reference photo count must be between ${MIN_REFERENCE_PHOTOS} and ${MAX_REFERENCE_PHOTOS} inclusive.`,
    };
  }

  return { ok: true };
}
