/**
 * src/remotion/compositions/MehandiTraditional.tsx
 *
 * Composition: Mehandi Night — Traditional Edition
 * Template ID: mehandi-traditional
 * Function:    Mehandi (henna night ceremony)
 * Palette:     Deep forest green, gold, ivory, coral rose
 * Mood:        Intimate, romantic, traditional, artistic
 *
 * Scene sequence:
 *   1. Reveal (120f)   — ornate mandala reveal + names
 *   2. Mehandi (135f)  — henna/floral motif scene, venue + date
 *   3. Blessing (105f) — family blessings + CTA
 *
 * PRD §13 Template Library · Phase 1 B2
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
import { BokehOverlay } from "../components/BokehOverlay";
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
const META = getTemplateMetadata("mehandi-traditional");

// Motion descriptor — light leak topmost (Req 6.2), ceremony Lottie present
// (Req 6.4). Exported for structural unit tests (task 16.4).
export const mehandiTraditionalMotion = describeCompositionMotion(
  "mehandi-traditional",
  META.functionType,
);

// Per-ceremony visual identity — palette + motif driven from metadata
// (Req 4.3, 4.6). Mehandi = deep-green palette with mandala/henna line-art.
const VI = resolveVisualIdentity("mehandi-traditional");
const ACCENT = VI.primary; // deep forest green — dominant
const ACCENT_MID = VI.secondary; // sea green — secondary accent
const ACCENT_DEEP = VI.accent; // darkest green — depth
const ACCENT_LIGHT = VI.highlight; // light green — legible name colour
// Henna petals derive from the green palette (plus one coral complement).
const PETAL_COLORS = [ACCENT_LIGHT, ACCENT_MID, ACCENT, "#FF8C94"];

// ─────────────────────────────────────────────────────────────
// Shared: Mandala ornamental ring component
// ─────────────────────────────────────────────────────────────
const MandalaRing: React.FC<{ frame: number; size?: number; opacity?: number }> = ({
  frame, size = 580, opacity = 0.15,
}) => {
  const rotate = interpolate(frame, [0, 600], [0, 30], { extrapolateRight: "clamp" });
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `1px solid ${withAlpha(ACCENT_LIGHT, 0.5)}`,
      transform: `rotate(${rotate}deg)`,
      opacity,
      display: "flex", alignItems: "center", justifyContent: "center",
      position: "relative",
    }}>
      <div style={{ width: size * 0.68, height: size * 0.68, borderRadius: "50%", border: `1px solid ${withAlpha(ACCENT_LIGHT, 0.35)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: size * 0.42, height: size * 0.42, borderRadius: "50%", border: `1px solid ${withAlpha(ACCENT_LIGHT, 0.25)}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 40 }}>🌿</div>
        </div>
      </div>
      {/* 8 petal marks */}
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} style={{
          position: "absolute", width: 8, height: 8, borderRadius: "50%",
          backgroundColor: withAlpha(ACCENT_MID, 0.6),
          top: `${50 - 49 * Math.cos((i * 45 * Math.PI) / 180)}%`,
          left: `${50 + 49 * Math.sin((i * 45 * Math.PI) / 180)}%`,
          transform: "translate(-50%, -50%)",
        }} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 1: Grand Reveal
// ─────────────────────────────────────────────────────────────
const MehandiRevealScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
  brideAvatarUrl?: string;
  groomAvatarUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl, brideAvatarUrl, groomAvatarUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleStart = foregroundEntranceStartFrame(22);
  const subStart = foregroundEntranceStartFrame(40);
  const titleSpring = spring({ frame: Math.max(0, frame - titleStart), fps, config: { damping: 14, stiffness: 70 } });
  const subSpring = spring({ frame: Math.max(0, frame - subStart), fps, config: { damping: 14, stiffness: 70 } });
  const greenPulse = 0.2 + Math.sin(frame * 0.1) * 0.06;
  const borderOp = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });
  const revealBurst = interpolate(frame, [0, 40], [0.45, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#03100A", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#082A15" gradientTo="#03100A" gradientAngle={148} animated />

      {/* Opening flash */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(150,220,100,${revealBurst}), transparent 70%)` }} />

      {/* Forest-green ambient */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, rgba(8,42,21,0.6) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.88) 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 70% 30% at 50% 105%, rgba(50,180,80,${greenPulse}), transparent 65%)` }} />

      {/* Gold particles */}
      <GoldParticles count={28} color={ACCENT_MID} direction="up" />
      <FallingPetals count={18} direction="down" colors={PETAL_COLORS} />
      <BokehOverlay count={20} color={ACCENT_LIGHT} />

      {/* Mandala background art */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <MandalaRing frame={frame} size={600} opacity={0.18} />
      </AbsoluteFill>

      {/* Avatars — positions from metadata.json */}
      <AvatarPair
        brideAvatarUrl={brideAvatarUrl}
        groomAvatarUrl={groomAvatarUrl}
        brideSlot={META.avatarSlots.bride}
        groomSlot={META.avatarSlots.groom}
        enterFrame={foregroundEntranceStartFrame(38)}
      />

      {/* Decorative border */}
      <AbsoluteFill style={{ opacity: borderOp, border: "1.5px solid rgba(212,175,55,0.28)", margin: 36, borderRadius: 8 }} />
      {(["flex-start", "flex-end"] as const).map((ai, i) => (
        <AbsoluteFill key={i} style={{ justifyContent: "flex-start", alignItems: ai, opacity: borderOp }}>
          <div style={{ width: "100%", height: 2, background: `linear-gradient(90deg, transparent, rgba(50,180,80,0.7), rgba(212,175,55,0.8), rgba(50,180,80,0.7), transparent)` }} />
        </AbsoluteFill>
      ))}

      {/* Text layer */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 210 }}>
        <div style={{ fontSize: 48, marginBottom: 10 }}>🌿</div>
        <div style={{ width: 180, height: 1.5, background: "linear-gradient(90deg,transparent,#D4AF37,transparent)", marginBottom: 20 }} />

        <div style={{ opacity: interpolate(titleSpring, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)` }}>
          <AutoScaleText text={groomFirstName} fontSize={82} maxWidth={META.textSlots.primaryName.maxWidth} fontFamily={playfairFamily} color={ACCENT_LIGHT} animation="spring" delay={22} textShadow="0 0 70px rgba(212,175,55,0.5), 0 4px 40px rgba(0,0,0,0.95)" />
        </div>
        <AnimatedText text="weds" fontSize={26} fontFamily={poppinsFamily} fontWeight={300} color="rgba(200,255,200,0.55)" animation="fade" delay={36} letterSpacing={7} style={{ margin: "4px 0" }} />
        <div style={{ opacity: interpolate(subSpring, [0, 1], [0, 1]), transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)` }}>
          <AutoScaleText text={brideFirstName} fontSize={82} maxWidth={META.textSlots.secondaryName.maxWidth} fontFamily={playfairFamily} color={ACCENT_LIGHT} animation="spring" delay={40} textShadow="0 0 70px rgba(212,175,55,0.5), 0 4px 40px rgba(0,0,0,0.95)" />
        </div>

        <AnimatedText text="Mehandi Night" fontSize={20} fontFamily={poppinsFamily} fontWeight={300} color="rgba(160,255,160,0.45)" animation="fade" delay={62} letterSpacing={5} style={{ marginTop: 16, textTransform: "uppercase" as const }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 2: Henna / Event details
// ─────────────────────────────────────────────────────────────
const MehandiDetailsScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  eventDate: string;
  venueName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, eventDate, venueName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const greenPulse = 0.18 + Math.sin(frame * 0.09) * 0.06;
  const card1 = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 14, stiffness: 80 } });
  const card2 = spring({ frame: Math.max(0, frame - 36), fps, config: { damping: 14, stiffness: 80 } });
  const card3 = spring({ frame: Math.max(0, frame - 52), fps, config: { damping: 14, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#030D07", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#062012" gradientTo="#030D07" gradientAngle={155} animated />

      <AbsoluteFill style={{ background: `linear-gradient(to bottom, rgba(8,50,20,0.45) 0%, transparent 38%, rgba(0,0,0,0.88) 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 28% at 50% 105%, rgba(50,180,80,${greenPulse}), transparent 65%)` }} />

      {/* Side leaf accents */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-start", paddingLeft: 40, opacity: interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" }) }}>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
          {["🌿", "🍃", "🌿"].map((e, i) => (
            <div key={i} style={{ fontSize: 28, opacity: 0.5 + Math.sin(frame * 0.12 + i) * 0.2 }}>{e}</div>
          ))}
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "flex-end", paddingRight: 40, opacity: interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" }) }}>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 16 }}>
          {["🌿", "🍃", "🌿"].map((e, i) => (
            <div key={i} style={{ fontSize: 28, opacity: 0.5 + Math.sin(frame * 0.12 + i + 1.5) * 0.2 }}>{e}</div>
          ))}
        </div>
      </AbsoluteFill>

      <GoldParticles count={24} color={ACCENT_MID} direction="up" />
      <FallingPetals count={16} direction="down" colors={[ACCENT_LIGHT, ACCENT_MID, ACCENT, "#FF8C94"]} />
      <BokehOverlay count={14} color={ACCENT_MID} />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 90 }}>
        {/* Henna pattern header */}
        <div style={{ marginBottom: 8, opacity: interpolate(frame, [0, 28], [0, 1], { extrapolateRight: "clamp" }) }}>
          <div style={{ background: "rgba(50,180,80,0.1)", border: "1.5px solid rgba(50,180,80,0.4)", borderRadius: 50, padding: "10px 28px", fontFamily: poppinsFamily, fontSize: 19, fontWeight: 700, color: "#3CB371", letterSpacing: 5, textTransform: "uppercase" as const }}>
            🌿 Mehandi Rasam
          </div>
        </div>

        <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={52} fontFamily={playfairFamily} color={ACCENT_LIGHT} animation="spring" delay={12} textShadow="0 4px 40px rgba(0,0,0,0.95)" style={{ marginTop: 12 }} />

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 11, width: "82%", marginTop: 26, alignItems: "center" }}>
          <div style={{ opacity: card1, transform: `translateX(${interpolate(card1, [0, 1], [-30, 0])}px)`, width: "100%", background: "rgba(50,180,80,0.09)", border: "1px solid rgba(50,180,80,0.3)", borderRadius: 14, padding: "13px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: poppinsFamily, fontSize: 16, color: "#3CB371", fontWeight: 600 }}>📅 Date</span>
            <span style={{ fontFamily: poppinsFamily, fontSize: 15, color: "rgba(200,255,200,0.85)" }}>{eventDate}</span>
          </div>
          <div style={{ opacity: card2, transform: `translateX(${interpolate(card2, [0, 1], [30, 0])}px)`, width: "100%", background: "rgba(212,175,55,0.09)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 14, padding: "13px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: poppinsFamily, fontSize: 16, color: "#D4AF37", fontWeight: 600 }}>📍 Venue</span>
            <span style={{ fontFamily: poppinsFamily, fontSize: 15, color: "rgba(200,255,200,0.85)" }}>{venueName}</span>
          </div>
          <div style={{ opacity: card3, transform: `translateX(${interpolate(card3, [0, 1], [-30, 0])}px)`, width: "100%", background: "rgba(255,140,148,0.09)", border: "1px solid rgba(255,140,148,0.3)", borderRadius: 14, padding: "13px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: poppinsFamily, fontSize: 16, color: "#FF8C94", fontWeight: 600 }}>🎨 Henna by</span>
            <span style={{ fontFamily: poppinsFamily, fontSize: 15, color: "rgba(200,255,200,0.85)" }}>Family Artists</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20, marginTop: 24, opacity: interpolate(frame, [55, 80], [0, 1], { extrapolateRight: "clamp" }) }}>
          {["🌿", "🌺", "✨", "🌺", "🌿"].map((e, i) => (
            <div key={i} style={{ fontSize: 26 }}>{e}</div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 3: Blessing / CTA
// ─────────────────────────────────────────────────────────────
const MehhandiBlessingScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const burst = interpolate(frame, [0, 38], [0.4, 0], { extrapolateRight: "clamp" });
  const mainSpring = spring({ frame: Math.max(0, frame - 14), fps, config: { damping: 12, stiffness: 78 } });
  const greenPulse = 0.22 + Math.sin(frame * 0.11) * 0.08;

  return (
    <AbsoluteFill style={{ backgroundColor: "#020A05", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#072014" gradientTo="#020A05" gradientAngle={140} animated={false} />

      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 55% at 50% 50%, rgba(100,220,100,${burst}), transparent 70%)` }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.72) 55%, rgba(0,0,0,0.96) 100%)" }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 28% at 50% 105%, rgba(50,180,80,${greenPulse}), transparent 65%)` }} />

      <GoldParticles count={42} color={ACCENT_MID} direction="up" />
      <FallingPetals count={24} direction="down" colors={PETAL_COLORS} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" as const, opacity: mainSpring, transform: `scale(${interpolate(mainSpring, [0, 1], [0.88, 1])})` }}>
          <div style={{ justifyContent: "center", alignItems: "center", display: "flex" }}>
            <MandalaRing frame={frame} size={300} opacity={0.3} />
          </div>
          <AnimatedText text="You are invited to bless" fontSize={21} fontFamily={poppinsFamily} fontWeight={300} color="rgba(200,255,200,0.6)" animation="fade" delay={5} letterSpacing={3} style={{ textTransform: "uppercase" as const, marginTop: -40, zIndex: 10, position: "relative" }} />
          <div style={{ margin: "12px 0 10px" }}>
            <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={62} fontFamily={playfairFamily} color={ACCENT_LIGHT} animation="spring" delay={14} textShadow="0 0 60px rgba(212,175,55,0.5), 0 4px 40px rgba(0,0,0,0.95)" />
          </div>
          <AnimatedText text="at their Mehandi Night" fontSize={22} fontFamily={poppinsFamily} fontWeight={300} color="rgba(200,255,200,0.55)" animation="fade" delay={30} letterSpacing={3} />

          <div style={{ marginTop: 30, display: "flex", justifyContent: "center", gap: 20 }}>
            {["🌿", "🎨", "🌺", "✨", "🌺", "🎨", "🌿"].map((e, i) => (
              <div key={i} style={{ fontSize: 26, opacity: interpolate(frame, [42 + i * 5, 62 + i * 5], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }) }}>{e}</div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Main MehandiTraditional Composition
// ─────────────────────────────────────────────────────────────
export const MehandiTraditional: React.FC<InviteProps> = (props) => {
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
    <AbsoluteFill style={{ backgroundColor: "#03100A" }}>
      <Audio src={audio} volume={(f) => 0.42 * audioVolumeEnvelope(f, durationInFrames, fps)} startFrom={0} />

      {/* Scenes with non-instant cross-fade transitions (Req 6.5) */}
      <TransitionSeries>
        {/* Scene 1: Grand Reveal */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <MehandiRevealScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* Scene 2: Mehandi details */}
        <TransitionSeries.Sequence durationInFrames={135}>
          <MehandiDetailsScene groomFirstName={groom} brideFirstName={bride} eventDate={date} venueName={venueStr} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* Scene 3: Blessing CTA */}
        <TransitionSeries.Sequence durationInFrames={102}>
          <MehhandiBlessingScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Ceremony decorative motion (Req 6.4) — fails safe (Req 6.8). */}
      <CeremonyLottie ceremonyType={META.functionType} />

      {/* Persistent light leak — TOPMOST layer (Req 6.2), capped ≤35% (Req 6.3),
          green tint for Mehandi via hueShift. */}
      <CappedLightLeak intensity={leakIntensity} seed={2} hueShift={120} />

      {/* Pre-payment preview watermark — self-gates via render input props. */}
      <PreviewWatermark />
    </AbsoluteFill>
  );
};
