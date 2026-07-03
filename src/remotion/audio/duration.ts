/**
 * Audio & Duration — pure, total helpers for audio-synced composition duration
 * and volume shaping.
 *
 * Design §Components/6 (Audio & Duration). Every function here is pure and
 * total: no throws, no I/O, deterministic for property testing.
 *
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import type { FunctionType } from "@/lib/types";

/** Lower bound (seconds) for a composition's audio-driven duration (Req 7.5). */
export const AUDIO_MIN_SECONDS = 15;

/** Upper bound (seconds) for a composition's audio-driven duration (Req 7.5). */
export const AUDIO_MAX_SECONDS = 90;

/** Fade-in window in milliseconds (Req 7.2). */
const FADE_IN_MS = 1000;

/** Fade-out window in milliseconds (Req 7.3). */
const FADE_OUT_MS = 2000;

/** Fallback frame rate used when an invalid fps is supplied (keeps helpers total). */
const FALLBACK_FPS = 30;

/** Clamp `value` into the inclusive range [min, max]. Non-finite input falls back to `min`. */
function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Coerce an fps value to a usable positive frame rate (keeps callers total). */
function safeFps(fps: number): number {
  return Number.isFinite(fps) && fps > 0 ? fps : FALLBACK_FPS;
}

/**
 * Compute composition `durationInFrames` from an audio length in seconds.
 *
 * `round(clamp(seconds, 15, 90) * fps)`: audio outside the 15–90s range is
 * clamped to the nearest bound before conversion (Req 7.4, 7.5), and the result
 * is rounded to the nearest whole frame (Req 7.1).
 *
 * Total: non-finite `seconds` clamps to the minimum; invalid `fps` falls back
 * to 30 — the function never throws.
 *
 * Requirements: 7.1, 7.4, 7.5
 */
export function durationFramesFromAudio(seconds: number, fps: number): number {
  const clampedSeconds = clamp(seconds, AUDIO_MIN_SECONDS, AUDIO_MAX_SECONDS);
  return Math.round(clampedSeconds * safeFps(fps));
}

/**
 * Audio volume multiplier for a given frame, shaping a fade-in over the first
 * 1000ms and a fade-out over the final 2000ms.
 *
 * Guarantees (Req 7.2, 7.3):
 *  - 0 at the first frame (frame 0)
 *  - full volume (1) by the end of the 1000ms fade-in
 *  - full volume until 2000ms before the end
 *  - 0 at the final frame (`durationInFrames - 1`)
 *  - every returned value lies within [0, 1]
 *
 * The envelope is the minimum of the fade-in and fade-out ramps, so for very
 * short compositions (where the windows overlap) it degrades gracefully while
 * still honouring the [0,1] bound and the zero endpoints.
 *
 * Total: invalid `fps`/`durationInFrames` and out-of-range `frame` values are
 * handled without throwing.
 *
 * Requirements: 7.2, 7.3
 */
export function audioVolumeEnvelope(
  frame: number,
  durationInFrames: number,
  fps: number,
): number {
  const effectiveFps = safeFps(fps);
  const lastFrame = Math.max(0, Math.floor(durationInFrames) - 1);

  // Degenerate composition (0 or 1 frame): nothing to fade.
  if (lastFrame <= 0) return 0;

  const f = Number.isFinite(frame) ? frame : 0;

  const fadeInFrames = (FADE_IN_MS / 1000) * effectiveFps;
  const fadeOutFrames = (FADE_OUT_MS / 1000) * effectiveFps;

  // Rising ramp: 0 at frame 0 → 1 at end of the fade-in window.
  const fadeIn = fadeInFrames > 0 ? clamp(f / fadeInFrames, 0, 1) : 1;

  // Falling ramp: 1 until the fade-out window begins → 0 at the final frame.
  const fadeOut =
    fadeOutFrames > 0 ? clamp((lastFrame - f) / fadeOutFrames, 0, 1) : 1;

  return clamp(Math.min(fadeIn, fadeOut), 0, 1);
}

/**
 * PLACEHOLDER default-track mapping per ceremony type (Req 7.6).
 *
 * The curated per-ceremony audio library is not built yet, so every ceremony
 * currently resolves to the one track shipped in `public/music/Jashn.mp3`.
 * When the real library lands, replace the individual entries below — the
 * shape (one path per FunctionType) is intentionally explicit so swapping in
 * ceremony-specific tracks is a one-line change per ceremony.
 */
const DEFAULT_TRACK_FALLBACK = "/music/Jashn.mp3";

const DEFAULT_TRACKS: Record<FunctionType, string> = {
  // TODO: replace each placeholder with a curated ceremony-specific track.
  haldi: DEFAULT_TRACK_FALLBACK,
  mehandi: DEFAULT_TRACK_FALLBACK,
  sangeet: DEFAULT_TRACK_FALLBACK,
  wedding: DEFAULT_TRACK_FALLBACK,
  reception: DEFAULT_TRACK_FALLBACK,
  baraat: DEFAULT_TRACK_FALLBACK,
};

/**
 * Resolve the default audio track path for a ceremony type, used as the
 * fallback when the selected track is unreachable (Req 7.6).
 *
 * Total: an unrecognised ceremony value resolves to the universal fallback
 * rather than throwing.
 *
 * Requirements: 7.6
 */
export function defaultTrackFor(ceremony: FunctionType): string {
  return DEFAULT_TRACKS[ceremony] ?? DEFAULT_TRACK_FALLBACK;
}
