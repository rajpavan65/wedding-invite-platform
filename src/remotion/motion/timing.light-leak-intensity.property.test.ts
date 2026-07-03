// src/remotion/motion/timing.light-leak-intensity.property.test.ts
//
// Feature: invite-product-quality, Property 20: Light-leak intensity resolver is total
// For any template metadata, the resolved light-leak intensity is within
// [0.0, 1.0]; when the metadata defines an intensity in [0.0, 1.0] the resolved
// value equals it, and when it is absent a default within [0.0, 1.0] is
// returned (the overlay is always rendered).
//
// Validates: Requirements 6.6, 6.7

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import type { TemplateMetadata } from "@/lib/schemas";
import {
  resolveLightLeakIntensity,
  DEFAULT_LIGHT_LEAK_INTENSITY,
} from "./timing";

// The resolver only reads `meta.lightLeakIntensity`, so we generate minimal
// metadata-shaped objects carrying just that field (and occasionally noise) and
// cast to the metadata type — the helper is total over any value.
function metaWith(lightLeakIntensity: unknown): TemplateMetadata {
  return { lightLeakIntensity } as unknown as TemplateMetadata;
}

describe("Property 20: Light-leak intensity resolver is total", () => {
  it("returns the declared value when it is within [0, 1]", () => {
    fc.assert(
      fc.property(fc.double({ min: 0, max: 1, noNaN: true }), (intensity) => {
        const resolved = resolveLightLeakIntensity(metaWith(intensity));
        expect(resolved).toBe(intensity);
        expect(resolved).toBeGreaterThanOrEqual(0);
        expect(resolved).toBeLessThanOrEqual(1);
      }),
      { numRuns: 200 },
    );
  });

  it("returns an in-range default when intensity is absent", () => {
    const absent = fc.constantFrom<unknown>(undefined, null);
    fc.assert(
      fc.property(absent, (value) => {
        const resolved = resolveLightLeakIntensity(metaWith(value));
        expect(resolved).toBe(DEFAULT_LIGHT_LEAK_INTENSITY);
        expect(resolved).toBeGreaterThanOrEqual(0);
        expect(resolved).toBeLessThanOrEqual(1);
      }),
      { numRuns: 100 },
    );
  });

  it("is total — always returns a value in [0, 1] for any input", () => {
    const anyValue = fc.oneof(
      fc.double({ noNaN: false }),
      fc.constantFrom<unknown>(
        undefined,
        null,
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY,
        -0.5,
        1.5,
        "0.5",
      ),
    );
    fc.assert(
      fc.property(anyValue, (value) => {
        const resolved = resolveLightLeakIntensity(metaWith(value));
        expect(Number.isFinite(resolved)).toBe(true);
        expect(resolved).toBeGreaterThanOrEqual(0);
        expect(resolved).toBeLessThanOrEqual(1);
      }),
      { numRuns: 200 },
    );
  });
});
