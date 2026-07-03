/**
 * src/remotion/compositions/WeddingDivine.tsx
 *
 * Composition: Wedding — Divine Temple Edition
 * Template ID: wedding-divine
 * Function:    Wedding (sacred temple style)
 * Palette:     Temple teal, sacred gold, deep teal, warm ivory
 * Mood:        Sacred, serene, divine, timeless
 *
 * A second STYLE for the wedding ceremony (alongside royal-rajasthani): a
 * temple-inspired look with rotating mandala geometry and diya glow. Same
 * 3-layer + Motion-System architecture; slots from validated metadata.
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

const META = getTemplateMetadata("wedding-divine");

export const weddingDivineMotion = describeCompositionMotion(
  "wedding-divine",
  META.functionType,
);

const VI = resolveVisualIdentity("wedding-divine");
const TEAL = VI.primary;     // #1B7C84
const GOLD = VI.secondary;   // #E8C547
const DEEP = VI.accent;      // #0A2E36
const IVORY = VI.highlight;  // #F4E4BC

// ─────────────────────────────────────────────────────────────
// Shared: rotating sacred mandala (concentric petal rings)
// ─────────────────────────────────────────────────────────────
const SacredMandala: React.FC<{ frame: number; cx: number; cy: number; opacity: number; size?: number }> = ({ frame, cx, cy, opacity, size = 1 }) => {
  const rot = frame * 0.12;
  const petals = 16;
  return (
    <div style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, transform: `translate(-50%,-50%) rotate(${rot}deg) scale(${size})`, opacity, pointerEvents: "none" }}>
      {[230, 180, 130, 80].map((r, ri) => (
        <div key={ri} style={{ position: "absolute", left: -r, top: -r, width: r * 2, height: r * 2, borderRadius: "50%", border: `1px solid ${withAlpha(GOLD, 0.4 - ri * 0.06)}` }} />
      ))}
      {Array.from({ length: petals }, (_, i) => (
        <div key={i} style={{
          position: "absolute", left: -3, top: -230, width: 6, height: 90,
          background: `linear-gradient(to bottom, ${withAlpha(GOLD, 0.5)}, transparent)`,
          transformOrigin: "center 230px",
          transform: `rotate(${(360 / petals) * i}deg)`,
        }} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 1: Reveal
// ─────────────────────────────────────────────────────────────
const DivineRevealScene: React.FC<{
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
  const titleSpring = spring({ frame: Math.max(0, frame - titleStart), fps, config: { damping: 14, stiffness: 70 } });
  const glow = 0.16 + Math.sin(frame * 0.07) * 0.05;
  const borderOp = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: DEEP, overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#0F4148" gradientTo={DEEP} gradientAngle={160} animated />

      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 42% at 50% 30%, ${withAlpha(TEAL, glow)}, transparent 62%)` }} />
      <SacredMandala frame={frame} cx={50} cy={32} opacity={borderOp * 0.9} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 82% 28% at 50% 104%, ${withAlpha(GOLD, glow)}, transparent 65%)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(10,46,54,0.3) 0%, transparent 26%, rgba(0,0,0,0.85) 72%, rgba(0,0,0,0.95) 100%)" }} />

      <GoldParticles count={20} color={GOLD} direction="up" />

      <AvatarPair brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} brideSlot={META.avatarSlots.bride} groomSlot={META.avatarSlots.groom} enterFrame={foregroundEntranceStartFrame(40)} />

      <AbsoluteFill style={{ opacity: borderOp, border: `1.5px solid ${withAlpha(GOLD, 0.3)}`, margin: 36, borderRadius: 8 }} />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 220 }}>
        <div style={{ opacity: interpolate(frame, [fgGate, fgGate + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <div style={{ background: withAlpha(TEAL, 0.18), border: `1.5px solid ${withAlpha(GOLD, 0.5)}`, borderRadius: 50, padding: "10px 28px", fontFamily: poppinsFamily, fontSize: 18, fontWeight: 600, color: GOLD, letterSpacing: 6, textTransform: "uppercase" as const, textAlign: "center" as const }}>
            ॐ Shubh Vivah
          </div>
        </div>

        <div style={{ width: 200, height: 1.5, background: `linear-gradient(90deg,transparent,${GOLD},transparent)`, margin: "18px 0" }} />

        <div style={{ opacity: interpolate(titleSpring, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)` }}>
          <AutoScaleText text={`${groomFirstName} & ${brideFirstName}`} fontSize={74} maxWidth={META.textSlots.primaryName.maxWidth} fontFamily={playfairFamily} color={IVORY} animation="spring" delay={24} textShadow={`0 0 60px ${withAlpha(GOLD, 0.4)}, 0 4px 45px rgba(0,0,0,0.95)`} />
        </div>

        <AnimatedText text="Two souls, one sacred union" fontSize={20} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(IVORY, 0.7)} animation="fade" delay={46} letterSpacing={3} style={{ marginTop: 14 }} />
        <AnimatedText text="with the blessings of the divine 🪔" fontSize={17} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(GOLD, 0.6)} animation="fade" delay={68} letterSpacing={2} style={{ marginTop: 8 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 2: Program
// ─────────────────────────────────────────────────────────────
const DivineProgramScene: React.FC<{
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
    <AbsoluteFill style={{ backgroundColor: "#08262C", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#0E3942" gradientTo="#08262C" gradientAngle={160} animated />
      <SacredMandala frame={frame} cx={84} cy={12} opacity={0.5} size={0.6} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(10,46,54,0.4) 0%, transparent 30%, rgba(0,0,0,0.9) 80%, rgba(0,0,0,0.96) 100%)" }} />
      <GoldParticles count={16} color={GOLD} direction="up" />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 80 }}>
        <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={50} fontFamily={playfairFamily} color={IVORY} animation="spring" delay={8} textShadow="0 4px 40px rgba(0,0,0,0.95)" style={{ marginBottom: 6 }} />
        <AnimatedText text="seek your blessings at the ceremony" fontSize={17} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(GOLD, 0.7)} animation="fade" delay={22} letterSpacing={2} style={{ marginBottom: 28 }} />

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, width: "84%", alignItems: "center" }}>
          {[
            { sp: card(18), dir: -30, clr: GOLD, bd: withAlpha(GOLD, 0.3), icon: "🪔", label: "Mandap Rituals", val: "6:00 PM" },
            { sp: card(34), dir: 30, clr: TEAL, bd: withAlpha(TEAL, 0.4), icon: "🌸", label: "Varmala", val: "7:00 PM" },
            { sp: card(50), dir: -30, clr: IVORY, bd: withAlpha(IVORY, 0.3), icon: "🔥", label: "Pheras", val: "8:00 PM" },
            { sp: card(66), dir: 30, clr: GOLD, bd: withAlpha(GOLD, 0.3), icon: "📍", label: venueName, val: eventDate },
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
const DivineFinaleScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const burst = interpolate(frame, [0, 40], [0.4, 0], { extrapolateRight: "clamp" });
  const mainSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 13, stiffness: 74 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#061E23", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#0B313A" gradientTo="#061E23" gradientAngle={140} animated={false} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${withAlpha(TEAL, burst)}, transparent 70%)` }} />
      <SacredMandala frame={frame} cx={50} cy={42} opacity={0.7} size={1.1} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.96) 100%)" }} />

      <GoldParticles count={30} color={GOLD} direction="up" />
      <FallingPetals count={18} direction="down" colors={[GOLD, IVORY, TEAL, "#FFFFFF"]} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" as const, opacity: mainSpring, transform: `scale(${interpolate(mainSpring, [0, 1], [0.9, 1])})` }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>🪔</div>
          <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={70} fontFamily={playfairFamily} color={IVORY} animation="spring" delay={10} textShadow={`0 0 70px ${withAlpha(GOLD, 0.4)}, 0 4px 50px rgba(0,0,0,0.95)`} />
          <div style={{ margin: "16px 0 8px" }}>
            <AnimatedText text="request your presence at their" fontSize={20} fontFamily={poppinsFamily} fontWeight={300} color="rgba(255,255,255,0.72)" animation="fade" delay={26} letterSpacing={3} />
          </div>
          <AnimatedText text="Wedding Ceremony" fontSize={34} fontFamily={playfairFamily} color={GOLD} animation="spring" delay={38} textShadow={`0 0 40px ${withAlpha(GOLD, 0.5)}`} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Main WeddingDivine Composition
// ─────────────────────────────────────────────────────────────
export const WeddingDivine: React.FC<InviteProps> = (props) => {
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
    <AbsoluteFill style={{ backgroundColor: DEEP }}>
      <Audio src={audio} volume={(f) => 0.42 * audioVolumeEnvelope(f, durationInFrames, fps)} startFrom={0} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <DivineRevealScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: transitionFrames })} />
        <TransitionSeries.Sequence durationInFrames={132}>
          <DivineProgramScene groomFirstName={groom} brideFirstName={bride} eventDate={date} venueName={venueStr} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: transitionFrames })} />
        <TransitionSeries.Sequence durationInFrames={102}>
          <DivineFinaleScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <CeremonyLottie ceremonyType={META.functionType} />
      <CappedLightLeak intensity={leakIntensity} seed={19} hueShift={170} />

      {/* Pre-payment preview watermark — self-gates via render input props. */}
      <PreviewWatermark />
    </AbsoluteFill>
  );
};
