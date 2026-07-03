/**
 * resolveCompositionAudio — async audio-source resolution for `calculateMetadata`.
 *
 * Wraps the pure `durationFramesFromAudio` (clamp + round) around a real audio
 * length lookup, and implements the unreachable-audio fallback (Req 7.6):
 * when the selected track cannot be reached, fall back to the ceremony's
 * default track, record the fallback, and still return a usable duration so the
 * render completes without interruption.
 *
 * The audio-length lookup is injected (`fetchDuration`) so this resolver is
 * unit-testable without network/Remotion I/O. In production `Root.tsx` passes
 * `@remotion/media-utils`' `getAudioDurationInSeconds`.
 *
 * Requirements: 7.1, 7.6; Design §Components/6
 */

import type { FunctionType } from "@/lib/types";
import {
  AUDIO_MIN_SECONDS,
  defaultTrackFor,
  durationFramesFromAudio,
} from "./duration";

/** Resolves an audio source to its length in seconds (may reject if unreachable). */
export type AudioDurationFetcher = (src: string) => Promise<number>;

export interface AudioResolution {
  /** Composition duration in frames, always finite and > 0 (Req 7.1, 7.6). */
  durationInFrames: number;
  /** The audio source actually used (primary, or the ceremony default on fallback). */
  audioSrc: string;
  /** True when the primary source was unreachable and a default track was used (Req 7.6). */
  fallbackUsed: boolean;
  /** Human-readable reason for the fallback, recorded for diagnostics (Req 7.6). */
  fallbackReason?: string;
}

/**
 * Resolve the composition duration from the selected audio track, falling back
 * to the ceremony default track when the primary source is unreachable.
 *
 * Total: never throws. If even the default track is unreachable, the duration
 * is clamped to the minimum audio length so the render still completes.
 */
export async function resolveCompositionAudio(args: {
  audioSrc: string | undefined;
  ceremony: FunctionType;
  fps: number;
  fetchDuration: AudioDurationFetcher;
}): Promise<AudioResolution> {
  const { audioSrc, ceremony, fps, fetchDuration } = args;

  // 1. Try the selected audio source.
  if (audioSrc) {
    try {
      const seconds = await fetchDuration(audioSrc);
      return {
        durationInFrames: durationFramesFromAudio(seconds, fps),
        audioSrc,
        fallbackUsed: false,
      };
    } catch {
      // fall through to the ceremony default track (Req 7.6)
    }
  }

  // 2. Fall back to the ceremony default track and record the fallback.
  const fallbackTrack = defaultTrackFor(ceremony);
  const fallbackReason = audioSrc
    ? `selected audio unreachable (${audioSrc}); fell back to default track for ${ceremony}`
    : `no audio source supplied; using default track for ${ceremony}`;

  try {
    const seconds = await fetchDuration(fallbackTrack);
    return {
      durationInFrames: durationFramesFromAudio(seconds, fps),
      audioSrc: fallbackTrack,
      fallbackUsed: true,
      fallbackReason,
    };
  } catch {
    // 3. Even the default track is unreachable: clamp to the minimum length so
    //    the render still completes without interruption (Req 7.6).
    return {
      durationInFrames: durationFramesFromAudio(AUDIO_MIN_SECONDS, fps),
      audioSrc: fallbackTrack,
      fallbackUsed: true,
      fallbackReason: `${fallbackReason}; default track also unreachable, clamped to ${AUDIO_MIN_SECONDS}s`,
    };
  }
}
