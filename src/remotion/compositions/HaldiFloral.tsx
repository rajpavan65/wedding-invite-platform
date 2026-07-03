/**
 * src/remotion/compositions/HaldiFloral.tsx
 *
 * Composition: Haldi Ceremony — Floral Edition
 * Template ID: haldi-floral
 * Function:    Haldi (pre-wedding turmeric ritual)
 * Palette:     Golden yellow, marigold orange, warm ivory
 * Mood:        Festive, joyful, colourful, energetic
 *
 * Scene sequence:
 *   1. Intro (120f)  — couple names spring in over golden mandala
 *   2. Ritual (120f) — "Haldi Carnival" announcement + turmeric particles
 *   3. Details (120f) — date, venue, diya motif
 *   4. CTA (90f)     — "Join the celebration" + rose petals shower
 *
 * PRD §13 Template Library · Phase 1 B1
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

// Load validated metadata once — avatar/text slots are read from here
const META = getTemplateMetadata("haldi-floral");

// Motion descriptor — light leak topmost (Req 6.2), ceremony Lottie present
// (Req 6.4). Exported for structural unit tests (task 16.4).
export const haldiFloralMotion = describeCompositionMotion(
  "haldi-floral",
  META.functionType,
);

// Per-ceremony visual identity — palette + motif are driven from metadata
// (Req 4.2, 4.6). Haldi = bright turmeric-yellow with garden/outdoor motifs.
const VI = resolveVisualIdentity("haldi-floral");
const ACCENT = VI.primary; // turmeric yellow — dominant brand accent
const ACCENT_DEEP = VI.secondary; // marigold orange-gold
const ACCENT_SOFT = VI.accent; // soft turmeric glow for names
const GARDEN = VI.highlight; // garden/outdoor foliage green
// Petal palette derives from the dominant palette so it stays on-theme.
const PETAL_COLORS = [ACCENT_DEEP, ACCENT, ACCENT_SOFT, GARDEN];

// ─────────────────────────────────────────────────────────────
// Sub-scene: Opening intro — names + mandala bloom
// ─────────────────────────────────────────────────────────────
const HaldiIntroScene: React.FC<{
  groomFirstName: string;
  brideName: string;
  backgroundVideoUrl?: string;
  brideAvatarUrl?: string;
  groomAvatarUrl?: string;
}> = ({ groomFirstName, brideName, backgroundVideoUrl, brideAvatarUrl, groomAvatarUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Req 6.9: foreground (text/avatar) entrances must not begin before the
  // background-template entrance completes. Gate the earliest entrances.
  const titleStart = foregroundEntranceStartFrame(20);
  const subtitleStart = foregroundEntranceStartFrame(38);
  const titleProgress = spring({ frame: Math.max(0, frame - titleStart), fps, config: { damping: 12, stiffness: 80 } });
  const subtitleProgress = spring({ frame: Math.max(0, frame - subtitleStart), fps, config: { damping: 14, stiffness: 70 } });

  const turmericPulse = 0.22 + Math.sin(frame * 0.09) * 0.08;
  const borderOp = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  // Mandala spin
  const mandalaRotate = interpolate(frame, [0, 120], [0, 15], { extrapolateRight: "clamp" });
  const mandalaOp = interpolate(frame, [0, 30], [0, 0.18], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#1A0800", overflow: "hidden" }}>
      {/* Layer 1: background */}
      <BackgroundLayer
        backgroundVideoUrl={backgroundVideoUrl}
        gradientFrom="#3D1E00"
        gradientTo="#1A0800"
        gradientAngle={145}
        animated
      />

      {/* Turmeric radial glow — driven by the palette accent colours */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 50% at 50% 105%, ${withAlpha(ACCENT, turmericPulse)}, ${withAlpha(ACCENT_DEEP, turmericPulse * 0.5)} 35%, transparent 65%)` }} />

      {/* Mandala watermark */}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity: mandalaOp }}>
        <div style={{
          width: 620, height: 620, border: "1px solid rgba(255,215,0,0.4)",
          borderRadius: "50%", transform: `rotate(${mandalaRotate}deg)`,
          background: "radial-gradient(ellipse, rgba(255,215,0,0.04), transparent 70%)",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ width: 440, height: 440, border: "1px solid rgba(255,200,0,0.25)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: 260, height: 260, border: "1px solid rgba(255,190,0,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ fontSize: 60, opacity: 0.6 }}>🌼</div>
            </div>
          </div>
        </div>
      </AbsoluteFill>

      {/* Layer 2: avatars — positions from metadata.json */}
      <AvatarPair
        brideAvatarUrl={brideAvatarUrl}
        groomAvatarUrl={groomAvatarUrl}
        brideSlot={META.avatarSlots.bride}
        groomSlot={META.avatarSlots.groom}
        enterFrame={foregroundEntranceStartFrame(30)}
      />

      {/* Gold particles — colour driven by the turmeric-yellow palette */}
      <GoldParticles count={30} color={ACCENT} direction="up" />
      <FallingPetals count={16} direction="down" colors={PETAL_COLORS} />

      {/* Ornate frame */}
      <AbsoluteFill style={{ opacity: borderOp, border: "1.5px solid rgba(255,215,0,0.35)", margin: 36, borderRadius: 8 }} />
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 0, opacity: borderOp }}>
        <div style={{ width: "100%", height: 3, background: "linear-gradient(90deg, transparent, #FFD70099, #FFD700, #FFD70099, transparent)" }} />
      </AbsoluteFill>

      {/* Layer 3: text */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 230 }}>
        <div style={{ opacity: interpolate(titleProgress, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleProgress, [0, 1], [24, 0])}px)` }}>
          <AnimatedText text="🌼 Haldi Carnival" fontSize={22} fontFamily={poppinsFamily} fontWeight={700} color="#FFD700" animation="fade" delay={0} letterSpacing={5} style={{ textTransform: "uppercase" as const, textAlign: "center" as const }} />
        </div>

        <div style={{ width: 200, height: 1.5, background: "linear-gradient(90deg,transparent,#FFD700,transparent)", margin: "18px 0" }} />

        <div style={{ opacity: interpolate(titleProgress, [0, 1], [0, 1]) }}>
          <AutoScaleText text={groomFirstName} fontSize={84} maxWidth={META.textSlots.primaryName.maxWidth} fontFamily={playfairFamily} color={ACCENT_SOFT} animation="blurFade" delay={20} textShadow="0 0 80px rgba(255,215,0,0.5), 0 4px 40px rgba(0,0,0,0.9)" />
        </div>
        <AnimatedText text="&" fontSize={36} fontFamily={playfairFamily} color="rgba(255,230,180,0.7)" animation="fade" delay={34} fontWeight={300} style={{ margin: "6px 0" }} />
        <div style={{ opacity: interpolate(subtitleProgress, [0, 1], [0, 1]) }}>
          <AutoScaleText text={brideName} fontSize={84} maxWidth={META.textSlots.secondaryName.maxWidth} fontFamily={playfairFamily} color={ACCENT_SOFT} animation="blurFade" delay={38} textShadow="0 0 80px rgba(255,215,0,0.5), 0 4px 40px rgba(0,0,0,0.9)" />
        </div>

        <AnimatedText text="The Turmeric Blessing" fontSize={20} fontFamily={poppinsFamily} fontWeight={300} color="rgba(255,240,180,0.55)" animation="fade" delay={60} letterSpacing={3} style={{ marginTop: 18 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene: Ritual details
// ─────────────────────────────────────────────────────────────
const HaldiRitualScene: React.FC<{
  groomFirstName: string;
  brideName: string;
  eventDate: string;
  venueName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideName, eventDate, venueName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const diyaGlow = 0.5 + Math.sin(frame * 0.14) * 0.22;
  const turmericPulse = 0.25 + Math.sin(frame * 0.11) * 0.08;

  const card1 = spring({ frame: Math.max(0, frame - 25), fps, config: { damping: 14, stiffness: 80 } });
  const card2 = spring({ frame: Math.max(0, frame - 42), fps, config: { damping: 14, stiffness: 80 } });
  const card3 = spring({ frame: Math.max(0, frame - 58), fps, config: { damping: 14, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#120600", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#2E1200" gradientTo="#120600" gradientAngle={150} animated />

      {/* Warm haldi tint */}
      <AbsoluteFill style={{ background: `linear-gradient(to bottom, rgba(245,166,35,0.2) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 90% 38% at 50% 105%, rgba(255,210,0,${turmericPulse}), transparent 65%)` }} />

      {/* Diya glows */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 28% 22% at 4% 96%, rgba(255,120,20,${diyaGlow * 0.6}), transparent 60%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 28% 22% at 96% 96%, rgba(255,140,10,${diyaGlow * 0.55}), transparent 60%)` }} />

      {/* Particles */}
      <GoldParticles count={38} color={ACCENT} direction="up" />
      <FallingPetals count={22} direction="down" colors={PETAL_COLORS} />

      {/* Top badge */}
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 100, opacity: interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" }) }}>
        <div style={{ background: "rgba(255,200,0,0.12)", border: "1.5px solid rgba(255,215,0,0.4)", borderRadius: 50, padding: "10px 30px", fontFamily: poppinsFamily, fontSize: 20, fontWeight: 700, color: "#FFD700", letterSpacing: 5, textTransform: "uppercase" as const }}>
          🌼 Rang De Basanti
        </div>
      </AbsoluteFill>

      {/* Info cards */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 100 }}>
        <AnimatedText text={`${groomFirstName} & ${brideName}`} fontSize={56} fontFamily={playfairFamily} color="#FFE566" animation="spring" delay={10} textShadow="0 4px 50px rgba(0,0,0,0.95)" />

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, width: "84%", marginTop: 28 }}>
          <div style={{ opacity: card1, transform: `translateX(${interpolate(card1, [0, 1], [-30, 0])}px)`, background: "rgba(255,215,0,0.09)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: 14, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: poppinsFamily, fontSize: 17, color: "#FFD700", fontWeight: 600 }}>📅 Date</span>
            <span style={{ fontFamily: poppinsFamily, fontSize: 15, color: "rgba(255,240,180,0.8)" }}>{eventDate}</span>
          </div>
          <div style={{ opacity: card2, transform: `translateX(${interpolate(card2, [0, 1], [30, 0])}px)`, background: "rgba(255,140,0,0.09)", border: "1px solid rgba(255,140,0,0.3)", borderRadius: 14, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: poppinsFamily, fontSize: 17, color: "#FFB347", fontWeight: 600 }}>📍 Venue</span>
            <span style={{ fontFamily: poppinsFamily, fontSize: 15, color: "rgba(255,240,180,0.8)" }}>{venueName}</span>
          </div>
          <div style={{ opacity: card3, transform: `translateX(${interpolate(card3, [0, 1], [-30, 0])}px)`, background: "rgba(255,100,30,0.09)", border: "1px solid rgba(255,100,30,0.3)", borderRadius: 14, padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontFamily: poppinsFamily, fontSize: 17, color: "#FF8C42", fontWeight: 600 }}>🪔 Ceremony</span>
            <span style={{ fontFamily: poppinsFamily, fontSize: 15, color: "rgba(255,240,180,0.8)" }}>Haldi & Mehandi</span>
          </div>
        </div>

        {/* Diya icons */}
        <div style={{ display: "flex", gap: 28, marginTop: 24, opacity: interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" }) }}>
          {["🪔", "🌼", "🪔"].map((e, i) => (
            <div key={i} style={{ fontSize: 32, filter: `drop-shadow(0 0 8px rgba(255,150,0,${diyaGlow}))` }}>{e}</div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene: CTA — join us
// ─────────────────────────────────────────────────────────────
const HaldiCtaScene: React.FC<{
  groomFirstName: string;
  brideName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const revealBurst = interpolate(frame, [0, 35], [0.4, 0], { extrapolateRight: "clamp" });
  const mainSpring = spring({ frame: Math.max(0, frame - 12), fps, config: { damping: 12, stiffness: 75 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0E0500", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#2A1000" gradientTo="#0E0500" gradientAngle={135} animated={false} />

      {/* Flash reveal */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 80% 60% at 50% 50%, rgba(255,215,0,${revealBurst}), transparent 70%)` }} />

      {/* Tint + glow */}
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 60%, rgba(0,0,0,0.95) 100%)" }} />
      <AbsoluteFill style={{ background: "radial-gradient(ellipse 80% 30% at 50% 105%, rgba(255,215,0,0.25), transparent 65%)" }} />

      <GoldParticles count={45} color={ACCENT} direction="up" />
      <FallingPetals count={26} direction="down" colors={["#FF4D6D", ACCENT_DEEP, "#FF80CC", ACCENT, GARDEN]} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" as const, opacity: mainSpring, transform: `scale(${interpolate(mainSpring, [0, 1], [0.9, 1])})` }}>
          <div style={{ fontSize: 72, marginBottom: 8 }}>🌼</div>
          <AnimatedText text="Join the Celebration!" fontSize={52} fontFamily={playfairFamily} color={ACCENT_SOFT} animation="spring" delay={10} textShadow="0 0 60px rgba(255,215,0,0.5), 0 4px 40px rgba(0,0,0,0.95)" />
          <div style={{ margin: "18px 0" }}>
            <AnimatedText text={`${groomFirstName} & ${brideName}`} fontSize={30} fontFamily={poppinsFamily} fontWeight={300} color="rgba(255,240,180,0.8)" animation="fade" delay={28} letterSpacing={4} />
          </div>
          <AnimatedText text="cordially invite you to their Haldi Ceremony" fontSize={18} fontFamily={poppinsFamily} fontWeight={300} color="rgba(255,240,180,0.55)" animation="fade" delay={42} letterSpacing={2} />
          <div style={{ marginTop: 28, display: "flex", justifyContent: "center", gap: 20 }}>
            {["🌼", "🪔", "🎊", "🪔", "🌼"].map((e, i) => (
              <div key={i} style={{ fontSize: 28, opacity: interpolate(frame, [50 + i * 5, 70 + i * 5], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }), filter: "drop-shadow(0 0 8px rgba(255,215,0,0.8))" }}>{e}</div>
            ))}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Main HaldiFloral Composition
// ─────────────────────────────────────────────────────────────
export const HaldiFloral: React.FC<InviteProps> = (props) => {
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
  // Single track for the full video — fade in over first 1000ms, fade out over
  // the final 2000ms via the shared envelope (Req 7.2, 7.3). 0.42 master gain
  // preserves the existing music/visual balance.
  const audio = audioUrl || musicUrl || staticFile("music/Jashn.mp3");
  const { durationInFrames, fps } = useVideoConfig();

  // Non-instant scene transitions, 0.3–1.0s (Req 6.5) via clampTransitionDuration.
  const transitionFrames = Math.round(clampTransitionDuration(0.5) * fps);
  // Light-leak intensity from template metadata, defaulted + clamped (Req 6.6, 6.7).
  const leakIntensity = resolveLightLeakIntensity(META);

  return (
    <AbsoluteFill style={{ backgroundColor: "#1A0800" }}>
      <Audio src={audio} volume={(f) => 0.42 * audioVolumeEnvelope(f, durationInFrames, fps)} startFrom={0} />

      {/* Scenes with non-instant cross-fade transitions (Req 6.5) */}
      <TransitionSeries>
        {/* Scene 1: Intro */}
        <TransitionSeries.Sequence durationInFrames={120}>
          <HaldiIntroScene
            groomFirstName={groom}
            brideName={bride}
            backgroundVideoUrl={backgroundVideoUrl}
            brideAvatarUrl={brideAvatarUrl}
            groomAvatarUrl={groomAvatarUrl}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* Scene 2: Ritual details */}
        <TransitionSeries.Sequence durationInFrames={135}>
          <HaldiRitualScene
            groomFirstName={groom}
            brideName={bride}
            eventDate={date}
            venueName={venueStr}
            backgroundVideoUrl={backgroundVideoUrl}
          />
        </TransitionSeries.Sequence>

        <TransitionSeries.Transition
          presentation={fade()}
          timing={linearTiming({ durationInFrames: transitionFrames })}
        />

        {/* Scene 3: CTA */}
        <TransitionSeries.Sequence durationInFrames={102}>
          <HaldiCtaScene groomFirstName={groom} brideName={bride} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      {/* Ceremony decorative motion (Req 6.4) — beneath the light leak, fails
          safe when no asset is present (Req 6.8). */}
      <CeremonyLottie ceremonyType={META.functionType} />

      {/* Persistent light leak — TOPMOST layer (Req 6.2), capped ≤35% (Req 6.3),
          turmeric-yellow tint via hueShift. */}
      <CappedLightLeak intensity={leakIntensity} seed={1} hueShift={0} />

      {/* Pre-payment preview watermark — self-gates via render input props. */}
      <PreviewWatermark />
    </AbsoluteFill>
  );
};
