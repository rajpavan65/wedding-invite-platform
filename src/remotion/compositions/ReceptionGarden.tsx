/**
 * src/remotion/compositions/ReceptionGarden.tsx
 *
 * Composition: Reception — Garden Twilight Edition
 * Template ID: reception-garden
 * Function:    Reception (open-air garden style)
 * Palette:     Garden green, blush, ivory, warm peach
 * Mood:        Romantic, natural, warm, intimate
 *
 * A second STYLE for the reception ceremony (alongside reception-luxury): a
 * twilight garden with string-lights and fireflies. Same 3-layer + Motion-System
 * architecture; slots from validated metadata.
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
import { FallingPetals } from "../components/FallingPetals";
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

const META = getTemplateMetadata("reception-garden");

export const receptionGardenMotion = describeCompositionMotion(
  "reception-garden",
  META.functionType,
);

const VI = resolveVisualIdentity("reception-garden");
const GREEN = VI.primary;   // #4F8A6D
const BLUSH = VI.secondary; // #F7CAC9
const IVORY = VI.accent;    // #FBF2E3
const PEACH = VI.highlight; // #E6A57E

// ─────────────────────────────────────────────────────────────
// Shared: hanging string-lights swag
// ─────────────────────────────────────────────────────────────
const StringLights: React.FC<{ frame: number; opacity: number }> = ({ frame, opacity }) => (
  <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 30, opacity, pointerEvents: "none" }}>
    <div style={{ position: "relative", width: "92%", height: 120 }}>
      {Array.from({ length: 22 }, (_, i) => {
        const t = i / 21;
        // catenary-ish dip
        const dip = Math.sin(t * Math.PI) * 70;
        const twinkle = 0.45 + Math.sin(frame * 0.16 + i * 1.2) * 0.4;
        return (
          <div key={i} style={{
            position: "absolute", left: `${t * 100}%`, top: dip,
            width: 9, height: 9, borderRadius: "50%",
            background: withAlpha(PEACH, twinkle),
            boxShadow: `0 0 12px ${withAlpha(PEACH, twinkle)}`,
          }} />
        );
      })}
    </div>
  </AbsoluteFill>
);

// ─────────────────────────────────────────────────────────────
// Shared: drifting fireflies
// ─────────────────────────────────────────────────────────────
const Fireflies: React.FC<{ frame: number; count?: number }> = ({ frame, count = 18 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {Array.from({ length: count }, (_, i) => {
      const seed = i * 137.508;
      const x = (seed * 1.7) % 100 + Math.sin(frame * 0.02 + i) * 3;
      const y = (seed * 2.3) % 100 + Math.cos(frame * 0.018 + i * 0.7) * 3;
      const glow = 0.3 + Math.abs(Math.sin(frame * 0.1 + i * 1.5)) * 0.6;
      return (
        <div key={i} style={{
          position: "absolute", left: `${x}%`, top: `${y}%`,
          width: 5, height: 5, borderRadius: "50%",
          background: withAlpha("#FFE9A8", glow),
          boxShadow: `0 0 10px ${withAlpha("#FFE9A8", glow)}`,
        }} />
      );
    })}
  </AbsoluteFill>
);

// ─────────────────────────────────────────────────────────────
// Sub-scene 1: Reveal
// ─────────────────────────────────────────────────────────────
const GardenRevealScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
  brideAvatarUrl?: string;
  groomAvatarUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl, brideAvatarUrl, groomAvatarUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const fgGate = foregroundEntranceStartFrame(0);
  const titleStart = foregroundEntranceStartFrame(24);
  const titleSpring = spring({ frame: Math.max(0, frame - titleStart), fps, config: { damping: 14, stiffness: 72 } });
  const glow = 0.16 + Math.sin(frame * 0.07) * 0.05;
  const borderOp = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#16241C", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#2E4636" gradientTo="#16241C" gradientAngle={160} animated />

      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 40% at 50% 8%, ${withAlpha(PEACH, glow)}, transparent 60%)` }} />
      <StringLights frame={frame} opacity={borderOp} />
      <Fireflies frame={frame} count={18} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 82% 30% at 50% 104%, ${withAlpha(GREEN, glow * 1.4)}, transparent 65%)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(22,36,28,0.3) 0%, transparent 26%, rgba(0,0,0,0.82) 72%, rgba(0,0,0,0.94) 100%)" }} />

      <FallingPetals count={16} direction="down" colors={[BLUSH, IVORY, PEACH, "#FFFFFF"]} />

      <AvatarPair brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} brideSlot={META.avatarSlots.bride} groomSlot={META.avatarSlots.groom} enterFrame={foregroundEntranceStartFrame(40)} />

      <AbsoluteFill style={{ opacity: borderOp, border: `1.5px solid ${withAlpha(IVORY, 0.25)}`, margin: 36, borderRadius: 8 }} />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 220 }}>
        <div style={{ opacity: interpolate(frame, [fgGate, fgGate + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <div style={{ background: withAlpha(GREEN, 0.22), border: `1.5px solid ${withAlpha(BLUSH, 0.5)}`, borderRadius: 50, padding: "10px 28px", fontFamily: poppinsFamily, fontSize: 18, fontWeight: 600, color: IVORY, letterSpacing: 5, textTransform: "uppercase" as const, textAlign: "center" as const }}>
            ❧ Garden Reception
          </div>
        </div>

        <div style={{ width: 200, height: 1.5, background: `linear-gradient(90deg,transparent,${PEACH},transparent)`, margin: "18px 0" }} />

        <div style={{ opacity: interpolate(titleSpring, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)` }}>
          <AutoScaleText text={`${groomFirstName} & ${brideFirstName}`} fontSize={74} maxWidth={META.textSlots.primaryName.maxWidth} fontFamily={playfairFamily} color={IVORY} animation="spring" delay={24} textShadow={`0 0 50px ${withAlpha(PEACH, 0.4)}, 0 4px 45px rgba(0,0,0,0.9)`} />
        </div>

        <AnimatedText text="An evening under the stars & string-lights" fontSize={19} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(IVORY, 0.72)} animation="fade" delay={46} letterSpacing={2} style={{ marginTop: 14 }} />
        <AnimatedText text="join us in the garden 🌿" fontSize={17} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(BLUSH, 0.7)} animation="fade" delay={68} letterSpacing={2} style={{ marginTop: 8 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 2: Program
// ─────────────────────────────────────────────────────────────
const GardenProgramScene: React.FC<{
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
    <AbsoluteFill style={{ backgroundColor: "#121E17", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#283E30" gradientTo="#121E17" gradientAngle={160} animated />
      <StringLights frame={frame} opacity={0.7} />
      <Fireflies frame={frame} count={12} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(18,30,23,0.4) 0%, transparent 30%, rgba(0,0,0,0.88) 80%, rgba(0,0,0,0.95) 100%)" }} />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 80 }}>
        <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={50} fontFamily={playfairFamily} color={IVORY} animation="spring" delay={8} textShadow="0 4px 40px rgba(0,0,0,0.9)" style={{ marginBottom: 6 }} />
        <AnimatedText text="welcome you to their garden reception" fontSize={17} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(BLUSH, 0.75)} animation="fade" delay={22} letterSpacing={2} style={{ marginBottom: 28 }} />

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, width: "84%", alignItems: "center" }}>
          {[
            { sp: card(18), dir: -30, clr: PEACH, bd: withAlpha(PEACH, 0.4), icon: "🥂", label: "Sundowner", val: "6:30 PM" },
            { sp: card(34), dir: 30, clr: BLUSH, bd: withAlpha(BLUSH, 0.4), icon: "🍽️", label: "Al Fresco Dinner", val: "8:00 PM" },
            { sp: card(50), dir: -30, clr: IVORY, bd: withAlpha(IVORY, 0.3), icon: "🎸", label: "Live Acoustic", val: "9:30 PM" },
            { sp: card(66), dir: 30, clr: PEACH, bd: withAlpha(GREEN, 0.5), icon: "📍", label: venueName, val: eventDate },
          ].map((row, i) => (
            <div key={i} style={{
              opacity: row.sp, transform: `translateX(${interpolate(row.sp, [0, 1], [row.dir, 0])}px)`,
              width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${row.bd}`,
              borderRadius: 14, padding: "13px 22px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: poppinsFamily, fontSize: 17, color: row.clr, fontWeight: 600 }}>{row.icon} {row.label}</span>
              <span style={{ fontFamily: poppinsFamily, fontSize: 14, color: "rgba(255,255,255,0.6)" }}>{row.val}</span>
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
const GardenFinaleScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const burst = interpolate(frame, [0, 40], [0.35, 0], { extrapolateRight: "clamp" });
  const mainSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 13, stiffness: 74 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0E180F", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#22351F" gradientTo="#0E180F" gradientAngle={140} animated={false} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${withAlpha(PEACH, burst)}, transparent 70%)` }} />
      <StringLights frame={frame} opacity={0.85} />
      <Fireflies frame={frame} count={22} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.68) 55%, rgba(0,0,0,0.95) 100%)" }} />

      <GoldParticles count={24} color={PEACH} direction="up" />
      <FallingPetals count={20} direction="down" colors={[BLUSH, IVORY, PEACH, "#FFFFFF"]} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" as const, opacity: mainSpring, transform: `scale(${interpolate(mainSpring, [0, 1], [0.9, 1])})` }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🌿</div>
          <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={70} fontFamily={playfairFamily} color={IVORY} animation="spring" delay={10} textShadow={`0 0 60px ${withAlpha(PEACH, 0.4)}, 0 4px 50px rgba(0,0,0,0.92)`} />
          <div style={{ margin: "16px 0 8px" }}>
            <AnimatedText text="celebrate with us in the garden at their" fontSize={20} fontFamily={poppinsFamily} fontWeight={300} color="rgba(255,255,255,0.72)" animation="fade" delay={26} letterSpacing={3} />
          </div>
          <AnimatedText text="Garden Reception" fontSize={34} fontFamily={playfairFamily} color={PEACH} animation="spring" delay={38} textShadow={`0 0 40px ${withAlpha(PEACH, 0.5)}`} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Main ReceptionGarden Composition
// ─────────────────────────────────────────────────────────────
export const ReceptionGarden: React.FC<InviteProps> = (props) => {
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
    <AbsoluteFill style={{ backgroundColor: "#16241C" }}>
      <Audio src={audio} volume={(f) => 0.42 * audioVolumeEnvelope(f, durationInFrames, fps)} startFrom={0} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <GardenRevealScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: transitionFrames })} />
        <TransitionSeries.Sequence durationInFrames={132}>
          <GardenProgramScene groomFirstName={groom} brideFirstName={bride} eventDate={date} venueName={venueStr} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: transitionFrames })} />
        <TransitionSeries.Sequence durationInFrames={102}>
          <GardenFinaleScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <CeremonyLottie ceremonyType={META.functionType} />
      <CappedLightLeak intensity={leakIntensity} seed={23} hueShift={90} />

      {/* Pre-payment preview watermark — self-gates via render input props. */}
      <PreviewWatermark />
    </AbsoluteFill>
  );
};
