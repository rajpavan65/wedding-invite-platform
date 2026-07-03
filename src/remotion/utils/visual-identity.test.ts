// src/remotion/utils/visual-identity.test.ts
//
// Feature: invite-product-quality
// The four compositions (HaldiFloral / MehandiTraditional / SangeetGrand /
// RoyalRajasthani) drive their palette and key motif from
// `resolveVisualIdentity`. This test verifies that two templates of different
// ceremony types resolve to a different applied palette AND key motif — the
// data that the compositions then apply (Req 4.6).
//
// Lightweight by design: no dev server, no full Remotion render. We assert on
// the resolved visual-identity values the compositions consume.
//
// Validates: Requirements 4.6 (applied palette + motif differ between ceremonies)

import { describe, expect, it } from "vitest";
import { resolveVisualIdentity, withAlpha } from "./visual-identity";
import type { TemplateId } from "../../lib/types";

const TEMPLATES: TemplateId[] = [
  "haldi-floral",
  "mehandi-traditional",
  "sangeet-grand",
  "royal-rajasthani",
  "reception-luxury",
  "baraat-royal",
  "sangeet-neon",
  "haldi-modern",
  "mehandi-pastel",
  "wedding-divine",
  "reception-garden",
];

describe("resolveVisualIdentity — applied palette/motif per composition", () => {
  it("maps the metadata palette onto the applied accent fields", () => {
    const haldi = resolveVisualIdentity("haldi-floral");
    expect(haldi.primary).toBe(haldi.palette[0]);
    expect(haldi.secondary).toBe(haldi.palette[1]);
    expect(haldi.accent).toBe(haldi.palette[2] ?? haldi.palette[1]);
    expect(haldi.highlight).toBe(haldi.palette[3] ?? haldi.palette[0]);
    expect(haldi.keyMotif.length).toBeGreaterThan(0);
  });

  it("two different-ceremony templates apply a different palette AND key motif", () => {
    // Check every distinct pair so each composition's applied identity is
    // verified against every other (haldi/mehandi/sangeet/wedding).
    for (let i = 0; i < TEMPLATES.length; i++) {
      for (let j = i + 1; j < TEMPLATES.length; j++) {
        const a = resolveVisualIdentity(TEMPLATES[i]);
        const b = resolveVisualIdentity(TEMPLATES[j]);

        // Applied dominant palette differs.
        expect(JSON.stringify(a.palette)).not.toBe(JSON.stringify(b.palette));
        // Applied primary brand accent differs.
        expect(a.primary).not.toBe(b.primary);
        // Applied key motif differs.
        expect(a.keyMotif).not.toBe(b.keyMotif);
      }
    }
  });

  it("haldi vs mehandi: turmeric-yellow vs deep-green primary accent", () => {
    const haldi = resolveVisualIdentity("haldi-floral");
    const mehandi = resolveVisualIdentity("mehandi-traditional");

    expect(haldi.primary).toBe("#FFD23F"); // turmeric yellow
    expect(mehandi.primary).toBe("#1B5E3A"); // deep green
    expect(haldi.primary).not.toBe(mehandi.primary);
    expect(haldi.keyMotif).not.toBe(mehandi.keyMotif);
  });

  it("withAlpha converts hex palette colours to rgba at a given opacity", () => {
    expect(withAlpha("#FFD23F", 0.5)).toBe("rgba(255, 210, 63, 0.5)");
    // Clamps opacity into [0,1].
    expect(withAlpha("#000000", 2)).toBe("rgba(0, 0, 0, 1)");
    expect(withAlpha("#000000", -1)).toBe("rgba(0, 0, 0, 0)");
    // Total: non-hex input is returned unchanged.
    expect(withAlpha("transparent", 0.5)).toBe("transparent");
  });
});
