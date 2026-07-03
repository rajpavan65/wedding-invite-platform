// src/remotion/layout/geometry.canvas-scaling.property.test.ts
//
// Feature: invite-product-quality, Property 9: Proportional canvas scaling
// For any slot and any canvas size, scaling the slot to the canvas multiplies
// its x and width by `canvas.width / 1080` and its y and height by
// `canvas.height / 1920`, preserving the slot's relative position on the canvas.
//
// Validates: Requirements 3.3

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { scaleSlotToCanvas, REF_CANVAS, type Slot, type Size } from "./geometry";

const slotArb: fc.Arbitrary<Slot> = fc.record({
  x: fc.double({ min: 0, max: 1080, noNaN: true }),
  y: fc.double({ min: 0, max: 1920, noNaN: true }),
  width: fc.double({ min: 0, max: 1080, noNaN: true }),
  height: fc.double({ min: 0, max: 1920, noNaN: true }),
});

const canvasArb: fc.Arbitrary<Size> = fc.record({
  width: fc.double({ min: 1, max: 7680, noNaN: true }),
  height: fc.double({ min: 1, max: 7680, noNaN: true }),
});

const close = (a: number, b: number): void => {
  // Scale-aware tolerance: absolute floor plus a relative component.
  expect(Math.abs(a - b)).toBeLessThanOrEqual(1e-6 + Math.abs(b) * 1e-9);
};

describe("Property 9: Proportional canvas scaling", () => {
  it("scales x/width by width-ratio and y/height by height-ratio", () => {
    fc.assert(
      fc.property(slotArb, canvasArb, (slot, canvas) => {
        const scaled = scaleSlotToCanvas(slot, canvas);

        const sx = canvas.width / REF_CANVAS.width;
        const sy = canvas.height / REF_CANVAS.height;

        close(scaled.x, slot.x * sx);
        close(scaled.width, slot.width * sx);
        close(scaled.y, slot.y * sy);
        close(scaled.height, slot.height * sy);

        // Relative position is preserved: the slot's left fraction of the
        // canvas is unchanged by scaling.
        if (slot.width > 0) {
          const refFrac = slot.x / REF_CANVAS.width;
          const scaledFrac = scaled.x / canvas.width;
          expect(Math.abs(refFrac - scaledFrac)).toBeLessThan(1e-9);
        }
      }),
      { numRuns: 200 },
    );
  });
});
