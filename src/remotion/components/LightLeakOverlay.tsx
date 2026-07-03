/**
 * src/remotion/components/LightLeakOverlay.tsx
 *
 * Persistent ambient light leak — the #1 visual upgrade for a premium cinematic feel.
 *
 * Unlike TransitionLightLeak (a flash), this component stays on screen for the
 * full video duration, slowly drifting warm gold/amber light across the frame.
 *
 * Usage: add as the TOPMOST AbsoluteFill in every composition, after all content layers.
 */

import React from "react";
import { useCurrentFrame, useVideoConfig, interpolate } from "remotion";

interface LightLeakOverlayProps {
  /** 0–1 intensity multiplier. Default 0.18 — subtle luxury. */
  intensity?: number;
  /** Tint colour (CSS colour string). Default warm gold. */
  color?: string;
}

export const LightLeakOverlay: React.FC<LightLeakOverlayProps> = ({
  intensity = 0.18,
  color = "#FFD580",
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Slow diagonal drift: starts top-left, drifts to bottom-right over full video
  const driftProgress = frame / Math.max(durationInFrames, 1);

  // Horizontal position: 20% → 80% across the video
  const x = interpolate(driftProgress, [0, 1], [20, 80]);
  // Vertical position: 15% → 75%
  const y = interpolate(driftProgress, [0, 1], [15, 75]);

  // Gentle pulse — sine wave gives it a "breathing" feel
  const pulse = 0.85 + 0.15 * Math.sin(frame * 0.04);
  const opacity = intensity * pulse;

  // Secondary cooler streak going the opposite direction
  const x2 = interpolate(driftProgress, [0, 1], [85, 20]);
  const y2 = interpolate(driftProgress, [0, 1], [80, 25]);
  const opacity2 = intensity * 0.5 * (0.7 + 0.3 * Math.sin(frame * 0.06 + 1.5));

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 50,
        mixBlendMode: "screen",
        overflow: "hidden",
      }}
    >
      {/* Primary warm gold leak — drifts top-left to bottom-right */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity,
          background: `radial-gradient(ellipse 55% 35% at ${x}% ${y}%, ${color}CC 0%, ${color}66 35%, transparent 75%)`,
        }}
      />

      {/* Secondary amber streak — drifts opposite direction */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: opacity2,
          background: `radial-gradient(ellipse 40% 25% at ${x2}% ${y2}%, #FFA94D88 0%, #FF8C4244 40%, transparent 70%)`,
        }}
      />

      {/* Static top-corner highlight — very subtle, gives a lens flare origin feel */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          opacity: intensity * 0.3,
          background: `radial-gradient(ellipse 30% 20% at 92% 4%, #FFFFFF55 0%, ${color}22 40%, transparent 70%)`,
        }}
      />
    </div>
  );
};
