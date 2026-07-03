/**
 * src/lib/template-qa.acceptance-gate.property.test.ts
 *
 * Feature: invite-product-quality, Property 25: Template QA acceptance gate
 *
 * For any set of template quality-check results, the template is marked active
 * if and only if every check passed; when at least one check fails the
 * template's prior active state is preserved unchanged and the report
 * identifies each failed check.
 *
 * **Validates: Requirements 9.5, 9.6**
 *
 * The gate decision is exercised through the PURE, render-free function
 * `decideTemplateActivation(checks, priorState)` so the property is fully
 * deterministic and needs no rendering.
 */

import { describe, it, expect } from "vitest";
import fc from "fast-check";
import { decideTemplateActivation, type TemplateCheck } from "./template-qa";

// A generated quality-check result. `passed` drives the gate; the reason is
// only meaningful when a check fails.
const checkArb: fc.Arbitrary<TemplateCheck> = fc.record({
  name: fc.stringMatching(/^[a-z][a-z0-9-]{0,30}$/),
  passed: fc.boolean(),
  reason: fc.option(fc.string(), { nil: undefined }),
});

const checksArb = fc.array(checkArb, { minLength: 0, maxLength: 12 });

describe("Property 25: Template QA acceptance gate", () => {
  it("marks active iff every check passed", () => {
    fc.assert(
      fc.property(checksArb, fc.boolean(), (checks, priorActive) => {
        const decision = decideTemplateActivation(checks, priorActive);
        const allPassed = checks.every((c) => c.passed);

        if (allPassed) {
          // Every check passed → active regardless of prior state (Req 9.5).
          expect(decision.active).toBe(true);
          expect(decision.failedChecks).toHaveLength(0);
        } else {
          // At least one failure → prior active state preserved unchanged (Req 9.6).
          expect(decision.active).toBe(priorActive);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("on any failure, identifies exactly the failed checks", () => {
    fc.assert(
      fc.property(checksArb, fc.boolean(), (checks, priorActive) => {
        const decision = decideTemplateActivation(checks, priorActive);
        const expectedFailed = checks.filter((c) => !c.passed);

        // The report surfaces every failed check and nothing else.
        expect(decision.failedChecks).toEqual(expectedFailed);
        for (const failed of decision.failedChecks) {
          expect(failed.passed).toBe(false);
        }
      }),
      { numRuns: 300 },
    );
  });

  it("is deterministic for the same inputs", () => {
    fc.assert(
      fc.property(checksArb, fc.boolean(), (checks, priorActive) => {
        const a = decideTemplateActivation(checks, priorActive);
        const b = decideTemplateActivation(checks, priorActive);
        expect(a).toEqual(b);
      }),
      { numRuns: 100 },
    );
  });
});
