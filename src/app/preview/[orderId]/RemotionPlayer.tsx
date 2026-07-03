"use client";

import React, { useMemo } from "react";
import { Player } from "@remotion/player";
import { WeddingVideoProps, TEMPLATE_CONFIGS, type TemplateId } from "@/lib/types";

// Lazy-import all 4 compositions so they're code-split per-template
import { RoyalRajasthani } from "@/remotion/compositions/RoyalRajasthani";
import { HaldiFloral } from "@/remotion/compositions/HaldiFloral";
import { MehandiTraditional } from "@/remotion/compositions/MehandiTraditional";
import { SangeetGrand } from "@/remotion/compositions/SangeetGrand";
import { ReceptionLuxury } from "@/remotion/compositions/ReceptionLuxury";
import { BaraatRoyal } from "@/remotion/compositions/BaraatRoyal";
import { SangeetNeon } from "@/remotion/compositions/SangeetNeon";
import { HaldiModern } from "@/remotion/compositions/HaldiModern";
import { MehandiPastel } from "@/remotion/compositions/MehandiPastel";
import { WeddingDivine } from "@/remotion/compositions/WeddingDivine";
import { ReceptionGarden } from "@/remotion/compositions/ReceptionGarden";

interface RemotionPlayerProps {
  videoProps: WeddingVideoProps;
  totalFrames: number;
  /** Remotion composition ID — drives which component is rendered */
  templateId?: string;
}

/** Map composition ID → React component */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPOSITION_MAP: Record<string, React.ComponentType<any>> = {
  "royal-rajasthani": RoyalRajasthani,
  "haldi-floral": HaldiFloral,
  "mehandi-traditional": MehandiTraditional,
  "sangeet-grand": SangeetGrand,
  "reception-luxury": ReceptionLuxury,
  "baraat-royal": BaraatRoyal,
  "sangeet-neon": SangeetNeon,
  "haldi-modern": HaldiModern,
  "mehandi-pastel": MehandiPastel,
  "wedding-divine": WeddingDivine,
  "reception-garden": ReceptionGarden,
};

/**
 * RemotionPlayer — renders the correct Remotion composition inline in the browser.
 * Client-only (no SSR) because @remotion/player uses browser APIs.
 */
export default function RemotionPlayerComponent({
  videoProps,
  totalFrames,
  templateId,
}: RemotionPlayerProps) {
  const resolvedId = templateId || videoProps.templateId || "royal-rajasthani";
  const Component = COMPOSITION_MAP[resolvedId] ?? RoyalRajasthani;

  // Get canonical duration from TEMPLATE_CONFIGS if available
  const tplConfig = TEMPLATE_CONFIGS[resolvedId as TemplateId];
  const frames = Math.max(
    tplConfig && resolvedId !== "royal-rajasthani"
      ? tplConfig.durationInFrames
      : totalFrames,
    1
  );

  // Theme accent color for the border glow
  const accentColor = useMemo(() => {
    return tplConfig?.palette.primary ?? "#D4AF37";
  }, [tplConfig]);

  return (
    <div
      className="w-full rounded-2xl overflow-hidden"
      style={{
        aspectRatio: "9 / 16",
        border: `1px solid ${accentColor}33`,
        boxShadow: `0 0 50px ${accentColor}18, 0 0 120px ${accentColor}08`,
        transition: "box-shadow 0.4s ease",
      }}
    >
      <Player
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        component={Component as any}
        inputProps={videoProps}
        durationInFrames={frames}
        compositionWidth={1080}
        compositionHeight={1920}
        fps={30}
        style={{
          width: "100%",
          height: "100%",
        }}
        controls
        loop
        showPosterWhenUnplayed={false}
        initiallyMuted={false}
        clickToPlay
        doubleClickToFullscreen
        acknowledgeRemotionLicense
      />
    </div>
  );
}
