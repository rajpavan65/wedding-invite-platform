/**
 * src/remotion/compositions/compositionMotion.test.ts
 *
 * Feature: invite-product-quality
 *
 * Unit tests for the Motion System wiring across the four compositions
 * (task 16.4). These verify the structural motion invariants WITHOUT a DOM or
 * a full Remotion render, by asserting on:
 *   - the per-composition motion descriptors each composition exports
 *     (built from the shared MOTION_LAYER_STACK), and
 *   - the pure CeremonyLottie helpers.
 *
 * Covered acceptance criteria:
 *   - 6.2: the light leak is the topmost visual layer of every composition.
 *   - 6.4: a ceremony-specific decorative Lottie is present and matches the
 *          template's ceremony/key motif.
 *   - 6.8: a missing ceremony Lottie falls back (renders nothing, records the
 *          error) WITHOUT aborting the render.
 *
 * **Validates: Requirements 6.2, 6.4, 6.8**
 */

import { describe, it, expect } from "vitest";

import { haldiFloralMotion } from "./HaldiFloral";
import { mehandiTraditionalMotion } from "./MehandiTraditional";
import { sangeetGrandMotion } from "./SangeetGrand";
import { royalRajasthaniMotion } from "./RoyalRajasthani";
import { receptionLuxuryMotion } from "./ReceptionLuxury";
import { baraatRoyalMotion } from "./BaraatRoyal";
import { sangeetNeonMotion } from "./SangeetNeon";
import { haldiModernMotion } from "./HaldiModern";
import { mehandiPastelMotion } from "./MehandiPastel";
import { weddingDivineMotion } from "./WeddingDivine";
import { receptionGardenMotion } from "./ReceptionGarden";

import {
  TOPMOST_MOTION_LAYER,
  isTopmostLayer,
  type CompositionMotionDescriptor,
} from "../motion/motionLayers";
import {
  resolveCeremonyLottieSource,
  ceremonyLottieFallback,
} from "../motion/CeremonyLottie";

const ALL_COMPOSITIONS: CompositionMotionDescriptor[] = [
  haldiFloralMotion,
  mehandiTraditionalMotion,
  sangeetGrandMotion,
  royalRajasthaniMotion,
  receptionLuxuryMotion,
  baraatRoyalMotion,
  sangeetNeonMotion,
  haldiModernMotion,
  mehandiPastelMotion,
  weddingDivineMotion,
  receptionGardenMotion,
];

describe("Motion layer stack — light leak is the topmost layer (Req 6.2)", () => {
  it("declares the light leak as the single topmost layer", () => {
    expect(TOPMOST_MOTION_LAYER).toBe("lightLeak");
    expect(isTopmostLayer("lightLeak")).toBe(true);
    expect(isTopmostLayer("content")).toBe(false);
    expect(isTopmostLayer("decorativeLottie")).toBe(false);
    expect(isTopmostLayer("background")).toBe(false);
  });

  it.each(ALL_COMPOSITIONS)(
    "$templateId renders the light leak above all content layers",
    (motion) => {
      const layers = motion.layers;
      // Last layer (topmost) is the light leak.
      expect(layers[layers.length - 1]).toBe("lightLeak");
      // The light leak sits strictly above the content and decorative layers.
      const leakIndex = layers.indexOf("lightLeak");
      expect(leakIndex).toBeGreaterThan(layers.indexOf("content"));
      expect(leakIndex).toBeGreaterThan(layers.indexOf("decorativeLottie"));
      // Exactly one light-leak layer.
      expect(layers.filter((l) => l === "lightLeak")).toHaveLength(1);
    },
  );
});

describe("Ceremony decorative Lottie is present and motif-matched (Req 6.4)", () => {
  it.each(ALL_COMPOSITIONS)(
    "$templateId mounts a decorative Lottie layer with a resolvable motif source",
    (motion) => {
      // The decorative Lottie layer is part of the composition stack.
      expect(motion.layers).toContain("decorativeLottie");
      // A ceremony-specific Lottie source is configured for this ceremony type
      // (the basename encodes the motif), so the overlay matches the key motif.
      const source = resolveCeremonyLottieSource(motion.ceremonyType);
      expect(typeof source).toBe("string");
      expect(source && source.length).toBeGreaterThan(0);
      expect(source).toMatch(/\.json$/);
    },
  );

  it("maps each ceremony type to a distinct motif asset where themed", () => {
    expect(resolveCeremonyLottieSource("haldi")).toContain("haldi");
    expect(resolveCeremonyLottieSource("mehandi")).toContain("mehandi");
    expect(resolveCeremonyLottieSource("sangeet")).toContain("sangeet");
    expect(resolveCeremonyLottieSource("wedding")).toContain("wedding");
  });
});

describe("Missing ceremony Lottie falls back without aborting (Req 6.8)", () => {
  it("renders nothing and records the error when the asset is unavailable, without aborting", () => {
    const fallback = ceremonyLottieFallback(false);
    expect(fallback.rendersOverlay).toBe(false);
    expect(fallback.recordsError).toBe(true);
    // The render is NEVER aborted on a missing/failed decorative overlay.
    expect(fallback.abortsRender).toBe(false);
  });

  it("renders the overlay and never aborts when the asset is available", () => {
    const fallback = ceremonyLottieFallback(true);
    expect(fallback.rendersOverlay).toBe(true);
    expect(fallback.recordsError).toBe(false);
    expect(fallback.abortsRender).toBe(false);
  });
});
