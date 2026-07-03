/**
 * src/remotion/components/PreviewWatermark.tsx
 *
 * Pre-payment preview watermark overlay (PRD §10.1).
 *
 * Renders a repeating diagonal "PREVIEW" tile plus a brand tag, as the absolute
 * topmost layer (above the capped light leak), ONLY when the render is a
 * watermarked preview. The flag is read from the render's input props via
 * `getInputProps().previewWatermark`, so every composition can mount
 * `<PreviewWatermark />` unconditionally and it self-gates:
 *   - watermarked preview render (renderMedia inputProps.previewWatermark=true)
 *     → overlay shows.
 *   - final delivered render / Studio / Player (flag absent or false)
 *     → renders nothing.
 *
 * The final, paid video therefore NEVER carries the watermark — it is a
 * preview-only artifact and is intentionally not part of the Motion-System
 * layer descriptor (`motionLayers.ts`), so the "light leak topmost" structural
 * invariant for the delivered video is unaffected.
 */

import React from "react";
import { AbsoluteFill, getInputProps } from "remotion";

export interface PreviewWatermarkProps {
  /**
   * Explicit override. When omitted, the flag is read from the render input
   * props (`previewWatermark`). Passing `enabled` is mainly for the in-app
   * @remotion/player preview and for unit tests.
   */
  enabled?: boolean;
  /** Repeating label text. Defaults to "PREVIEW". */
  label?: string;
  /** Brand tag shown bottom-centre. Defaults to "digitalinvites.ai". */
  brand?: string;
}

/** Read the preview flag from render input props without ever throwing. */
function readPreviewFlag(): boolean {
  try {
    const input = getInputProps() as Record<string, unknown>;
    return input?.previewWatermark === true;
  } catch {
    return false;
  }
}

export const PreviewWatermark: React.FC<PreviewWatermarkProps> = ({
  enabled,
  label = "PREVIEW",
  brand = "digitalinvites.ai",
}) => {
  const show = enabled ?? readPreviewFlag();
  if (!show) return null;

  // A single diagonal tile, repeated across the frame via repeating gradients
  // is awkward for text — instead we lay out a grid of rotated labels.
  const cols = 4;
  const rows = 9;
  const cells = Array.from({ length: cols * rows });

  return (
    <AbsoluteFill
      style={{
        // Sit above the capped light leak (zIndex 9999) so the watermark is
        // always visible on the preview.
        zIndex: 10000,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {/* Tiled diagonal labels */}
      <div
        style={{
          position: "absolute",
          inset: "-10%",
          display: "grid",
          gridTemplateColumns: `repeat(${cols}, 1fr)`,
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          transform: "rotate(-30deg)",
        }}
      >
        {cells.map((_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Arial, Helvetica, sans-serif",
              fontWeight: 800,
              fontSize: 40,
              letterSpacing: 6,
              color: "rgba(255,255,255,0.10)",
              textTransform: "uppercase",
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Brand tag */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 60 }}>
        <div
          style={{
            background: "rgba(0,0,0,0.45)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: 40,
            padding: "8px 22px",
            fontFamily: "Arial, Helvetica, sans-serif",
            fontWeight: 700,
            fontSize: 22,
            letterSpacing: 2,
            color: "rgba(255,255,255,0.8)",
          }}
        >
          {brand} · preview
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
