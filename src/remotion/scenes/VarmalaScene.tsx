import React from "react";
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  interpolate, spring,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { GoldParticles } from "../components/GoldParticles";
import { FallingPetals } from "../components/FallingPetals";
import { FireGlow } from "../components/FireGlow";
import { BackgroundLayer } from "../components/BackgroundLayer";
import { AvatarPair } from "../components/AvatarSlot";
import { StyleConfig } from "../../lib/types";
import { playfairFamily, poppinsFamily } from "../utils/fonts";

interface VarmalaSceneProps {
  groomName: string;
  brideName: string;
  weddingDate: string;
  venue: string;
  style: StyleConfig;
  backgroundVideoUrl?: string;
  brideAvatarUrl?: string;
  groomAvatarUrl?: string;
  /** @deprecated */
  photo?: string;
}

export const VarmalaScene: React.FC<VarmalaSceneProps> = ({
  groomName, brideName, weddingDate, venue, style,
  backgroundVideoUrl, brideAvatarUrl, groomAvatarUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Border + corner opacity
  const borderOp = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });

  // Garland icon spring
  const garlandSpring = spring({ frame: Math.max(0, frame - 18), fps, config: { damping: 14, stiffness: 70, mass: 0.6 } });

  // Gold line grow
  const lineW = interpolate(frame, [45, 82], [0, 220], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  // Temple amber top glow
  const amberPulse = 0.1 + Math.sin(frame * 0.07) * 0.04;

  return (
    <AbsoluteFill style={{ backgroundColor: "#050200", overflow: "hidden" }}>
      {/* ── LAYER 1: Background (template video or deep mandap gradient) ── */}
      <BackgroundLayer
        backgroundVideoUrl={backgroundVideoUrl}
        gradientFrom="#1A0800"
        gradientTo="#050200"
        gradientAngle={145}
        animated
      />

      {/* ── LAYER 2: Client avatar (standing wedding pose) ── */}
      <AvatarPair
        brideAvatarUrl={brideAvatarUrl}
        groomAvatarUrl={groomAvatarUrl}
        brideSlot={{ x: 130, y: 860, width: 360, height: 520 }}
        groomSlot={{ x: 590, y: 860, width: 360, height: 520 }}
        enterFrame={50}
      />

      {/* ── LAYER 2: Deep warm vignette ── */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(0,0,0,0.18) 0%,
            rgba(20,5,0,0.08) 28%,
            rgba(0,0,0,0.52) 60%,
            rgba(0,0,0,0.94) 100%
          )`,
        }}
      />

      {/* ── LAYER 3: Sacred fire glow from bottom ── */}
      <FireGlow intensity={0.55} color="#FF6B1A" />

      {/* ── LAYER 4: Temple amber light from top ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 48% 28% at 50% -2%, rgba(212,175,55,${amberPulse + 0.08}), transparent 65%)`,
        }}
      />

      {/* ── LAYER 5: Gold confetti falling ── */}
      <GoldParticles count={48} direction="down" color={style.accentColor} />

      {/* ── LAYER 6: Rose & marigold falling petals ── */}
      <FallingPetals
        count={28}
        direction="down"
        colors={["#FF4D6D", "#FF6B9D", "#FFB347", "#FF8C42", "#FFD700"]}
      />

      {/* ── LAYER 7: Decorative gold border frame ── */}
      <AbsoluteFill
        style={{
          opacity: borderOp,
          border: `2px solid ${style.secondaryColor}55`,
          margin: 38, borderRadius: 12,
          boxShadow: `inset 0 0 50px ${style.secondaryColor}06`,
        }}
      />

      {/* ── LAYER 8: Corner L-accents ── */}
      {([
        { jc: "flex-start", ai: "flex-start" },
        { jc: "flex-start", ai: "flex-end" },
        { jc: "flex-end",   ai: "flex-start" },
        { jc: "flex-end",   ai: "flex-end" },
      ] as const).map((pos, i) => (
        <AbsoluteFill key={i} style={{ justifyContent: pos.jc, alignItems: pos.ai, padding: 48, opacity: borderOp * 0.9 }}>
          <div style={{
            width: 32, height: 32,
            borderTop:    i < 2 ? `2px solid ${style.accentColor}88` : undefined,
            borderBottom: i >= 2 ? `2px solid ${style.accentColor}88` : undefined,
            borderLeft:   i % 2 === 0 ? `2px solid ${style.accentColor}88` : undefined,
            borderRight:  i % 2 === 1 ? `2px solid ${style.accentColor}88` : undefined,
          }} />
        </AbsoluteFill>
      ))}

      {/* ── LAYER 9: Lotus side medallions ── */}
      {[{ l: 48, top: "48%" }, { r: 48, top: "48%" }].map((pos, i) => (
        <AbsoluteFill
          key={i}
          style={{
            justifyContent: "center",
            alignItems: pos.r !== undefined ? "flex-end" : "flex-start",
            paddingLeft: pos.l ?? 0,
            paddingRight: pos.r ?? 0,
            opacity: interpolate(frame, [25, 50], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ fontSize: 28, filter: `drop-shadow(0 0 8px ${style.secondaryColor})` }}>🪷</div>
        </AbsoluteFill>
      ))}

      {/* ── LAYER 10: Text content ── */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 170 }}>
        {/* Garland icon */}
        <div style={{ fontSize: 60, transform: `scale(${garlandSpring})`, marginBottom: 14 }}>🌺</div>

        {/* Growing gold line */}
        <div style={{ width: lineW, height: 1.5, background: `linear-gradient(90deg, transparent, ${style.accentColor}80, transparent)`, marginBottom: 20, borderRadius: 2 }} />

        <AnimatedText
          text={groomName}
          fontSize={66}
          fontFamily={playfairFamily}
          color={style.accentColor}
          animation="spring"
          delay={22}
          textShadow={`0 0 70px ${style.accentColor}55, 0 4px 40px rgba(0,0,0,0.95)`}
        />
        <AnimatedText
          text="weds"
          fontSize={26}
          fontFamily={poppinsFamily}
          fontWeight={300}
          color={`${style.textColor}75`}
          animation="fade"
          delay={38}
          letterSpacing={7}
          style={{ margin: "4px 0" }}
        />
        <AnimatedText
          text={brideName}
          fontSize={66}
          fontFamily={playfairFamily}
          color={style.accentColor}
          animation="spring"
          delay={32}
          textShadow={`0 0 70px ${style.accentColor}55, 0 4px 40px rgba(0,0,0,0.95)`}
        />

        {/* Thin separator */}
        <div style={{ width: lineW * 0.5, height: 1, background: `${style.secondaryColor}44`, margin: "16px 0", borderRadius: 1 }} />

        <AnimatedText
          text={weddingDate}
          fontSize={26}
          fontFamily={poppinsFamily}
          fontWeight={500}
          color={`${style.textColor}95`}
          animation="rise"
          delay={60}
          letterSpacing={3}
        />

        {venue && (
          <AnimatedText
            text={`📍 ${venue}`}
            fontSize={18}
            fontFamily={poppinsFamily}
            fontWeight={400}
            color={`${style.textColor}55`}
            animation="fade"
            delay={82}
            style={{ marginTop: 6 }}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
