// src/remotion/layout/geometry.safe-zone.property.test.ts
//
// Feature: invite-product-quality, Property 12: Safe-zone containment
// For any placed box (avatar or fitted text layout) and any canvas size,
// after safe-zone clamping the box lies fully within the safe zone — its
// left/top are at or beyond the inset and its right/bottom are at or before
// the canvas edge minus the inset — so no part is clipped by a canvas edge.
//
// Validates: Requirements 3.6, 5.8, 9.3

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { clampToSafeZone, SAFE_ZONE_INSET, type Box, type Size } from "./geometry";

const EPSILON = 1e-6;

// Arbitrary boxes — including ones that start out-of-bounds or oversized.
const boxArb: fc.Arbitrary<Box> = fc.record({
  left: fc.double({ min: -2000, max: 4000, noNaN: true }),
  top: fc.double({ min: -2000, max: 6000, noNaN: true }),
  width: fc.double({ min: 0, max: 4000, noNaN: true }),
  height: fc.double({ min: 0, max: 6000, noNaN: true }),
});

const canvasArb: fc.Arbitrary<Size> = fc.record({
  width: fc.double({ min: 1, max: 7680, noNaN: true }),
  height: fc.double({ min: 1, max: 7680, noNaN: true }),
});

const insetArb = fc.double({ min: 0, max: 200, noNaN: true });

describe("Property 12: Safe-zone containment", () => {
  it("clamped box lies fully within [inset, edge - inset] on both axes", () => {
    fc.assert(
      fc.property(boxArb, canvasArb, fc.option(insetArb, { nil: undefined }), (box, canvas, inset) => {
        const resolvedInset = inset ?? SAFE_ZONE_INSET;
        const clamped = clampToSafeZone(box, canvas, inset);

        // The effective inset is itself clamped to what the canvas can hold,
        // so derive the available span the helper actually uses.
        const safeW = Math.max(0, canvas.width - resolvedInset * 2);
        const safeH = Math.max(0, canvas.height - resolvedInset * 2);

        // Left/top at or beyond the inset.
        expect(clamped.left).toBeGreaterThanOrEqual(resolvedInset - EPSILON);
        expect(clamped.top).toBeGreaterThanOrEqual(resolvedInset - EPSILON);

        // Right/bottom at or before the canvas edge minus the inset.
        expect(clamped.left + clamped.width).toBeLessThanOrEqual(
          resolvedInset + safeW + EPSILON,
        );
        expect(clamped.top + clamped.height).toBeLessThanOrEqual(
          resolvedInset + safeH + EPSILON,
        );

        // The clamp never produces a negative-size box.
        expect(clamped.width).toBeGreaterThanOrEqual(0);
        expect(clamped.height).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 },
    );
  });
});
