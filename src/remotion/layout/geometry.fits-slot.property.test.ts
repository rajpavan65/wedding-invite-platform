// src/remotion/layout/geometry.fits-slot.property.test.ts
//
// Feature: invite-product-quality, Property 7: Avatar fits within slot
// For any avatar intrinsic size and slot, the placed avatar box's width is at
// most the slot width and its height is at most the slot height.
//
// Validates: Requirements 3.1

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { fitAvatarIntoSlot, type Slot, type Size } from "./geometry";

const EPSILON = 1e-9;

// Positive, finite intrinsic sizes (a real asset always has area).
const intrinsicArb: fc.Arbitrary<Size> = fc.record({
  width: fc.double({ min: 1, max: 8000, noNaN: true }),
  height: fc.double({ min: 1, max: 8000, noNaN: true }),
});

// Slots authored on the reference canvas; non-negative finite dimensions.
const slotArb: fc.Arbitrary<Slot> = fc.record({
  x: fc.double({ min: -2000, max: 2000, noNaN: true }),
  y: fc.double({ min: -2000, max: 4000, noNaN: true }),
  width: fc.double({ min: 0, max: 1080, noNaN: true }),
  height: fc.double({ min: 0, max: 1920, noNaN: true }),
  anchorBottom: fc.boolean(),
});

describe("Property 7: Avatar fits within slot", () => {
  it("placed box never exceeds the slot's width or height", () => {
    fc.assert(
      fc.property(intrinsicArb, slotArb, (intrinsic, slot) => {
        const box = fitAvatarIntoSlot(intrinsic, slot);

        expect(box.width).toBeLessThanOrEqual(slot.width + EPSILON);
        expect(box.height).toBeLessThanOrEqual(slot.height + EPSILON);
        // The placed box is always a valid, non-negative size.
        expect(box.width).toBeGreaterThanOrEqual(0);
        expect(box.height).toBeGreaterThanOrEqual(0);
      }),
      { numRuns: 200 },
    );
  });
});
