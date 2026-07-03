/**
 * src/lib/template-qa.test.ts
 *
 * Feature: invite-product-quality
 *
 * Unit tests for the Template Quality Acceptance gate (`templateQa.validate`,
 * task 19.1; Design §Components/8). These verify the four quality checks and
 * the activation/preservation behaviour against the real registered templates,
 * render-free.
 *
 * Covered acceptance criteria:
 *   - 9.1: metadata validity + non-empty slots check is run and reported.
 *   - 9.2: Standard/Premium render-to-completion with safe-zone avatars check.
 *   - 9.3: a 30+ character name fits inside the Safe_Zone.
 *   - 9.4: light-leak topmost + ceremony decorative motion present.
 *   - 9.5: when all checks pass, the template is marked active.
 *   - 9.6: when any check fails, prior state is preserved and the report
 *          identifies each failed check.
 */

import { describe, it, expect } from "vitest";
import {
  templateQa,
  TEMPLATE_CHECK_NAMES,
  LONG_NAME_PROBE,
} from "./template-qa";
import { TEMPLATE_IDS } from "./types";

describe("templateQa.validate — real registered templates pass all checks (Req 9.1–9.5)", () => {
  it("uses a 30+ character long-name probe (Req 9.3)", () => {
    expect(LONG_NAME_PROBE.length).toBeGreaterThanOrEqual(30);
  });

  it.each(TEMPLATE_IDS)(
    "%s passes every quality check and is marked active",
    async (templateId) => {
      const report = await templateQa.validate(templateId);

      // All four checks are present in the report.
      expect(report.checks.map((c) => c.name).sort()).toEqual(
        [
          TEMPLATE_CHECK_NAMES.metadata,
          TEMPLATE_CHECK_NAMES.renderSafeZone,
          TEMPLATE_CHECK_NAMES.longNameFits,
          TEMPLATE_CHECK_NAMES.motionLayers,
        ].sort(),
      );

      // Every check passes for a well-formed registered template.
      for (const check of report.checks) {
        expect(check.passed, `${check.name}: ${check.reason ?? ""}`).toBe(true);
      }

      // All checks pass → active (Req 9.5).
      expect(report.active).toBe(true);
      expect(report.templateId).toBe(templateId);
    },
  );
});

describe("templateQa.validate — failure handling (Req 9.6)", () => {
  it("fails the metadata check for an unknown template id without throwing", async () => {
    const report = await templateQa.validate(
      // deliberately invalid id
      "not-a-real-template" as never,
    );
    expect(report.active).toBe(false);
    const metaCheck = report.checks.find(
      (c) => c.name === TEMPLATE_CHECK_NAMES.metadata,
    );
    expect(metaCheck?.passed).toBe(false);
    expect(metaCheck?.reason).toBeTruthy();
  });

  it("preserves a prior active state of true when the template is unknown (Req 9.6)", async () => {
    const report = await templateQa.validate(
      "not-a-real-template" as never,
      /* priorActive */ true,
    );
    // At least one check failed → prior active state is preserved unchanged.
    expect(report.active).toBe(true);
    expect(report.checks.some((c) => !c.passed)).toBe(true);
  });
});
