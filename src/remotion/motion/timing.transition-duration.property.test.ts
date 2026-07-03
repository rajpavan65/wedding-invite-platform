// src/remotion/motion/timing.transition-duration.property.test.ts
//
// Feature: invite-product-quality, Property 19: Transition duration bounds
// For any requested scene-transition duration, the resolved transition
// duration is greater than 0 and within 0.3 to 1.0 seconds inclusive (never an
// instant hard cut).
//
// Validates: Requirements 6.5

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  clampTransitionDuration,
  TRANSITION_DURATION_MIN_SECONDS,
  TRANSITION_DURATION_MAX_SECONDS,
} from "./timing";

describe("Property 19: Transition duration bounds", () => {
  it("resolves any finite request into (0, 1.0] and within [0.3, 1.0]", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        (seconds) => {
          const resolved = clampTransitionDuration(seconds);

          // Never an instant hard cut.
          expect(resolved).toBeGreaterThan(0);
          // Within the defined transition window.
          expect(resolved).toBeGreaterThanOrEqual(TRANSITION_DURATION_MIN_SECONDS);
          expect(resolved).toBeLessThanOrEqual(TRANSITION_DURATION_MAX_SECONDS);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("is total — non-finite requests still resolve within bounds", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
        (seconds) => {
          const resolved = clampTransitionDuration(seconds);

          expect(resolved).toBeGreaterThan(0);
          expect(resolved).toBeGreaterThanOrEqual(TRANSITION_DURATION_MIN_SECONDS);
          expect(resolved).toBeLessThanOrEqual(TRANSITION_DURATION_MAX_SECONDS);
        },
      ),
      { numRuns: 100 },
    );
  });
});
