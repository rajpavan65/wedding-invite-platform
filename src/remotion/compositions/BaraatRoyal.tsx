/**
 * src/remotion/compositions/BaraatRoyal.tsx
 *
 * Composition: Baraat — Royal Procession
 * Template ID: baraat-royal
 * Function:    Baraat (the groom's grand wedding procession)
 * Palette:     Saffron-orange, marigold gold, festive red, cream
 * Mood:        Festive, energetic, celebratory, grand
 *
 * Scene sequence:
 *   1. Procession (120f) — dhol-driven grand entry + couple names
 *   2. Program    (132f) — assembly / procession / arrival schedule + venue + date
 *   3. Finale     (102f) — "Join the Baraat!" CTA, firecracker bursts, all names
 *
 * Built on the shared 3-layer + Motion-System architecture (Req 6.2–6.9):
 * BackgroundLayer (Layer 1) → AvatarPair (Layer 2) → text props (Layer 3) →
 * ceremony Lottie → topmost capped light-leak. Avatar / text slots are read
 * from the validated baraat-royal metadata.
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
import { StarBurst } from "../components/StarBurst";
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

// Load validated metadata once — avatar/text slots are read from here.
const META = getTemplateMetadata("baraat-royal");

// Motion descriptor — light leak topmost (Req 6.2), ceremony Lottie present
// (Req 6.4). Exported for the structural composition-motion unit test.
export const baraatRoyalMotion = describeCompositionMotion(
  "baraat-royal",
  META.functionType,
);

// Per-ceremony visual identity — palette + motif driven from metadata
// (Req 4.4, 4.6). Baraat = festive saffron/marigold procession palette.
const VI = resolveVisualIdentity("baraat-royal");
const SAFFRON = VI.primary;  // #E8541E — saffron-orange, key accent
const GOLD = VI.secondary;   // #FFC300 — marigold gold, primary names
const RED = VI.accent;       // #C81912 — festive deep red
const CREAM = VI.highlight;  // #FFE08A — warm cream

// ─────────────────────────────────────────────────────────────
// Shared: dhol-beat burst ring (pulses on a steady procession beat)
// ─────────────────────────────────────────────────────────────
const DholPulse: React.FC<{ frame: number; x: number; period?: number; delay?: number }> = ({
  frame, x, period = 28, delay = 0,
}) => {
  const t = ((frame + delay) % period) / period;
  const scale = 0.4 + t * 1.4;
  const opacity = (1 - t) * 0.4;
  return (
    <div style={{
      position: "absolute", bottom: "16%", left: `${x}%`,
      width: 120, height: 120, marginLeft: -60, borderRadius: "50%",
      border: `2px solid ${withAlpha(GOLD, opacity)}`,
      transform: `scale(${scale})`, pointerEvents: "none",
    }} />
  );
};

// ─────────────────────────────────────────────────────────────
// Shared: marigold garland string across the top
// ─────────────────────────────────────────────────────────────
const MarigoldGarland: React.FC<{ frame: number; opacity: number }> = ({ frame, opacity }) => (
  <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 40, opacity, pointerEvents: "none" }}>
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      {Array.from({ length: 20 }, (_, i) => {
        const bob = Math.sin(frame * 0.12 + i * 0.8) * 4;
        const c = i % 3 === 0 ? GOLD : i % 3 === 1 ? SAFFRON : RED;
        return (
          <div key={i} style={{
            width: 14, height: 14, borderRadius: "50%",
            background: `radial-gradient(circle at 35% 35%, ${CREAM}, ${c} 70%)`,
            transform: `translateY(${10 + bob + (i % 2) * 8}px)`,
            boxShadow: `0 0 8px ${withAlpha(c, 0.5)}`,
          }} />
        );
      })}
    </div>
  </AbsoluteFill>
);

// ─────────────────────────────────────────────────────────────
// Sub-scene 1: Procession Entrance
// ─────────────────────────────────────────────────────────────
const BaraatProcessionScene: React.FC<{
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
  const titleSpring = spring({ frame: Math.max(0, frame - titleStart), fps, config: { damping: 13, stiffness: 76 } });
  const glow = 0.2 + Math.sin(frame * 0.12) * 0.07;
  const borderOp = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#2A0A04", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#5A1505" gradientTo="#2A0A04" gradientAngle={160} animated />

      {/* Warm sky wash */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 40% at 50% -4%, ${withAlpha(SAFFRON, glow)}, transparent 64%)` }} />
      {/* Festive floor glow */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 82% 30% at 50% 104%, ${withAlpha(GOLD, glow * 0.9)}, transparent 65%)` }} />
      {/* Vignette */}
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(40,8,2,0.35) 0%, transparent 26%, rgba(0,0,0,0.86) 72%, rgba(0,0,0,0.95) 100%)" }} />

      <MarigoldGarland frame={frame} opacity={borderOp} />

      {/* Dhol-beat pulse rings */}
      <DholPulse frame={frame} x={26} period={26} delay={0} />
      <DholPulse frame={frame} x={74} period={26} delay={13} />

      <FallingPetals count={20} direction="down" colors={[GOLD, SAFFRON, RED, CREAM]} />
      <GoldParticles count={26} color={GOLD} direction="up" />

      {/* Avatars — positions from metadata.json */}
      <AvatarPair brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} brideSlot={META.avatarSlots.bride} groomSlot={META.avatarSlots.groom} enterFrame={foregroundEntranceStartFrame(40)} />

      {/* Festive border frame */}
      <AbsoluteFill style={{ opacity: borderOp, border: `1.5px solid ${withAlpha(GOLD, 0.32)}`, margin: 36, borderRadius: 8 }} />

      {/* Text */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 220 }}>
        <div style={{ opacity: interpolate(frame, [fgGate, fgGate + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <div style={{ background: withAlpha(SAFFRON, 0.16), border: `1.5px solid ${withAlpha(GOLD, 0.5)}`, borderRadius: 50, padding: "10px 28px", fontFamily: poppinsFamily, fontSize: 19, fontWeight: 700, color: GOLD, letterSpacing: 5, textTransform: "uppercase" as const, textAlign: "center" as const }}>
            🥁 The Baraat
          </div>
        </div>

        <div style={{ width: 200, height: 1.5, background: `linear-gradient(90deg,transparent,${GOLD},transparent)`, margin: "18px 0" }} />

        <div style={{ opacity: interpolate(titleSpring, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)` }}>
          <AutoScaleText text={`${groomFirstName} & ${brideFirstName}`} fontSize={74} maxWidth={META.textSlots.primaryName.maxWidth} fontFamily={playfairFamily} color={GOLD} animation="spring" delay={24} textShadow={`0 0 70px ${withAlpha(SAFFRON, 0.55)}, 0 4px 45px rgba(0,0,0,0.95)`} />
        </div>

        <AnimatedText text="Dhol bajao, baraat aayi! 🎉" fontSize={21} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(CREAM, 0.8)} animation="fade" delay={46} letterSpacing={3} style={{ marginTop: 14 }} />
        <AnimatedText text="Dance with us as the groom arrives in style" fontSize={17} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(GOLD, 0.6)} animation="fade" delay={68} letterSpacing={2} style={{ marginTop: 8 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 2: Program / Event details
// ─────────────────────────────────────────────────────────────
const BaraatProgramScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  eventDate: string;
  venueName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, eventDate, venueName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glow = 0.16 + Math.sin(frame * 0.11) * 0.06;
  const card1 = spring({ frame: Math.max(0, frame - 18), fps, config: { damping: 14, stiffness: 80 } });
  const card2 = spring({ frame: Math.max(0, frame - 34), fps, config: { damping: 14, stiffness: 80 } });
  const card3 = spring({ frame: Math.max(0, frame - 50), fps, config: { damping: 14, stiffness: 80 } });
  const card4 = spring({ frame: Math.max(0, frame - 66), fps, config: { damping: 14, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#220804", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#4A1204" gradientTo="#220804" gradientAngle={160} animated />

      <AbsoluteFill style={{ background: `radial-gradient(ellipse 56% 40% at 50% -4%, ${withAlpha(SAFFRON, glow * 1.4)}, transparent 64%)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(34,8,4,0.4) 0%, transparent 30%, rgba(0,0,0,0.9) 80%, rgba(0,0,0,0.96) 100%)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 25% at 50% 105%, ${withAlpha(GOLD, 0.18)}, transparent 65%)` }} />

      <GoldParticles count={20} color={GOLD} direction="up" />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 80 }}>
        <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={50} fontFamily={playfairFamily} color={GOLD} animation="spring" delay={8} textShadow="0 4px 40px rgba(0,0,0,0.95)" style={{ marginBottom: 6 }} />
        <AnimatedText text="welcome you to the baraat" fontSize={17} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(CREAM, 0.7)} animation="fade" delay={22} letterSpacing={2} style={{ marginBottom: 28 }} />

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, width: "84%", alignItems: "center" }}>
          {[
            { sp: card1, dir: -30, clr: GOLD, bg: withAlpha(GOLD, 0.08), bd: withAlpha(GOLD, 0.3), icon: "🥁", label: "Baraat Assembly", val: "5:00 PM" },
            { sp: card2, dir: 30, clr: SAFFRON, bg: withAlpha(SAFFRON, 0.1), bd: withAlpha(SAFFRON, 0.3), icon: "🐎", label: "Procession Begins", val: "5:30 PM" },
            { sp: card3, dir: -30, clr: CREAM, bg: withAlpha(CREAM, 0.08), bd: withAlpha(CREAM, 0.28), icon: "💃", label: "Dance & Dhol", val: "6:00 PM" },
            { sp: card4, dir: 30, clr: GOLD, bg: withAlpha(GOLD, 0.09), bd: withAlpha(GOLD, 0.3), icon: "📍", label: venueName, val: eventDate },
          ].map((row, i) => (
            <div key={i} style={{
              opacity: row.sp, transform: `translateX(${interpolate(row.sp, [0, 1], [row.dir, 0])}px)`,
              width: "100%", background: row.bg, border: `1px solid ${row.bd}`,
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
// Sub-scene 3: Grand Finale CTA
// ─────────────────────────────────────────────────────────────
const BaraatFinaleScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const burst = interpolate(frame, [0, 40], [0.5, 0], { extrapolateRight: "clamp" });
  const mainSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 12, stiffness: 76 } });
  const haloPulse = 0.14 + Math.sin(frame * 0.1) * 0.07;

  return (
    <AbsoluteFill style={{ backgroundColor: "#1E0703", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#420F03" gradientTo="#1E0703" gradientAngle={140} animated={false} />

      {/* Grand reveal burst */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${withAlpha(SAFFRON, burst)}, transparent 70%)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.96) 100%)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 22% at 50% 38%, ${withAlpha(GOLD, haloPulse)}, transparent 65%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 28% at 50% 105%, ${withAlpha(SAFFRON, 0.22)}, transparent 65%)` }} />

      {/* Firecracker bursts */}
      <StarBurst sparksPerBurst={14} period={64} cx={18} cy={15} colors={[GOLD, SAFFRON, CREAM]} />
      <StarBurst sparksPerBurst={14} period={82} cx={82} cy={12} colors={[SAFFRON, RED, GOLD]} />
      <StarBurst sparksPerBurst={10} period={98} cx={50} cy={20} colors={[GOLD, CREAM, SAFFRON]} />

      <GoldParticles count={36} color={GOLD} direction="up" />
      <FallingPetals count={24} direction="down" colors={[GOLD, SAFFRON, RED, CREAM]} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" as const, opacity: mainSpring, transform: `scale(${interpolate(mainSpring, [0, 1], [0.88, 1])})` }}>
          <div style={{ fontSize: 62, marginBottom: 14 }}>🥁</div>
          <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={70} fontFamily={playfairFamily} color={GOLD} animation="spring" delay={10} textShadow={`0 0 80px ${withAlpha(SAFFRON, 0.55)}, 0 4px 50px rgba(0,0,0,0.95)`} />
          <div style={{ margin: "16px 0 8px" }}>
            <AnimatedText text="invite you to dance in their" fontSize={20} fontFamily={poppinsFamily} fontWeight={300} color="rgba(255,255,255,0.72)" animation="fade" delay={26} letterSpacing={3} />
          </div>
          <AnimatedText text="Grand Baraat!" fontSize={34} fontFamily={playfairFamily} color={CREAM} animation="spring" delay={38} textShadow={`0 0 50px ${withAlpha(GOLD, 0.5)}`} />

          <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 18 }}>
            {["🥁", "🐎", "🎉", "💃", "🎉", "🐎", "🥁"].map((e, i) => (
              <div key={i} style={{
                fontSize: 26,
                opacity: interpolate(frame, [45 + i * 5, 65 + i * 5], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
              }}>{e}</div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Main BaraatRoyal Composition
// ─────────────────────────────────────────────────────────────
export const BaraatRoyal: React.FC<InviteProps> = (props) => {
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

  // Non-instant scene transitions, 0.3–1.0s (Req 6.5).
  const transitionFrames = Math.round(clampTransitionDuration(0.5) * fps);
  // Light-leak intensity from template metadata, defaulted + clamped (Req 6.6, 6.7).
  const leakIntensity = resolveLightLeakIntensity(META);

  return (
    <AbsoluteFill style={{ backgroundColor: "#2A0A04" }}>
      <Audio src={audio} volume={(f) => 0.42 * audioVolumeEnvelope(f, durationInFrames, fps)} startFrom={0} />

      {/* Scenes with non-instant cross-fade transitions (Req 6.5) */}
      <TransitionSeries>
        {/* Scene 1: Procession Entrance */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <BaraatProcessionScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* Scene 2: Program */}
        <TransitionSeries.Sequence durationInFrames={132}>
          <BaraatProgramScene groomFirstName={groom} brideFirstName={bride} eventDate={date} venueName={venueStr} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* Scene 3: Grand Finale */}
        <TransitionSeries.Sequence durationInFrames={102}>
          <BaraatFinaleScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Ceremony decorative motion (Req 6.4) — fails safe (Req 6.8). */}
      <CeremonyLottie ceremonyType={META.functionType} />

      {/* Persistent light leak — TOPMOST layer (Req 6.2), capped ≤35% (Req 6.3),
          warm saffron tint via hueShift. */}
      <CappedLightLeak intensity={leakIntensity} seed={7} hueShift={25} />

      {/* Pre-payment preview watermark — self-gates via render input props. */}
      <PreviewWatermark />
    </AbsoluteFill>
  );
};
