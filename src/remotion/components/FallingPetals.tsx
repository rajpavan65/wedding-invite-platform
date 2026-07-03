import React, { useMemo } from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Petal {
  x: number;       // start X %
  size: number;    // px
  speed: number;   // fall speed multiplier
  drift: number;   // horizontal drift factor
  delay: number;   // frame delay before appearing
  rotation: number; // initial rotation degrees
  color: string;
}

interface FallingPetalsProps {
  count?: number;
  colors?: string[];
  /** "down" = fall from top, "up" = rise from bottom */
  direction?: "down" | "up";
}

/**
 * Organic falling/rising petals — deterministic, no randomness at render time.
 * Uses golden-angle seed for natural distribution.
 */
export const FallingPetals: React.FC<FallingPetalsProps> = ({
  count = 20,
  colors = ["#FF6B9D", "#FFB347", "#FF8C69", "#FFD700"],
  direction = "down",
}) => {
  const frame = useCurrentFrame();

  const petals: Petal[] = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const seed = i * 137.508; // golden angle
      return {
        x: (seed * 6.13) % 100,
        size: 10 + ((seed * 2.37) % 18),
        speed: 0.25 + ((seed * 0.43) % 0.55),
        drift: ((seed * 1.91) % 3) - 1.5,
        delay: (seed * 1.07) % 90,
        rotation: (seed * 11.3) % 360,
        color: colors[i % colors.length],
      };
    });
  }, [count, colors]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {petals.map((p, i) => {
        const adjFrame = Math.max(0, frame - p.delay);
        const travel = adjFrame * p.speed * 2;
        const loopTravel = travel % 130; // loop every ~130 units

        const yPos = direction === "down"
          ? -10 + loopTravel  // start above, fall down
          : 110 - loopTravel; // start below, rise up

        const xOffset = Math.sin(adjFrame * 0.04 * p.drift) * 30;
        const rot = p.rotation + adjFrame * p.speed * 3;

        const opacity = interpolate(
          loopTravel,
          [0, 8, 100, 125],
          [0, 0.85, 0.7, 0],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
        );

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${yPos}%`,
              transform: `translateX(${xOffset}px) rotate(${rot}deg)`,
              opacity,
              width: p.size,
              height: p.size * 0.6,
              borderRadius: "50% 0 50% 0",
              backgroundColor: p.color,
              boxShadow: `0 0 ${p.size * 0.5}px ${p.color}66`,
            }}
          />
        );
      })}
    </div>
  );
};
