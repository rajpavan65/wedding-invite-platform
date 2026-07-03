// src/lib/avatar/storage-path.property.test.ts
//
// Property-based tests for avatar storage path construction.
//
// Feature: invite-product-quality, Property 2: Avatar storage path construction
// For any clientId and ceremonyType, the stored avatar object key equals exactly
// `avatars/{clientId}/{ceremonyType}.png`, and the returned URL resolves to that key.
//
// Validates: Requirements 1.8

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { AVATAR_BUCKET, AVATAR_EXTENSION, avatarKey, avatarUrl } from "./storage-path";
import type { CeremonyPose } from "./types";

const POSES: CeremonyPose[] = [
  "haldi",
  "mehandi",
  "sangeet",
  "wedding",
  "reception",
];

// clientIds are opaque identifiers; exercise a broad range of non-empty strings
// that don't contain path separators (which would change the key structure).
const clientIdArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => !s.includes("/") && s.trim().length > 0);

const poseArb = fc.constantFrom(...POSES);

describe("Property 2: Avatar storage path construction", () => {
  it("builds the key exactly as avatars/{clientId}/{ceremonyType}.png", () => {
    fc.assert(
      fc.property(clientIdArb, poseArb, (clientId, pose) => {
        const key = avatarKey(clientId, pose);
        expect(key).toBe(`${AVATAR_BUCKET}/${clientId}/${pose}.${AVATAR_EXTENSION}`);
        expect(key).toBe(`avatars/${clientId}/${pose}.png`);
      }),
      { numRuns: 100 },
    );
  });

  it("returns a URL that resolves to (ends with) the exact object key", () => {
    fc.assert(
      fc.property(clientIdArb, poseArb, (clientId, pose) => {
        const key = avatarKey(clientId, pose);
        const url = avatarUrl(clientId, pose);
        // The resolvable URL must map back to the same key.
        expect(url.endsWith(`/${key}`)).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
