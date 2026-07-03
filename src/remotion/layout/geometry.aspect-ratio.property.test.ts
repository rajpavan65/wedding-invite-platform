// src/remotion/layout/geometry.aspect-ratio.property.test.ts
//
// Feature: invite-product-quality, Property 8: Aspect ratio preserved (uniform scale)
// For any avatar intrinsic size and slot, the placed avatar box preserves the
// original width-to-height aspect ratio (a single uniform scale factor is
// applied to both axes) within a small numerical epsilon, so the asset is
// never stretched, squashed, or cropped.
//
// Validates: Requirements 3.2

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { fitAvatarIntoSlot, type Slot, type Size } from "./geometry";

// Positive intrinsic sizes and positive slot dimensions so a non-degenerate
// box is produced and an aspect ratio is well-defined.
const intrinsicArb: fc.Arbitrary<Size> = fc.record({
  width: fc.double({ min: 1, max: 8000, noNaN: true }),
  height: fc.double({ min: 1, max: 8000, noNaN: true }),
});

const slotArb: fc.Arbitrary<Slot> = fc.record({
  x: fc.double({ min: -2000, max: 2000, noNaN: true }),
  y: fc.double({ min: -2000, max: 4000, noNaN: true }),
  width: fc.double({ min: 1, max: 1080, noNaN: true }),
  height: fc.double({ min: 1, max: 1920, noNaN: true }),
  anchorBottom: fc.boolean(),
});

describe("Property 8: Aspect ratio preserved (uniform scale)", () => {
  it("placed box keeps the intrinsic width-to-height ratio (single scale factor)", () => {
    fc.assert(
      fc.property(intrinsicArb, slotArb, (intrinsic, slot) => {
        const box = fitAvatarIntoSlot(intrinsic, slot);

        const intrinsicRatio = intrinsic.width / intrinsic.height;
        const placedRatio = box.width / box.height;

        // Relative tolerance keeps the comparison scale-independent.
        const relativeError =
          Math.abs(placedRatio - intrinsicRatio) / intrinsicRatio;
        expect(relativeError).toBeLessThan(1e-6);

        // The single uniform scale factor must match on both axes.
        const scaleX = box.width / intrinsic.width;
        const scaleY = box.height / intrinsic.height;
        expect(Math.abs(scaleX - scaleY)).toBeLessThan(1e-9 + scaleX * 1e-6);
      }),
      { numRuns: 200 },
    );
  });
});
