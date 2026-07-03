import React from "react";
import { Composition, staticFile } from "remotion";
import { RoyalRajasthani } from "./compositions/RoyalRajasthani";
import { HaldiFloral } from "./compositions/HaldiFloral";
import { MehandiTraditional } from "./compositions/MehandiTraditional";
import { SangeetGrand } from "./compositions/SangeetGrand";
import { ReceptionLuxury } from "./compositions/ReceptionLuxury";
import { BaraatRoyal } from "./compositions/BaraatRoyal";
import { SangeetNeon } from "./compositions/SangeetNeon";
import { HaldiModern } from "./compositions/HaldiModern";
import { MehandiPastel } from "./compositions/MehandiPastel";
import { WeddingDivine } from "./compositions/WeddingDivine";
import { ReceptionGarden } from "./compositions/ReceptionGarden";
import { UniversalTemplate } from "./compositions/UniversalTemplate";
import { InvitePropsSchema } from "../lib/schemas";
import type { InviteProps } from "../lib/schemas";
import type { FunctionType } from "../lib/types";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { resolveCompositionAudio } from "./audio/resolveCompositionAudio";

const FPS = 30;

/**
 * calculateMetadata — Req 7.1, 7.4, 7.5, 7.6: Audio-driven composition duration.
 * Sets durationInFrames from the audio track length clamped to 15–90 s.
 * Falls back to the ceremony default track on unreachable audio (Req 7.6).
 */
const calculateMetadataFn = async ({
  props,
}: {
  props: InviteProps;
}): Promise<{ durationInFrames: number }> => {
  const audioSrc = props.audioUrl || props.musicUrl;
  const ceremony = (props.functionType as FunctionType | undefined) ?? "wedding";

  const resolution = await resolveCompositionAudio({
    audioSrc,
    ceremony,
    fps: FPS,
    fetchDuration: getAudioDurationInSeconds,
  });

  if (resolution.fallbackUsed) {
    console.warn(`[calculateMetadata] ${resolution.fallbackReason}`);
  }
  console.log(
    `[calculateMetadata] audio "${resolution.audioSrc}" → ${resolution.durationInFrames} frames`,
  );

  return { durationInFrames: resolution.durationInFrames };
};

/**
 * calculateMetadata for UniversalTemplate — derives duration from the
 * dynamicTemplate.scenes array: sum of (scene.durationSeconds * fps).
 * Falls back to audio-driven duration if the template has no scenes yet.
 */
const universalCalculateMetadata = async ({
  props,
}: {
  props: InviteProps & { dynamicTemplate?: { scenes: Array<{ durationSeconds: number }> } };
}): Promise<{ durationInFrames: number }> => {
  const scenes = props.dynamicTemplate?.scenes ?? [];
  if (scenes.length > 0) {
    const total = scenes.reduce((sum, s) => sum + Math.round(s.durationSeconds * FPS), 0);
    return { durationInFrames: Math.max(total, 30) };
  }
  return calculateMetadataFn({ props });
};

/**
 * Remotion Root — registers all video compositions.
 * Entry point for `npm run remotion:preview` and `npm run remotion:render`.
 *
 * Compositions:
 *   1. royal-rajasthani      — Full wedding (5-scene, hardcoded)
 *   2. haldi-floral          — Haldi ceremony (3-scene, hardcoded)
 *   3. mehandi-traditional   — Mehandi night (3-scene, hardcoded)
 *   4. sangeet-grand         — Sangeet night (3-scene, hardcoded)
 *   5. universal-template    — Database-driven, Template Manager (no code changes per template)
 */
export const RemotionRoot: React.FC = () => {
  const defaultProps: InviteProps = {
    brideFirstName: "Priya",
    groomFirstName: "Rahul",
    eventDate: "15 February 2026",
    venueName: "The Grand Palace, Jaipur",
    venueCity: "Jaipur",
    audioUrl: staticFile("music/Jashn.mp3"),
    backgroundVideoUrl: undefined,
    brideAvatarUrl: undefined,
    groomAvatarUrl: undefined,
    avatarType: "png",
    templateId: "royal-rajasthani",
    functionType: "wedding",
    tier: "standard",
    voiceoverEnabled: false,
    // Legacy compat
    brideName: "Priya",
    groomName: "Rahul",
    weddingDate: "15 February 2026",
    venue: "The Grand Palace, Jaipur",
    groomCity: "Delhi",
    brideCity: "Mumbai",
    style: "royal",
    scenes: ["intro", "haldi", "sangeet", "varmala", "outro"],
    photos: [],
    musicUrl: staticFile("music/Jashn.mp3"),
  };

  /** Minimal 2-scene demo for Universal Template preview in Remotion Studio */
  const universalDefaultProps = {
    ...defaultProps,
    templateId: "universal-template",
    dynamicTemplate: {
      id: "demo",
      name: "Demo Template",
      status: "draft" as const,
      ceremony: "wedding" as const,
      emoji: "🎬",
      palette: { primary: "#D4AF37", secondary: "#0A0500", accent: "#F0D060", background: "#0A0500" },
      scenes: [
        {
          id: "intro",
          label: "Intro",
          durationSeconds: 4,
          transitionIn: "fade" as const,
          transitionOut: "fade" as const,
          avatarSlots: [],
          textSlots: [
            { key: "groomName", x: 540, y: 750, fontSize: 64, color: "#D4AF37", align: "center" as const },
            { key: "brideName", x: 540, y: 860, fontSize: 64, color: "#D4AF37", align: "center" as const },
          ],
        },
        {
          id: "outro",
          label: "Join Us",
          durationSeconds: 4,
          transitionIn: "fade" as const,
          transitionOut: "fade" as const,
          avatarSlots: [],
          textSlots: [
            { key: "eventDate", x: 540, y: 900, fontSize: 48, color: "#D4AF37", align: "center" as const },
            { key: "venueName", x: 540, y: 980, fontSize: 28, color: "#F5ECD7", align: "center" as const },
          ],
        },
      ],
    },
  };

  return (
    <>
      {/* ── 1: Royal Rajasthani ── */}
      <Composition
        id="royal-rajasthani"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={RoyalRajasthani as any}
        calculateMetadata={calculateMetadataFn as any}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        schema={InvitePropsSchema}
      />

      {/* ── 2: Haldi Floral ── */}
      <Composition
        id="haldi-floral"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={HaldiFloral as any}
        calculateMetadata={calculateMetadataFn as any}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...defaultProps, templateId: "haldi-floral", functionType: "haldi" as const }}
        schema={InvitePropsSchema}
      />

      {/* ── 3: Mehandi Traditional ── */}
      <Composition
        id="mehandi-traditional"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={MehandiTraditional as any}
        calculateMetadata={calculateMetadataFn as any}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...defaultProps, templateId: "mehandi-traditional", functionType: "mehandi" as const }}
        schema={InvitePropsSchema}
      />

      {/* ── 4: Sangeet Grand ── */}
      <Composition
        id="sangeet-grand"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SangeetGrand as any}
        calculateMetadata={calculateMetadataFn as any}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...defaultProps, templateId: "sangeet-grand", functionType: "sangeet" as const }}
        schema={InvitePropsSchema}
      />

      {/* ── 5: Reception Luxury ── */}
      <Composition
        id="reception-luxury"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ReceptionLuxury as any}
        calculateMetadata={calculateMetadataFn as any}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...defaultProps, templateId: "reception-luxury", functionType: "reception" as const }}
        schema={InvitePropsSchema}
      />

      {/* ── 6: Baraat Royal ── */}
      <Composition
        id="baraat-royal"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={BaraatRoyal as any}
        calculateMetadata={calculateMetadataFn as any}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...defaultProps, templateId: "baraat-royal", functionType: "baraat" as const }}
        schema={InvitePropsSchema}
      />

      {/* ── 7: Sangeet Neon ── */}
      <Composition
        id="sangeet-neon"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={SangeetNeon as any}
        calculateMetadata={calculateMetadataFn as any}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...defaultProps, templateId: "sangeet-neon", functionType: "sangeet" as const }}
        schema={InvitePropsSchema}
      />

      {/* ── 8: Haldi Modern ── */}
      <Composition
        id="haldi-modern"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={HaldiModern as any}
        calculateMetadata={calculateMetadataFn as any}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...defaultProps, templateId: "haldi-modern", functionType: "haldi" as const }}
        schema={InvitePropsSchema}
      />

      {/* ── 9: Mehandi Pastel ── */}
      <Composition
        id="mehandi-pastel"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={MehandiPastel as any}
        calculateMetadata={calculateMetadataFn as any}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...defaultProps, templateId: "mehandi-pastel", functionType: "mehandi" as const }}
        schema={InvitePropsSchema}
      />

      {/* ── 10: Wedding Divine ── */}
      <Composition
        id="wedding-divine"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={WeddingDivine as any}
        calculateMetadata={calculateMetadataFn as any}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...defaultProps, templateId: "wedding-divine", functionType: "wedding" as const }}
        schema={InvitePropsSchema}
      />

      {/* ── 11: Reception Garden ── */}
      <Composition
        id="reception-garden"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={ReceptionGarden as any}
        calculateMetadata={calculateMetadataFn as any}
        durationInFrames={1800}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...defaultProps, templateId: "reception-garden", functionType: "reception" as const }}
        schema={InvitePropsSchema}
      />

      {/* ── 12: Universal Template (Template Manager)
           Renders any database-driven template without code changes.
           Duration = sum of scene.durationSeconds × fps (via universalCalculateMetadata). ── */}
      <Composition
        id="universal-template"
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={UniversalTemplate as any}
        calculateMetadata={universalCalculateMetadata as any}
        durationInFrames={240}
        fps={30}
        width={1080}
        height={1920}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        defaultProps={universalDefaultProps as any}
      />
    </>
  );
};
