// src/remotion/motion/timing.entrance-duration.property.test.ts
//
// Feature: invite-product-quality, Property 17: Entrance duration bounds
// For any requested entrance duration, the resolved entrance duration is at
// least 0.3 seconds and at most 1.5 seconds (no linear or sub-0.3s entrance is
// produced).
//
// Validates: Requirements 6.1

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  clampEntranceDuration,
  ENTRANCE_DURATION_MIN_SECONDS,
  ENTRANCE_DURATION_MAX_SECONDS,
} from "./timing";

describe("Property 17: Entrance duration bounds", () => {
  it("resolves any finite request into [0.3, 1.5] seconds", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -1000, max: 1000, noNaN: true }),
        (seconds) => {
          const resolved = clampEntranceDuration(seconds);

          expect(resolved).toBeGreaterThanOrEqual(ENTRANCE_DURATION_MIN_SECONDS);
          expect(resolved).toBeLessThanOrEqual(ENTRANCE_DURATION_MAX_SECONDS);
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
          const resolved = clampEntranceDuration(seconds);

          expect(Number.isFinite(resolved)).toBe(true);
          expect(resolved).toBeGreaterThanOrEqual(ENTRANCE_DURATION_MIN_SECONDS);
          expect(resolved).toBeLessThanOrEqual(ENTRANCE_DURATION_MAX_SECONDS);
        },
      ),
      { numRuns: 100 },
    );
  });

  it("leaves already-valid durations unchanged (idempotent within range)", () => {
    fc.assert(
      fc.property(
        fc.double({
          min: ENTRANCE_DURATION_MIN_SECONDS,
          max: ENTRANCE_DURATION_MAX_SECONDS,
          noNaN: true,
        }),
        (seconds) => {
          expect(clampEntranceDuration(seconds)).toBeCloseTo(seconds, 10);
        },
      ),
      { numRuns: 100 },
    );
  });
});
