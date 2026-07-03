/**
 * src/remotion/utils/luxuryFonts.ts
 *
 * Luxury typography registry for the Text Renderer (Requirement 5.1).
 *
 * Maps the human-readable luxury font-family names configured in template
 * metadata (`textSlots.*.fontFamily`, e.g. "Playfair Display", "Cormorant
 * Garamond", "Great Vibes") to their `@remotion/google-fonts` loaders so the
 * render layer can guarantee each configured family is actually loadable
 * before text is measured/rendered.
 *
 * Each loader exposes:
 *   - `fontFamily`: the CSS family string Remotion registers the font under.
 *   - `loadFont()` → `{ fontFamily, waitUntilDone }`: kicks off loading and
 *     resolves once every weight/subset is ready (the `measuring-text` rule
 *     requires fonts to be loaded before measuring).
 *
 * A single fallback family is defined for the font-load-failure path (Req 5.9).
 */

import {
  loadFont as loadPlayfairDisplay,
  fontFamily as playfairDisplayFamily,
} from "@remotion/google-fonts/PlayfairDisplay";
import {
  loadFont as loadCormorantGaramond,
  fontFamily as cormorantGaramondFamily,
} from "@remotion/google-fonts/CormorantGaramond";
import {
  loadFont as loadGreatVibes,
  fontFamily as greatVibesFamily,
} from "@remotion/google-fonts/GreatVibes";
import {
  loadFont as loadPoppins,
  fontFamily as poppinsFamily,
} from "@remotion/google-fonts/Poppins";

/** The handle returned by a `@remotion/google-fonts` `loadFont()` call. */
export interface LoadedFontHandle {
  fontFamily: string;
  waitUntilDone: () => Promise<void>;
}

/** A luxury font loader entry. */
export interface LuxuryFontLoader {
  /** Canonical CSS family string (what `loadFont` registers). */
  readonly fontFamily: string;
  /** Begin loading the font; resolve via `waitUntilDone()`. */
  readonly load: () => LoadedFontHandle;
}

/**
 * Fallback family used when a configured luxury font fails to load (Req 5.9).
 * A widely-available serif stack so the text stays legible and on-theme.
 */
export const DEFAULT_FALLBACK_FONT_FAMILY =
  "Georgia, 'Times New Roman', 'Noto Serif', serif";

/**
 * Registry of supported luxury font families, keyed by the canonical family
 * name configured in template metadata.
 */
export const LUXURY_FONT_LOADERS: Record<string, LuxuryFontLoader> = {
  [playfairDisplayFamily]: {
    fontFamily: playfairDisplayFamily,
    load: () => loadPlayfairDisplay() as LoadedFontHandle,
  },
  [cormorantGaramondFamily]: {
    fontFamily: cormorantGaramondFamily,
    load: () => loadCormorantGaramond() as LoadedFontHandle,
  },
  [greatVibesFamily]: {
    fontFamily: greatVibesFamily,
    load: () => loadGreatVibes() as LoadedFontHandle,
  },
  // Poppins — a clean geometric sans for modern/minimal templates (e.g.
  // haldi-modern). Registered so metadata name-slot fonts resolve to a real
  // loader alongside the serif/script luxury families.
  [poppinsFamily]: {
    fontFamily: poppinsFamily,
    load: () => loadPoppins() as LoadedFontHandle,
  },
};

/** All luxury family names known to the registry. */
export const LUXURY_FONT_FAMILIES: string[] = Object.keys(LUXURY_FONT_LOADERS);

/** True when `family` is a registered luxury font family. */
export function isLuxuryFontFamily(family: string): boolean {
  return Object.prototype.hasOwnProperty.call(LUXURY_FONT_LOADERS, family);
}

/**
 * Resolve the loader for a configured luxury family. Returns `undefined` when
 * the family is not in the registry so callers can fall back (Req 5.9).
 */
export function getLuxuryFontLoader(
  family: string,
): LuxuryFontLoader | undefined {
  return LUXURY_FONT_LOADERS[family];
}

/**
 * Load a configured luxury font family and return its handle. Throws if the
 * family is unknown — callers that must not throw should first check
 * {@link isLuxuryFontFamily} or use {@link getLuxuryFontLoader}.
 */
export function loadLuxuryFont(family: string): LoadedFontHandle {
  const loader = LUXURY_FONT_LOADERS[family];
  if (!loader) {
    throw new Error(
      `[luxuryFonts] Unknown luxury font family "${family}". ` +
        `Known families: ${LUXURY_FONT_FAMILIES.join(", ")}`,
    );
  }
  return loader.load();
}
