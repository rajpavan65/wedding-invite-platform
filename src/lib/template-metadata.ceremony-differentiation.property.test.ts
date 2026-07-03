// src/lib/template-metadata.ceremony-differentiation.property.test.ts
//
// Feature: invite-product-quality, Property 14: Ceremony differentiation
// For any two registered templates of different ceremony types, their dominant
// palettes differ and their key motifs differ.
//
// Validates: Requirements 4.6

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { getAllTemplateMetadata, getTemplateMetadata } from "./template-metadata";
import type { TemplateId } from "./types";

const ALL = getAllTemplateMetadata();
const TEMPLATE_IDS = Object.keys(ALL) as TemplateId[];

// Two dominant palettes "differ" when they are not the identical ordered list
// of colours. (A pure not-deep-equal check over the authored arrays.)
function palettesDiffer(a: string[], b: string[]): boolean {
  return JSON.stringify(a) !== JSON.stringify(b);
}

describe("Property 14: Ceremony differentiation", () => {
  it("any two registered templates of different ceremony types differ in palette and key motif", () => {
    const idArb = fc.constantFrom(...TEMPLATE_IDS);

    fc.assert(
      fc.property(idArb, idArb, (idA, idB) => {
        const a = getTemplateMetadata(idA);
        const b = getTemplateMetadata(idB);

        // Only constrain pairs of DIFFERENT ceremony types (Req 4.6).
        fc.pre(a.functionType !== b.functionType);

        // Dominant palettes must differ.
        expect(
          palettesDiffer(
            a.visualIdentity.dominantPalette,
            b.visualIdentity.dominantPalette
          )
        ).toBe(true);

        // Key motifs must differ.
        expect(a.visualIdentity.keyMotif).not.toBe(b.visualIdentity.keyMotif);
      }),
      { numRuns: 200 }
    );
  });

  it("every registered template is globally visually distinct (unique palette + key motif)", () => {
    // The library now supports multiple STYLES per ceremony type (e.g.
    // sangeet-grand + sangeet-neon), so ceremony types may repeat. The real
    // quality invariant is that every template is visually distinct: a unique
    // id, a unique dominant palette, and a unique key motif across the whole
    // library — so no two templates ever look the same (Req 4.6).
    const ids = TEMPLATE_IDS;
    expect(new Set(ids).size).toBe(ids.length);

    const palettes = ids.map((id) =>
      JSON.stringify(getTemplateMetadata(id).visualIdentity.dominantPalette)
    );
    expect(new Set(palettes).size).toBe(palettes.length);

    const motifs = ids.map((id) => getTemplateMetadata(id).visualIdentity.keyMotif);
    expect(new Set(motifs).size).toBe(motifs.length);
  });
});
