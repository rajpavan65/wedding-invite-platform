// src/remotion/audio/resolveCompositionAudio.fallback.test.ts
//
// Feature: invite-product-quality — unreachable-audio fallback (Task 17.5)
// Asserts that when the selected audio track is unreachable, resolution falls
// back to the ceremony default track, records the fallback, and still returns a
// usable duration so the render completes without interruption.
//
// Validates: Requirements 7.6

import { describe, expect, it, vi } from "vitest";
import { resolveCompositionAudio } from "./resolveCompositionAudio";
import { defaultTrackFor, durationFramesFromAudio } from "./duration";

describe("Unreachable-audio fallback (Req 7.6)", () => {
  it("falls back to the ceremony default track, records the fallback, and completes", async () => {
    const ceremony = "haldi" as const;
    const unreachable = "https://example.com/missing.mp3";
    const fetchDuration = vi.fn(async (src: string) => {
      if (src === unreachable) throw new Error("ENOTFOUND");
      return 30; // the default track resolves fine
    });

    const res = await resolveCompositionAudio({
      audioSrc: unreachable,
      ceremony,
      fps: 30,
      fetchDuration,
    });

    // fallback is recorded
    expect(res.fallbackUsed).toBe(true);
    expect(res.fallbackReason).toContain(unreachable);
    expect(res.audioSrc).toBe(defaultTrackFor(ceremony));

    // render completes: a usable, finite duration is produced from the default track
    expect(res.durationInFrames).toBe(durationFramesFromAudio(30, 30));
    expect(Number.isFinite(res.durationInFrames)).toBe(true);
    expect(res.durationInFrames).toBeGreaterThan(0);

    // the default track was actually consulted
    expect(fetchDuration).toHaveBeenCalledWith(defaultTrackFor(ceremony));
  });

  it("still completes (no throw, finite duration) when even the default track is unreachable", async () => {
    const fetchDuration = vi.fn(async () => {
      throw new Error("offline");
    });

    const res = await resolveCompositionAudio({
      audioSrc: "x.mp3",
      ceremony: "wedding",
      fps: 30,
      fetchDuration,
    });

    expect(res.fallbackUsed).toBe(true);
    expect(res.fallbackReason).toMatch(/unreachable/i);
    expect(res.durationInFrames).toBeGreaterThan(0);
    expect(Number.isFinite(res.durationInFrames)).toBe(true);
  });

  it("uses the primary source without fallback when it is reachable", async () => {
    const fetchDuration = vi.fn(async () => 42);

    const res = await resolveCompositionAudio({
      audioSrc: "ok.mp3",
      ceremony: "sangeet",
      fps: 30,
      fetchDuration,
    });

    expect(res.fallbackUsed).toBe(false);
    expect(res.audioSrc).toBe("ok.mp3");
    expect(res.durationInFrames).toBe(durationFramesFromAudio(42, 30));
    expect(fetchDuration).toHaveBeenCalledTimes(1);
  });
});
