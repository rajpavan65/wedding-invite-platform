/**
 * src/remotion/components/avatarSlotState.ts
 *
 * Pure, runtime-free decision helpers for `AvatarSlot` (Design §Components/3).
 *
 * These functions carry NO React/Remotion runtime dependency so the high-value
 * compositing-gate behaviour (empty slot → nothing rendered; load failure →
 * background-only + recorded slot) is unit/property-testable in a plain Node
 * environment without spinning up a renderer or a DOM.
 *
 * Requirements: 3.4 (empty slot for Standard tier), 3.7 (load-failure fallback).
 */

/** A template avatar slot authored against the 1080×1920 reference canvas. */
export interface SlotCoords {
  x: number;
  y: number;
  width: number;
  height: number;
  anchorBottom?: boolean;
}

/** A recorded avatar-asset load failure that identifies the affected slot (Req 3.7). */
export interface AvatarLoadFailure {
  /** The slot whose avatar failed to load. */
  slot: SlotCoords;
  /** The avatar URL that failed to load. */
  avatarUrl: string;
}

/**
 * The single render decision for an avatar slot.
 *
 * Returns `true` only when an avatar URL is present AND it has not failed to
 * load. When this is `false` the component renders `null` — the slot shows the
 * background layer only, with no placeholder graphic, partial pixels, or
 * residual overlay (Req 3.4 Standard tier; Req 3.7 load failure).
 */
export function shouldRenderAvatar(
  avatarUrl: string | undefined,
  loadFailed: boolean,
): boolean {
  return Boolean(avatarUrl) && !loadFailed;
}

/**
 * Build the load-failure record for a slot whose avatar URL failed to load
 * (Req 3.7). The record identifies the affected slot so the failure can be
 * logged/surfaced while the render falls back to background-only.
 */
export function describeAvatarLoadFailure(
  slot: SlotCoords,
  avatarUrl: string,
): AvatarLoadFailure {
  return { slot: { ...slot }, avatarUrl };
}
