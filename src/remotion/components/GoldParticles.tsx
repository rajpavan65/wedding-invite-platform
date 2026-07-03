import React, { useMemo } from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  opacity: number;
  delay: number;
}

interface GoldParticlesProps {
  count?: number;
  direction?: "up" | "down";
  color?: string;
}

export const GoldParticles: React.FC<GoldParticlesProps> = ({
  count = 35,
  direction = "up",
  color = "#D4AF37",
}) => {
  const frame = useCurrentFrame();

  // Generate particles once (deterministic based on count)
  const particles: Particle[] = useMemo(() => {
    const result: Particle[] = [];
    for (let i = 0; i < count; i++) {
      const seed = i * 137.508; // golden angle for distribution
      result.push({
        x: ((seed * 7.31) % 100),
        y: ((seed * 3.17) % 100),
        size: 2 + ((seed * 1.73) % 4),
        speed: 0.3 + ((seed * 0.41) % 0.7),
        drift: ((seed * 2.19) % 2) - 1,
        opacity: 0.2 + ((seed * 0.37) % 0.5),
        delay: (seed * 1.13) % 60,
      });
    }
    return result;
  }, [count]);

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      {particles.map((p, i) => {
        const adjustedFrame = Math.max(0, frame - p.delay);
        const progress = (adjustedFrame * p.speed * 0.5) % 120;

        // Vertical movement
        const yOffset = direction === "up" ? -progress * 2 : progress * 2;

        // Horizontal drift using sin wave
        const xOffset = Math.sin(adjustedFrame * 0.03 * p.drift) * 15;

        // Fade in and out during lifecycle
        const particleOpacity = interpolate(
          progress,
          [0, 10, 90, 110],
          [0, p.opacity, p.opacity * 0.6, 0],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
        );

        // Slight size pulsing
        const sizeScale =
          1 + Math.sin(adjustedFrame * 0.05 + i) * 0.15;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size * sizeScale,
              height: p.size * sizeScale,
              borderRadius: "50%",
              backgroundColor: color,
              opacity: particleOpacity,
              transform: `translate(${xOffset}px, ${yOffset}px)`,
              boxShadow: `0 0 ${p.size * 2}px ${color}`,
            }}
          />
        );
      })}
    </div>
  );
};
