import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface TransitionLightLeakProps {
  durationInFrames?: number;
}

/**
 * A film burn / light leak transition.
 * Simulates a vintage camera light leak flash.
 */
export const TransitionLightLeak: React.FC<TransitionLightLeakProps> = ({
  durationInFrames = 20,
}) => {
  const frame = useCurrentFrame();

  // Opacity of the effect peaks in the middle
  const opacity = interpolate(
    frame,
    [0, durationInFrames / 2, durationInFrames],
    [0, 1, 0],
    {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
      easing: Easing.inOut(Easing.quad),
    }
  );

  // The flash blooms outward
  const scale = interpolate(
    frame,
    [0, durationInFrames / 2, durationInFrames],
    [1, 3, 1.5],
    {
      extrapolateRight: "clamp",
    }
  );

  // Intense brightness in the middle
  const brightness = interpolate(
    frame,
    [durationInFrames * 0.4, durationInFrames * 0.5, durationInFrames * 0.6],
    [1, 2.5, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        opacity,
        zIndex: 100,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        mixBlendMode: "screen",
        filter: `brightness(${brightness}) blur(10px)`,
      }}
    >
      <div
        style={{
          width: "150%",
          height: "150%",
          transform: `scale(${scale})`,
          background: `radial-gradient(ellipse at 70% 30%, #fff 0%, #ffcf70 20%, #f47b20 50%, transparent 80%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "100%",
          transform: `scale(${scale * 1.2}) rotate(15deg)`,
          background: `radial-gradient(ellipse at 30% 80%, #fff 0%, #ffcf70 15%, #d42222 40%, transparent 70%)`,
        }}
      />
    </div>
  );
};
