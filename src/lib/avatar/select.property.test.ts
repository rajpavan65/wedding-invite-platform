// src/lib/avatar/select.property.test.ts
//
// Property-based tests for best-variant selection.
//
// Feature: invite-product-quality, Property 3: Best-variant selection
// For any non-empty list of generated variants with identity scores, the
// selected candidate is a variant with the maximum identity score, and among
// variants tied for the maximum it is the one with the lowest variant index.
//
// Validates: Requirements 1.11

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { selectBestVariant } from "./select";
import type { AvatarVariant } from "./types";

// Generate a non-empty list of variants with arbitrary indices and scores in [0,1].
const variantsArb = fc
  .array(
    fc.record({
      index: fc.integer({ min: 0, max: 1000 }),
      identityScore: fc.double({ min: 0, max: 1, noNaN: true }),
    }),
    { minLength: 1, maxLength: 12 },
  )
  .map((rows) =>
    rows.map(
      (r): AvatarVariant => ({
        index: r.index,
        identityScore: r.identityScore,
        imageData: Buffer.alloc(0),
      }),
    ),
  );

describe("Property 3: Best-variant selection", () => {
  it("selects the max identity score, breaking ties by lowest index", () => {
    fc.assert(
      fc.property(variantsArb, (variants) => {
        const best = selectBestVariant(variants);
        expect(best).toBeDefined();
        if (best === undefined) return;

        const maxScore = Math.max(...variants.map((v) => v.identityScore));
        // Selected score is the maximum.
        expect(best.identityScore).toBe(maxScore);

        // Among all variants at the maximum score, the selected index is the lowest.
        const lowestTiedIndex = Math.min(
          ...variants
            .filter((v) => v.identityScore === maxScore)
            .map((v) => v.index),
        );
        expect(best.index).toBe(lowestTiedIndex);

        // The selected variant is actually a member of the input list.
        expect(variants).toContain(best);
      }),
      { numRuns: 100 },
    );
  });

  it("returns undefined only for an empty list", () => {
    expect(selectBestVariant([])).toBeUndefined();
  });
});
