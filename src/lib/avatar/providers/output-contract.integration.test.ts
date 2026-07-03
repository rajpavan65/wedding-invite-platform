// src/lib/avatar/providers/output-contract.integration.test.ts
//
// Integration test for the AvatarProvider output contract (task 3.5).
//
// Feature: invite-product-quality
// Every provider — exercised here through the offline MockAvatarProvider so
// the test needs no network access or credentials — MUST yield 1024x1024
// transparent-background PNG variants whose identity score against the
// designated reference pose is at least 0.80.
//
// Validates: Requirements 1.4, 1.6

import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { MockAvatarProvider } from "./mock";
import type { CeremonyPose } from "../types";

/** Req 1.6 fixed avatar canvas. */
const AVATAR_SIZE = 1024;

/** Req 1.4 cross-pose identity-match floor. */
const IDENTITY_FLOOR = 0.8;

const POSES: CeremonyPose[] = [
  "haldi",
  "mehandi",
  "sangeet",
  "wedding",
  "reception",
];

describe("AvatarProvider output contract (Req 1.4, 1.6)", () => {
  it("produces 1024x1024 transparent PNG variants with identity score >= 0.80", async () => {
    const provider = new MockAvatarProvider();

    for (const pose of POSES) {
      const variants = await provider.generatePose({
        referencePhotos: ["https://example.com/reference.jpg"],
        pose,
        variants: 3, // batch of 3 per pose (Req 1.11)
        timeoutMs: 120_000,
      });

      expect(variants.length).toBe(3);

      for (const variant of variants) {
        // ── Identity score contract (Req 1.4) ──────────────────────────────
        expect(variant.identityScore).toBeGreaterThanOrEqual(IDENTITY_FLOOR);
        expect(variant.identityScore).toBeLessThanOrEqual(1);

        // ── PNG format + dimensions (Req 1.6) ──────────────────────────────
        const image = sharp(variant.imageData);
        const metadata = await image.metadata();

        expect(metadata.format).toBe("png");
        expect(metadata.width).toBe(AVATAR_SIZE);
        expect(metadata.height).toBe(AVATAR_SIZE);
        expect(metadata.hasAlpha).toBe(true);

        // ── Transparent background (Req 1.6) ───────────────────────────────
        // Read the raw RGBA buffer and confirm the top-left corner pixel is
        // fully transparent (alpha === 0), proving a real alpha channel rather
        // than an opaque background flattened to white.
        const { data, info } = await image
          .raw()
          .toBuffer({ resolveWithObject: true });

        expect(info.channels).toBe(4); // RGBA
        const cornerAlpha = data[3]; // alpha of pixel (0,0)
        expect(cornerAlpha).toBe(0);
      }
    }
  });

  it("is deterministic — identical inputs yield identical bytes and scores", async () => {
    const provider = new MockAvatarProvider();
    const input = {
      referencePhotos: ["https://example.com/reference.jpg"],
      pose: "wedding" as CeremonyPose,
      variants: 2,
      timeoutMs: 120_000,
    };

    const first = await provider.generatePose(input);
    const second = await provider.generatePose(input);

    expect(first).toHaveLength(2);
    for (let i = 0; i < first.length; i++) {
      expect(first[i].identityScore).toBe(second[i].identityScore);
      expect(first[i].imageData.equals(second[i].imageData)).toBe(true);
    }
  });
});
