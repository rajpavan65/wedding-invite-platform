/**
 * src/remotion/compositions/MehandiPastel.tsx
 *
 * Composition: Mehandi — Pastel Boho Edition
 * Template ID: mehandi-pastel
 * Function:    Mehandi (henna ceremony — soft boho style)
 * Palette:     Dusty rose, sage green, cream, leaf green
 * Mood:        Soft, boho, romantic, airy
 *
 * A second STYLE for the mehandi ceremony (alongside mehandi-traditional):
 * watercolour blooms + pastel henna line-art. Same 3-layer + Motion-System
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

const META = getTemplateMetadata("mehandi-pastel");

export const mehandiPastelMotion = describeCompositionMotion(
  "mehandi-pastel",
  META.functionType,
);

const VI = resolveVisualIdentity("mehandi-pastel");
const ROSE = VI.primary;    // #D88FA8
const SAGE = VI.secondary;  // #A7C957
const CREAM = VI.accent;    // #F2E2CE
const LEAF = VI.highlight;  // #7FB069
const INK = "#5A4A52";      // muted plum ink for text on light bg

// ─────────────────────────────────────────────────────────────
// Shared: soft watercolour blobs
// ─────────────────────────────────────────────────────────────
const WatercolourBlobs: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill style={{ pointerEvents: "none" }}>
    {[
      { x: 18, y: 22, s: 360, c: ROSE },
      { x: 82, y: 30, s: 300, c: SAGE },
      { x: 24, y: 78, s: 320, c: LEAF },
      { x: 78, y: 82, s: 280, c: ROSE },
    ].map((b, i) => {
      const breathe = 1 + Math.sin(frame * 0.03 + i) * 0.04;
      return (
        <div key={i} style={{
          position: "absolute", left: `${b.x}%`, top: `${b.y}%`,
          width: b.s, height: b.s, marginLeft: -b.s / 2, marginTop: -b.s / 2,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${withAlpha(b.c, 0.28)}, transparent 65%)`,
          filter: "blur(8px)", transform: `scale(${breathe})`,
        }} />
      );
    })}
  </AbsoluteFill>
);

// ─────────────────────────────────────────────────────────────
// Shared: pastel mandala ring (delicate line-art)
// ─────────────────────────────────────────────────────────────
const PastelMandala: React.FC<{ frame: number; cx: number; cy: number; opacity: number }> = ({ frame, cx, cy, opacity }) => {
  const rot = frame * 0.15;
  return (
    <div style={{ position: "absolute", left: `${cx}%`, top: `${cy}%`, transform: `translate(-50%,-50%) rotate(${rot}deg)`, opacity, pointerEvents: "none" }}>
      {[200, 150, 100].map((r, ri) => (
        <div key={ri} style={{
          position: "absolute", left: -r, top: -r, width: r * 2, height: r * 2,
          borderRadius: "50%", border: `1.5px dashed ${withAlpha(ri % 2 ? SAGE : ROSE, 0.5)}`,
        }} />
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 1: Reveal
// ─────────────────────────────────────────────────────────────
const PastelRevealScene: React.FC<{
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
  const titleSpring = spring({ frame: Math.max(0, frame - titleStart), fps, config: { damping: 14, stiffness: 72 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#FBF4EC", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#FBF4EC" gradientTo="#F3E7DC" gradientAngle={150} animated />
      <WatercolourBlobs frame={frame} />
      <PastelMandala frame={frame} cx={50} cy={32} opacity={interpolate(frame, [0, 24], [0, 0.8], { extrapolateRight: "clamp" })} />
      <FallingPetals count={16} direction="down" colors={[ROSE, SAGE, CREAM, LEAF]} />

      <AvatarPair brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} brideSlot={META.avatarSlots.bride} groomSlot={META.avatarSlots.groom} enterFrame={foregroundEntranceStartFrame(40)} />

      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 230 }}>
        <div style={{ opacity: interpolate(frame, [fgGate, fgGate + 25], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
          <div style={{ background: withAlpha(ROSE, 0.16), border: `1.5px solid ${withAlpha(ROSE, 0.5)}`, borderRadius: 50, padding: "9px 26px", fontFamily: poppinsFamily, fontSize: 18, fontWeight: 600, color: INK, letterSpacing: 5, textTransform: "uppercase" as const }}>
            ❀ Mehandi
          </div>
        </div>

        <div style={{ width: 160, height: 1.5, background: `linear-gradient(90deg,transparent,${SAGE},transparent)`, margin: "18px 0" }} />

        <div style={{ opacity: interpolate(titleSpring, [0, 1], [0, 1]), transform: `translateY(${interpolate(titleSpring, [0, 1], [20, 0])}px)` }}>
          <AutoScaleText text={`${groomFirstName} & ${brideFirstName}`} fontSize={74} maxWidth={META.textSlots.primaryName.maxWidth} fontFamily={playfairFamily} color={INK} animation="spring" delay={22} textShadow={`0 2px 20px ${withAlpha(ROSE, 0.3)}`} />
        </div>

        <AnimatedText text="An afternoon of henna & harmony" fontSize={19} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(INK, 0.6)} animation="fade" delay={46} letterSpacing={2} style={{ marginTop: 14 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Sub-scene 2: Program
// ─────────────────────────────────────────────────────────────
const PastelProgramScene: React.FC<{
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
    <AbsoluteFill style={{ backgroundColor: "#F7EEE3", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#F7EEE3" gradientTo="#EFE0D2" gradientAngle={150} animated />
      <WatercolourBlobs frame={frame} />
      <FallingPetals count={10} direction="down" colors={[ROSE, SAGE, CREAM]} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 9%" }}>
        <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={52} fontFamily={playfairFamily} color={INK} animation="spring" delay={8} textShadow="none" style={{ marginBottom: 4 }} />
        <AnimatedText text="invite you to their Mehandi" fontSize={17} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(INK, 0.55)} animation="fade" delay={22} letterSpacing={2} style={{ marginBottom: 32 }} />

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12, width: "100%", alignItems: "center" }}>
          {[
            { sp: card(18), dir: -26, icon: "🌿", label: "Henna Artists", val: "3:00 PM" },
            { sp: card(34), dir: 26, icon: "🎶", label: "Acoustic Sets", val: "4:30 PM" },
            { sp: card(50), dir: -26, icon: "🍵", label: "High Tea", val: "5:30 PM" },
            { sp: card(66), dir: 26, icon: "📍", label: venueName, val: eventDate },
          ].map((row, i) => (
            <div key={i} style={{
              opacity: row.sp, transform: `translateX(${interpolate(row.sp, [0, 1], [row.dir, 0])}px)`,
              width: "100%", background: withAlpha(CREAM, 0.7), border: `1px solid ${withAlpha(SAGE, 0.4)}`,
              borderRadius: 16, padding: "13px 22px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{ fontFamily: poppinsFamily, fontSize: 17, color: INK, fontWeight: 600 }}>{row.icon} {row.label}</span>
              <span style={{ fontFamily: poppinsFamily, fontSize: 14, color: LEAF, fontWeight: 600 }}>{row.val}</span>
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
const PastelFinaleScene: React.FC<{
  groomFirstName: string;
  brideFirstName: string;
  backgroundVideoUrl?: string;
}> = ({ groomFirstName, brideFirstName, backgroundVideoUrl }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const mainSpring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 14, stiffness: 74 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#EFE3D6", overflow: "hidden" }}>
      <BackgroundLayer backgroundVideoUrl={backgroundVideoUrl} gradientFrom="#F1E6DA" gradientTo="#E6D5C6" gradientAngle={140} animated={false} />
      <WatercolourBlobs frame={frame} />
      <PastelMandala frame={frame} cx={50} cy={42} opacity={0.6} />
      <FallingPetals count={20} direction="down" colors={[ROSE, SAGE, CREAM, LEAF]} />

      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" as const, opacity: mainSpring, transform: `scale(${interpolate(mainSpring, [0, 1], [0.9, 1])})` }}>
          <div style={{ fontSize: 56, marginBottom: 14 }}>❀</div>
          <AnimatedText text={`${groomFirstName} & ${brideFirstName}`} fontSize={68} fontFamily={playfairFamily} color={INK} animation="spring" delay={10} textShadow={`0 2px 24px ${withAlpha(ROSE, 0.3)}`} />
          <div style={{ margin: "16px 0 8px" }}>
            <AnimatedText text="warmly invite you to their" fontSize={19} fontFamily={poppinsFamily} fontWeight={300} color={withAlpha(INK, 0.7)} animation="fade" delay={26} letterSpacing={2} />
          </div>
          <AnimatedText text="Mehandi Afternoon" fontSize={32} fontFamily={playfairFamily} color={ROSE} animation="spring" delay={38} textShadow="none" />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Main MehandiPastel Composition
// ─────────────────────────────────────────────────────────────
export const MehandiPastel: React.FC<InviteProps> = (props) => {
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
    <AbsoluteFill style={{ backgroundColor: "#FBF4EC" }}>
      <Audio src={audio} volume={(f) => 0.42 * audioVolumeEnvelope(f, durationInFrames, fps)} startFrom={0} />

      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={120}>
          <PastelRevealScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} brideAvatarUrl={brideAvatarUrl} groomAvatarUrl={groomAvatarUrl} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: transitionFrames })} />
        <TransitionSeries.Sequence durationInFrames={132}>
          <PastelProgramScene groomFirstName={groom} brideFirstName={bride} eventDate={date} venueName={venueStr} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: transitionFrames })} />
        <TransitionSeries.Sequence durationInFrames={102}>
          <PastelFinaleScene groomFirstName={groom} brideFirstName={bride} backgroundVideoUrl={backgroundVideoUrl} />
        </TransitionSeries.Sequence>
      </TransitionSeries>

      <CeremonyLottie ceremonyType={META.functionType} />
      <CappedLightLeak intensity={leakIntensity} seed={17} hueShift={330} />

      {/* Pre-payment preview watermark — self-gates via render input props. */}
      <PreviewWatermark />
    </AbsoluteFill>
  );
};
