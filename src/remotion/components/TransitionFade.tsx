import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface TransitionFadeProps {
  durationInFrames?: number;
  color?: string;
}

/**
 * A smooth crossfade transition.
 * Place this as a <Series.Sequence> between scene sequences.
 * It renders a solid color overlay that fades in and then out.
 */
export const TransitionFade: React.FC<TransitionFadeProps> = ({
  durationInFrames = 20,
  color = "#050200", // Default to dark cinematic fade
}) => {
  const frame = useCurrentFrame();

  // Opacity goes 0 -> 1 -> 0
  const opacity = interpolate(
    frame,
    [0, durationInFrames / 2, durationInFrames],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.ease),
    }
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundColor: color,
        opacity,
        zIndex: 100,
        pointerEvents: "none",
      }}
    />
  );
};
