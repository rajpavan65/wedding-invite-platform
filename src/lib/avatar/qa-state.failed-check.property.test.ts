// src/lib/avatar/qa-state.failed-check.property.test.ts
//
// Property-based tests for failed-check identification.
//
// Feature: invite-product-quality, Property 4: Failed-check identification
// For any combination of automatic check outcomes (transparency, face) on an
// avatar asset, the asset is marked failed if and only if at least one check
// fails, and the recorded `failedCheck` names a check that actually failed.
//
// Validates: Requirements 2.4

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { evaluateAvatarCheck, type AutoCheckOutcome } from "./qa-state";
import type { CeremonyPose } from "./types";

const POSES: CeremonyPose[] = [
  "haldi",
  "mehandi",
  "sangeet",
  "wedding",
  "reception",
];

const outcomeArb = fc.record({
  pose: fc.constantFrom(...POSES),
  transparencyPassed: fc.boolean(),
  facePassed: fc.boolean(),
});

describe("Property 4: Failed-check identification", () => {
  it("marks an asset failed iff a check failed, and names a genuinely failed check", () => {
    fc.assert(
      fc.property(outcomeArb, (outcome: AutoCheckOutcome) => {
        const result = evaluateAvatarCheck(outcome);

        const bothPassed = outcome.transparencyPassed && outcome.facePassed;

        // passed iff every check passed.
        expect(result.passed).toBe(bothPassed);

        // The pose is preserved.
        expect(result.pose).toBe(outcome.pose);

        if (result.passed) {
          // No failed check is recorded when the asset passed.
          expect(result.failedCheck).toBeUndefined();
        } else {
          // A failed check must be named, and it must be one that actually failed.
          expect(result.failedCheck).toBeDefined();
          if (result.failedCheck === "transparency") {
            expect(outcome.transparencyPassed).toBe(false);
          } else {
            expect(result.failedCheck).toBe("face");
            expect(outcome.facePassed).toBe(false);
          }
        }
      }),
      { numRuns: 100 },
    );
  });
});
