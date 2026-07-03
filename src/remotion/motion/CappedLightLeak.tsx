/**
 * src/remotion/motion/CappedLightLeak.tsx
 *
 * Topmost light-leak overlay for every composition (Motion System, design §Components/5).
 *
 * Wraps `<LightLeak>` from `@remotion/light-leaks` (the package the design
 * mandates — Req 6.2) and enforces the ≤35% peak-opacity cap (Req 6.3).
 *
 * WHY A WRAPPER:
 * `@remotion/light-leaks`' `<LightLeak>` exposes `durationInFrames`, `seed` and
 * `hueShift` props but NO opacity control of its own. To guarantee the overlay
 * never obscures text/avatars beneath it (Req 6.3), we render it inside an
 * `AbsoluteFill` whose opacity is driven by the pure `lightLeakOpacity` helper,
 * which is always within [0, LIGHT_LEAK_MAX_OPACITY] (= 0.35). The container
 * opacity clamps the whole effect subtree, so the cap holds regardless of what
 * the WebGL effect renders internally.
 *
 * This component is intended to be mounted as the LAST child of a composition's
 * root `AbsoluteFill` so it sits on top of all content layers (Req 6.2).
 *
 * Requirements: 6.2, 6.3, 6.6, 6.7; Design §Components/5.
 */

import { LightLeak } from "@remotion/light-leaks";
import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { lightLeakOpacity } from "./timing";

export interface CappedLightLeakProps {
  /**
   * Resolved light-leak intensity ∈ [0,1]. Callers pass
   * `resolveLightLeakIntensity(meta)` so a template's declared intensity (or a
   * safe default) drives the overlay strength (Req 6.6, 6.7).
   */
  intensity: number;
  /** Pattern seed forwarded to `<LightLeak>`. Default `0`. */
  seed?: number;
  /**
   * Hue rotation in degrees forwarded to `<LightLeak>` so the leak tint can
   * match a ceremony's palette (0 ≈ yellow/orange, 120 ≈ green, 240 ≈ blue).
   * Default `0`.
   */
  hueShift?: number;
}

/**
 * Light-leak overlay capped at ≤35% peak opacity (Req 6.3). Render it as the
 * topmost layer of a composition (Req 6.2).
 */
export const CappedLightLeak: React.FC<CappedLightLeakProps> = ({
  intensity,
  seed = 0,
  hueShift = 0,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Always within [0, LIGHT_LEAK_MAX_OPACITY] — the hard cap for Req 6.3.
  const opacity = lightLeakOpacity(frame, durationInFrames, intensity);

  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        mixBlendMode: "screen",
        // Sit above every content layer (Req 6.2).
        zIndex: 9999,
        opacity,
      }}
    >
      <LightLeak
        durationInFrames={durationInFrames}
        seed={seed}
        hueShift={hueShift}
      />
    </AbsoluteFill>
  );
};
