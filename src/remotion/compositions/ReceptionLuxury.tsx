/**
 * src/remotion/compositions/ReceptionLuxury.tsx
 *
 * Composition: Reception — Luxury Edition
 * Template ID: reception-luxury
 * Function:    Reception (grand celebration dinner)
 * Palette:     Midnight navy, platinum silver, pearl, champagne gold
 * Mood:        Elegant, luxurious, refined, glamorous
 *
 * Scene sequence:
 *   1. Entrance (120f) — crystal chandelier reveal + couple names
 *   2. Program  (132f) — cocktails / dinner / dance schedule + venue + date
 *   3. Finale   (102f) — champagne CTA, confetti shimmer, all names
 *
 * Built on the shared 3-layer + Motion-System architecture (Req 6.2–6.9):
 * BackgroundLayer (Layer 1) → AvatarPair (Layer 2) → text props (Layer 3) →
 * ceremony Lottie → topmost capped light-leak. Avatar / text slots are read
 * from the validated reception-luxury metadata.
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
const META = getTemplateMetadata("reception-luxury");

// Motion descriptor — light leak topmost (Req 6.2), ceremony Lottie present
// (Req 6.4). Exported for the structural composition-motion unit test.
export const receptionLuxuryMotion = describeCompositionMotion(
  "reception-luxury",
  META.functionType,
);

// Per-ceremony visual identity — palette + motif driven from metadata
// (Req 4.4, 4.6). Reception = silver/champagne ballroom palette.
const VI = resolveVisualIdentity("reception-luxury");
const NAVY = VI.primary;     // #0B0E1A — deep ballroom backdrop
const SILVER = VI.secondary; // #E8E8F0 — platinum, primary names
const PEARL = VI.accent;     // #C0C0C8 — pearl, secondary accents
const GOLD = VI.highlight;   // #D4AF37 — champagne gold

// ─────────────────────────────────────────────────────────────
// Shared: hanging crystal chandelier (pure-math sparkle, no CSS anim)
// ─────────────────────────────────────────────────────────────
const Chandelier: React.FC<{ frame: number; x: number; scale?: number; delay?: number }> = ({
  frame, x, scale = 1, delay = 0,
}) => {
  const tiers = [9, 7, 5, 3];
  const sway = Math.sin((frame + delay) * 0.03) * 2;
  return (
    <div style={{
      position: "absolute", top: 0, left: `${x}%`,
      transform: `translateX(-50%) rotate(${sway}deg) scale(${scale})`,
      transformOrigin: "top center", pointerEvents: "none",
    }}>
      <div style={{ width: 2, height: 70, margin: "0 auto", background: withAlpha(SILVER, 0.35) }} />
      {tiers.map((count, t) => (
        <div key={t} style={{ display: "flex", justifyContent: "center", gap: 9, marginTop: 6 }}>
          {Array.from({ length: count }, (_, i) => {
            const twinkle = 0.4 + Math.sin((frame + delay) * 0.18 + (t * 5 + i) * 1.3) * 0.35;
            return (
              <div key={i} style={{
                width: 5, height: 11, borderRadius: "50%",
                background: `linear-gradient(to bottom, ${withAlpha(SILVER, twinkle)}, ${withAlpha(GOLD, twinkle * 0.8)})`,
                boxShadow: `0 0 8px ${withAlpha(SILVER, twinkle)}`,
              }} />
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Shared: champagne bokeh field (soft drifting circles)
// ─────────────────────────────────────────────────────────────
const ChampagneBokeh: React.FC<{ frame: number; count?: number }> = ({ frame, count = 16 }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {Array.from({ length: count }, (_, i) => {
      const seed = i * 137.508;
      const baseX = (seed * 1.7) % 100;
      const drift = Math.sin(frame * 0.012 + i) * 4;
      const baseY = 100 - ((frame * (0.12 + (seed % 5) * 0.03) + (seed * 3) % 100) % 110);
      const size = 14 + (seed % 26);
      const op = 0.05 + ((seed * 0.7) % 10) / 50;
      return (
        <div key={i} style={{
          position: "absolute", left: `${baseX + drift}%`, top: `${baseY}%`,
          width: size, height: size, borderRadius: "50%",
          background: `radial-gradient(circle, ${withAlpha(GOLD, op * 2.2)}, transparent 70%)`,
          filter: "blur(1px)",
        }} />
      );
    })}
  </AbsoluteFill>
);

// ─────────────────────────────────────────────────────────────
// Sub-scene 1: Grand Entrance
// ─────────────────────────────────────────────────────────────
const ReceptionEntranceScene: React.FC<{
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
  const titleSpring = spring({ frame: Math.max(0, frame - titleStart), fps, config: { damping: 13, stiffness: 74 } });
  const glow = 0.16 + Math.sin(frame * 0.08) * 0.05;
  const borderOp = interpolate(frame, [0, 24], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: NAVY, overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#141A2E" gradientTo={NAVY} gradientAngle={160} animated />

      {/* Top chandelier wash */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 38% at 50% -6%, ${withAlpha(SILVER, glow)}, transparent 64%)` }} />
      {/* Champagne floor glow */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 82% 28% at 50% 104%, ${withAlpha(GOLD, glow)}, transparent 65%)` }} />
      {/* Vignette */}
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(5,8,18,0.4) 0%, transparent 26%, rgba(0,0,0,0.88) 72%, rgba(0,0,0,0.96) 100%)" }} />

      <ChampagneBokeh frame={frame} count={16} />

      {/* Chandeliers */}
      <Chandelier frame={frame} x={26} scale={0.9} delay={0} />
      <Chandelier frame={frame} x={50} scale={1.15} delay={20} />
      <Chandelier frame={frame} x={74} scale={0.9} delay={40} />

      <GoldParticles count={22} color={GOLD} direction="up" />

      {/* Avatars — positions from metadata.json */}
      <AvatarPair brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} brideSlot={META.avatarSlots.bride} groomSlot={META.avatarSlots.groom} enterFrame={foregroundEntranceStartFrame(40)} />

      {/* Silver border frame */}
      <AbsoluteFill style={{ opacity: borderOp, border: `1.5px solid ${withAlpha(SILVER, 0.28)}`, margin: 36, borderRadius: 8 }} />

      {/* Text */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 220 }}>
        <div style={{ opacity: interpolate(frame, [fgGate, fgGate + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <div style={{ background: withAlpha(SILVER, 0.08), border: `1.5px solid ${withAlpha(SILVER, 0.4)}`, borderRadius: 50, padding: "10px 28px", fontFamily: poppinsFamily, fontSize: 19, fontWeight: 600, color: SILVER, letterSpacing: 6, textTransform: "uppercase" as const, textAlign: "center" as const }}>
            ✦ The Reception
          </div>
        </div>

        <div style={{ width: 200, height: 1.5, background: `linear-gradient(90deg,transparent,${GOLD},transparent)`, margin: "18px 0" }} />

        <div style={{ opacity: interpolate(titleSpring, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)` }}>
          <AutoScaleText text={`${groomFirstName} & ${brideFirstName}`} fontSize={74} maxWidth={META.textSlots.primaryName.maxWidth} fontFamily={playfairFamily} color={SILVER} animation="spring" delay={24} textShadow={`0 0 70px ${withAlpha(SILVER, 0.45)}, 0 4px 45px rgba(0,0,0,0.95)`} />
        </div>

        <AnimatedText text="Request the pleasure of your company" fontSize={20} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(SILVER, 0.7)} animation="fade" delay={46} letterSpacing={3} style={{ marginTop: 14 }} />
        <AnimatedText text="An evening of elegance & celebration ✦" fontSize={17} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(GOLD, 0.6)} animation="fade" delay={68} letterSpacing={2} style={{ marginTop: 8 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 2: Program / Event details
// ─────────────────────────────────────────────────────────────
const ReceptionProgramScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  eventDate: string;
  venueName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, eventDate, venueName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const glow = 0.14 + Math.sin(frame * 0.1) * 0.05;
  const card1 = spring({ frame: Math.max(0, frame - 18), fps, config: { damping: 14, stiffness: 80 } });
  const card2 = spring({ frame: Math.max(0, frame - 34), fps, config: { damping: 14, stiffness: 80 } });
  const card3 = spring({ frame: Math.max(0, frame - 50), fps, config: { damping: 14, stiffness: 80 } });
  const card4 = spring({ frame: Math.max(0, frame - 66), fps, config: { damping: 14, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#070A14", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#101729" gradientTo="#070A14" gradientAngle={160} animated />

      <AbsoluteFill style={{ background: `radial-gradient(ellipse 56% 40% at 50% -4%, ${withAlpha(SILVER, glow * 1.6)}, transparent 64%)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(10,14,28,0.4) 0%, transparent 30%, rgba(0,0,0,0.9) 80%, rgba(0,0,0,0.96) 100%)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 25% at 50% 105%, ${withAlpha(GOLD, 0.16)}, transparent 65%)` }} />

      <ChampagneBokeh frame={frame} count={12} />
      <GoldParticles count={18} color={GOLD} direction="up" />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 80 }}>
        <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={50} fontFamily={playfairFamily} color={SILVER} animation="spring" delay={8} textShadow="0 4px 40px rgba(0,0,0,0.95)" style={{ marginBottom: 6 }} />
        <AnimatedText text="invite you to their reception" fontSize={17} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(PEARL, 0.7)} animation="fade" delay={22} letterSpacing={2} style={{ marginBottom: 28 }} />

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, width: "84%", alignItems: "center" }}>
          {[
            { sp: card1, dir: -30, clr: SILVER, bg: withAlpha(SILVER, 0.06), bd: withAlpha(SILVER, 0.28), icon: "🥂", label: "Cocktails", val: "7:00 PM" },
            { sp: card2, dir: 30, clr: GOLD, bg: withAlpha(GOLD, 0.07), bd: withAlpha(GOLD, 0.28), icon: "🍽️", label: "Dinner Service", val: "8:00 PM" },
            { sp: card3, dir: -30, clr: PEARL, bg: withAlpha(PEARL, 0.06), bd: withAlpha(PEARL, 0.28), icon: "🎷", label: "Live Music & Dance", val: "9:30 PM" },
            { sp: card4, dir: 30, clr: GOLD, bg: withAlpha(GOLD, 0.08), bd: withAlpha(GOLD, 0.3), icon: "📍", label: venueName, val: eventDate },
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
const ReceptionFinaleScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const burst = interpolate(frame, [0, 40], [0.45, 0], { extrapolateRight: "clamp" });
  const mainSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 12, stiffness: 76 } });
  const haloPulse = 0.12 + Math.sin(frame * 0.09) * 0.06;

  return (
    <AbsoluteFill style={{ backgroundColor: "#05070F", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#0D1322" gradientTo="#05070F" gradientAngle={140} animated={false} />

      {/* Grand reveal burst */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${withAlpha(SILVER, burst)}, transparent 70%)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.96) 100%)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 22% at 50% 38%, ${withAlpha(GOLD, haloPulse)}, transparent 65%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 85% 28% at 50% 105%, ${withAlpha(GOLD, 0.2)}, transparent 65%)` }} />

      {/* Sparkle bursts (toasting glassware) */}
      <StarBurst sparksPerBurst={12} period={70} cx={20} cy={16} colors={[SILVER, GOLD, "#FFFFFF"]} />
      <StarBurst sparksPerBurst={12} period={88} cx={80} cy={13} colors={[GOLD, SILVER, "#FFFFFF"]} />
      <StarBurst sparksPerBurst={9} period={104} cx={50} cy={20} colors={[SILVER, "#FFFFFF", GOLD]} />

      <ChampagneBokeh frame={frame} count={18} />
      <GoldParticles count={32} color={GOLD} direction="up" />
      <FallingPetals count={20} direction="down" colors={[SILVER, PEARL, GOLD, "#FFFFFF"]} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" as const, opacity: mainSpring, transform: `scale(${interpolate(mainSpring, [0, 1], [0.88, 1])})` }}>
          <div style={{ fontSize: 60, marginBottom: 14 }}>🥂</div>
          <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={70} fontFamily={playfairFamily} color={SILVER} animation="spring" delay={10} textShadow={`0 0 80px ${withAlpha(SILVER, 0.4)}, 0 4px 50px rgba(0,0,0,0.95)`} />
          <div style={{ margin: "16px 0 8px" }}>
            <AnimatedText text="invite you to celebrate at their" fontSize={20} fontFamily={poppinsFamily} fontWeight={300} color="rgba(255,255,255,0.72)" animation="fade" delay={26} letterSpacing={3} />
          </div>
          <AnimatedText text="Grand Reception!" fontSize={34} fontFamily={playfairFamily} color={GOLD} animation="spring" delay={38} textShadow={`0 0 50px ${withAlpha(GOLD, 0.5)}`} />

          <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 18 }}>
            {["🥂", "✦", "🍽️", "🎷", "🍽️", "✦", "🥂"].map((e, i) => (
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
// Main ReceptionLuxury Composition
// ─────────────────────────────────────────────────────────────
export const ReceptionLuxury: React.FC<InviteProps> = (props) => {
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
    <AbsoluteFill style={{ backgroundColor: NAVY }}>
      <Audio src={audio} volume={(f) => 0.42 * audioVolumeEnvelope(f, durationInFrames, fps)} startFrom={0} />

      {/* Scenes with non-instant cross-fade transitions (Req 6.5) */}
      <TransitionSeries>
        {/* Scene 1: Grand Entrance */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <ReceptionEntranceScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* Scene 2: Program */}
        <TransitionSeries.Sequence durationInFrames={132}>
          <ReceptionProgramScene groomFirstName={groom} brideFirstName={bride} eventDate={date} venueName={venueStr} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* Scene 3: Grand Finale */}
        <TransitionSeries.Sequence durationInFrames={102}>
          <ReceptionFinaleScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Ceremony decorative motion (Req 6.4) — fails safe (Req 6.8). */}
      <CeremonyLottie ceremonyType={META.functionType} />

      {/* Persistent light leak — TOPMOST layer (Req 6.2), capped ≤35% (Req 6.3),
          warm champagne tint via hueShift. */}
      <CappedLightLeak intensity={leakIntensity} seed={5} hueShift={45} />

      {/* Pre-payment preview watermark — self-gates via render input props. */}
      <PreviewWatermark />
    </AbsoluteFill>
  );
};
