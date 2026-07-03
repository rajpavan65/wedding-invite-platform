import React from "react";
import { useCurrentFrame, interpolate, Easing } from "remotion";

interface TransitionWipeProps {
  durationInFrames?: number;
  color?: string;
}

/**
 * Golden curtain wipe transition.
 * Place this as a <Series.Sequence> between scene sequences.
 * It renders a gold rectangle that slides across the screen.
 */
export const TransitionWipe: React.FC<TransitionWipeProps> = ({
  durationInFrames = 15,
  color = "#D4AF37",
}) => {
  const frame = useCurrentFrame();

  // The wipe slides from left to right
  const progress = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Width expands then contracts (door-opening effect)
  const wipeWidth = interpolate(
    progress,
    [0, 0.3, 0.7, 1],
    [0, 100, 100, 0],
    { extrapolateRight: "clamp" }
  );

  const wipeX = interpolate(progress, [0, 1], [-10, 110], {
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        zIndex: 100,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: `${wipeX - wipeWidth / 2}%`,
          top: 0,
          width: `${wipeWidth}%`,
          height: "100%",
          background: `linear-gradient(90deg, transparent, ${color}88, ${color}, ${color}88, transparent)`,
        }}
      />
    </div>
  );
};
