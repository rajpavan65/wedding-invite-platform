import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { GoldParticles } from "../components/GoldParticles";
import { StyleConfig } from "../../lib/types";
import { playfairFamily } from "../utils/fonts";

interface ProposalSceneProps {
  photo: string;
  groomName: string;
  brideName: string;
  style: StyleConfig;
}

export const ProposalScene: React.FC<ProposalSceneProps> = ({
  photo,
  groomName,
  brideName,
  style,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Dramatic slow zoom
  const scale = interpolate(frame, [0, 150], [1.0, 1.2], {
    extrapolateRight: "clamp",
  });

  // Ring emoji spring bounce
  const ringSpring = spring({
    frame: Math.max(0, frame - 25),
    fps,
    config: { damping: 8, stiffness: 100, mass: 0.4 },
  });

  // Glow pulse
  const glowIntensity = interpolate(
    Math.sin(frame * 0.08),
    [-1, 1],
    [0.3, 0.7]
  );

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0500" }}>
      {/* Background photo */}
      <AbsoluteFill>
        <Img
          src={photo}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale})`,
          }}
        />
      </AbsoluteFill>

      {/* Warm vignette */}
      <AbsoluteFill
        style={{
          background: `
            radial-gradient(ellipse 70% 70% at 50% 50%, transparent 30%, rgba(0,0,0,0.7) 100%),
            linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 70%, rgba(0,0,0,0.85) 100%)
          `,
        }}
      />

      {/* Center glow effect */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle 200px at 50% 55%, ${style.accentColor}${Math.round(glowIntensity * 25).toString(16).padStart(2, '0')}, transparent)`,
        }}
      />

      <GoldParticles count={30} direction="down" color={style.accentColor} />

      {/* Text content */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 280,
        }}
      >
        {/* Ring emoji with spring bounce */}
        <div
          style={{
            fontSize: 72,
            transform: `scale(${ringSpring})`,
            marginBottom: 16,
          }}
        >
          💍
        </div>

        <AnimatedText
          text="She Said Yes!"
          fontSize={64}
          fontFamily={playfairFamily}
          color={style.accentColor}
          animation="zoom"
          delay={15}
          textShadow={`0 0 40px ${style.accentColor}88, 0 4px 30px rgba(0,0,0,0.8)`}
        />

        <AnimatedText
          text="The moment everything changed..."
          fontSize={22}
          fontWeight={300}
          color={`${style.textColor}CC`}
          animation="fade"
          delay={45}
          letterSpacing={2}
          style={{ marginTop: 12 }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
