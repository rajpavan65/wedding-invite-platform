/**
 * src/remotion/compositions/HaldiModern.tsx
 *
 * Composition: Haldi — Modern Minimal Edition
 * Template ID: haldi-modern
 * Function:    Haldi (turmeric ceremony — clean minimal style)
 * Palette:     Bright amber, white, ink, soft amber
 * Mood:        Modern, minimal, bright, playful
 *
 * A second STYLE for the haldi ceremony (alongside haldi-floral): a light,
 * negative-space, geometric look — deliberate contrast to the dark templates.
 * Same 3-layer + Motion-System architecture; slots from validated metadata.
 *
 * PRD §13 Template Library
 */

import React from "react";
import {
  AbsoluteFill, Audio, useCurrentFrame,
  useVideoConfig, interpolate, spring, staticFile,
} from "remotion";
import { audioVolumeEnvelope } from "../audio/duration";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { AnimatedText } from "../components/AnimatedText";
import { AutoScaleText } from "../components/AutoScaleText";
import { GoldParticles } from "../components/GoldParticles";
import { BackgroundLayer } from "../components/BackgroundLayer";
import { AvatarPair } from "../components/AvatarSlot";
import { CappedLightLeak } from "../motion/CappedLightLeak";
import { PreviewWatermark } from "../components/PreviewWatermark";
import { CeremonyLottie } from "../motion/CeremonyLottie";
import {
  resolveLightLeakIntensity,
  clampTransitionDuration,
  foregroundEntranceStartFrame,
} from "../motion/timing";
import { describeCompositionMotion } from "../motion/motionLayers";
import type { InviteProps } from "../../lib/schemas";
import { getTemplateMetadata } from "../../lib/template-metadata";
import { resolveVisualIdentity, withAlpha } from "../utils/visual-identity";
import { playfairFamily, poppinsFamily } from "../utils/fonts";

const META = getTemplateMetadata("haldi-modern");

export const haldiModernMotion = describeCompositionMotion(
  "haldi-modern",
  META.functionType,
);

const VI = resolveVisualIdentity("haldi-modern");
const AMBER = VI.primary;   // #FF9E00
const WHITE = VI.secondary; // #FFFFFF
const INK = VI.accent;      // #2B2B2B
const SOFT = VI.highlight;  // #FFD98A

// ─────────────────────────────────────────────────────────────
// Shared: minimal concentric sunburst
// ─────────────────────────────────────────────────────────────
const Sunburst: React.FC<{ frame: number; cx: number; cy: number; opacity: number }> = ({ frame, cx, cy, opacity }) => {
  const rot = frame * 0.25;
  return (
    <div style={{
      position: "absolute", left: `${cx}%`, top: `${cy}%`,
      transform: `translate(-50%,-50%) rotate(${rot}deg)`, opacity, pointerEvents: "none",
    }}>
      {Array.from({ length: 24 }, (_, i) => (
        <div key={i} style={{
          position: "absolute", left: 0, top: 0, width: 3, height: 220,
          background: `linear-gradient(to bottom, ${withAlpha(AMBER, 0.5)}, transparent)`,
          transformOrigin: "top center",
          transform: `rotate(${(360 / 24) * i}deg)`,
        }} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 1: Reveal
// ─────────────────────────────────────────────────────────────
const ModernRevealScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
  brideAvatarUrl?: string;
  groomAvatarUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl, brideAvatarUrl, groomAvatarUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fgGate = foregroundEntranceStartFrame(0);
  const titleStart = foregroundEntranceStartFrame(22);
  const titleSpring = spring({ frame: Math.max(0, frame - titleStart), fps, config: { damping: 13, stiffness: 80 } });
  const dotScale = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 12, stiffness: 90 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFDF7", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#FFFFFF" gradientTo="#FFF3DC" gradientAngle={150} animated />

      <Sunburst frame={frame} cx={50} cy={34} opacity={interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" })} />

      {/* Big amber dot accent behind names */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{
          width: 520, height: 520, borderRadius: "50%", marginTop: -120,
          background: `radial-gradient(circle, ${withAlpha(SOFT, 0.6)}, ${withAlpha(AMBER, 0.12)} 60%, transparent 72%)`,
          transform: `scale(${dotScale})`,
        }} />
      </AbsoluteFill>

      <GoldParticles count={16} color={AMBER} direction="up" />

      <AvatarPair brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} brideSlot={META.avatarSlots.bride} groomSlot={META.avatarSlots.groom} enterFrame={foregroundEntranceStartFrame(40)} />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 230 }}>
        <div style={{ opacity: interpolate(frame, [fgGate, fgGate + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <div style={{ background: AMBER, borderRadius: 4, padding: "9px 26px", fontFamily: poppinsFamily, fontSize: 18, fontWeight: 700, color: "#FFFFFF", letterSpacing: 8, textTransform: "uppercase" as const }}>
            HALDI
          </div>
        </div>

        <div style={{ width: 60, height: 4, background: INK, margin: "20px 0", borderRadius: 2 }} />

        <div style={{ opacity: interpolate(titleSpring, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)` }}>
          <AutoScaleText text={`${groomFirstName} & ${brideFirstName}`} fontSize={76} maxWidth={META.textSlots.primaryName.maxWidth} fontFamily={poppinsFamily} fontWeight={700} color={INK} animation="spring" delay={22} textShadow="none" />
        </div>

        <AnimatedText text="A splash of sunshine & turmeric" fontSize={19} fontFamily={poppinsFamily} fontWeight={400} color={withAlpha(INK, 0.6)} animation="fade" delay={46} letterSpacing={2} style={{ marginTop: 14 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 2: Program
// ─────────────────────────────────────────────────────────────
const ModernProgramScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  eventDate: string;
  venueName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, eventDate, venueName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = (d: number) => spring({ frame: Math.max(0, frame - d), fps, config: { damping: 14, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFF8EC", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#FFF8EC" gradientTo="#FFEFD0" gradientAngle={150} animated />
      <Sunburst frame={frame} cx={84} cy={14} opacity={0.5} />
      <GoldParticles count={12} color={AMBER} direction="up" />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 9%" }}>
        <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={52} fontFamily={poppinsFamily} fontWeight={700} color={INK} animation="spring" delay={8} textShadow="none" style={{ marginBottom: 4 }} />
        <AnimatedText text="invite you to their Haldi" fontSize={17} fontFamily={poppinsFamily} fontWeight={400} color={withAlpha(INK, 0.55)} animation="fade" delay={22} letterSpacing={2} style={{ marginBottom: 34 }} />

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 14, width: "100%", alignItems: "stretch" }}>
          {[
            { sp: card(18), icon: "🌼", label: "Haldi Ritual", val: "10:00 AM" },
            { sp: card(34), icon: "🥁", label: "Dhol & Games", val: "11:30 AM" },
            { sp: card(50), icon: "🍽️", label: "Brunch", val: "1:00 PM" },
            { sp: card(66), icon: "📍", label: venueName, val: eventDate },
          ].map((row, i) => (
            <div key={i} style={{
              opacity: row.sp, transform: `translateY(${interpolate(row.sp, [0, 1], [20, 0])}px)`,
              width: "100%", borderBottom: `2px solid ${withAlpha(AMBER, 0.4)}`, paddingBottom: 12,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: poppinsFamily, fontSize: 18, color: INK, fontWeight: 600 }}>{row.icon} {row.label}</span>
              <span style={{ fontFamily: poppinsFamily, fontSize: 15, color: AMBER, fontWeight: 700 }}>{row.val}</span>
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 3: Finale
// ─────────────────────────────────────────────────────────────
const ModernFinaleScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mainSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 12, stiffness: 80 } });
  const ring = spring({ frame: Math.max(0, frame - 4), fps, config: { damping: 13, stiffness: 70 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFB300", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#FFC233" gradientTo="#FF9E00" gradientAngle={150} animated={false} />

      {/* White ring frame */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{
          width: 760, height: 760, borderRadius: "50%",
          border: `3px solid ${withAlpha(WHITE, 0.55)}`,
          transform: `scale(${interpolate(ring, [0, 1], [0.5, 1])})`, opacity: ring * 0.8,
        }} />
      </AbsoluteFill>

      <GoldParticles count={26} color={WHITE} direction="up" />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" as const, opacity: mainSpring, transform: `scale(${interpolate(mainSpring, [0, 1], [0.88, 1])})` }}>
          <div style={{ fontSize: 60, marginBottom: 14 }}>🌼</div>
          <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={70} fontFamily={poppinsFamily} fontWeight={800} color="#FFFFFF" animation="spring" delay={10} textShadow={`0 4px 30px ${withAlpha(INK, 0.25)}`} />
          <div style={{ margin: "16px 0 8px" }}>
            <AnimatedText text="celebrate the colours of love at their" fontSize={19} fontFamily={poppinsFamily} fontWeight={400} color="rgba(255,255,255,0.9)" animation="fade" delay={26} letterSpacing={2} />
          </div>
          <AnimatedText text="Haldi Ceremony!" fontSize={34} fontFamily={poppinsFamily} fontWeight={800} color={INK} animation="spring" delay={38} textShadow="none" />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Main HaldiModern Composition
// ─────────────────────────────────────────────────────────────
export const HaldiModern: React.FC<InviteProps> = (props) => {
  const {
    brideFirstName, groomFirstName,
    brideName: legacyBrideName, groomName: legacyGroomName,
    eventDate, weddingDate,
    venueName, venue: legacyVenue,
    audioUrl, musicUrl,
    backgroundVideoUrl, brideAvatarUrl, groomAvatarUrl,
  } = props;

  const bride = brideFirstName || legacyBrideName || "Bride";
  const groom = groomFirstName || legacyGroomName || "Groom";
  const date = eventDate || weddingDate || "";
  const venueStr = venueName || legacyVenue || "";
  const audio = audioUrl || musicUrl || staticFile("music/Jashn.mp3");
  const { durationInFrames, fps } = useVideoConfig();

  const transitionFrames = Math.round(clampTransitionDuration(0.5) * fps);
  const leakIntensity = resolveLightLeakIntensity(META);

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFFDF7" }}>
      <Audio src={audio} volume={(f) => 0.42 * audioVolumeEnvelope(f, durationInFrames, fps)} startFrom={0} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <ModernRevealScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: transitionFrames })} />
        <TransitionSeries.Sequence durationInFrames={132}>
          <ModernProgramScene groomFirstName={groom} brideFirstName={bride} eventDate={date} venueName={venueStr} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: transitionFrames })} />
        <TransitionSeries.Sequence durationInFrames={102}>
          <ModernFinaleScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <CeremonyLottie ceremonyType={META.functionType} />
      <CappedLightLeak intensity={leakIntensity} seed={13} hueShift={40} />

      {/* Pre-payment preview watermark — self-gates via render input props. */}
      <PreviewWatermark />
    </AbsoluteFill>
  );
};
