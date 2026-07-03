// src/lib/template-metadata.invalid-rejected.property.test.ts
//
// Feature: invite-product-quality, Property 15: Invalid metadata rejected with field error
// For any template metadata in which a required field (`visualIdentity`,
// `avatarSlots`, or `textSlots`) is missing or invalid, registration is rejected
// with an error identifying the failing field, and the template is not registered.
//
// Validates: Requirements 4.8, 9.1

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { validateTemplateMetadata } from "./template-metadata";

// A fully valid metadata baseline. Each generated case corrupts exactly one of
// the three required fields so the registration result must name that field.
function validBaseMetadata() {
  return {
    templateId: "fixture-template",
    functionType: "haldi" as const,
    durationFrames: 390,
    thumbnailFrame: 90,
    avatarSlots: {
      bride: { x: 100, y: 920, width: 380, height: 500, anchorBottom: false },
      groom: { x: 600, y: 920, width: 380, height: 500, anchorBottom: false },
    },
    textSlots: {
      primaryName: { x: 540, y: 1400, maxWidth: 900, fontFamily: "Playfair Display" },
      secondaryName: { x: 540, y: 1520, maxWidth: 900, fontFamily: "Playfair Display" },
      date: { x: 540, y: 1620 },
      venue: { x: 540, y: 1680 },
      ceremonyTitle: { x: 540, y: 1340 },
    },
    visualIdentity: {
      dominantPalette: ["#FFD23F", "#FFB300"],
      keyMotif: "sunlit garden marigold arches",
      moodKeywords: ["festive", "sunny"],
    },
  };
}

// Each entry describes one required field, how to break it, and the top-level
// field name expected to appear in the failing-field path.
const corruptionArb = fc.constantFrom<"visualIdentity" | "avatarSlots" | "textSlots">(
  "visualIdentity",
  "avatarSlots",
  "textSlots",
);

// How to break a given field: drop it entirely, or supply an invalid value.
const breakModeArb = fc.constantFrom<"missing" | "invalid">("missing", "invalid");

describe("Property 15: Invalid metadata rejected with field error", () => {
  it("rejects metadata with a missing/invalid required field and names that field", () => {
    fc.assert(
      fc.property(corruptionArb, breakModeArb, (field, mode) => {
        const meta: Record<string, unknown> = validBaseMetadata();

        if (mode === "missing") {
          delete meta[field];
        } else {
          // Supply a structurally invalid value for the field.
          if (field === "visualIdentity") {
            // Too few palette colors and too few mood keywords.
            meta[field] = {
              dominantPalette: ["#fff"],
              keyMotif: "",
              moodKeywords: ["only-one"],
            };
          } else if (field === "avatarSlots") {
            // Wrong shape — not the required { bride, groom } slot object.
            meta[field] = "not-an-object";
          } else {
            // textSlots wrong shape.
            meta[field] = 42;
          }
        }

        const result = validateTemplateMetadata(meta);

        // Registration must be rejected.
        expect(result.success).toBe(false);
        if (!result.success) {
          // The failing-field path must identify the corrupted top-level field.
          expect(result.field.startsWith(field)).toBe(true);
          // A descriptive error is provided.
          expect(result.error.length).toBeGreaterThan(0);
          expect(result.error).toContain(field);
        }
      }),
      { numRuns: 200 },
    );
  });
});
