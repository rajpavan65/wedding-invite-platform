// src/remotion/audio/duration.audio-driven-duration.property.test.ts
//
// Feature: invite-product-quality, Property 22: Audio-driven duration
// For any audio length in seconds and frame rate, durationInFrames equals
// round(clamp(seconds, 15, 90) * fps); consequently for lengths in 15–90s it
// matches round(seconds * fps) within ±1 frame, and lengths below 15s or above
// 90s are clamped to the nearest bound before conversion.
//
// Validates: Requirements 7.1, 7.4, 7.5

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  AUDIO_MAX_SECONDS,
  AUDIO_MIN_SECONDS,
  durationFramesFromAudio,
} from "./duration";

const clamp = (v: number, min: number, max: number) =>
  Math.min(Math.max(v, min), max);

describe("Property 22: Audio-driven duration", () => {
  it("equals round(clamp(seconds, 15, 90) * fps) for any finite input", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -200, max: 400, noNaN: true }),
        fc.integer({ min: 1, max: 120 }),
        (seconds, fps) => {
          const expected = Math.round(
            clamp(seconds, AUDIO_MIN_SECONDS, AUDIO_MAX_SECONDS) * fps,
          );
          expect(durationFramesFromAudio(seconds, fps)).toBe(expected);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("matches round(seconds * fps) within ±1 frame for lengths in 15–90s", () => {
    fc.assert(
      fc.property(
        fc.double({ min: AUDIO_MIN_SECONDS, max: AUDIO_MAX_SECONDS, noNaN: true }),
        fc.constantFrom(24, 25, 30, 48, 60),
        (seconds, fps) => {
          const frames = durationFramesFromAudio(seconds, fps);
          expect(Math.abs(frames - Math.round(seconds * fps))).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 300 },
    );
  });

  it("clamps lengths below 15s to the 15s bound before conversion", () => {
    fc.assert(
      fc.property(
        fc.double({ min: -200, max: AUDIO_MIN_SECONDS, noNaN: true }),
        fc.integer({ min: 1, max: 120 }),
        (seconds, fps) => {
          expect(durationFramesFromAudio(seconds, fps)).toBe(
            Math.round(AUDIO_MIN_SECONDS * fps),
          );
        },
      ),
      { numRuns: 200 },
    );
  });

  it("clamps lengths above 90s to the 90s bound before conversion", () => {
    fc.assert(
      fc.property(
        fc.double({ min: AUDIO_MAX_SECONDS, max: 600, noNaN: true }),
        fc.integer({ min: 1, max: 120 }),
        (seconds, fps) => {
          expect(durationFramesFromAudio(seconds, fps)).toBe(
            Math.round(AUDIO_MAX_SECONDS * fps),
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});
