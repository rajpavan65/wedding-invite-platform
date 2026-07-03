import React from "react";
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  interpolate, spring, Easing,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { AutoScaleText } from "../components/AutoScaleText";
import { GoldParticles } from "../components/GoldParticles";
import { LensFlare } from "../components/LensFlare";
import { BokehOverlay } from "../components/BokehOverlay";
import { BackgroundLayer } from "../components/BackgroundLayer";
import { AvatarPair } from "../components/AvatarSlot";
import { StyleConfig } from "../../lib/types";
import { getTemplateMetadata } from "../../lib/template-metadata";
import { playfairFamily, poppinsFamily } from "../utils/fonts";

// Royal Rajasthani metadata — avatar/text slots for this composition
const META = getTemplateMetadata("royal-rajasthani");

interface IntroSceneProps {
  groomName: string;
  brideName: string;
  style: StyleConfig;
  /** Layer 1 — pre-built template background video URL (Phase 2+) */
  backgroundVideoUrl?: string;
  /** Layer 2 — client Pixar avatar URLs (Premium/Luxury tier) */
  brideAvatarUrl?: string;
  groomAvatarUrl?: string;
  /** @deprecated Layer 1 used to be a client photo — kept for migration period */
  photo?: string;
}

export const IntroScene: React.FC<IntroSceneProps> = ({
  groomName, brideName, style,
  backgroundVideoUrl,
  brideAvatarUrl,
  groomAvatarUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Cinematic letterbox bars (slide in from top/bottom)
  const barHeight = interpolate(frame, [0, 25], [80, 0], {
    extrapolateRight: "clamp",
    easing: Easing.inOut(Easing.cubic),
  });

  // Frame border fade in
  const borderOp = interpolate(frame, [10, 35], [0, 1], { extrapolateRight: "clamp" });

  // Vignette
  const vigOp = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  // Divider line grows
  const lineW = interpolate(frame, [38, 65], [0, 140], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  // Pulsing halo behind names
  const haloPulse = 0.12 + Math.sin(frame * 0.08) * 0.06;

  // Corner accent spring
  const cornerSpring = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 14, stiffness: 70 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#050200", overflow: "hidden" }}>
      {/* ── LAYER 1: Background (template video or gradient) ── */}
      <BackgroundLayer
        backgroundVideoUrl={backgroundVideoUrl}
        gradientFrom="#1C0A00"
        gradientTo="#050200"
        animated
      />
      {/* ── LAYER 2: Client avatar (Premium/Luxury tier — empty slot for Standard) ── */}
      <AvatarPair
        brideAvatarUrl={brideAvatarUrl}
        groomAvatarUrl={groomAvatarUrl}
        brideSlot={META.avatarSlots.bride}
        groomSlot={META.avatarSlots.groom}
        enterFrame={45}
      />

      {/* ── LAYER 2b: Graduated dark vignette (over both bg + avatar) ── */}
      <AbsoluteFill
        style={{
          opacity: vigOp,
          background: `
            linear-gradient(to bottom,
              rgba(0,0,0,0.15) 0%,
              rgba(0,0,0,0.08) 30%,
              rgba(0,0,0,0.55) 62%,
              rgba(5,2,0,0.9) 100%
            )`,
        }}
      />

      {/* ── LAYER 3: Atmospheric warm gold glow from bottom ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 70% 28% at 50% 102%, ${style.secondaryColor}22, transparent 65%)`,
        }}
      />

      {/* ── LAYER 4: Pulsing name halo ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 25% at 50% 75%, ${style.accentColor}${Math.round(haloPulse * 255).toString(16).padStart(2, "0")}, transparent 65%)`,
        }}
      />

      {/* ── LAYER 5: Gold particles & Cinematic Overlays ── */}
      <GoldParticles count={22} color={style.secondaryColor} direction="up" />
      <BokehOverlay count={12} color={style.secondaryColor} />
      <LensFlare color={style.accentColor} />

      {/* ── LAYER 6: Ornate outer border frame ── */}
      <AbsoluteFill
        style={{
          opacity: borderOp,
          border: `1.5px solid ${style.secondaryColor}55`,
          margin: 36,
          borderRadius: 6,
          boxShadow: `inset 0 0 40px ${style.secondaryColor}08`,
        }}
      />

      {/* ── LAYER 7: Animated corner filigree accents ── */}
      {([
        { isBottom: false, isRight: false },
        { isBottom: false, isRight: true  },
        { isBottom: true,  isRight: false },
        { isBottom: true,  isRight: true  },
      ]).map((pos, i) => (
        <AbsoluteFill
          key={i}
          style={{
            justifyContent: pos.isBottom ? "flex-end" : "flex-start",
            alignItems:     pos.isRight  ? "flex-end" : "flex-start",
            padding: 50,
            opacity: cornerSpring * borderOp,
          }}
        >
          <div style={{
            width: 28, height: 28,
            borderTop:    !pos.isBottom ? `2px solid ${style.accentColor}90` : undefined,
            borderBottom:  pos.isBottom ? `2px solid ${style.accentColor}90` : undefined,
            borderLeft:   !pos.isRight  ? `2px solid ${style.accentColor}90` : undefined,
            borderRight:   pos.isRight  ? `2px solid ${style.accentColor}90` : undefined,
          }} />
        </AbsoluteFill>
      ))}

      {/* ── LAYER 8: Cinematic top/bottom letterbox bars ── */}
      <AbsoluteFill style={{ justifyContent: "flex-start" }}>
        <div style={{ width: "100%", height: barHeight, backgroundColor: "#000" }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "flex-end" }}>
        <div style={{ width: "100%", height: barHeight, backgroundColor: "#000" }} />
      </AbsoluteFill>

      {/* ── LAYER 9: Text content ── */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 260 }}>
        {/* Tagline above names */}
        <AnimatedText
          text="TOGETHER FOREVER"
          fontSize={14}
          fontFamily={poppinsFamily}
          fontWeight={400}
          color={`${style.secondaryColor}88`}
          animation="typewriter"
          delay={5}
          letterSpacing={6}
          style={{ marginBottom: 18, textTransform: "uppercase" as const }}
        />

        {/* Groom name */}
        <AutoScaleText
          text={groomName}
          fontSize={76}
          maxWidth={META.textSlots.primaryName.maxWidth}
          fontFamily={playfairFamily}
          color={style.accentColor}
          animation="blurFade"
          delay={18}
          textShadow={`0 0 80px ${style.accentColor}44, 0 4px 40px rgba(0,0,0,0.9)`}
          style={{ marginBottom: -6 }}
        />

        {/* × divider with growing gold line */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, margin: "12px 0" }}>
          <div style={{ width: lineW, height: 1, backgroundColor: `${style.secondaryColor}70` }} />
          <AnimatedText
            text="×"
            fontSize={32}
            color={`${style.textColor}99`}
            animation="fade"
            delay={32}
            fontWeight={300}
          />
          <div style={{ width: lineW, height: 1, backgroundColor: `${style.secondaryColor}70` }} />
        </div>

        {/* Bride name */}
        <AutoScaleText
          text={brideName}
          fontSize={76}
          maxWidth={META.textSlots.secondaryName.maxWidth}
          fontFamily={playfairFamily}
          color={style.accentColor}
          animation="blurFade"
          delay={28}
          textShadow={`0 0 80px ${style.accentColor}44, 0 4px 40px rgba(0,0,0,0.9)`}
          style={{ marginBottom: 22 }}
        />

        {/* Subtitle */}
        <AnimatedText
          text="A Love Story Begins..."
          fontSize={22}
          fontFamily={poppinsFamily}
          fontWeight={300}
          color={`${style.textColor}99`}
          animation="fade"
          delay={52}
          letterSpacing={4}
        />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
