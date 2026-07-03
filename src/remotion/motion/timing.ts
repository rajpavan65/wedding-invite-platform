/**
 * src/remotion/motion/timing.ts
 *
 * Pure, total motion-timing helpers for the Motion System (Design §Components/5).
 *
 * Every function here is deterministic and total — it never throws and always
 * returns a value within its documented bounds, even for non-finite or
 * out-of-range input. This keeps the helpers property-testable without running
 * a full Remotion render.
 *
 * Requirements: 6.1, 6.3, 6.5, 6.6, 6.7, 6.9
 */

import type { TemplateMetadata } from "@/lib/schemas";

// ─────────────────────────────────────────────────────────────
// Bounds and defaults
// ─────────────────────────────────────────────────────────────

/** Peak opacity cap for the light-leak overlay (Req 6.3 — never above 35%). */
export const LIGHT_LEAK_MAX_OPACITY = 0.35;

/** Default light-leak intensity used when a template declares none (Req 6.7). */
export const DEFAULT_LIGHT_LEAK_INTENSITY = 0.5;

/** Entrance-duration bounds in seconds (Req 6.1). */
export const ENTRANCE_DURATION_MIN_SECONDS = 0.3;
export const ENTRANCE_DURATION_MAX_SECONDS = 1.5;

/** Default entrance duration (seconds) used for non-finite input — within bounds. */
export const DEFAULT_ENTRANCE_DURATION_SECONDS = 0.6;

/** Scene-transition duration bounds in seconds (Req 6.5). */
export const TRANSITION_DURATION_MIN_SECONDS = 0.3;
export const TRANSITION_DURATION_MAX_SECONDS = 1.0;

/** Default transition duration (seconds) used for non-finite input — within bounds. */
export const DEFAULT_TRANSITION_DURATION_SECONDS = 0.5;

/**
 * Frame on which the Background_Template entrance completes. Avatar and text
 * entrances must not begin before this frame (Req 6.9). Authored against the
 * fixed 30fps render config (24 frames ≈ 0.8s, within the 0.3–1.5s window).
 */
export const BACKGROUND_ENTRANCE_FRAMES = 24;

// ─────────────────────────────────────────────────────────────
// Internal helpers (pure, total)
// ─────────────────────────────────────────────────────────────

const isFiniteNumber = (n: number): boolean =>
  typeof n === "number" && Number.isFinite(n);

/** Clamp `n` into [min, max]. Assumes min <= max. */
const clamp = (n: number, min: number, max: number): number =>
  n < min ? min : n > max ? max : n;

/** Clamp into [0, 1]. */
const clamp01 = (n: number): number => clamp(n, 0, 1);

// ─────────────────────────────────────────────────────────────
// Light-leak helpers
// ─────────────────────────────────────────────────────────────

/**
 * Opacity of the light-leak overlay at a given frame.
 *
 * The leak reveals over the first half of its duration and retracts over the
 * second half (a triangular envelope peaking at the midpoint), scaled by
 * `intensity`. The result is always within [0, {@link LIGHT_LEAK_MAX_OPACITY}]
 * so the overlay never obscures text or avatars beneath it (Req 6.3).
 *
 * Total: non-finite or out-of-range inputs yield 0 or a clamped value.
 */
export function lightLeakOpacity(
  frame: number,
  durationInFrames: number,
  intensity: number
): number {
  if (!isFiniteNumber(durationInFrames) || durationInFrames <= 0) {
    return 0;
  }

  const i = clamp01(isFiniteNumber(intensity) ? intensity : DEFAULT_LIGHT_LEAK_INTENSITY);
  const f = isFiniteNumber(frame) ? clamp(frame, 0, durationInFrames) : 0;

  const half = durationInFrames / 2;
  // Guard against degenerate/subnormal durations where `half` underflows to 0,
  // which would make the envelope 0/0 = NaN. With no positive half-span there
  // is no leak to reveal, so the opacity is 0.
  if (!(half > 0)) {
    return 0;
  }
  // Triangular envelope in [0, 1]: 0 at the edges, 1 at the midpoint.
  const envelopeRaw = f <= half ? f / half : (durationInFrames - f) / half;
  const envelope = isFiniteNumber(envelopeRaw) ? envelopeRaw : 0;

  const raw = LIGHT_LEAK_MAX_OPACITY * i * clamp01(envelope);

  // Belt-and-suspenders cap (Req 6.3).
  return clamp(raw, 0, LIGHT_LEAK_MAX_OPACITY);
}

/**
 * Resolve a template's light-leak intensity.
 *
 * Returns the template's declared `lightLeakIntensity` when it is defined and a
 * finite value within [0, 1]; otherwise returns {@link DEFAULT_LIGHT_LEAK_INTENSITY}.
 * The result is always within [0, 1] so the overlay is always rendered
 * (Req 6.6, 6.7). Total: never throws.
 */
export function resolveLightLeakIntensity(meta: TemplateMetadata): number {
  const declared = meta?.lightLeakIntensity;
  if (declared !== undefined && isFiniteNumber(declared) && declared >= 0 && declared <= 1) {
    return declared;
  }
  return DEFAULT_LIGHT_LEAK_INTENSITY;
}

// ─────────────────────────────────────────────────────────────
// Duration clamps
// ─────────────────────────────────────────────────────────────

/**
 * Clamp a requested entrance duration into the allowed range
 * [{@link ENTRANCE_DURATION_MIN_SECONDS}, {@link ENTRANCE_DURATION_MAX_SECONDS}]
 * so no entrance is shorter than 0.3s or longer than 1.5s (Req 6.1).
 * Non-finite input resolves to {@link DEFAULT_ENTRANCE_DURATION_SECONDS}.
 */
export function clampEntranceDuration(seconds: number): number {
  if (!isFiniteNumber(seconds)) {
    return DEFAULT_ENTRANCE_DURATION_SECONDS;
  }
  return clamp(seconds, ENTRANCE_DURATION_MIN_SECONDS, ENTRANCE_DURATION_MAX_SECONDS);
}

/**
 * Clamp a requested scene-transition duration into the allowed range
 * [{@link TRANSITION_DURATION_MIN_SECONDS}, {@link TRANSITION_DURATION_MAX_SECONDS}]
 * so transitions are never instant hard cuts (Req 6.5).
 * Non-finite input resolves to {@link DEFAULT_TRANSITION_DURATION_SECONDS}.
 */
export function clampTransitionDuration(seconds: number): number {
  if (!isFiniteNumber(seconds)) {
    return DEFAULT_TRANSITION_DURATION_SECONDS;
  }
  return clamp(seconds, TRANSITION_DURATION_MIN_SECONDS, TRANSITION_DURATION_MAX_SECONDS);
}

// ─────────────────────────────────────────────────────────────
// Entrance sequencing (Req 6.9)
// ─────────────────────────────────────────────────────────────

/**
 * Compute the earliest start frame for a foreground (avatar or text) entrance,
 * ensuring it begins at or after the Background_Template entrance completes
 * (Req 6.9). The returned frame is never earlier than `backgroundEntranceFrames`.
 *
 * Total: non-finite `requestedStartFrame` is treated as 0 (i.e. "as early as
 * allowed"); fractional/negative requests are floored at the gate.
 */
export function foregroundEntranceStartFrame(
  requestedStartFrame: number,
  backgroundEntranceFrames: number = BACKGROUND_ENTRANCE_FRAMES
): number {
  const gate = isFiniteNumber(backgroundEntranceFrames)
    ? Math.max(0, backgroundEntranceFrames)
    : BACKGROUND_ENTRANCE_FRAMES;
  const requested = isFiniteNumber(requestedStartFrame) ? requestedStartFrame : 0;
  return Math.max(gate, requested);
}

/**
 * Convenience predicate: does a foreground element's start frame respect the
 * background-entrance gate (Req 6.9)? Useful for validation/assertions.
 */
export function startsAfterBackgroundEntrance(
  startFrame: number,
  backgroundEntranceFrames: number = BACKGROUND_ENTRANCE_FRAMES
): boolean {
  if (!isFiniteNumber(startFrame)) {
    return false;
  }
  const gate = isFiniteNumber(backgroundEntranceFrames)
    ? Math.max(0, backgroundEntranceFrames)
    : BACKGROUND_ENTRANCE_FRAMES;
  return startFrame >= gate;
}
