/**
 * src/remotion/components/autoScaleTextLayout.ts
 *
 * Pure render-decision helpers backing `AutoScaleText` (Requirement 5.7, 5.8,
 * 5.9). Kept free of React/DOM so the positioning, safe-zone, and font-fallback
 * behaviour can be unit/property-tested in a plain Node environment — the same
 * pattern used by `avatarSlotState.ts`.
 *
 * Requirements:
 *   - 5.7 position text at `textSlots` coordinates (not hardcoded).
 *   - 5.8 keep text within the Safe_Zone (via `clampToSafeZone`).
 *   - 5.9 fall back to a defined font family on font-load failure, recording it.
 */

import {
  scaleSlotToCanvas,
  clampToSafeZone,
  REF_CANVAS,
  type Box,
  type Size,
} from "../layout/geometry";
import { DEFAULT_FALLBACK_FONT_FAMILY } from "../utils/luxuryFonts";

// ─────────────────────────────────────────────────────────────
// Text-slot positioning (Req 5.7, 5.8)
// ─────────────────────────────────────────────────────────────

/**
 * A template text slot, authored against the 1080×1920 reference canvas. The
 * `x`/`y` are the slot's CENTER anchor (templates author centred text), and
 * `maxWidth` bounds the text block's width.
 */
export interface TextSlotPosition {
  x: number;
  y: number;
  maxWidth: number;
}

/**
 * Resolve the absolute, safe-zone-clamped box for a text block placed at a
 * template text slot.
 *
 * The slot's `x`/`y` center anchor is scaled to the actual canvas (Req 3.3
 * proportional scaling reused for text), the block is centred on that anchor,
 * then clamped so no character can be clipped by a canvas edge (Req 5.8).
 *
 * Pure and total — never throws.
 */
export function resolveTextSlotBox(
  slot: TextSlotPosition,
  blockHeight: number,
  canvas: Size = REF_CANVAS,
): Box {
  const scaled = scaleSlotToCanvas(
    { x: slot.x, y: slot.y, width: slot.maxWidth, height: blockHeight },
    canvas,
  );

  // Slot coordinates are a center anchor → derive the top-left of the block.
  const left = scaled.x - scaled.width / 2;
  const top = scaled.y - scaled.height / 2;

  return clampToSafeZone(
    { left, top, width: scaled.width, height: scaled.height },
    canvas,
  );
}

/**
 * Estimate the rendered height of a fitted text block so it can be centred and
 * safe-zone clamped. `lineHeight` is the CSS line-height multiplier.
 */
export function textBlockHeight(
  fontSize: number,
  lineCount: number,
  lineHeight: number,
): number {
  const safeFont = Number.isFinite(fontSize) && fontSize > 0 ? fontSize : 0;
  const safeLines = Number.isFinite(lineCount) && lineCount > 0 ? lineCount : 1;
  const safeLh = Number.isFinite(lineHeight) && lineHeight > 0 ? lineHeight : 1;
  return safeFont * safeLh * safeLines;
}

// ─────────────────────────────────────────────────────────────
// Font-load fallback (Req 5.9)
// ─────────────────────────────────────────────────────────────

/** A recorded font-load failure (Req 5.9). */
export interface FontLoadFailure {
  /** The luxury family that failed to load. */
  requestedFamily: string;
  /** The fallback family used in its place. */
  fallbackFamily: string;
  /** ISO timestamp the failure was recorded. */
  at: string;
}

/** Process-level record of font-load failures (Req 5.9). */
const fontLoadFailures: FontLoadFailure[] = [];

/** Record a font-load failure. */
export function recordFontLoadFailure(failure: FontLoadFailure): void {
  fontLoadFailures.push(failure);
}

/** Return a copy of all recorded font-load failures. */
export function getRecordedFontLoadFailures(): FontLoadFailure[] {
  return [...fontLoadFailures];
}

/** Clear all recorded font-load failures (test/maintenance helper). */
export function clearRecordedFontLoadFailures(): void {
  fontLoadFailures.length = 0;
}

/** Result of resolving which font family to actually render with. */
export interface ResolvedFont {
  /** The family to render and measure with. */
  family: string;
  /** True when the requested family failed to load and the fallback is used. */
  failed: boolean;
}

/**
 * Resolve the font family to render with, falling back to a defined family on
 * font-load failure and recording the failure (Req 5.9).
 *
 * Pure given its injected `isFontLoaded` probe and `record` sink, so the
 * decision is fully testable without a DOM.
 *
 * @param requestedFamily   The configured luxury family.
 * @param isFontLoaded      Probe returning whether `requestedFamily` is loaded.
 * @param fallbackFamily    Family to use on failure (defaults to the luxury fallback).
 * @param record            Sink for the failure record (defaults to the module recorder).
 */
export function resolveFontFamily(opts: {
  requestedFamily: string;
  isFontLoaded: (family: string) => boolean;
  fallbackFamily?: string;
  record?: (failure: FontLoadFailure) => void;
}): ResolvedFont {
  const {
    requestedFamily,
    isFontLoaded,
    fallbackFamily = DEFAULT_FALLBACK_FONT_FAMILY,
    record = recordFontLoadFailure,
  } = opts;

  let loaded = false;
  try {
    loaded = isFontLoaded(requestedFamily);
  } catch {
    // A throwing probe is treated as "not loaded" so we always fall back
    // safely rather than crashing the render.
    loaded = false;
  }

  if (loaded) {
    return { family: requestedFamily, failed: false };
  }

  record({
    requestedFamily,
    fallbackFamily,
    at: new Date().toISOString(),
  });
  return { family: fallbackFamily, failed: true };
}
