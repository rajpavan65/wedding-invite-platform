import React from "react";
import {
  AbsoluteFill,
  Img,
  useCurrentFrame,
  interpolate,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { GoldParticles } from "../components/GoldParticles";
import { LensFlare } from "../components/LensFlare";
import { BokehOverlay } from "../components/BokehOverlay";
import { StyleConfig } from "../../lib/types";
import { playfairFamily, poppinsFamily } from "../utils/fonts";

interface WeddingSceneProps {
  photo: string;
  groomName: string;
  brideName: string;
  weddingDate: string;
  venue: string;
  style: StyleConfig;
}

export const WeddingScene: React.FC<WeddingSceneProps> = ({
  photo,
  groomName,
  brideName,
  weddingDate,
  venue,
  style,
}) => {
  const frame = useCurrentFrame();

  // Majestic zoom out: 1.15 → 1.0
  const scale = interpolate(frame, [0, 210], [1.15, 1.0], {
    extrapolateRight: "clamp",
  });

  // Decorative line width animation
  const lineWidth = interpolate(frame, [50, 90], [0, 200], {
    extrapolateRight: "clamp",
    extrapolateLeft: "clamp",
  });

  // Gold border frame fade in
  const borderOpacity = interpolate(frame, [0, 30], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0500" }}>
      {/* Background photo with zoom out */}
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

      {/* Grand dark overlay */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(0,0,0,0.3) 0%,
            rgba(0,0,0,0.15) 30%,
            rgba(0,0,0,0.4) 60%,
            rgba(0,0,0,0.85) 85%,
            rgba(0,0,0,0.95) 100%
          )`,
        }}
      />

      {/* Warm gold glow from bottom */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 100% 40% at 50% 100%, ${style.secondaryColor}15, transparent)`,
        }}
      />

      {/* Gold confetti particles falling from top */}
      <GoldParticles count={40} direction="down" color={style.accentColor} />
      <BokehOverlay count={20} color={style.secondaryColor} />
      <LensFlare color={style.accentColor} />

      {/* Decorative gold border frame */}
      <AbsoluteFill
        style={{
          opacity: borderOpacity,
          border: `2px solid ${style.secondaryColor}40`,
          margin: 40,
          borderRadius: 20,
        }}
      />

      {/* Main text content */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 220,
        }}
      >
        {/* Save The Date heading */}
        <AnimatedText
          text="Save The Date"
          fontSize={32}
          fontWeight={600}
          color={style.textColor}
          animation="typewriter"
          delay={5}
          letterSpacing={8}
          style={{ textTransform: "uppercase", marginBottom: 24 }}
        />

        {/* Decorative line */}
        <div
          style={{
            width: lineWidth,
            height: 1.5,
            backgroundColor: style.secondaryColor,
            marginBottom: 28,
            opacity: 0.6,
          }}
        />

        {/* Groom name */}
        <AnimatedText
          text={groomName}
          fontSize={68}
          fontFamily={playfairFamily}
          color={style.accentColor}
          animation="blurFade"
          delay={20}
          textShadow={`0 0 50px ${style.accentColor}44, 0 4px 30px rgba(0,0,0,0.8)`}
        />

        {/* Weds */}
        <AnimatedText
          text="weds"
          fontSize={28}
          fontWeight={300}
          fontFamily={poppinsFamily}
          color={`${style.textColor}AA`}
          animation="fade"
          delay={35}
          letterSpacing={6}
          style={{ margin: "4px 0" }}
        />

        {/* Bride name */}
        <AnimatedText
          text={brideName}
          fontSize={68}
          fontFamily={playfairFamily}
          color={style.accentColor}
          animation="blurFade"
          delay={30}
          textShadow={`0 0 50px ${style.accentColor}44, 0 4px 30px rgba(0,0,0,0.8)`}
        />

        {/* Decorative line */}
        <div
          style={{
            width: lineWidth * 0.6,
            height: 1,
            backgroundColor: style.secondaryColor,
            margin: "20px 0",
            opacity: 0.4,
          }}
        />

        {/* Date */}
        <AnimatedText
          text={weddingDate}
          fontSize={28}
          fontWeight={500}
          fontFamily={poppinsFamily}
          color={style.textColor}
          animation="rise"
          delay={55}
          letterSpacing={3}
        />

        {/* Venue */}
        <AnimatedText
          text={`📍 ${venue}`}
          fontSize={20}
          fontWeight={400}
          fontFamily={poppinsFamily}
          color={`${style.textColor}99`}
          animation="fade"
          delay={70}
          style={{ marginTop: 8 }}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
