import React from "react";
import { AbsoluteFill, Audio, useVideoConfig, staticFile } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { audioVolumeEnvelope } from "../audio/duration";
import { IntroScene } from "../scenes/IntroScene";
import { HaldiScene } from "../scenes/HaldiScene";
import { SangeetScene } from "../scenes/SangeetScene";
import { VarmalaScene } from "../scenes/VarmalaScene";
import { OutroScene } from "../scenes/OutroScene";
// Legacy scene imports (kept for backwards compat)
import { FirstMeetScene } from "../scenes/FirstMeetScene";
import { ProposalScene } from "../scenes/ProposalScene";
import { WeddingScene } from "../scenes/WeddingScene";
import { CappedLightLeak } from "../motion/CappedLightLeak";
import { PreviewWatermark } from "../components/PreviewWatermark";
import { CeremonyLottie } from "../motion/CeremonyLottie";
import { resolveLightLeakIntensity, clampTransitionDuration } from "../motion/timing";
import { describeCompositionMotion } from "../motion/motionLayers";
import { WeddingVideoProps, STYLE_CONFIGS, StyleConfig } from "../../lib/types";
import { resolveVisualIdentity } from "../utils/visual-identity";
import { getTemplateMetadata } from "../../lib/template-metadata";

// Per-ceremony visual identity — palette driven from metadata (Req 4.5, 4.6).
// Wedding = royal palette with cinematic decorative motifs.
const VI = resolveVisualIdentity("royal-rajasthani");

// Validated template metadata — drives light-leak intensity + ceremony motif.
const META = getTemplateMetadata("royal-rajasthani");

// Motion descriptor — light leak topmost (Req 6.2), ceremony Lottie present
// (Req 6.4). Exported for structural unit tests (task 16.4).
export const royalRajasthaniMotion = describeCompositionMotion(
  "royal-rajasthani",
  META.functionType,
);

interface SceneEntry {
  id: string;
  component: React.ReactNode;
  duration: number;
}

/**
 * Royal Rajasthani Wedding Video Composition
 *
 * Sequences scenes based on the `scenes` prop array.
 * Supports the full traditional Indian wedding flow:
 *   intro → haldi → sangeet → varmala → outro
 * as well as legacy scene types for backwards compatibility.
 */
export const RoyalRajasthani: React.FC<WeddingVideoProps> = ({
  groomName,
  brideName,
  weddingDate,
  venue,
  groomCity,
  brideCity,
  style: styleId,
  scenes: sceneProp,
  photos: photosProp,
  musicUrl,
  backgroundVideoUrl,
  brideAvatarUrl,
  groomAvatarUrl,
}) => {
  // Provide safe defaults for props that are now optional in InviteProps
  const scenes = sceneProp ?? ["intro", "haldi", "sangeet", "varmala", "outro"];
  const photos = photosProp ?? [];
  const { fps } = useVideoConfig();
  // Get the style config (fallback to royal), then drive its palette from the
  // template's visualIdentity so the royal maroon + gold identity comes from
  // metadata rather than hardcoded literals (Req 4.5, 4.6).
  const baseStyle: StyleConfig =
    STYLE_CONFIGS[styleId as keyof typeof STYLE_CONFIGS] ||
    STYLE_CONFIGS.royal;
  const styleConfig: StyleConfig = {
    ...baseStyle,
    primaryColor: VI.primary,
    secondaryColor: VI.secondary,
    accentColor: VI.highlight,
  };

  // Map scenes to photos (cycle if fewer photos than scenes)
  let photoIndex = 0;
  const getPhoto = (): string => {
    if (photos.length === 0) {
      // No photos uploaded — use a local transparent placeholder so renders
      // complete without network dependency on an external service.
      return "https://placehold.co/1080x1920/1C0A00/D4AF37?text=Add+Photo";
    }
    const url = photos[photoIndex % photos.length];
    photoIndex++;
    return url;
  };

  // Build ordered scene array — supports duplicate scene IDs correctly
  const buildSceneList = (): SceneEntry[] => {
    const list: SceneEntry[] = [];

    for (const sceneId of scenes) {
      const photo = getPhoto();

      switch (sceneId) {
        case "intro":
          list.push({
            id: sceneId,
            component: (
              <IntroScene
                groomName={groomName ?? ""}
                brideName={brideName ?? ""}
                style={styleConfig}
                backgroundVideoUrl={backgroundVideoUrl}
                brideAvatarUrl={brideAvatarUrl}
                groomAvatarUrl={groomAvatarUrl}
              />
            ),
            duration: 150,
          });
          break;

        case "haldi":
          list.push({
            id: sceneId,
            component: (
              <HaldiScene
                groomName={groomName ?? ""}
                brideName={brideName ?? ""}
                style={styleConfig}
                backgroundVideoUrl={backgroundVideoUrl}
                brideAvatarUrl={brideAvatarUrl}
                groomAvatarUrl={groomAvatarUrl}
              />
            ),
            duration: 150,
          });
          break;

        case "sangeet":
          list.push({
            id: sceneId,
            component: (
              <SangeetScene
                groomName={groomName ?? ""}
                brideName={brideName ?? ""}
                style={styleConfig}
                backgroundVideoUrl={backgroundVideoUrl}
                brideAvatarUrl={brideAvatarUrl}
                groomAvatarUrl={groomAvatarUrl}
              />
            ),
            duration: 150,
          });
          break;

        case "varmala":
          list.push({
            id: sceneId,
            component: (
              <VarmalaScene
                groomName={groomName ?? ""}
                brideName={brideName ?? ""}
                weddingDate={weddingDate ?? ""}
                venue={venue ?? ""}
                style={styleConfig}
                backgroundVideoUrl={backgroundVideoUrl}
                brideAvatarUrl={brideAvatarUrl}
                groomAvatarUrl={groomAvatarUrl}
              />
            ),
            duration: 180,
          });
          break;

        case "outro":
          list.push({
            id: sceneId,
            component: (
              <OutroScene
                groomName={groomName ?? ""}
                brideName={brideName ?? ""}
                weddingDate={weddingDate ?? ""}
                venue={venue ?? ""}
                groomCity={groomCity ?? ""}
                brideCity={brideCity ?? ""}
                style={styleConfig}
                backgroundVideoUrl={backgroundVideoUrl}
                brideAvatarUrl={brideAvatarUrl}
                groomAvatarUrl={groomAvatarUrl}
              />
            ),
            duration: 150,
          });
          break;

        // ── Legacy scenes ──────────────────────────────────────────
        case "firstmeet":
          list.push({
            id: sceneId,
            component: <FirstMeetScene photo={photo} style={styleConfig} />,
            duration: 150,
          });
          break;

        case "proposal":
          list.push({
            id: sceneId,
            component: (
              <ProposalScene
                photo={photo}
                groomName={groomName ?? ""}
                brideName={brideName ?? ""}
                style={styleConfig}
              />
            ),
            duration: 150,
          });
          break;

        case "wedding":
          list.push({
            id: sceneId,
            component: (
              <WeddingScene
                photo={photo}
                groomName={groomName ?? ""}
                brideName={brideName ?? ""}
                weddingDate={weddingDate ?? ""}
                venue={venue ?? ""}
                style={styleConfig}
              />
            ),
            duration: 210,
          });
          break;

        case "family":
          list.push({
            id: sceneId,
            component: (
              <WeddingScene
                photo={photo}
                groomName={groomName ?? ""}
                brideName={brideName ?? ""}
                weddingDate={weddingDate ?? ""}
                venue={venue ?? ""}
                style={styleConfig}
              />
            ),
            duration: 150,
          });
          break;

        default:
          break;
      }
    }

    return list;
  };

  const sceneList = buildSceneList();

  // Non-instant scene transitions, 0.3–1.0s (Req 6.5) via clampTransitionDuration.
  const transitionFrames = Math.round(clampTransitionDuration(0.5) * fps);
  // Light-leak intensity from template metadata, defaulted + clamped (Req 6.6, 6.7).
  const leakIntensity = resolveLightLeakIntensity(META);

  return (
    <AbsoluteFill style={{ backgroundColor: "#0A0500" }}>
      {/* Background music — single Jashn.mp3 track, fade in/out (Req 7.2, 7.3) */}
      <AudioWithFade src={musicUrl || staticFile("music/Jashn.mp3")} />

      {/* Scene sequence with non-instant cross-fade transitions (Req 6.5) */}
      <TransitionSeries>
        {sceneList.flatMap((scene, idx) => {
          const nodes: React.ReactNode[] = [];
          if (idx > 0) {
            nodes.push(
              <TransitionSeries.Transition
                key={`transition-${idx}`}
                presentation={fade()}
                timing={linearTiming({ durationInFrames: transitionFrames })}
              />,
            );
          }
          nodes.push(
            <TransitionSeries.Sequence key={`scene-${idx}`} durationInFrames={scene.duration}>
              {scene.component}
            </TransitionSeries.Sequence>,
          );
          return nodes;
        })}
      </TransitionSeries>

      {/* Ceremony decorative motion (Req 6.4) — fails safe (Req 6.8). */}
      <CeremonyLottie ceremonyType={META.functionType} />

      {/* Persistent light leak — TOPMOST layer (Req 6.2), capped ≤35% (Req 6.3),
          royal-gold tint via hueShift. */}
      <CappedLightLeak intensity={leakIntensity} seed={0} hueShift={30} />

      {/* Pre-payment preview watermark — self-gates via render input props. */}
      <PreviewWatermark />
    </AbsoluteFill>
  );
};

/** Small helper: Audio with the shared fade-in/out volume envelope (Req 7.2, 7.3). */
const AudioWithFade: React.FC<{ src: string }> = ({ src }) => {
  const { fps, durationInFrames } = useVideoConfig();
  // 0.38 master gain preserves the existing music/visual balance for this template.
  return (
    <Audio
      src={src}
      volume={(f) => 0.38 * audioVolumeEnvelope(f, durationInFrames, fps)}
      startFrom={0}
    />
  );
};
