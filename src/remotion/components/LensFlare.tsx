import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Easing } from "remotion";

/**
 * Cinematic Anamorphic Lens Flare component.
 * Pans across the screen slowly, emitting horizontal light streaks.
 */
export const LensFlare: React.FC<{ color?: string }> = ({ color = "#D4AF37" }) => {
  const frame = useCurrentFrame();

  // Flare slowly moves from left to right
  const panX = interpolate(frame, [0, 300], [-30, 130], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });
  
  // Slight bobbing on the Y axis
  const panY = interpolate(frame, [0, 150, 300], [20, 25, 18], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Pulse intensity
  const intensity = interpolate(frame, [0, 40, 80, 120, 160], [0.4, 0.8, 0.5, 0.9, 0.5], {
    extrapolateRight: "clamp",
    easing: Easing.ease,
  });

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 50, mixBlendMode: "screen" }}>
      {/* The main bright core */}
      <div
        style={{
          position: "absolute",
          top: `${panY}%`,
          left: `${panX}%`,
          width: 80,
          height: 80,
          borderRadius: "50%",
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(circle, #fff 0%, ${color} 20%, transparent 70%)`,
          opacity: intensity,
          filter: "blur(4px)",
        }}
      />
      {/* The horizontal anamorphic streak */}
      <div
        style={{
          position: "absolute",
          top: `${panY}%`,
          left: `${panX}%`,
          width: "200%",
          height: 8,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(ellipse at center, #fff 0%, ${color} 30%, transparent 80%)`,
          opacity: intensity * 0.7,
          filter: "blur(2px)",
        }}
      />
      {/* A secondary wider, fainter streak */}
      <div
        style={{
          position: "absolute",
          top: `${panY}%`,
          left: `${panX}%`,
          width: "150%",
          height: 30,
          transform: "translate(-50%, -50%)",
          background: `radial-gradient(ellipse at center, ${color} 0%, transparent 70%)`,
          opacity: intensity * 0.3,
          filter: "blur(8px)",
        }}
      />
    </AbsoluteFill>
  );
};
