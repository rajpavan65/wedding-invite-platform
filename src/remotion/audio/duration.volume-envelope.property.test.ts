// src/remotion/audio/duration.volume-envelope.property.test.ts
//
// Feature: invite-product-quality, Property 23: Audio volume envelope
// For any composition duration and frame rate, the audio volume envelope is 0
// at the first frame, reaches full volume by 1000ms, remains at full volume
// until 2000ms before the end, and returns to 0 at the final frame, with all
// values within [0, 1].
//
// Validates: Requirements 7.2, 7.3

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { audioVolumeEnvelope, durationFramesFromAudio } from "./duration";

// fps choices; seconds kept in the valid 15–90s window so the fade-in (1000ms)
// and fade-out (2000ms) windows never overlap.
const fpsArb = fc.constantFrom(24, 25, 30, 48, 60);
const secondsArb = fc.integer({ min: 15, max: 90 });

describe("Property 23: Audio volume envelope", () => {
  it("is 0 at first frame, full by 1000ms, full until 2000ms before end, 0 at final frame", () => {
    fc.assert(
      fc.property(secondsArb, fpsArb, (seconds, fps) => {
        const duration = durationFramesFromAudio(seconds, fps);
        const lastFrame = duration - 1;

        // 0 at the first frame (Req 7.2)
        expect(audioVolumeEnvelope(0, duration, fps)).toBe(0);

        // full volume by the end of the 1000ms fade-in (frame = fps) (Req 7.2)
        expect(audioVolumeEnvelope(fps, duration, fps)).toBeCloseTo(1, 10);

        // still full at 2000ms before the end (start of fade-out) (Req 7.3)
        expect(
          audioVolumeEnvelope(lastFrame - 2 * fps, duration, fps),
        ).toBeCloseTo(1, 10);

        // 0 at the final frame (Req 7.3)
        expect(audioVolumeEnvelope(lastFrame, duration, fps)).toBe(0);
      }),
      { numRuns: 300 },
    );
  });

  it("returns values within [0, 1] for any frame (including out-of-range)", () => {
    fc.assert(
      fc.property(
        secondsArb,
        fpsArb,
        fc.integer({ min: -100, max: 10_000 }),
        (seconds, fps, frame) => {
          const duration = durationFramesFromAudio(seconds, fps);
          const v = audioVolumeEnvelope(frame, duration, fps);
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        },
      ),
      { numRuns: 400 },
    );
  });

  it("is monotonically non-decreasing across the fade-in window", () => {
    fc.assert(
      fc.property(secondsArb, fpsArb, (seconds, fps) => {
        const duration = durationFramesFromAudio(seconds, fps);
        for (let f = 1; f <= Math.floor(fps); f++) {
          expect(audioVolumeEnvelope(f, duration, fps)).toBeGreaterThanOrEqual(
            audioVolumeEnvelope(f - 1, duration, fps),
          );
        }
      }),
      { numRuns: 100 },
    );
  });
});
