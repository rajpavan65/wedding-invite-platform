/**
 * src/remotion/utils/luxuryFonts.smoke.test.ts
 *
 * Feature: invite-product-quality
 *
 * Smoke test: the luxury font family configured for each registered template's
 * text slots is loadable via the luxury font registry (Req 5.1). For every
 * template we resolve the configured `fontFamily`, load it, and `await
 * waitUntilDone()` so the "fonts loaded before measuring" precondition holds.
 *
 * **Validates: Requirements 5.1**
 */

import { describe, it, expect } from "vitest";
import { getAllTemplateMetadata } from "../../lib/template-metadata";
import {
  getLuxuryFontLoader,
  loadLuxuryFont,
  isLuxuryFontFamily,
  LUXURY_FONT_FAMILIES,
} from "./luxuryFonts";

const templates = Object.entries(getAllTemplateMetadata());

describe("luxury font loading per template (Req 5.1)", () => {
  it("registers at least the core luxury families", () => {
    expect(LUXURY_FONT_FAMILIES).toContain("Playfair Display");
    expect(LUXURY_FONT_FAMILIES.length).toBeGreaterThanOrEqual(1);
  });

  it.each(templates)(
    "%s: configured text-slot font families are registered luxury fonts",
    (_templateId, meta) => {
      const families = [
        meta.textSlots.primaryName.fontFamily,
        meta.textSlots.secondaryName.fontFamily,
      ];
      for (const family of families) {
        expect(isLuxuryFontFamily(family)).toBe(true);
        const loader = getLuxuryFontLoader(family);
        expect(loader).toBeDefined();
        // The registry wires this family name to a real loader of the same name.
        expect(loader?.fontFamily).toBe(family);
      }
    },
  );

  it.each(templates)(
    "%s: each configured luxury font loads to completion",
    async (_templateId, meta) => {
      const families = Array.from(
        new Set([
          meta.textSlots.primaryName.fontFamily,
          meta.textSlots.secondaryName.fontFamily,
        ]),
      );
      for (const family of families) {
        const handle = loadLuxuryFont(family);
        expect(handle.fontFamily).toBe(family);
        // Resolves once all weights/subsets are ready (no-op without a browser).
        await expect(handle.waitUntilDone()).resolves.not.toThrow();
      }
    },
  );
});
