// src/lib/schemas.visual-identity-bounds.property.test.ts
//
// Feature: invite-product-quality, Property 13: Visual identity schema bounds
// For any candidate `visualIdentity` object, schema validation succeeds if and
// only if it has at least 2 palette colors, at least 1 key motif, and between
// 2 and 5 mood keywords inclusive.
//
// Validates: Requirements 4.1

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { TemplateMetadataSchema } from "./schemas";

// A fixed, always-valid base metadata. Only `visualIdentity` is varied so the
// overall parse result reflects exactly the visual-identity bounds.
const BASE_METADATA = {
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
};

// Non-empty color/keyword strings keep the generators focused on the array/length
// bounds rather than incidental empty-string failures of nested string fields.
const nonEmptyString = fc.string({ minLength: 1, maxLength: 12 });

// keyMotif may be empty (invalid) or non-empty (valid) so we exercise the min(1) bound.
const keyMotifArb = fc.oneof(fc.constant(""), nonEmptyString);

const visualIdentityArb = fc.record({
  // length 0..6 spans below, at, and above the >= 2 lower bound.
  dominantPalette: fc.array(nonEmptyString, { minLength: 0, maxLength: 6 }),
  keyMotif: keyMotifArb,
  // length 0..7 spans below 2, the 2..5 valid band, and above 5.
  moodKeywords: fc.array(nonEmptyString, { minLength: 0, maxLength: 7 }),
});

describe("Property 13: Visual identity schema bounds", () => {
  it("validates iff palette >= 2, keyMotif non-empty, and 2 <= moodKeywords <= 5", () => {
    fc.assert(
      fc.property(visualIdentityArb, (visualIdentity) => {
        const candidate = { ...BASE_METADATA, visualIdentity };
        const result = TemplateMetadataSchema.safeParse(candidate);

        const expectedValid =
          visualIdentity.dominantPalette.length >= 2 &&
          visualIdentity.keyMotif.length >= 1 &&
          visualIdentity.moodKeywords.length >= 2 &&
          visualIdentity.moodKeywords.length <= 5;

        expect(result.success).toBe(expectedValid);
      }),
      { numRuns: 200 },
    );
  });
});
