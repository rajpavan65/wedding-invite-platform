/**
 * src/remotion/components/autoScaleText.test.ts
 *
 * Feature: invite-product-quality
 *
 * Unit tests for the Text Renderer positioning and font-fallback behaviour
 * backing `AutoScaleText`:
 *   - Text is positioned at the template `textSlots` coordinates (Req 5.7) and
 *     stays within the Safe_Zone (Req 5.8).
 *   - On font-load failure the defined fallback family is used AND the failure
 *     is recorded (Req 5.9).
 *
 * These exercise the PURE render-decision helpers (`resolveTextSlotBox`,
 * `resolveFontFamily`) that drive `AutoScaleText`, so behaviour is verified
 * without a DOM or a full Remotion render — the same pattern as
 * `avatarSlotState.test.ts`.
 *
 * **Validates: Requirements 5.7, 5.9**
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  resolveTextSlotBox,
  textBlockHeight,
  resolveFontFamily,
  recordFontLoadFailure,
  getRecordedFontLoadFailures,
  clearRecordedFontLoadFailures,
  type FontLoadFailure,
} from "./autoScaleTextLayout";
import { SAFE_ZONE_INSET, REF_CANVAS } from "../layout/geometry";
import { DEFAULT_FALLBACK_FONT_FAMILY } from "../utils/luxuryFonts";

const EPSILON = 1e-6;

describe("resolveTextSlotBox — positioning at textSlots coordinates (Req 5.7, 5.8)", () => {
  it("centres a fitted text block on the slot's center anchor on the reference canvas", () => {
    // haldi-floral primaryName slot.
    const slot = { x: 540, y: 1400, maxWidth: 900 };
    const blockHeight = textBlockHeight(84, 1, 1.3); // ~109px
    const box = resolveTextSlotBox(slot, blockHeight, REF_CANVAS);

    // Horizontal center stays on the slot's x (well within safe zone).
    expect(box.left + box.width / 2).toBeCloseTo(540, 6);
    // Vertical center stays on the slot's y.
    expect(box.top + box.height / 2).toBeCloseTo(1400, 6);
    // Width follows the slot maxWidth.
    expect(box.width).toBeCloseTo(900, 6);
  });

  it("scales slot coordinates proportionally to a non-reference canvas", () => {
    const slot = { x: 540, y: 960, maxWidth: 540 };
    const canvas = { width: 540, height: 960 }; // half-scale on both axes
    const blockHeight = textBlockHeight(40, 1, 1.3);
    const box = resolveTextSlotBox(slot, blockHeight, canvas);

    // Center scales by canvas.width/1080 = 0.5 and canvas.height/1920 = 0.5.
    expect(box.left + box.width / 2).toBeCloseTo(270, 6);
    expect(box.top + box.height / 2).toBeCloseTo(480, 6);
    expect(box.width).toBeCloseTo(270, 6);
  });

  it("keeps the text block within the Safe_Zone even for an off-canvas slot (Req 5.8)", () => {
    const slot = { x: 2000, y: -500, maxWidth: 400 };
    const blockHeight = textBlockHeight(60, 2, 1.3);
    const box = resolveTextSlotBox(slot, blockHeight, REF_CANVAS);

    expect(box.left).toBeGreaterThanOrEqual(SAFE_ZONE_INSET - EPSILON);
    expect(box.top).toBeGreaterThanOrEqual(SAFE_ZONE_INSET - EPSILON);
    expect(box.left + box.width).toBeLessThanOrEqual(
      REF_CANVAS.width - SAFE_ZONE_INSET + EPSILON,
    );
    expect(box.top + box.height).toBeLessThanOrEqual(
      REF_CANVAS.height - SAFE_ZONE_INSET + EPSILON,
    );
  });
});

describe("resolveFontFamily — font fallback on load failure (Req 5.9)", () => {
  beforeEach(() => {
    clearRecordedFontLoadFailures();
  });

  it("uses the requested luxury family when it is loaded (no failure recorded)", () => {
    const recorded: FontLoadFailure[] = [];
    const resolved = resolveFontFamily({
      requestedFamily: "Playfair Display",
      isFontLoaded: () => true,
      record: (f) => recorded.push(f),
    });

    expect(resolved.family).toBe("Playfair Display");
    expect(resolved.failed).toBe(false);
    expect(recorded).toHaveLength(0);
  });

  it("falls back to the default family AND records the failure when the font fails to load", () => {
    const recorded: FontLoadFailure[] = [];
    const resolved = resolveFontFamily({
      requestedFamily: "Great Vibes",
      isFontLoaded: () => false,
      record: (f) => recorded.push(f),
    });

    expect(resolved.failed).toBe(true);
    expect(resolved.family).toBe(DEFAULT_FALLBACK_FONT_FAMILY);
    expect(recorded).toHaveLength(1);
    expect(recorded[0].requestedFamily).toBe("Great Vibes");
    expect(recorded[0].fallbackFamily).toBe(DEFAULT_FALLBACK_FONT_FAMILY);
    expect(typeof recorded[0].at).toBe("string");
  });

  it("uses a caller-provided fallback family when supplied", () => {
    const resolved = resolveFontFamily({
      requestedFamily: "Cormorant Garamond",
      isFontLoaded: () => false,
      fallbackFamily: "Times New Roman, serif",
      record: () => {},
    });
    expect(resolved.family).toBe("Times New Roman, serif");
    expect(resolved.failed).toBe(true);
  });

  it("treats a throwing font probe as a load failure (safe fallback)", () => {
    const recorded: FontLoadFailure[] = [];
    const resolved = resolveFontFamily({
      requestedFamily: "Playfair Display",
      isFontLoaded: () => {
        throw new Error("measureText() can only be called in a browser.");
      },
      record: (f) => recorded.push(f),
    });
    expect(resolved.failed).toBe(true);
    expect(resolved.family).toBe(DEFAULT_FALLBACK_FONT_FAMILY);
    expect(recorded).toHaveLength(1);
  });

  it("records failures to the module-level recorder by default", () => {
    expect(getRecordedFontLoadFailures()).toHaveLength(0);
    resolveFontFamily({
      requestedFamily: "Great Vibes",
      isFontLoaded: () => false,
    });
    const failures = getRecordedFontLoadFailures();
    expect(failures).toHaveLength(1);
    expect(failures[0].requestedFamily).toBe("Great Vibes");
  });

  it("recordFontLoadFailure accumulates and clear resets", () => {
    recordFontLoadFailure({
      requestedFamily: "A",
      fallbackFamily: "B",
      at: new Date().toISOString(),
    });
    expect(getRecordedFontLoadFailures().length).toBeGreaterThan(0);
    clearRecordedFontLoadFailures();
    expect(getRecordedFontLoadFailures()).toHaveLength(0);
  });
});
