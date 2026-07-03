/**
 * src/remotion/components/BackgroundLayer.tsx
 *
 * Layer 1 of the 3-layer compositing model (PRD §5).
 *
 * Renders the pre-built template background. In Phase 1 this is a
 * Remotion 3D gradient (no Veo 3 yet). When `backgroundVideoUrl` is
 * supplied it renders a looping <Video>. Otherwise it falls back to
 * a style-matched gradient — so ALL existing compositions keep working
 * with zero changes during the transition period.
 *
 * All backgrounds are enforced at 9:16 (1080×1920) — objectFit: "cover"
 * ensures no aspect ratio distortion.
 */

import React from "react";
import {
  AbsoluteFill,
  Video,
  useVideoConfig,
  useCurrentFrame,
  Easing,
  interpolate,
} from "remotion";

interface BackgroundLayerProps {
  /** CDN URL to a pre-rendered .mp4 background (Phase 2+) */
  backgroundVideoUrl?: string;
  /** Fallback gradient colours if no video URL is provided */
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: number;
  /** Subtle Ken-Burns-style scale animation on the gradient */
  animated?: boolean;
  /** Layer opacity — useful for scene transitions (0–1) */
  opacity?: number;
}

export const BackgroundLayer: React.FC<BackgroundLayerProps> = ({
  backgroundVideoUrl,
  gradientFrom = "#1C0A00",
  gradientTo = "#0A0500",
  gradientAngle = 135,
  animated = true,
  opacity = 1,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Ken-Burns subtle zoom for gradient backgrounds (1.0 → 1.06)
  const scale = animated
    ? interpolate(frame, [0, durationInFrames], [1, 1.06], {
        extrapolateRight: "clamp",
        easing: Easing.inOut(Easing.ease),
      })
    : 1;

  if (backgroundVideoUrl) {
    return (
      <AbsoluteFill style={{ opacity }}>
        <Video
          src={backgroundVideoUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover", // 9:16 enforcement — no distortion
          }}
          loop
          muted
        />
      </AbsoluteFill>
    );
  }

  // Remotion 3D gradient fallback (Phase 1 default)
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientAngle}deg, ${gradientFrom}, ${gradientTo})`,
        transform: `scale(${scale})`,
        transformOrigin: "center center",
        opacity,
      }}
    />
  );
};
