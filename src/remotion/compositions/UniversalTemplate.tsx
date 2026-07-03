/**
 * UniversalTemplate.tsx
 *
 * A single Remotion composition that renders ANY database-driven template
 * (DynamicTemplate) without requiring new Remotion component code.
 *
 * Layer stack per scene (bottom → top):
 *   1. Background video/image
 *   2. Avatar slots — spring float-up entrance
 *   3. Text slots  — staggered spring reveal
 *   4. Lottie VFX overlay (optional)
 *   5. Light-leak shimmer (capped at 35%)
 */

import React from "react";
import {
  AbsoluteFill,
  Video,
  Img,
  Audio,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  staticFile,
  Sequence,
} from "remotion";
import type { DynamicTemplate, SceneDefinition, TextSlotDef, AvatarSlotDef } from "@/lib/types";
import type { InviteProps } from "@/lib/schemas";
import { audioVolumeEnvelope } from "../audio/duration";

// ─── Prop mapping ──────────────────────────────────────────────────────────────

/**
 * Map InviteProps field keys to their actual values at render time.
 */
function resolveText(key: string, customText: string | undefined, props: InviteProps): string {
  if (key === "custom") return customText ?? "";
  const map: Record<string, string> = {
    groomName: props.brideFirstName ? props.groomFirstName ?? "" : props.groomName ?? "",
    brideName: props.brideFirstName ?? props.brideName ?? "",
    eventDate: props.eventDate ?? props.weddingDate ?? "",
    venueName: props.venueName ?? props.venue ?? "",
    venueCity: props.venueCity ?? "",
  };
  return map[key] ?? key;
}

function resolveAvatar(key: string, props: InviteProps): string | undefined {
  if (key === "groomAvatar") return props.groomAvatarUrl;
  if (key === "brideAvatar") return props.brideAvatarUrl;
  return undefined;
}

// ─── Light leak shimmer ────────────────────────────────────────────────────────

function LightLeakOverlay({ intensity }: { intensity: number }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Slow pulse within the 35% cap
  const pulse = interpolate(frame % 90, [0, 45, 90], [0.15, 0.30, 0.15]);
  const opacity = Math.min(pulse * intensity, 0.35);
  return (
    <AbsoluteFill style={{
      background: "linear-gradient(160deg, rgba(240,208,96,0.6) 0%, transparent 40%, rgba(212,175,55,0.4) 100%)",
      opacity,
      mixBlendMode: "screen",
      pointerEvents: "none",
    }} />
  );
}

// ─── Avatar slot renderer ──────────────────────────────────────────────────────

function AvatarSlotRenderer({ slot, url, startFrame }: { slot: AvatarSlotDef; url?: string; startFrame: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const localFrame = Math.max(0, frame - startFrame);

  const sp = spring({ frame: localFrame, fps, config: { damping: 12, stiffness: 80 } });
  const translateY = interpolate(sp, [0, 1], [100, 0]);
  const opacity = interpolate(sp, [0, 1], [0, 1]);

  const w = slot.width;
  const h = w * (slot.aspectRatio ?? 1.333);

  if (!url) return null;

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Img
        src={url}
        style={{
          position: "absolute",
          left: slot.x - w / 2,
          top: slot.y - h / 2,
          width: w,
          height: h,
          objectFit: "contain",
          transform: `translateY(${translateY}px)`,
          opacity,
        }}
      />
    </AbsoluteFill>
  );
}

// ─── Text slot renderer ────────────────────────────────────────────────────────

function TextSlotRenderer({ slot, text, startFrame, staggerIndex }: { slot: TextSlotDef; text: string; startFrame: number; staggerIndex: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Stagger: each text slot waits 8 more frames than the previous
  const localFrame = Math.max(0, frame - startFrame - staggerIndex * 8);

  const sp = spring({ frame: localFrame, fps, config: { damping: 14, stiffness: 90 } });
  const translateY = interpolate(sp, [0, 1], [24, 0]);
  const opacity = interpolate(sp, [0, 1], [0, 1]);

  const textAlignMap: Record<string, "left" | "center" | "right"> = {
    left: "left", center: "center", right: "right",
  };

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute",
        left: slot.align === "center" ? 0 : slot.x,
        right: slot.align === "center" ? 0 : undefined,
        top: slot.y,
        textAlign: textAlignMap[slot.align] ?? "center",
        fontSize: slot.fontSize,
        color: slot.color,
        fontFamily: slot.fontFamily ?? "var(--font-playfair, 'Playfair Display', serif)",
        fontWeight: 700,
        lineHeight: 1.2,
        transform: `translateY(${translateY}px)`,
        opacity,
        letterSpacing: "0.02em",
        textShadow: "0 2px 8px rgba(0,0,0,0.4)",
        // Prevent overflow
        maxWidth: "90%",
        marginLeft: slot.align === "center" ? "5%" : undefined,
        wordBreak: "break-word",
      }}>
        {text}
      </div>
    </AbsoluteFill>
  );
}

// ─── Single scene renderer ─────────────────────────────────────────────────────

function SceneRenderer({
  scene,
  inviteProps,
  palette,
}: {
  scene: SceneDefinition;
  inviteProps: InviteProps;
  palette: DynamicTemplate["palette"];
}) {
  const isVideo = scene.backgroundUrl
    ? /\.(mp4|webm)$/i.test(scene.backgroundUrl)
    : false;

  return (
    <AbsoluteFill style={{ background: palette.background, overflow: "hidden" }}>
      {/* Layer 1: Background */}
      {scene.backgroundUrl ? (
        isVideo ? (
          <Video src={scene.backgroundUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <Img src={scene.backgroundUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        )
      ) : (
        /* Gradient fallback when no background is set */
        <AbsoluteFill style={{ background: `linear-gradient(180deg, ${palette.background} 0%, ${palette.primary}33 50%, ${palette.background} 100%)` }} />
      )}

      {/* Layer 2: Avatar slots */}
      {scene.avatarSlots.map((slot) => (
        <AvatarSlotRenderer
          key={slot.key}
          slot={slot}
          url={resolveAvatar(slot.key, inviteProps)}
          startFrame={0}
        />
      ))}

      {/* Layer 3: Text slots (staggered) */}
      {scene.textSlots.map((slot, i) => (
        <TextSlotRenderer
          key={`${slot.key}-${i}`}
          slot={slot}
          text={resolveText(slot.key, slot.customText, inviteProps)}
          startFrame={Math.max(0, scene.avatarSlots.length > 0 ? 15 : 0)}
          staggerIndex={i}
        />
      ))}

      {/* Layer 4: Light leak */}
      <LightLeakOverlay intensity={0.8} />
    </AbsoluteFill>
  );
}

// ─── Universal Template root component ────────────────────────────────────────

export interface UniversalTemplateProps extends InviteProps {
  /** The full DynamicTemplate definition (injected by Root.tsx as inputProps) */
  dynamicTemplate: DynamicTemplate;
}

/**
 * UniversalTemplate — renders any DynamicTemplate from the database.
 *
 * Duration = sum of scene durations (in frames at 30fps).
 * Each scene is a separate <Sequence> so Remotion can handle them independently.
 * Music is a single Jashn.mp3 track across the whole composition.
 */
export function UniversalTemplate({ dynamicTemplate, ...inviteProps }: UniversalTemplateProps) {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();

  const musicVolume = audioVolumeEnvelope(frame, durationInFrames, fps);

  let offset = 0;
  const sceneSequences = dynamicTemplate.scenes.map((scene) => {
    const durationInFrames = Math.round(scene.durationSeconds * fps);
    const from = offset;
    offset += durationInFrames;
    return { scene, from, durationInFrames };
  });

  return (
    <AbsoluteFill>
      {/* Background music */}
      <Audio
        src={inviteProps.audioUrl || inviteProps.musicUrl || staticFile("music/Jashn.mp3")}
        volume={musicVolume}
      />

      {/* Scene sequences */}
      {sceneSequences.map(({ scene, from, durationInFrames: dur }) => (
        <Sequence key={scene.id} from={from} durationInFrames={dur}>
          <SceneRenderer
            scene={scene}
            inviteProps={inviteProps as InviteProps}
            palette={dynamicTemplate.palette}
          />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
