// src/remotion/render/thumbnail.clamping.property.test.ts
//
// Feature: invite-product-quality, Property 24: Thumbnail frame clamping
// For any configured `thumbnailFrame` and `durationInFrames`, the resolved
// thumbnail frame lies within [0, durationInFrames - 1], and equals 0 whenever
// the configured frame is negative or greater than `durationInFrames - 1`.
//
// Validates: Requirements 8.4

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { resolveThumbnailFrame } from "./thumbnail";

describe("Property 24: Thumbnail frame clamping", () => {
  it("resolves to a frame within [0, durationInFrames-1], else 0 for out-of-range", () => {
    fc.assert(
      fc.property(
        // Valid composition length: at least one frame.
        fc.integer({ min: 1, max: 100_000 }),
        // Configured frame spans negative, in-range, and beyond-range values.
        fc.integer({ min: -10_000, max: 200_000 }),
        (durationInFrames, frame) => {
          const resolved = resolveThumbnailFrame(frame, durationInFrames);
          const maxFrame = durationInFrames - 1;

          // Result is always a valid index within the composition.
          expect(resolved).toBeGreaterThanOrEqual(0);
          expect(resolved).toBeLessThanOrEqual(maxFrame);

          if (frame < 0 || frame > maxFrame) {
            // Out-of-range configured frame resolves to the first frame.
            expect(resolved).toBe(0);
          } else {
            // In-range frame is preserved exactly.
            expect(resolved).toBe(frame);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it("resolves non-finite frame inputs to the first frame", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 100_000 }),
        fc.constantFrom(NaN, Infinity, -Infinity),
        (durationInFrames, frame) => {
          expect(resolveThumbnailFrame(frame, durationInFrames)).toBe(0);
        },
      ),
      { numRuns: 100 },
    );
  });
});
