import React from "react";
import { AbsoluteFill, Img, useCurrentFrame, interpolate } from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { GoldParticles } from "../components/GoldParticles";
import { StyleConfig } from "../../lib/types";

interface FirstMeetSceneProps {
  photo: string;
  style: StyleConfig;
}

export const FirstMeetScene: React.FC<FirstMeetSceneProps> = ({
  photo,
  style,
}) => {
  const frame = useCurrentFrame();

  // Parallax: slight horizontal drift
  const xDrift = interpolate(frame, [0, 150], [-15, 15], {
    extrapolateRight: "clamp",
  });

  // Slow zoom
  const scale = interpolate(frame, [0, 150], [1.05, 1.12], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0500" }}>
      {/* Background photo with parallax */}
      <AbsoluteFill>
        <Img
          src={photo}
          style={{
            width: "110%",
            height: "110%",
            objectFit: "cover",
            transform: `scale(${scale}) translateX(${xDrift}px)`,
            marginLeft: "-5%",
            marginTop: "-5%",
          }}
        />
      </AbsoluteFill>

      {/* Dark overlay */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(0,0,0,0.15) 0%,
            rgba(0,0,0,0.3) 50%,
            rgba(0,0,0,0.75) 80%,
            rgba(0,0,0,0.9) 100%
          )`,
        }}
      />

      {/* Soft warm glow from bottom */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 30% at 50% 95%, ${style.secondaryColor}20, transparent)`,
        }}
      />

      <GoldParticles count={20} color={style.secondaryColor} />

      {/* Text content */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 300,
        }}
      >
        <AnimatedText
          text="The First Meet ☕"
          fontSize={52}
          color={style.accentColor}
          animation="rise"
          delay={10}
          textShadow="0 4px 30px rgba(0,0,0,0.8)"
        />
        <AnimatedText
          text={`"When coffee became fate..."`}
          fontSize={22}
          fontWeight={300}
          color={`${style.textColor}BB`}
          animation="fade"
          delay={35}
          letterSpacing={1}
          style={{ marginTop: 16, fontStyle: "italic" }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
