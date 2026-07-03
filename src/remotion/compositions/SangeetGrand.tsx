/**
 * src/remotion/compositions/SangeetGrand.tsx
 *
 * Composition: Sangeet Night — Grand Edition
 * Template ID: sangeet-grand
 * Function:    Sangeet (music & dance celebration)
 * Palette:     Deep purple, electric violet, champagne gold, midnight blue
 * Mood:        Electric, celebratory, glamorous, high-energy
 *
 * Scene sequence:
 *   1. Stage (120f)   — spotlight reveal + DJ/stage energy, couple names
 *   2. Program (135f) — performance lineup + event details
 *   3. Finale (105f)  — grand CTA, StarBurst fireworks, all names
 *
 * PRD §13 Template Library · Phase 1 B3
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
import { MusicNotes } from "../components/MusicNotes";
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

// Load validated metadata once — avatar/text slots are read from here
const META = getTemplateMetadata("sangeet-grand");

// Motion descriptor — light leak topmost (Req 6.2), ceremony Lottie present
// (Req 6.4). Exported for structural unit tests (task 16.4).
export const sangeetGrandMotion = describeCompositionMotion(
  "sangeet-grand",
  META.functionType,
);

// Per-ceremony visual identity — palette + motif driven from metadata
// (Req 4.4, 4.6). Sangeet = stage/gold palette with celebratory sparkle motifs.
const VI = resolveVisualIdentity("sangeet-grand");
const GOLD = VI.secondary; // sparkle gold
const SPARKLE = VI.accent; // magenta sparkle — accent / names
const VIOLET = VI.highlight; // stage violet — spotlight beams

// ─────────────────────────────────────────────────────────────
// Shared: DJ Stage Light Beam
// ─────────────────────────────────────────────────────────────
const StageLightBeam: React.FC<{
  frame: number;
  x: number;
  color: string;
  speed?: number;
  delay?: number;
}> = ({ frame, x, color, speed = 0.04, delay = 0 }) => {
  const angle = Math.sin((frame + delay) * speed) * 18;
  const opacity = 0.12 + Math.sin((frame + delay) * speed * 1.7) * 0.05;
  return (
    <div style={{
      position: "absolute",
      top: 0, left: `${x}%`,
      width: 80, height: 900,
      background: `linear-gradient(to bottom, ${color} 0%, transparent 100%)`,
      opacity,
      transform: `rotate(${angle}deg)`,
      transformOrigin: "top center",
      pointerEvents: "none",
    }} />
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 1: Stage Reveal
// ─────────────────────────────────────────────────────────────
const SangeetStageScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
  brideAvatarUrl?: string;
  groomAvatarUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl, brideAvatarUrl, groomAvatarUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Req 6.9: gate foreground (text/avatar) entrances behind the background entrance.
  const fgGate = foregroundEntranceStartFrame(0);
  const titleStart = foregroundEntranceStartFrame(22);
  const titleSpring = spring({ frame: Math.max(0, frame - titleStart), fps, config: { damping: 12, stiffness: 78 } });
  const spot1 = 0.38 + Math.sin(frame * 0.13) * 0.15;
  const spot2 = 0.28 + Math.sin(frame * 0.21 + 0.8) * 0.12;
  const goldGlow = 0.18 + Math.sin(frame * 0.09) * 0.06;
  const borderOp = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });

  // Equaliser bars (pure math, no CSS anim)
  const eqBars = Array.from({ length: 9 }, (_, i) => ({
    h: 20 + 40 * Math.abs(Math.sin(frame * 0.18 + i * 0.7)),
  }));

  return (
    <AbsoluteFill style={{ backgroundColor: "#06001A", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#0D0030" gradientTo="#06001A" gradientAngle={160} animated />

      {/* Stage spotlights — beam colours driven by the stage palette */}
      <AbsoluteFill>
        <StageLightBeam frame={frame} x={20} color={withAlpha(VIOLET, spot1)} speed={0.04} delay={0} />
        <StageLightBeam frame={frame} x={50} color={withAlpha(VIOLET, spot2)} speed={0.035} delay={15} />
        <StageLightBeam frame={frame} x={78} color={withAlpha(SPARKLE, spot1 * 0.8)} speed={0.048} delay={30} />
      </AbsoluteFill>

      {/* Top-down centre spot */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 42% at 50% -4%, ${withAlpha(VIOLET, spot1 * 0.5)}, transparent 65%)` }} />

      {/* Gold warm floor glow */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 28% at 50% 104%, ${withAlpha(GOLD, goldGlow)}, transparent 65%)` }} />

      {/* Dark gradient */}
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(50,0,100,0.35) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0.9) 70%, rgba(0,0,0,0.97) 100%)" }} />

      {/* Music notes VFX */}
      <MusicNotes count={18} color={SPARKLE} />

      {/* Gold particles */}
      <GoldParticles count={28} color={GOLD} direction="up" />

      {/* Fairy light string */}
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 55, opacity: borderOp }}>
        <div style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {Array.from({ length: 16 }, (_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: "50%",
              backgroundColor: i % 3 === 0 ? "#C89EFF" : i % 3 === 1 ? "#FFD700" : "#FF80CC",
              opacity: 0.4 + Math.sin(frame * 0.15 + i * 1.3) * 0.35,
              boxShadow: `0 0 10px ${i % 3 === 0 ? "#C89EFF" : i % 3 === 1 ? "#FFD700" : "#FF80CC"}`,
            }} />
          ))}
        </div>
      </AbsoluteFill>

      {/* Equaliser bar art (bottom) */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 185, opacity: borderOp }}>
        <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
          {eqBars.map((bar, i) => (
            <div key={i} style={{
              width: 10, height: bar.h, borderRadius: 3,
              background: `linear-gradient(to top, #C89EFF, #FFD700)`,
              opacity: 0.45,
            }} />
          ))}
        </div>
      </AbsoluteFill>

      {/* Gold border */}
      <AbsoluteFill style={{ opacity: borderOp, border: "1.5px solid rgba(180,100,255,0.3)", margin: 36, borderRadius: 8 }} />

      {/* Avatars — positions from metadata.json */}
      <AvatarPair brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} brideSlot={META.avatarSlots.bride} groomSlot={META.avatarSlots.groom} enterFrame={foregroundEntranceStartFrame(40)} />

      {/* Text */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 220 }}>
        <div style={{ opacity: interpolate(frame, [fgGate, fgGate + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <div style={{ background: "rgba(140,60,220,0.2)", border: "1.5px solid rgba(180,100,255,0.5)", borderRadius: 50, padding: "10px 28px", fontFamily: poppinsFamily, fontSize: 20, fontWeight: 700, color: "#C89EFF", letterSpacing: 5, textTransform: "uppercase" as const, textAlign: "center" as const }}>
            🎶 Sangeet Grand
          </div>
        </div>

        <div style={{ width: 200, height: 1.5, background: "linear-gradient(90deg,transparent,#D4AF37,transparent)", margin: "18px 0" }} />

        <div style={{ opacity: interpolate(titleSpring, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)` }}>
          <AutoScaleText text={`${groomFirstName} & ${brideFirstName}`} fontSize={74} maxWidth={META.textSlots.primaryName.maxWidth} fontFamily={playfairFamily} color={SPARKLE} animation="spring" delay={22} textShadow="0 0 70px rgba(180,100,255,0.55), 0 4px 45px rgba(0,0,0,0.95)" />
        </div>

        <AnimatedText text="Dance. Celebrate. Love." fontSize={22} fontFamily={poppinsFamily} fontWeight={300} color="rgba(255,255,255,0.65)" animation="fade" delay={44} letterSpacing={5} style={{ marginTop: 14 }} />
        <AnimatedText text="An evening of music, magic & memories ✨" fontSize={18} fontFamily={poppinsFamily} fontWeight={300} color="rgba(200,158,255,0.5)" animation="fade" delay={66} letterSpacing={2} style={{ marginTop: 8 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 2: Program / Event details
// ─────────────────────────────────────────────────────────────
const SangeetProgramScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  eventDate: string;
  venueName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, eventDate, venueName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const spot1 = 0.3 + Math.sin(frame * 0.11) * 0.12;
  const card1 = spring({ frame: Math.max(0, frame - 18), fps, config: { damping: 14, stiffness: 80 } });
  const card2 = spring({ frame: Math.max(0, frame - 34), fps, config: { damping: 14, stiffness: 80 } });
  const card3 = spring({ frame: Math.max(0, frame - 50), fps, config: { damping: 14, stiffness: 80 } });
  const card4 = spring({ frame: Math.max(0, frame - 66), fps, config: { damping: 14, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#050016", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#0A0030" gradientTo="#050016" gradientAngle={160} animated />

      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 40% at 50% -4%, rgba(140,60,220,${spot1 * 0.4}), transparent 65%)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(30,0,70,0.4) 0%, transparent 30%, rgba(0,0,0,0.92) 80%, rgba(0,0,0,0.97) 100%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 25% at 50% 105%, rgba(212,175,55,0.18), transparent 65%)" }} />

      <MusicNotes count={12} color={SPARKLE} />
      <GoldParticles count={22} color={GOLD} direction="up" />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 80 }}>
        <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={50} fontFamily={playfairFamily} color={SPARKLE} animation="spring" delay={8} textShadow="0 4px 40px rgba(0,0,0,0.95)" style={{ marginBottom: 6 }} />
        <AnimatedText text="Present an evening of celebration" fontSize={18} fontFamily={poppinsFamily} fontWeight={300} color="rgba(200,158,255,0.55)" animation="fade" delay={22} letterSpacing={2} style={{ marginBottom: 28 }} />

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, width: "84%", alignItems: "center" }}>
          {[
            { sp: card1, dir: -30, clr: "#C89EFF", bg: "rgba(140,60,220,0.1)", bd: "rgba(180,100,255,0.3)", icon: "🎤", label: "Opening Act", val: "7:00 PM" },
            { sp: card2, dir: 30, clr: "#FFD700", bg: "rgba(212,175,55,0.08)", bd: "rgba(255,215,0,0.28)", icon: "💃", label: "Dance Performances", val: "8:00 PM" },
            { sp: card3, dir: -30, clr: "#FF80CC", bg: "rgba(255,128,204,0.08)", bd: "rgba(255,128,204,0.28)", icon: "🎶", label: "DJ Night", val: "9:30 PM" },
            { sp: card4, dir: 30, clr: "#D4AF37", bg: "rgba(212,175,55,0.09)", bd: "rgba(212,175,55,0.3)", icon: "📍", label: venueName, val: eventDate },
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
const SangeetFinaleScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const burst = interpolate(frame, [0, 40], [0.5, 0], { extrapolateRight: "clamp" });
  const mainSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 12, stiffness: 76 } });
  const haloPulse = 0.14 + Math.sin(frame * 0.09) * 0.07;
  const accentColor = SPARKLE;

  return (
    <AbsoluteFill style={{ backgroundColor: "#040012", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#080028" gradientTo="#040012" gradientAngle={140} animated={false} />

      {/* Grand reveal burst */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(180,100,255,${burst}), transparent 70%)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.97) 100%)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 55% 22% at 50% 38%, ${accentColor}${Math.round(haloPulse * 255).toString(16).padStart(2, "0")}, transparent 65%)` }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 85% 28% at 50% 105%, rgba(212,175,55,0.22), transparent 65%)" }} />

      {/* Fireworks */}
      <StarBurst sparksPerBurst={14} period={65} cx={18} cy={15} colors={[accentColor, GOLD, "#FFF8EE"]} />
      <StarBurst sparksPerBurst={14} period={82} cx={82} cy={12} colors={["#FF80CC", accentColor, GOLD]} />
      <StarBurst sparksPerBurst={10} period={98} cx={50} cy={20} colors={[GOLD, "#FFF8EE", accentColor]} />

      <MusicNotes count={16} color={SPARKLE} />
      <GoldParticles count={38} color={GOLD} direction="up" />
      <FallingPetals count={22} direction="down" colors={[SPARKLE, "#FF80CC", GOLD, "#FF4D6D"]} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" as const, opacity: mainSpring, transform: `scale(${interpolate(mainSpring, [0, 1], [0.88, 1])})` }}>
          <div style={{ fontSize: 64, marginBottom: 14 }}>🎶</div>
          <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={70} fontFamily={playfairFamily} color={accentColor} animation="spring" delay={10} textShadow={`0 0 80px ${accentColor}55, 0 4px 50px rgba(0,0,0,0.95)`} />
          <div style={{ margin: "16px 0 8px" }}>
            <AnimatedText text="invite you to celebrate" fontSize={21} fontFamily={poppinsFamily} fontWeight={300} color="rgba(255,255,255,0.72)" animation="fade" delay={26} letterSpacing={3} />
          </div>
          <AnimatedText text="their Sangeet Night!" fontSize={34} fontFamily={playfairFamily} color={GOLD} animation="spring" delay={38} textShadow="0 0 50px rgba(255,215,0,0.5)" />

          <div style={{ marginTop: 32, display: "flex", justifyContent: "center", gap: 18 }}>
            {["🎶", "💃", "🥂", "🎵", "🥂", "💃", "🎶"].map((e, i) => (
              <div key={i} style={{
                fontSize: 28,
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
// Main SangeetGrand Composition
// ─────────────────────────────────────────────────────────────
export const SangeetGrand: React.FC<InviteProps> = (props) => {
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
    <AbsoluteFill style={{ backgroundColor: "#06001A" }}>
      <Audio src={audio} volume={(f) => 0.42 * audioVolumeEnvelope(f, durationInFrames, fps)} startFrom={0} />

      {/* Scenes with non-instant cross-fade transitions (Req 6.5) */}
      <TransitionSeries>
        {/* Scene 1: Stage reveal */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <SangeetStageScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* Scene 2: Program */}
        <TransitionSeries.Sequence durationInFrames={132}>
          <SangeetProgramScene groomFirstName={groom} brideFirstName={bride} eventDate={date} venueName={venueStr} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* Scene 3: Grand Finale */}
        <TransitionSeries.Sequence durationInFrames={102}>
          <SangeetFinaleScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Ceremony decorative motion (Req 6.4) — fails safe (Req 6.8). */}
      <CeremonyLottie ceremonyType={META.functionType} />

      {/* Persistent light leak — TOPMOST layer (Req 6.2), capped ≤35% (Req 6.3),
          violet tint for Sangeet via hueShift. */}
      <CappedLightLeak intensity={leakIntensity} seed={3} hueShift={270} />

      {/* Pre-payment preview watermark — self-gates via render input props. */}
      <PreviewWatermark />
    </AbsoluteFill>
  );
};
