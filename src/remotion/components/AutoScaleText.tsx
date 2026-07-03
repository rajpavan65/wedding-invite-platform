/**
 * src/remotion/components/AutoScaleText.tsx
 *
 * Luxury Text Renderer (Requirement 5, Design §Components/4).
 *
 * Replaces the previous character-width *estimator* with TRUE text measurement
 * via `fitText` (`@remotion/layout-utils`), so names never overflow or clip:
 *   - measure at the base size, decrement ≤1px until it fits or hits the 55%
 *     legibility floor, then wrap onto additional lines (Req 5.2–5.6);
 *   - position at the template `textSlots` coordinates when provided, clamped
 *     into the Safe_Zone so no character is clipped (Req 5.7, 5.8);
 *   - fall back to a defined font family on font-load failure, recording the
 *     failure (Req 5.9).
 *
 * Backward compatible: every existing prop is preserved and the new
 * positioning props are optional, so current composition usages
 * (`<AutoScaleText text=... fontSize=... maxWidth=... fontFamily=... />`)
 * render exactly as before — now driven by true measurement.
 */

import React, { useMemo } from "react";
import { measureText } from "@remotion/layout-utils";
import { AnimatedText } from "./AnimatedText";
import { fitText, type TextFitResult } from "../layout/textfit";
import {
  resolveFontFamily,
  resolveTextSlotBox,
  textBlockHeight,
} from "./autoScaleTextLayout";
import { REF_CANVAS } from "../layout/geometry";

type AnimationType = "fade" | "rise" | "zoom" | "spring" | "blurFade" | "typewriter";

interface AutoScaleTextProps {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  animation?: AnimationType;
  delay?: number;
  textShadow?: string;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: React.CSSProperties["textAlign"];
  style?: React.CSSProperties;
  /** Maximum pixel width the text may occupy (from textSlot.maxWidth). */
  maxWidth: number;
  /** Optional template textSlot center-x (reference canvas) — Req 5.7. */
  slotX?: number;
  /** Optional template textSlot center-y (reference canvas) — Req 5.7. */
  slotY?: number;
  /** Actual canvas size for slot scaling / safe-zone clamping. Defaults to 1080×1920. */
  canvasWidth?: number;
  canvasHeight?: number;
  /** Fallback family used when the requested luxury font fails to load (Req 5.9). */
  fallbackFontFamily?: string;
}

/**
 * Browser-only probe: returns whether `family` is actually loaded by taking a
 * true measurement with `validateFontIsLoaded`. Outside a browser (or when the
 * font is missing) `measureText` throws, which we treat as "not loaded" so the
 * fallback path engages (Req 5.9).
 */
function isBrowserFontLoaded(family: string): boolean {
  try {
    measureText({
      text: "Loadcheck",
      fontFamily: family,
      fontSize: 40,
      validateFontIsLoaded: true,
    });
    return true;
  } catch {
    return false;
  }
}

/** Minimum scale factor — never shrink below 55% of base font size (Req 5.4). */
const MIN_SCALE = 0.55;

export const AutoScaleText: React.FC<AutoScaleTextProps> = ({
  text,
  fontSize = 84,
  maxWidth,
  fontFamily,
  fontWeight,
  letterSpacing = 0,
  lineHeight = 1.3,
  slotX,
  slotY,
  canvasWidth = REF_CANVAS.width,
  canvasHeight = REF_CANVAS.height,
  fallbackFontFamily,
  ...restProps
}) => {
  // 1. Resolve the font family, falling back + recording on load failure (Req 5.9).
  const resolvedFamily = useMemo(() => {
    if (!fontFamily) return undefined;
    return resolveFontFamily({
      requestedFamily: fontFamily,
      isFontLoaded: isBrowserFontLoaded,
      fallbackFamily: fallbackFontFamily,
    }).family;
  }, [fontFamily, fallbackFontFamily]);

  // 2. Fit the text using TRUE measurement (Req 5.2–5.6). Guard against
  //    environments where measurement is unavailable so render never crashes.
  const fit: TextFitResult = useMemo(() => {
    if (!text || !maxWidth || maxWidth <= 0) {
      return { fontSize, lines: [text], wrapped: false };
    }
    try {
      return fitText({
        text,
        baseFontSize: fontSize,
        maxWidth,
        fontFamily: resolvedFamily ?? "serif",
        fontWeight,
        letterSpacing,
        minScale: MIN_SCALE,
      });
    } catch {
      // Measurement unavailable (e.g. no browser) — render unscaled rather
      // than throwing; the safe-zone clamp below still bounds the block.
      return { fontSize, lines: [text], wrapped: false };
    }
  }, [text, fontSize, maxWidth, resolvedFamily, fontWeight, letterSpacing]);

  const content = (
    <AnimatedText
      text={fit.lines.join("\n")}
      fontSize={fit.fontSize}
      fontFamily={resolvedFamily}
      fontWeight={fontWeight}
      letterSpacing={letterSpacing}
      lineHeight={lineHeight}
      {...restProps}
    />
  );

  // 3. Position at the template textSlot coordinates, clamped to the Safe_Zone
  //    (Req 5.7, 5.8) — only when explicit slot coordinates are supplied so
  //    existing inline usages are unaffected.
  if (slotX !== undefined && slotY !== undefined) {
    const box = resolveTextSlotBox(
      { x: slotX, y: slotY, maxWidth },
      textBlockHeight(fit.fontSize, fit.lines.length, lineHeight),
      { width: canvasWidth, height: canvasHeight },
    );
    return (
      <div
        style={{
          position: "absolute",
          left: box.left,
          top: box.top,
          width: box.width,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        {content}
      </div>
    );
  }

  return content;
};
