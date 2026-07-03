/**
 * src/remotion/components/AvatarSlot.tsx
 *
 * Layer 2 of the 3-layer compositing model (PRD §5, Design §Components/3).
 *
 * Positions the client's Pixar-style avatar PNG into the slot defined by the
 * template's metadata.json, using the PURE geometry helpers in
 * `../layout/geometry`:
 *   - slot coordinates are scaled proportionally to the actual canvas
 *     (`scaleSlotToCanvas`, Req 3.3),
 *   - the avatar is placed with a SINGLE uniform scale factor so its aspect
 *     ratio is preserved — never stretched/squashed/cropped
 *     (`fitAvatarIntoSlot`, Req 3.1, 3.2; replaces the old non-uniform
 *     scaleX/scaleY stretch bug),
 *   - the placed box is clamped fully inside the safe zone so no part is
 *     clipped by a canvas edge (`clampToSafeZone`, Req 3.6).
 *
 * When no avatar URL is supplied (Standard tier) this renders nothing — the
 * slot shows background only (Req 3.4). If the avatar URL fails to load, the
 * slot falls back to background-only and the failure is recorded, identifying
 * the affected slot (Req 3.7).
 *
 * The spring entrance config (damping 14 / stiffness 120 / mass 0.8) settles
 * within ~0.6s, inside the required 0.5–1.2s window (Req 3.5), verifiable via
 * `entranceDurationSeconds` in the geometry helpers.
 */

import React, { useCallback, useState } from "react";
import {
  AbsoluteFill,
  Img,
  spring,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import {
  scaleSlotToCanvas,
  fitAvatarIntoSlot,
  clampToSafeZone,
  type Size,
} from "../layout/geometry";
import {
  shouldRenderAvatar,
  describeAvatarLoadFailure,
  type SlotCoords,
  type AvatarLoadFailure,
} from "./avatarSlotState";

interface AvatarSlotProps {
  /** S3/CDN URL to a transparent PNG avatar. If undefined, renders nothing. */
  avatarUrl?: string;
  /** Slot coordinates from template metadata.json (1080×1920 reference canvas) */
  slot: SlotCoords;
  /** Frame on which the avatar starts fading in */
  enterFrame?: number;
  /** Flip image horizontally (e.g. for groom slot on the right) */
  flipHorizontal?: boolean;
  /** Opacity at full visibility (0–1) */
  maxOpacity?: number;
  /** Invoked when the avatar URL fails to load, identifying the slot (Req 3.7) */
  onLoadFailure?: (failure: AvatarLoadFailure) => void;
}

/**
 * Avatar assets are generated as 1024×1024 transparent PNGs (Req 1.6), so the
 * intrinsic size used for uniform fitting is square. `fitAvatarIntoSlot` then
 * preserves that 1:1 aspect ratio inside any slot.
 */
const AVATAR_INTRINSIC: Size = { width: 1024, height: 1024 };

/** Spring entrance config — settles in ~0.6s, within the 0.5–1.2s window (Req 3.5). */
const ENTRANCE_SPRING = { damping: 14, stiffness: 120, mass: 0.8 } as const;

export const AvatarSlot: React.FC<AvatarSlotProps> = ({
  avatarUrl,
  slot,
  enterFrame = 60,
  flipHorizontal = false,
  maxOpacity = 1,
  onLoadFailure,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();
  const [loadFailed, setLoadFailed] = useState(false);

  // On load failure: record the failed slot and fall back to background-only (Req 3.7).
  const handleError = useCallback(() => {
    setLoadFailed(true);
    if (avatarUrl) {
      const failure = describeAvatarLoadFailure(slot, avatarUrl);
      console.warn(
        `[AvatarSlot] Avatar failed to load for slot @(${slot.x},${slot.y}); ` +
          `rendering background-only.`,
        failure,
      );
      onLoadFailure?.(failure);
    }
  }, [avatarUrl, slot, onLoadFailure]);

  // Empty slot (Standard tier, Req 3.4) or a load failure (Req 3.7) →
  // render nothing so only the background layer shows in the slot region.
  if (!shouldRenderAvatar(avatarUrl, loadFailed) || !avatarUrl) {
    return null;
  }

  const canvas: Size = { width, height };

  // Proportional slot scaling (Req 3.3) → uniform aspect-preserving fit
  // (Req 3.1, 3.2) → safe-zone containment (Req 3.6).
  const scaledSlot = scaleSlotToCanvas(slot, canvas);
  const fitted = fitAvatarIntoSlot(AVATAR_INTRINSIC, scaledSlot);
  const box = clampToSafeZone(fitted, canvas);

  // Spring-in entrance animation (Req 3.5).
  const progress = spring({
    frame: Math.max(0, frame - enterFrame),
    fps,
    config: ENTRANCE_SPRING,
  });

  const opacity = interpolate(progress, [0, 1], [0, maxOpacity]);
  const translateY = interpolate(progress, [0, 1], [30, 0]);
  const scale = interpolate(progress, [0, 1], [0.92, 1]);

  return (
    <AbsoluteFill>
      <Img
        src={avatarUrl}
        onError={handleError}
        style={{
          position: "absolute",
          left: box.left,
          top: box.top,
          width: box.width,
          height: box.height,
          objectFit: "contain",
          opacity,
          transform: `translateY(${translateY}px) scale(${scale}) scaleX(${flipHorizontal ? -1 : 1})`,
          transformOrigin: "bottom center",
        }}
      />
    </AbsoluteFill>
  );
};

// ─────────────────────────────────────────────────────────────
// Convenience: renders both bride and groom slots from template metadata
// ─────────────────────────────────────────────────────────────

interface AvatarPairProps {
  brideAvatarUrl?: string;
  groomAvatarUrl?: string;
  brideSlot: SlotCoords;
  groomSlot: SlotCoords;
  enterFrame?: number;
  /** Forwarded to each slot to record per-slot avatar load failures (Req 3.7). */
  onLoadFailure?: (failure: AvatarLoadFailure) => void;
}

export const AvatarPair: React.FC<AvatarPairProps> = ({
  brideAvatarUrl,
  groomAvatarUrl,
  brideSlot,
  groomSlot,
  enterFrame = 60,
  onLoadFailure,
}) => (
  <>
    <AvatarSlot
      avatarUrl={brideAvatarUrl}
      slot={brideSlot}
      enterFrame={enterFrame}
      onLoadFailure={onLoadFailure}
    />
    <AvatarSlot
      avatarUrl={groomAvatarUrl}
      slot={groomSlot}
      enterFrame={enterFrame + 10}
      flipHorizontal
      onLoadFailure={onLoadFailure}
    />
  </>
);

export type { SlotCoords, AvatarLoadFailure } from "./avatarSlotState";
