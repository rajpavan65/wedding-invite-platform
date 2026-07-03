// src/remotion/layout/geometry.entrance-settle.property.test.ts
//
// Feature: invite-product-quality, Property 11: Avatar entrance settle time
// For any supported frame rate, the avatar spring entrance settles to its
// final position and scale within a duration between 0.5 and 1.2 seconds
// inclusive.
//
// Validates: Requirements 3.5

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { measureSpring } from "remotion";
import { entranceDurationSeconds } from "./geometry";

// The spring config the Compositing Engine (AvatarSlot) uses for the avatar
// entrance — tuned so the settle time lands in the 0.5–1.2s window (design
// §Components/3). Property 11 quantifies over the supported frame rates.
const AVATAR_SPRING_CONFIG = { damping: 14, stiffness: 120, mass: 0.8 } as const;

const SUPPORTED_FPS = [24, 25, 30, 48, 50, 60];

describe("Property 11: Avatar entrance settle time", () => {
  it("settles within [0.5, 1.2]s for every supported frame rate", () => {
    fc.assert(
      fc.property(fc.constantFrom(...SUPPORTED_FPS), (fps) => {
        const seconds = entranceDurationSeconds(AVATAR_SPRING_CONFIG, fps);

        expect(seconds).toBeGreaterThanOrEqual(0.5);
        expect(seconds).toBeLessThanOrEqual(1.2);

        // The pure helper must agree with Remotion's own spring measurement,
        // so what we verify here is exactly what the renderer animates.
        const remotionSeconds = measureSpring({ fps, config: AVATAR_SPRING_CONFIG }) / fps;
        expect(Math.abs(seconds - remotionSeconds)).toBeLessThan(1e-9);
      }),
      { numRuns: 100 },
    );
  });
});
