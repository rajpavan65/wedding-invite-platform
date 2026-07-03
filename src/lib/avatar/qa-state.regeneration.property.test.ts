// src/lib/avatar/qa-state.regeneration.property.test.ts
//
// Property-based tests for the regeneration bound and downgrade transition.
//
// Feature: invite-product-quality, Property 5: Regeneration bound and downgrade
// For any sequence of rejection/regeneration events on an order, the recorded
// regeneration attempt count never exceeds 2; once 2 attempts have failed the
// quality checks, the order state is `Downgraded` (Standard tier) with a
// recorded downgrade reason.
//
// Validates: Requirements 2.7, 2.8

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  createInitialRecord,
  rejectAndRegenerate,
  MAX_REGENERATION_ATTEMPTS,
  type AvatarQaRecord,
} from "./qa-state";

const DOWNGRADE_REASON = "Avatars failed quality checks after maximum regeneration attempts";

describe("Property 5: Regeneration bound and downgrade", () => {
  it("never exceeds the attempt cap and downgrades with a reason once the budget is spent", () => {
    fc.assert(
      fc.property(
        // A sequence of 1..10 rejection events on the same order.
        fc.integer({ min: 1, max: 10 }),
        (rejections) => {
          let record: AvatarQaRecord = createInitialRecord("order-1");

          for (let i = 0; i < rejections; i++) {
            const before = record;
            record = rejectAndRegenerate(record, DOWNGRADE_REASON);

            // The cap is never exceeded after any transition.
            expect(record.attempts).toBeLessThanOrEqual(MAX_REGENERATION_ATTEMPTS);

            // Inputs are never mutated.
            expect(before).not.toBe(record);

            if (before.attempts >= MAX_REGENERATION_ATTEMPTS) {
              // Budget already spent → this rejection downgrades.
              expect(record.state).toBe("Downgraded");
              expect(record.attempts).toBe(MAX_REGENERATION_ATTEMPTS);
              expect(record.downgradeReason).toBe(DOWNGRADE_REASON);
            } else {
              // Budget remaining → consume one attempt and await regeneration.
              expect(record.state).toBe("Rejected");
              expect(record.attempts).toBe(before.attempts + 1);
            }
          }

          // After enough rejections (> MAX), the order must be downgraded.
          if (rejections > MAX_REGENERATION_ATTEMPTS) {
            expect(record.state).toBe("Downgraded");
            expect(record.attempts).toBe(MAX_REGENERATION_ATTEMPTS);
            expect(record.downgradeReason).toBe(DOWNGRADE_REASON);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
