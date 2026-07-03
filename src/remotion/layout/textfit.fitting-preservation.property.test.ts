/**
 * src/remotion/layout/textfit.fitting-preservation.property.test.ts
 *
 * Feature: invite-product-quality, Property 16: Text fitting and preservation
 *
 * For any text string and slot `maxWidth`, the fitting result has a font size
 * in the range [55% of base, base]; every output line's measured width is at
 * or below `maxWidth`; and the concatenation of the output lines preserves the
 * full input text without truncation.
 *
 * **Validates: Requirements 5.2, 5.3, 5.4, 5.5, 5.6**
 *
 * ── Injectable measurement (why this test is deterministic) ──────────────────
 * `@remotion/layout-utils` `measureText` performs *true* DOM text measurement
 * and throws outside a browser ("measureText() can only be called in a
 * browser."). Under Vitest/Node there is no DOM, so we cannot exercise the real
 * measurer here. `textfit.ts` is therefore written with an INJECTABLE measure
 * seam (`fitTextWith(input, measure)`); production `fitText` injects the real
 * `@remotion/layout-utils` measurer, while this property test injects a
 * deterministic, strictly monotonic measure function. That lets Property 16 be
 * verified across hundreds of inputs without a browser, while the production
 * path still uses true measurement.
 *
 * Per the `measuring-text` rule we still `await waitUntilDone()` for the
 * configured luxury fonts in `beforeAll` so the "fonts loaded before measuring"
 * precondition is honoured for the production measurement path.
 */

import { describe, it, expect, beforeAll } from "vitest";
import fc from "fast-check";
import { fitTextWith, type MeasureFn } from "./textfit";
import { LUXURY_FONT_LOADERS } from "../utils/luxuryFonts";

const EPSILON = 1e-6;

// Honour the "fonts must be loaded before measuring" precondition (Req 5.x /
// measuring-text rule). Best-effort: in Node this resolves without a real DOM.
beforeAll(async () => {
  await Promise.all(
    Object.values(LUXURY_FONT_LOADERS).map(async (loader) => {
      try {
        await loader.load().waitUntilDone();
      } catch {
        // Font fetching is a no-op without a browser; ignore so the
        // deterministic injected-measure property below can still run.
      }
    }),
  );
});

/**
 * A strictly monotonic, deterministic measure: width grows linearly with both
 * font size and the number of non-space glyphs. This models a real measurer
 * closely enough to exercise the shrink → floor → wrap pipeline while keeping
 * the per-line width invariant decidable.
 *
 * `PER_CHAR` is small enough that a single glyph at the 55% floor always fits
 * within the generated `maxWidth` bounds (see generator constraints below), so
 * the per-line invariant is well-defined even for pathological inputs.
 */
const PER_CHAR = 0.45;
const measure: MeasureFn = (text, fontSize) => {
  const glyphs = text.replace(/\s/g, "").length;
  return glyphs * fontSize * PER_CHAR;
};

/** Strip all whitespace — used to assert full-text preservation. */
const stripWs = (s: string) => s.replace(/\s+/g, "");

// Words of letters/digits; multiple words let the wrapper split on spaces.
const wordArb = fc
  .stringMatching(/^[A-Za-z0-9]{1,12}$/)
  .filter((w) => w.length > 0);

const textArb = fc
  .array(wordArb, { minLength: 1, maxLength: 8 })
  .map((words) => words.join(" "));

// Base font size in a realistic luxury range.
const baseFontArb = fc.double({ min: 40, max: 120, noNaN: true });

// maxWidth at least the base font size: since a single glyph at the 55% floor
// measures 0.55*base*PER_CHAR ≈ 0.25*base < base ≤ maxWidth, every single
// character always fits, so the per-line ≤ maxWidth invariant is decidable.
const maxWidthArb = fc.double({ min: 120, max: 2000, noNaN: true });

describe("Property 16: Text fitting and preservation", () => {
  it("font size stays within [55% base, base]", () => {
    fc.assert(
      fc.property(textArb, baseFontArb, maxWidthArb, (text, base, maxWidth) => {
        const result = fitTextWith(
          { text, baseFontSize: base, maxWidth, minScale: 0.55, stepPx: 1 },
          measure,
        );
        expect(result.fontSize).toBeLessThanOrEqual(base + EPSILON);
        expect(result.fontSize).toBeGreaterThanOrEqual(0.55 * base - EPSILON);
      }),
      { numRuns: 300 },
    );
  });

  it("every output line measures at or below maxWidth", () => {
    fc.assert(
      fc.property(textArb, baseFontArb, maxWidthArb, (text, base, maxWidth) => {
        const result = fitTextWith(
          { text, baseFontSize: base, maxWidth, minScale: 0.55, stepPx: 1 },
          measure,
        );
        for (const line of result.lines) {
          expect(measure(line, result.fontSize)).toBeLessThanOrEqual(
            maxWidth + EPSILON,
          );
        }
      }),
      { numRuns: 300 },
    );
  });

  it("concatenation of output lines preserves the full input text", () => {
    fc.assert(
      fc.property(textArb, baseFontArb, maxWidthArb, (text, base, maxWidth) => {
        const result = fitTextWith(
          { text, baseFontSize: base, maxWidth, minScale: 0.55, stepPx: 1 },
          measure,
        );
        // No glyph is lost or truncated across the produced lines.
        expect(stripWs(result.lines.join(""))).toBe(stripWs(text));
        // `wrapped` is consistent with line count.
        expect(result.wrapped).toBe(result.lines.length > 1);
      }),
      { numRuns: 300 },
    );
  });
});
