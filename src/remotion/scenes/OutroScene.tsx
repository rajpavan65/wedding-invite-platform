import React from "react";
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  interpolate, spring, Easing,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { GoldParticles } from "../components/GoldParticles";
import { StarBurst } from "../components/StarBurst";
import { FallingPetals } from "../components/FallingPetals";
import { BackgroundLayer } from "../components/BackgroundLayer";
import { AvatarPair } from "../components/AvatarSlot";
import { StyleConfig } from "../../lib/types";
import { playfairFamily, poppinsFamily } from "../utils/fonts";

interface OutroSceneProps {
  groomName: string;
  brideName: string;
  weddingDate: string;
  venue: string;
  groomCity: string;
  brideCity: string;
  style: StyleConfig;
  backgroundVideoUrl?: string;
  brideAvatarUrl?: string;
  groomAvatarUrl?: string;
  /** @deprecated */
  photo?: string;
}

export const OutroScene: React.FC<OutroSceneProps> = ({
  groomName, brideName, weddingDate, venue, groomCity, brideCity, style,
  backgroundVideoUrl, brideAvatarUrl, groomAvatarUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Border fade in
  const borderOp = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  // Staggered event card springs
  const card1 = spring({ frame: Math.max(0, frame - 42), fps, config: { damping: 14, stiffness: 80 } });
  const card2 = spring({ frame: Math.max(0, frame - 58), fps, config: { damping: 14, stiffness: 80 } });
  const card3 = spring({ frame: Math.max(0, frame - 74), fps, config: { damping: 14, stiffness: 80 } });

  // Grand reveal radial burst at start
  const revealBurst = interpolate(frame, [0, 40], [1.0, 0.0], { extrapolateRight: "clamp" });

  // Gold pulsing halo
  const haloPulse = 0.14 + Math.sin(frame * 0.09) * 0.07;

  return (
    <AbsoluteFill style={{ backgroundColor: "#040100", overflow: "hidden" }}>
      {/* ── LAYER 1: Background (template video or deep cinematic gradient) ── */}
      <BackgroundLayer
        backgroundVideoUrl={backgroundVideoUrl}
        gradientFrom="#140800"
        gradientTo="#040100"
        gradientAngle={135}
        animated={false}
      />

      {/* ── LAYER 2: Client avatar (celebratory pose) ── */}
      <AvatarPair
        brideAvatarUrl={brideAvatarUrl}
        groomAvatarUrl={groomAvatarUrl}
        brideSlot={{ x: 140, y: 1050, width: 340, height: 420 }}
        groomSlot={{ x: 600, y: 1050, width: 340, height: 420 }}
        enterFrame={25}
      />

      {/* ── LAYER 2: Deep dark vignette ── */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(0,0,0,0.42) 0%,
            rgba(8,4,0,0.62) 38%,
            rgba(0,0,0,0.88) 72%,
            rgba(0,0,0,0.98) 100%
          )`,
        }}
      />

      {/* ── LAYER 3: Gold radial glow from bottom ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 85% 32% at 50% 102%, ${style.secondaryColor}22, transparent 65%)`,
        }}
      />

      {/* ── LAYER 4: Pulsing halo behind couple names ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 22% at 50% 38%, ${style.accentColor}${Math.round(haloPulse * 255).toString(16).padStart(2, "0")}, transparent 65%)`,
        }}
      />

      {/* ── LAYER 5: Grand reveal flash (fades out immediately) ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(240,208,96,${revealBurst * 0.35}), transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* ── LAYER 6: StarBurst fireworks ── */}
      <StarBurst sparksPerBurst={14} period={70} cx={20} cy={18} colors={[style.accentColor, style.secondaryColor, "#FFF8EE"]} />
      <StarBurst sparksPerBurst={14} period={85} cx={80} cy={15} colors={[style.secondaryColor, "#FF80CC", style.accentColor]} />
      <StarBurst sparksPerBurst={10} period={100} cx={50} cy={25} colors={[style.accentColor, "#FFF8EE", style.secondaryColor]} />

      {/* ── LAYER 7: Rose petals falling ── */}
      <FallingPetals count={18} direction="down" colors={["#FF4D6D", "#FFB347", "#FF80CC", "#FFD700"]} />

      {/* ── LAYER 8: Gold particles rising ── */}
      <GoldParticles count={30} color={style.accentColor} direction="up" />

      {/* ── LAYER 9: Gold border frame ── */}
      <AbsoluteFill
        style={{
          opacity: borderOp,
          border: `2px solid ${style.secondaryColor}45`,
          margin: 38, borderRadius: 12,
        }}
      />

      {/* ── LAYER 10: Decorative corner accents ── */}
      {([
        { jc: "flex-start", ai: "flex-start" },
        { jc: "flex-start", ai: "flex-end" },
        { jc: "flex-end",   ai: "flex-start" },
        { jc: "flex-end",   ai: "flex-end" },
      ] as const).map((pos, i) => (
        <AbsoluteFill key={i} style={{ justifyContent: pos.jc, alignItems: pos.ai, padding: 48, opacity: borderOp * 0.85 }}>
          <div style={{
            width: 26, height: 26,
            borderTop:    i < 2 ? `2px solid ${style.accentColor}80` : undefined,
            borderBottom: i >= 2 ? `2px solid ${style.accentColor}80` : undefined,
            borderLeft:   i % 2 === 0 ? `2px solid ${style.accentColor}80` : undefined,
            borderRight:  i % 2 === 1 ? `2px solid ${style.accentColor}80` : undefined,
          }} />
        </AbsoluteFill>
      ))}

      {/* ── LAYER 11: Main content ── */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 92 }}>
        {/* Blessing line */}
        <AnimatedText
          text="माता रानी की असीम कृपा से"
          fontSize={20}
          fontFamily={poppinsFamily}
          fontWeight={400}
          color={`${style.textColor}75`}
          animation="fade"
          delay={5}
          letterSpacing={1}
          style={{ marginBottom: 5 }}
        />

        {/* Couple names — the hero line */}
        <AnimatedText
          text={`${groomName} & ${brideName}`}
          fontSize={66}
          fontFamily={playfairFamily}
          color={style.accentColor}
          animation="spring"
          delay={15}
          textShadow={`0 0 70px ${style.accentColor}55, 0 4px 50px rgba(0,0,0,0.95)`}
        />

        <AnimatedText
          text="request the pleasure of your company"
          fontSize={19}
          fontFamily={poppinsFamily}
          fontWeight={300}
          color={`${style.textColor}88`}
          animation="fade"
          delay={32}
          letterSpacing={2}
          style={{ marginTop: 10, marginBottom: 28 }}
        />

        {/* Event cards */}
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 11, width: "82%", alignItems: "center" }}>
          {/* Haldi card */}
          <div style={{
            opacity: card1,
            transform: `translateX(${interpolate(card1, [0, 1], [-40, 0])}px)`,
            width: "100%",
            backgroundColor: "rgba(255,215,0,0.08)",
            border: "1px solid rgba(255,215,0,0.28)",
            borderRadius: 14, padding: "13px 22px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: poppinsFamily, fontSize: 17, color: "#FFD700", fontWeight: 600 }}>🌼 Haldi Carnival</span>
            <span style={{ fontFamily: poppinsFamily, fontSize: 14, color: `${style.textColor}66` }}>Day 1</span>
          </div>

          {/* Sangeet card */}
          <div style={{
            opacity: card2,
            transform: `translateX(${interpolate(card2, [0, 1], [40, 0])}px)`,
            width: "100%",
            backgroundColor: "rgba(140,60,220,0.1)",
            border: "1px solid rgba(180,100,255,0.28)",
            borderRadius: 14, padding: "13px 22px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: poppinsFamily, fontSize: 17, color: "#C89EFF", fontWeight: 600 }}>🎶 Sangeet Night</span>
            <span style={{ fontFamily: poppinsFamily, fontSize: 14, color: `${style.textColor}66` }}>Day 2</span>
          </div>

          {/* Varmala card */}
          <div style={{
            opacity: card3,
            transform: `translateX(${interpolate(card3, [0, 1], [-40, 0])}px)`,
            width: "100%",
            backgroundColor: `${style.secondaryColor}10`,
            border: `1px solid ${style.secondaryColor}30`,
            borderRadius: 14, padding: "13px 22px",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontFamily: poppinsFamily, fontSize: 17, color: style.accentColor, fontWeight: 600 }}>🌺 Varmala & Pheras</span>
            <span style={{ fontFamily: poppinsFamily, fontSize: 14, color: `${style.textColor}66` }}>{weddingDate}</span>
          </div>
        </div>

        {/* Venue */}
        {venue && (
          <AnimatedText
            text={`📍 ${venue}`}
            fontSize={17}
            fontFamily={poppinsFamily}
            fontWeight={400}
            color={`${style.textColor}55`}
            animation="fade"
            delay={100}
            style={{ marginTop: 18 }}
          />
        )}

        {/* Cities */}
        {(groomCity || brideCity) && (
          <AnimatedText
            text={`${groomCity} × ${brideCity}`}
            fontSize={15}
            fontFamily={poppinsFamily}
            fontWeight={300}
            color={`${style.textColor}38`}
            animation="fade"
            delay={115}
            letterSpacing={5}
            style={{ marginTop: 5 }}
          />
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
