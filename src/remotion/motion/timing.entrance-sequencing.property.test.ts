// src/remotion/motion/timing.entrance-sequencing.property.test.ts
//
// Feature: invite-product-quality, Property 21: Entrance sequencing
// For any entrance schedule, the earliest start frame of any avatar or text
// element is at or after the frame on which the background-template entrance
// completes.
//
// Validates: Requirements 6.9

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  foregroundEntranceStartFrame,
  startsAfterBackgroundEntrance,
  BACKGROUND_ENTRANCE_FRAMES,
} from "./timing";

describe("Property 21: Entrance sequencing", () => {
  it("foreground start never precedes the background-entrance gate", () => {
    fc.assert(
      fc.property(
        // Any requested start frame for an avatar/text element.
        fc.double({ min: -500, max: 5000, noNaN: true }),
        // Any non-negative background-entrance completion frame.
        fc.double({ min: 0, max: 600, noNaN: true }),
        (requested, backgroundFrames) => {
          const start = foregroundEntranceStartFrame(requested, backgroundFrames);

          expect(start).toBeGreaterThanOrEqual(backgroundFrames);
          expect(startsAfterBackgroundEntrance(start, backgroundFrames)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("uses the default gate when none is supplied", () => {
    fc.assert(
      fc.property(fc.double({ min: -500, max: 5000, noNaN: true }), (requested) => {
        const start = foregroundEntranceStartFrame(requested);
        expect(start).toBeGreaterThanOrEqual(BACKGROUND_ENTRANCE_FRAMES);
      }),
      { numRuns: 100 },
    );
  });

  it("is total — non-finite requested start resolves to the gate", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
        fc.double({ min: 0, max: 600, noNaN: true }),
        (requested, backgroundFrames) => {
          const start = foregroundEntranceStartFrame(requested, backgroundFrames);
          expect(Number.isFinite(start)).toBe(true);
          // +Infinity request is allowed to stay large but never below the gate.
          expect(start).toBeGreaterThanOrEqual(backgroundFrames);
        },
      ),
      { numRuns: 100 },
    );
  });
});
