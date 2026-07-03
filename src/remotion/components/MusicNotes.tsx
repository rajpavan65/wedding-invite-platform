import React, { useMemo } from "react";
import { useCurrentFrame, interpolate } from "remotion";

interface Note {
  x: number;
  y: number;
  size: number;
  speed: number;
  delay: number;
  drift: number;
  symbol: string;
}

const SYMBOLS = ["♪", "♫", "♬", "♩", "𝄞"];

interface MusicNotesProps {
  count?: number;
  color?: string;
}

/**
 * Floating music notes drifting upward — deterministic, no Math.random().
 */
export const MusicNotes: React.FC<MusicNotesProps> = ({
  count = 14,
  color = "#C89EFF",
}) => {
  const frame = useCurrentFrame();

  const notes: Note[] = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const seed = i * 137.508;
      return {
        x: (seed * 7.13) % 90 + 5,
        y: (seed * 3.77) % 80 + 10,
        size: 22 + ((seed * 1.91) % 20),
        speed: 0.18 + ((seed * 0.29) % 0.22),
        delay: (seed * 1.13) % 80,
        drift: ((seed * 2.31) % 2) - 1,
        symbol: SYMBOLS[i % SYMBOLS.length],
      };
    });
  }, [count]);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}>
      {notes.map((n, i) => {
        const adjFrame = Math.max(0, frame - n.delay);
        const travel = (adjFrame * n.speed) % 110;
        const yPos = n.y - travel; // rise upward
        const xOffset = Math.sin(adjFrame * 0.05 * n.drift) * 20;

        const opacity = interpolate(
          travel,
          [0, 10, 80, 105],
          [0, 0.75, 0.6, 0],
          { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
        );
        const scale = 1 + Math.sin(adjFrame * 0.06 + i) * 0.08;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${n.x}%`,
              top: `${yPos}%`,
              transform: `translateX(${xOffset}px) scale(${scale})`,
              opacity,
              fontSize: n.size,
              color,
              textShadow: `0 0 12px ${color}99`,
              userSelect: "none",
            }}
          >
            {n.symbol}
          </div>
        );
      })}
    </div>
  );
};
