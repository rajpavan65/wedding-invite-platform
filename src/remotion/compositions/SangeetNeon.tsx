/**
 * src/remotion/compositions/SangeetNeon.tsx
 *
 * Composition: Sangeet — Neon Party Edition
 * Template ID: sangeet-neon
 * Function:    Sangeet (music & dance celebration — youthful club style)
 * Palette:     Neon magenta, electric cyan, neon yellow, ultraviolet
 * Mood:        Electric, youthful, high-energy, vibrant
 *
 * A second STYLE for the sangeet ceremony (alongside sangeet-grand): the same
 * 3-layer + Motion-System architecture with a retro neon-club visual identity.
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
import { MusicNotes } from "../components/MusicNotes";
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

const META = getTemplateMetadata("sangeet-neon");

export const sangeetNeonMotion = describeCompositionMotion(
  "sangeet-neon",
  META.functionType,
);

const VI = resolveVisualIdentity("sangeet-neon");
const MAGENTA = VI.primary;   // #FF2D95
const CYAN = VI.secondary;    // #00E5FF
const NEON_Y = VI.accent;     // #FFE600
const ULTRA = VI.highlight;   // #7C00FF

// ─────────────────────────────────────────────────────────────
// Shared: neon perspective grid floor
// ─────────────────────────────────────────────────────────────
const NeonGrid: React.FC<{ frame: number; opacity: number }> = ({ frame, opacity }) => {
  const scroll = (frame * 0.6) % 60;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", overflow: "hidden", opacity, pointerEvents: "none" }}>
      <div style={{
        height: "42%",
        background: `repeating-linear-gradient(to bottom, transparent 0px, transparent ${58 + 0}px, ${withAlpha(CYAN, 0.5)} ${58 + scroll}px, ${withAlpha(CYAN, 0.5)} ${60 + scroll}px)`,
        transform: "perspective(420px) rotateX(62deg)",
        transformOrigin: "bottom center",
        maskImage: "linear-gradient(to top, black, transparent)",
      }} />
      <AbsoluteFill style={{
        background: `repeating-linear-gradient(to right, transparent 0px, transparent 78px, ${withAlpha(MAGENTA, 0.32)} 79px, ${withAlpha(MAGENTA, 0.32)} 80px)`,
        top: "58%",
        transform: "perspective(420px) rotateX(62deg)",
        transformOrigin: "bottom center",
        maskImage: "linear-gradient(to top, black, transparent)",
      }} />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Shared: vertical neon glow bars
// ─────────────────────────────────────────────────────────────
const GlowBars: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {Array.from({ length: 7 }, (_, i) => {
      const x = 8 + i * 14;
      const c = [MAGENTA, CYAN, NEON_Y, ULTRA][i % 4];
      const h = 30 + 50 * Math.abs(Math.sin(frame * 0.16 + i * 0.9));
      return (
        <div key={i} style={{
          position: "absolute", bottom: "20%", left: `${x}%`,
          width: 6, height: `${h}%`, borderRadius: 4,
          background: `linear-gradient(to top, ${c}, transparent)`,
          opacity: 0.35, boxShadow: `0 0 16px ${c}`,
        }} />
      );
    })}
  </AbsoluteFill>
);

// ─────────────────────────────────────────────────────────────
// Sub-scene 1: Drop / Reveal
// ─────────────────────────────────────────────────────────────
const NeonRevealScene: React.FC<{
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
  const titleSpring = spring({ frame: Math.max(0, frame - titleStart), fps, config: { damping: 11, stiffness: 82 } });
  const glow = 0.2 + Math.sin(frame * 0.18) * 0.1;
  const borderOp = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0014", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#1A0030" gradientTo="#0A0014" gradientAngle={160} animated />

      <AbsoluteFill style={{ background: `radial-gradient(ellipse 60% 40% at 50% -4%, ${withAlpha(MAGENTA, glow)}, transparent 64%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 30% at 50% 104%, ${withAlpha(CYAN, glow * 0.8)}, transparent 65%)` }} />

      <NeonGrid frame={frame} opacity={borderOp} />
      <GlowBars frame={frame} />
      <MusicNotes count={16} color={CYAN} />
      <GoldParticles count={22} color={NEON_Y} direction="up" />

      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(10,0,20,0.3) 0%, transparent 26%, rgba(0,0,0,0.85) 72%, rgba(0,0,0,0.95) 100%)" }} />

      <AvatarPair brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} brideSlot={META.avatarSlots.bride} groomSlot={META.avatarSlots.groom} enterFrame={foregroundEntranceStartFrame(40)} />

      <AbsoluteFill style={{ opacity: borderOp, border: `2px solid ${withAlpha(MAGENTA, 0.4)}`, margin: 36, borderRadius: 10, boxShadow: `inset 0 0 40px ${withAlpha(ULTRA, 0.25)}` }} />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 220 }}>
        <div style={{ opacity: interpolate(frame, [fgGate, fgGate + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <div style={{ background: withAlpha(MAGENTA, 0.15), border: `1.5px solid ${withAlpha(CYAN, 0.6)}`, borderRadius: 50, padding: "10px 28px", fontFamily: poppinsFamily, fontSize: 19, fontWeight: 800, color: CYAN, letterSpacing: 6, textTransform: "uppercase" as const, textAlign: "center" as const, boxShadow: `0 0 24px ${withAlpha(CYAN, 0.4)}` }}>
            ◆ Sangeet Night
          </div>
        </div>

        <div style={{ width: 220, height: 2, background: `linear-gradient(90deg,transparent,${NEON_Y},transparent)`, margin: "18px 0" }} />

        <div style={{ opacity: interpolate(titleSpring, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)` }}>
          <AutoScaleText text={`${groomFirstName} & ${brideFirstName}`} fontSize={74} maxWidth={META.textSlots.primaryName.maxWidth} fontFamily={playfairFamily} color="#FFFFFF" animation="spring" delay={22} textShadow={`0 0 40px ${MAGENTA}, 0 0 70px ${withAlpha(CYAN, 0.6)}`} />
        </div>

        <AnimatedText text="Turn it up. Light it up. 🔊" fontSize={21} fontFamily={poppinsFamily} fontWeight={400} color={withAlpha(NEON_Y, 0.9)} animation="fade" delay={46} letterSpacing={3} style={{ marginTop: 14 }} />
        <AnimatedText text="A neon night of music & dance" fontSize={17} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(CYAN, 0.7)} animation="fade" delay={68} letterSpacing={2} style={{ marginTop: 8 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 2: Program
// ─────────────────────────────────────────────────────────────
const NeonProgramScene: React.FC<{
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
    <AbsoluteFill style={{ backgroundColor: "#08010F", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#16002B" gradientTo="#08010F" gradientAngle={160} animated />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 56% 40% at 50% -4%, ${withAlpha(MAGENTA, 0.22)}, transparent 64%)` }} />
      <GlowBars frame={frame} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(15,0,30,0.4) 0%, transparent 30%, rgba(0,0,0,0.9) 80%, rgba(0,0,0,0.96) 100%)" }} />
      <MusicNotes count={12} color={CYAN} />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 80 }}>
        <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={50} fontFamily={playfairFamily} color="#FFFFFF" animation="spring" delay={8} textShadow={`0 0 36px ${MAGENTA}`} style={{ marginBottom: 6 }} />
        <AnimatedText text="bring the party" fontSize={17} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(CYAN, 0.75)} animation="fade" delay={22} letterSpacing={2} style={{ marginBottom: 28 }} />

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, width: "84%", alignItems: "center" }}>
          {[
            { sp: card(18), dir: -30, clr: CYAN, bd: withAlpha(CYAN, 0.4), icon: "🎧", label: "DJ Set", val: "8:00 PM" },
            { sp: card(34), dir: 30, clr: MAGENTA, bd: withAlpha(MAGENTA, 0.4), icon: "💃", label: "Dance Battles", val: "9:00 PM" },
            { sp: card(50), dir: -30, clr: NEON_Y, bd: withAlpha(NEON_Y, 0.4), icon: "🪩", label: "Afterparty", val: "11:00 PM" },
            { sp: card(66), dir: 30, clr: ULTRA, bd: withAlpha(ULTRA, 0.5), icon: "📍", label: venueName, val: eventDate },
          ].map((row, i) => (
            <div key={i} style={{
              opacity: row.sp, transform: `translateX(${interpolate(row.sp, [0, 1], [row.dir, 0])}px)`,
              width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${row.bd}`,
              borderRadius: 14, padding: "13px 22px", boxShadow: `0 0 18px ${row.bd}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: poppinsFamily, fontSize: 17, color: row.clr, fontWeight: 700 }}>{row.icon} {row.label}</span>
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
const NeonFinaleScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const burst = interpolate(frame, [0, 40], [0.5, 0], { extrapolateRight: "clamp" });
  const mainSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 11, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#06000D", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#12001F" gradientTo="#06000D" gradientAngle={140} animated={false} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, ${withAlpha(MAGENTA, burst)}, transparent 70%)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.96) 100%)" }} />

      <StarBurst sparksPerBurst={14} period={60} cx={18} cy={15} colors={[MAGENTA, CYAN, NEON_Y]} />
      <StarBurst sparksPerBurst={14} period={78} cx={82} cy={12} colors={[CYAN, ULTRA, NEON_Y]} />
      <StarBurst sparksPerBurst={10} period={96} cx={50} cy={20} colors={[NEON_Y, MAGENTA, CYAN]} />
      <GlowBars frame={frame} />
      <MusicNotes count={16} color={CYAN} />
      <GoldParticles count={30} color={NEON_Y} direction="up" />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" as const, opacity: mainSpring, transform: `scale(${interpolate(mainSpring, [0, 1], [0.88, 1])})` }}>
          <div style={{ fontSize: 60, marginBottom: 14 }}>🪩</div>
          <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={70} fontFamily={playfairFamily} color="#FFFFFF" animation="spring" delay={10} textShadow={`0 0 44px ${MAGENTA}, 0 0 80px ${withAlpha(CYAN, 0.6)}`} />
          <div style={{ margin: "16px 0 8px" }}>
            <AnimatedText text="come dance with us at their" fontSize={20} fontFamily={poppinsFamily} fontWeight={300} color="rgba(255,255,255,0.75)" animation="fade" delay={26} letterSpacing={3} />
          </div>
          <AnimatedText text="Sangeet Night!" fontSize={34} fontFamily={playfairFamily} color={NEON_Y} animation="spring" delay={38} textShadow={`0 0 40px ${withAlpha(NEON_Y, 0.6)}`} />

          <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 18 }}>
            {["🎧", "🪩", "🔊", "💃", "🔊", "🪩", "🎧"].map((e, i) => (
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
// Main SangeetNeon Composition
// ─────────────────────────────────────────────────────────────
export const SangeetNeon: React.FC<InviteProps> = (props) => {
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
    <AbsoluteFill style={{ backgroundColor: "#0A0014" }}>
      <Audio src={audio} volume={(f) => 0.42 * audioVolumeEnvelope(f, durationInFrames, fps)} startFrom={0} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <NeonRevealScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: transitionFrames })} />
        <TransitionSeries.Sequence durationInFrames={132}>
          <NeonProgramScene groomFirstName={groom} brideFirstName={bride} eventDate={date} venueName={venueStr} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: transitionFrames })} />
        <TransitionSeries.Sequence durationInFrames={102}>
          <NeonFinaleScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <CeremonyLottie ceremonyType={META.functionType} />
      <CappedLightLeak intensity={leakIntensity} seed={11} hueShift={310} />

      {/* Pre-payment preview watermark — self-gates via render input props. */}
      <PreviewWatermark />
    </AbsoluteFill>
  );
};
