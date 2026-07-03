import React, { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, random } from "remotion";

/**
 * Cinematic Bokeh Overlay.
 * Renders large, out-of-focus golden orbs that slowly drift to create depth.
 */
export const BokehOverlay: React.FC<{ count?: number; color?: string }> = ({
  count = 15,
  color = "#F0D060",
}) => {
  const frame = useCurrentFrame();

  const particles = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => {
      return {
        x: random(`x-${i}`) * 100,
        y: random(`y-${i}`) * 100,
        size: random(`size-${i}`) * 150 + 50, // 50 to 200px
        speedY: random(`speedY-${i}`) * 0.5 + 0.1,
        speedX: (random(`speedX-${i}`) - 0.5) * 0.3,
        baseOpacity: random(`op-${i}`) * 0.4 + 0.1,
      };
    });
  }, [count]);

  return (
    <AbsoluteFill style={{ pointerEvents: "none", zIndex: 60, mixBlendMode: "screen", overflow: "hidden" }}>
      {particles.map((p, i) => {
        const driftY = (frame * p.speedY) % 150; 
        const driftX = frame * p.speedX;
        
        // Gentle pulsing
        const opacity = p.baseOpacity + Math.sin(frame * 0.05 + i) * 0.1;

        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${p.x + driftX}%`,
              top: `${p.y - driftY + 50}%`, // drift upwards and wrap by starting lower
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${color} 0%, transparent 60%)`,
              opacity: Math.max(0, opacity),
              filter: "blur(15px)",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
