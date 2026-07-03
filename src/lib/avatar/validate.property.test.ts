// src/lib/avatar/validate.property.test.ts
//
// Property-based tests for reference-photo count validation.
//
// Feature: invite-product-quality, Property 1: Reference photo count validation
// For any avatar request, the request is rejected without invoking the
// Avatar_Provider if and only if the number of reference photos is less than 1
// or greater than 3; rejection returns an error indicating the 1-3 range.
//
// Validates: Requirements 1.2, 1.3

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  MAX_REFERENCE_PHOTOS,
  MIN_REFERENCE_PHOTOS,
  validateAvatarRequest,
} from "./validate";
import type { AvatarRequest, CeremonyPose } from "./types";

const POSES: CeremonyPose[] = [
  "haldi",
  "mehandi",
  "sangeet",
  "wedding",
  "reception",
];

/** Build a representative AvatarRequest with `count` reference photos. */
function requestWithPhotoCount(count: number): AvatarRequest {
  return {
    clientId: "client-123",
    referencePhotos: Array.from({ length: count }, (_, i) => `https://cdn/photo-${i}.jpg`),
    poses: POSES.slice(0, 1),
  };
}

describe("Property 1: Reference photo count validation", () => {
  it("accepts iff the photo count is within [1, 3], rejects otherwise", () => {
    fc.assert(
      fc.property(
        // Cover the full range around the bounds, including 0 and large counts.
        fc.integer({ min: 0, max: 25 }),
        (count) => {
          const result = validateAvatarRequest(requestWithPhotoCount(count));
          const shouldAccept =
            count >= MIN_REFERENCE_PHOTOS && count <= MAX_REFERENCE_PHOTOS;

          expect(result.ok).toBe(shouldAccept);

          if (!result.ok) {
            // Rejection must describe the valid 1-3 range.
            expect(result.error).toContain(String(MIN_REFERENCE_PHOTOS));
            expect(result.error).toContain(String(MAX_REFERENCE_PHOTOS));
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("rejects every out-of-range count (< 1 or > 3) with a range error", () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant(0),
          fc.integer({ min: MAX_REFERENCE_PHOTOS + 1, max: 100 }),
        ),
        (count) => {
          const result = validateAvatarRequest(requestWithPhotoCount(count));
          expect(result.ok).toBe(false);
          if (!result.ok) {
            expect(result.error.length).toBeGreaterThan(0);
            expect(result.error).toContain(String(MIN_REFERENCE_PHOTOS));
            expect(result.error).toContain(String(MAX_REFERENCE_PHOTOS));
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
