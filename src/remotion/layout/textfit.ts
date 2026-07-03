/**
 * src/remotion/layout/textfit.ts
 *
 * True text fitting for the luxury Text Renderer (Requirement 5, Design §Components/4).
 *
 * Replaces the character-width *estimator* in AutoScaleText with TRUE measurement
 * from `@remotion/layout-utils` (`measureText` / `fillTextBox`), per the
 * `measuring-text` skill rule.
 *
 * Algorithm (Req 5.2–5.6):
 *   1. Measure the text at `baseFontSize` using true measurement.
 *   2. While the measured width exceeds `maxWidth`, decrement the font size by
 *      `stepPx` (≤ 1px) and re-measure — stop when the width is ≤ `maxWidth`
 *      OR the font size reaches `minScale` (default 0.55) of the base.
 *   3. If the text still exceeds `maxWidth` at the 55% floor, wrap it onto
 *      additional lines so every line measures ≤ `maxWidth`, preserving the
 *      full text.
 *
 * IMPORTANT: `@remotion/layout-utils` measurement requires fonts to be loaded
 * before calling `fitText` (see the `measuring-text` rule). Callers should
 * `await waitUntilDone()` from the relevant `@remotion/google-fonts` loader.
 *
 * The core fitting/wrapping logic is kept pure and deterministic (driven by an
 * injected `MeasureFn`) so it can be property-tested without a real font/DOM.
 */

import { measureText } from "@remotion/layout-utils";

export interface TextFitInput {
  text: string;
  baseFontSize: number;
  maxWidth: number;
  fontFamily: string;
  fontWeight?: number;
  letterSpacing?: number;
  /** Minimum font size as a fraction of the base size. Default 0.55 (Req 5.4). */
  minScale?: number;
  /** Font-size decrement per step in px. Clamped to ≤ 1px (Req 5.3). */
  stepPx?: number;
}

export interface TextFitResult {
  /** Resolved font size, always within `[minScale * baseFontSize, baseFontSize]`. */
  fontSize: number;
  /** One or more lines, each measured ≤ `maxWidth` (Req 5.5). */
  lines: string[];
  /** True when the text was wrapped onto more than one line. */
  wrapped: boolean;
}

/** Default minimum scale — never shrink below 55% of the base size (Req 5.4). */
export const DEFAULT_MIN_SCALE = 0.55;

/** Default font-size decrement per step (Req 5.3 requires ≤ 1px). */
export const DEFAULT_STEP_PX = 1;

/**
 * A pure measurement function: given a piece of text and a font size, return
 * its rendered width in pixels. Injecting this keeps the fitting logic
 * deterministic and testable.
 */
export type MeasureFn = (text: string, fontSize: number) => number;

/**
 * Find the largest font size in `[minFontSize, baseFontSize]` (stepping down by
 * `stepPx`) whose measured width is ≤ `maxWidth`. If even `minFontSize` is too
 * wide, returns `minFontSize` (the legibility floor, Req 5.4).
 *
 * Pure — depends only on its arguments and the injected `measure`.
 */
export function resolveFontSize(
  text: string,
  baseFontSize: number,
  maxWidth: number,
  minFontSize: number,
  stepPx: number,
  measure: MeasureFn,
): number {
  const step = Math.min(Math.max(stepPx, Number.EPSILON), 1);
  let fontSize = baseFontSize;

  // Decrement until it fits or we hit the floor.
  while (measure(text, fontSize) > maxWidth && fontSize > minFontSize) {
    fontSize = Math.max(fontSize - step, minFontSize);
  }

  return fontSize;
}

/**
 * Wrap `text` onto multiple lines so each line measures ≤ `maxWidth` at
 * `fontSize`, preserving the full text. Greedy word wrapping; a single word
 * that is itself wider than `maxWidth` is split on character boundaries so the
 * per-line invariant still holds.
 *
 * Pure — depends only on its arguments and the injected `measure`.
 */
export function wrapToLines(
  text: string,
  fontSize: number,
  maxWidth: number,
  measure: MeasureFn,
): string[] {
  const words = text.split(/(\s+)/).filter((w) => w.length > 0 && !/^\s+$/.test(w));
  if (words.length === 0) {
    return [text];
  }

  const lines: string[] = [];
  let current = "";

  const pushCurrent = () => {
    if (current.length > 0) {
      lines.push(current);
      current = "";
    }
  };

  for (const word of words) {
    const candidate = current.length === 0 ? word : `${current} ${word}`;

    if (measure(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    // Candidate too wide — flush the current line first.
    pushCurrent();

    if (measure(word, fontSize) <= maxWidth) {
      current = word;
    } else {
      // The word alone is wider than maxWidth — split it by characters so
      // every emitted line still measures ≤ maxWidth.
      for (const chunk of splitWord(word, fontSize, maxWidth, measure)) {
        lines.push(chunk);
      }
      // Leave `current` empty so the next word starts a fresh line.
    }
  }

  pushCurrent();

  return lines.length > 0 ? lines : [text];
}

/**
 * Split a single over-wide word into character chunks that each measure
 * ≤ `maxWidth`. Always makes progress (at least one character per chunk) so it
 * cannot loop forever even if a single glyph exceeds `maxWidth`.
 */
function splitWord(
  word: string,
  fontSize: number,
  maxWidth: number,
  measure: MeasureFn,
): string[] {
  const chars = Array.from(word);
  const chunks: string[] = [];
  let chunk = "";

  for (const ch of chars) {
    const candidate = chunk + ch;
    if (chunk.length > 0 && measure(candidate, fontSize) > maxWidth) {
      chunks.push(chunk);
      chunk = ch;
    } else {
      chunk = candidate;
    }
  }

  if (chunk.length > 0) {
    chunks.push(chunk);
  }

  return chunks;
}

/**
 * Pure core of the fitting algorithm, driven by an injected `MeasureFn`.
 * Exposed primarily for property/unit testing without a real font/DOM.
 *
 * Guarantees:
 *   - result.fontSize ∈ [minScale * baseFontSize, baseFontSize]
 *   - every line in result.lines measures ≤ maxWidth at result.fontSize
 *     (subject to character-splitting for pathological single glyphs)
 *   - result.wrapped === (result.lines.length > 1)
 */
export function fitTextWith(
  input: Required<Pick<TextFitInput, "text" | "baseFontSize" | "maxWidth">> & {
    minScale: number;
    stepPx: number;
  },
  measure: MeasureFn,
): TextFitResult {
  const { text, baseFontSize, maxWidth } = input;
  const minScale = clampMinScale(input.minScale);
  const minFontSize = baseFontSize * minScale;

  if (!text || maxWidth <= 0) {
    return { fontSize: baseFontSize, lines: [text], wrapped: false };
  }

  const fontSize = resolveFontSize(
    text,
    baseFontSize,
    maxWidth,
    minFontSize,
    input.stepPx,
    measure,
  );

  // Fits on a single line at the resolved size.
  if (measure(text, fontSize) <= maxWidth) {
    return { fontSize, lines: [text], wrapped: false };
  }

  // Still over at the 55% floor — wrap onto additional lines (Req 5.5).
  const lines = wrapToLines(text, fontSize, maxWidth, measure);
  return { fontSize, lines, wrapped: lines.length > 1 };
}

/**
 * Fit `text` into `maxWidth` using TRUE measurement from `@remotion/layout-utils`.
 *
 * Fonts MUST be loaded before calling this (the `measuring-text` rule). The
 * `fontFamily`, `fontWeight`, and `letterSpacing` passed here must match what
 * the text is actually rendered with so measurement is accurate.
 */
export function fitText(input: TextFitInput): TextFitResult {
  const {
    text,
    baseFontSize,
    maxWidth,
    fontFamily,
    fontWeight,
    letterSpacing,
    minScale = DEFAULT_MIN_SCALE,
    stepPx = DEFAULT_STEP_PX,
  } = input;

  const measure: MeasureFn = (str, fontSize) =>
    measureText({
      text: str,
      fontFamily,
      fontSize,
      fontWeight,
      // `@remotion/layout-utils` expects a CSS string for letter-spacing.
      letterSpacing:
        letterSpacing === undefined ? undefined : `${letterSpacing}px`,
    }).width;

  return fitTextWith(
    { text, baseFontSize, maxWidth, minScale, stepPx },
    measure,
  );
}

/** Clamp the min-scale factor into a sane (0, 1] range. */
function clampMinScale(minScale: number): number {
  if (!Number.isFinite(minScale) || minScale <= 0) {
    return DEFAULT_MIN_SCALE;
  }
  return Math.min(minScale, 1);
}
