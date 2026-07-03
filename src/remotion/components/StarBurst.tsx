import React, { useMemo } from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Spark {
  angle: number;   // degrees from center
  speed: number;
  size: number;
  delay: number;
  color: string;
}

interface StarBurstProps {
  /** How many bursts to emit per cycle */
  sparksPerBurst?: number;
  /** Burst period in frames */
  period?: number;
  colors?: string[];
  /** Center X % */
  cx?: number;
  /** Center Y % */
  cy?: number;
}

/**
 * Radial starburst / firework sparkle effect.
 * Sparks fly outward from a center point, then fade.
 */
export const StarBurst: React.FC<StarBurstProps> = ({
  sparksPerBurst = 12,
  period = 60,
  colors = ["#F0D060", "#D4AF37", "#FFD700", "#FFF8EE"],
  cx = 50,
  cy = 50,
}) => {
  const frame = useCurrentFrame();

  const sparks: Spark[] = useMemo(() => {
    return Array.from({ length: sparksPerBurst }, (_, i) => {
      const seed = i * 137.508;
      return {
        angle: (360 / sparksPerBurst) * i + ((seed * 3.7) % 30) - 15,
        speed: 0.3 + ((seed * 0.41) % 0.5),
        size: 3 + ((seed * 1.3) % 4),
        delay: (seed * 0.7) % 20,
        color: colors[i % colors.length],
      };
    });
  }, [sparksPerBurst, colors]);

  const cycleFrame = frame % period;

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {sparks.map((s, i) => {
        const adjFrame = Math.max(0, cycleFrame - s.delay);
        const progress = adjFrame / (period - s.delay);
        const radius = progress * 220 * s.speed; // px from center

        const rad = (s.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * radius;
        const dy = Math.sin(rad) * radius;

        const opacity = interpolate(progress, [0, 0.15, 0.7, 1.0], [0, 1, 0.6, 0], {
          extrapolateRight: "clamp",
        });
        const scale = interpolate(progress, [0, 0.2, 1.0], [0.3, 1.2, 0.4], {
          extrapolateRight: "clamp",
        });

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${cx}%`,
              top: `${cy}%`,
              width: s.size,
              height: s.size,
              borderRadius: "50%",
              backgroundColor: s.color,
              boxShadow: `0 0 ${s.size * 3}px ${s.color}`,
              transform: `translate(${dx}px, ${dy}px) scale(${scale}) translate(-50%,-50%)`,
              opacity,
            }}
          />
        );
      })}
    </div>
  );
};
