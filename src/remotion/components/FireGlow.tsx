import React from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface FireGlowProps {
  /** 0–1 base intensity */
  intensity?: number;
  color?: string;
}

/**
 * Animated sacred fire / agni glow at the bottom of a scene.
 * Uses stacked radial gradients with Math.sin pulsing for organic flicker.
 */
export const FireGlow: React.FC<FireGlowProps> = ({
  intensity = 0.5,
  color = "#FF6B1A",
}) => {
  const frame = useCurrentFrame();

  // Multi-frequency flicker — feels like real fire
  const flicker =
    intensity * 0.6 +
    Math.sin(frame * 0.18) * 0.12 +
    Math.sin(frame * 0.31 + 1.3) * 0.08 +
    Math.sin(frame * 0.47 + 2.7) * 0.05;

  const flicker2 =
    intensity * 0.3 +
    Math.sin(frame * 0.22 + 0.5) * 0.1 +
    Math.sin(frame * 0.39 + 1.8) * 0.07;

  const emberRise = (frame * 0.8) % 100;

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {/* Main fire glow — wide base */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 85% 38% at 50% 102%, ${color}${Math.round(flicker * 255).toString(16).padStart(2, "0")}, rgba(200,80,0,${flicker2 * 0.6}) 35%, transparent 65%)`,
        }}
      />
      {/* Narrow bright core */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(ellipse 30% 18% at 50% 100%, rgba(255,220,100,${flicker * 0.5}), transparent 60%)`,
        }}
      />
      {/* Rising ember dots */}
      {[0, 1, 2, 3].map((i) => {
        const seed = i * 137.508;
        const ex = 42 + ((seed * 6.1) % 16);
        const ey = 100 - ((emberRise + seed * 23) % 60);
        const eOp = interpolate(
          (emberRise + seed * 23) % 60,
          [0, 5, 45, 58],
          [0, 0.7, 0.4, 0],
          { extrapolateRight: "clamp" }
        );
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${ex}%`,
              top: `${ey}%`,
              width: 3 + i,
              height: 3 + i,
              borderRadius: "50%",
              backgroundColor: "rgba(255,200,60,1)",
              boxShadow: "0 0 6px rgba(255,180,0,0.8)",
              opacity: eOp,
            }}
          />
        );
      })}
    </div>
  );
};
