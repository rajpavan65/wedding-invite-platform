// src/lib/avatar/qa-state.render-gate.property.test.ts
//
// Property-based tests for the approval render gate.
//
// Feature: invite-product-quality, Property 6: Approval render gate
// For any order, its avatar assets are made available to the Compositing Engine
// (the render props contain avatar URLs) if and only if the order's avatar state
// is `Approved`; for every non-`Approved` state the render props contain no
// avatar URLs.
//
// Validates: Requirements 2.9

import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { canRender, type AvatarQaRecord, type AvatarState } from "./qa-state";

const STATES: AvatarState[] = [
  "None",
  "Pending_Review",
  "Approved",
  "Rejected",
  "Downgraded",
];

const recordArb: fc.Arbitrary<AvatarQaRecord> = fc.record({
  orderId: fc.string({ minLength: 1, maxLength: 12 }),
  state: fc.constantFrom(...STATES),
  attempts: fc.integer({ min: 0, max: 2 }),
  checks: fc.constant([]),
});

describe("Property 6: Approval render gate", () => {
  it("permits rendering iff the avatar state is Approved", () => {
    fc.assert(
      fc.property(recordArb, (record) => {
        expect(canRender(record)).toBe(record.state === "Approved");
      }),
      { numRuns: 100 },
    );
  });

  it("blocks every non-Approved state", () => {
    fc.assert(
      fc.property(
        recordArb.filter((r) => r.state !== "Approved"),
        (record) => {
          expect(canRender(record)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});
