// src/remotion/motion/timing.light-leak-opacity.property.test.ts
//
// Feature: invite-product-quality, Property 18: Light-leak opacity bound
// For any frame of any composition, the light-leak overlay's opacity is at
// most 0.35 (35%).
//
// Validates: Requirements 6.3

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { lightLeakOpacity, LIGHT_LEAK_MAX_OPACITY } from "./timing";

const EPSILON = 1e-9;

describe("Property 18: Light-leak opacity bound", () => {
  it("never exceeds 0.35 for any frame, duration, or intensity", () => {
    fc.assert(
      fc.property(
        // frame may fall outside [0, durationInFrames] — the helper is total.
        fc.double({ min: -500, max: 5000, noNaN: true }),
        fc.double({ min: 0, max: 5000, noNaN: true }),
        fc.double({ min: -2, max: 2, noNaN: true }),
        (frame, durationInFrames, intensity) => {
          const opacity = lightLeakOpacity(frame, durationInFrames, intensity);

          expect(opacity).toBeGreaterThanOrEqual(0);
          expect(opacity).toBeLessThanOrEqual(LIGHT_LEAK_MAX_OPACITY + EPSILON);
          expect(Number.isFinite(opacity)).toBe(true);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("is total — non-finite inputs yield a bounded opacity", () => {
    const weird = fc.constantFrom(
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
    );
    fc.assert(
      fc.property(weird, weird, weird, (frame, duration, intensity) => {
        const opacity = lightLeakOpacity(frame, duration, intensity);
        expect(Number.isFinite(opacity)).toBe(true);
        expect(opacity).toBeGreaterThanOrEqual(0);
        expect(opacity).toBeLessThanOrEqual(LIGHT_LEAK_MAX_OPACITY + EPSILON);
      }),
      { numRuns: 100 },
    );
  });
});
