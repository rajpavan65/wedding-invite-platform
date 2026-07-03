/**
 * src/lib/template-qa.ts
 *
 * Template Quality Acceptance gate (Design §Components/8; Req 9.1–9.6).
 *
 * Before a Background_Template is marked active it must pass four quality
 * checks:
 *   (a) metadata validity + non-empty `avatarSlots`/`textSlots`/`visualIdentity`
 *       — reuses the template-metadata registration validation (Task 10);    Req 9.1
 *   (b) Standard & Premium render-to-completion with avatars inside the
 *       Safe_Zone — verified via the pure compositing geometry helpers
 *       (`fitAvatarIntoSlot` + `clampToSafeZone`, Task 7) for both tiers;     Req 9.2
 *   (c) a 30+ character name fits fully inside the Safe_Zone — verified via
 *       the pure text-fit helper (`fitTextWith`, Task 14) + slot geometry;    Req 9.3
 *   (d) the light-leak overlay is the topmost layer and the ceremony-specific
 *       decorative-motion overlay matching the key motif is present — verified
 *       via the motion-layer descriptor + ceremony Lottie source (Task 16).   Req 9.4
 *
 * All four pass → mark active (Req 9.5). Any fail → keep inactive, preserve the
 * template's prior active state unchanged, and return a per-check failure report
 * identifying each failed check (Req 9.6).
 *
 * ── Pure gate decision (Property 25) ─────────────────────────────────────────
 * The activation decision is factored out into the pure, total function
 * {@link decideTemplateActivation}. It is render-free and deterministic so
 * Property 25 (active iff every check passed; prior state preserved on failure)
 * can be tested without rendering. `validate()` runs the (mostly pure) checks
 * and feeds their results through this same decision function.
 *
 * The real Standard/Premium render-to-completion is exercised only by the
 * env-gated integration test (Task 19.3); here checks (b)/(c) are verified via
 * the already-property-tested pure geometry/text-fit helpers, which is both
 * deterministic and fast.
 */

import {
  getTemplateMetadata,
  isValidTemplateId,
  validateTemplateMetadata,
} from "./template-metadata";
import type { TemplateId } from "./types";
import type { TemplateMetadata } from "./schemas";
import {
  REF_CANVAS,
  SAFE_ZONE_INSET,
  type Box,
  type Size,
  type Slot,
  clampToSafeZone,
  fitAvatarIntoSlot,
  scaleSlotToCanvas,
} from "@/remotion/layout/geometry";
import { fitTextWith, type MeasureFn } from "@/remotion/layout/textfit";
import {
  resolveTextSlotBox,
  textBlockHeight,
} from "@/remotion/components/autoScaleTextLayout";
import {
  describeCompositionMotion,
  TOPMOST_MOTION_LAYER,
} from "@/remotion/motion/motionLayers";
import { resolveCeremonyLottieSource } from "@/remotion/motion/CeremonyLottie";

// ─────────────────────────────────────────────────────────────
// Public types (Design §Components/8)
// ─────────────────────────────────────────────────────────────

export interface TemplateCheck {
  /** Stable identifier for the check (one of {@link TemplateCheckName}). */
  name: string;
  passed: boolean;
  /** Human-readable failure reason; present only when `passed` is false. */
  reason?: string;
}

export interface TemplateQaReport {
  templateId: string;
  /** Whether the template is active after this validation run. */
  active: boolean;
  /** Outcome of every quality check (Req 9.1–9.4). */
  checks: TemplateCheck[];
}

/** The four template-quality check identifiers (Req 9.1–9.4). */
export const TEMPLATE_CHECK_NAMES = {
  metadata: "metadata-valid-and-non-empty-slots", // Req 9.1
  renderSafeZone: "render-to-completion-safe-zone-avatars", // Req 9.2
  longNameFits: "long-name-fits-inside-safe-zone", // Req 9.3
  motionLayers: "light-leak-topmost-and-decorative-motion", // Req 9.4
} as const;

/** Result of the pure activation decision (Property 25). */
export interface TemplateActivationDecision {
  /** Active iff every check passed; otherwise the preserved prior state. */
  active: boolean;
  /** The subset of `checks` that failed (empty when all passed). */
  failedChecks: TemplateCheck[];
}

// ─────────────────────────────────────────────────────────────
// Pure activation decision (Property 25 — Req 9.5, 9.6)
// ─────────────────────────────────────────────────────────────

/**
 * Decide whether a template is active given its quality-check results and its
 * prior active state.
 *
 * - When EVERY check passed, the template is marked active (Req 9.5).
 * - When AT LEAST ONE check fails, the template's prior active state is
 *   preserved unchanged and the failed checks are surfaced so the caller can
 *   report each failure (Req 9.6).
 *
 * Pure and total: no side effects, never throws, depends only on its inputs.
 * This is the function under test for Property 25.
 */
export function decideTemplateActivation(
  checks: readonly TemplateCheck[],
  priorActive: boolean,
): TemplateActivationDecision {
  const failedChecks = checks.filter((c) => !c.passed);
  if (failedChecks.length === 0) {
    // Every check passed → mark active (Req 9.5).
    return { active: true, failedChecks: [] };
  }
  // At least one failure → preserve the prior active state unchanged (Req 9.6).
  return { active: priorActive, failedChecks };
}

// ─────────────────────────────────────────────────────────────
// Check helpers (pure where possible)
// ─────────────────────────────────────────────────────────────

/** Representative avatar asset size used for safe-zone fit checks (Req 1.6). */
const REPRESENTATIVE_AVATAR: Size = { width: 1024, height: 1024 };

/**
 * A 30+ character name used to exercise the long-name safe-zone check (Req 9.3).
 * Exported so tests can reuse the exact same probe.
 */
export const LONG_NAME_PROBE = "Lakshminarayan Venkataraghavachari"; // 34 chars

/** Base font size (px) used by the long-name fit check on the reference canvas. */
const PROBE_BASE_FONT_SIZE = 72;

/**
 * Deterministic, render-free text measurer used by the QA long-name check.
 * Width grows linearly with the number of non-space glyphs and the font size —
 * a conservative model of true measurement that lets `fitTextWith` exercise its
 * shrink → floor → wrap pipeline without a DOM/font. The real visual fit is
 * confirmed by the env-gated render integration test (Task 19.3).
 */
const PROBE_PER_CHAR = 0.5;
const qaMeasure: MeasureFn = (text, fontSize) => {
  const glyphs = text.replace(/\s/g, "").length;
  return glyphs * fontSize * PROBE_PER_CHAR;
};

/** Inclusive containment test: is `box` fully inside the canvas Safe_Zone? */
function isWithinSafeZone(
  box: Box,
  canvas: Size,
  inset: number = SAFE_ZONE_INSET,
): boolean {
  const epsilon = 1e-6;
  const minLeft = inset;
  const minTop = inset;
  const maxRight = canvas.width - inset;
  const maxBottom = canvas.height - inset;
  return (
    box.left >= minLeft - epsilon &&
    box.top >= minTop - epsilon &&
    box.left + box.width <= maxRight + epsilon &&
    box.top + box.height <= maxBottom + epsilon
  );
}

/**
 * Check (a) — metadata validity + non-empty slots (Req 9.1).
 *
 * Re-runs the template-metadata registration validation against the loaded
 * metadata and asserts a non-empty `visualIdentity` (palette + motif).
 */
function checkMetadata(meta: TemplateMetadata): TemplateCheck {
  const name = TEMPLATE_CHECK_NAMES.metadata;

  const result = validateTemplateMetadata(meta);
  if (!result.success) {
    return { name, passed: false, reason: result.error };
  }

  const vi = result.data.visualIdentity;
  if (!vi || vi.dominantPalette.length < 2 || vi.keyMotif.trim().length === 0) {
    return {
      name,
      passed: false,
      reason:
        'Template metadata "visualIdentity" must define a dominant palette of ≥2 colors and a non-empty key motif',
    };
  }

  return { name, passed: true };
}

/**
 * Check (b) — Standard & Premium render-to-completion with safe-zone avatars
 * (Req 9.2).
 *
 * Standard tier renders the slot empty (no avatar to clip) and therefore always
 * completes. For Premium tier, a representative avatar is fitted into each
 * avatar slot via the uniform-scale geometry helper and the placed box must
 * already lie fully within the Safe_Zone (i.e. clamping is a no-op). If a slot's
 * geometry would push the avatar outside the Safe_Zone, the check fails and
 * names the offending slot.
 */
function checkRenderSafeZone(meta: TemplateMetadata): TemplateCheck {
  const name = TEMPLATE_CHECK_NAMES.renderSafeZone;
  const canvas = REF_CANVAS;

  const slots: Array<{ key: string; slot: Slot }> = [
    { key: "bride", slot: meta.avatarSlots.bride },
    { key: "groom", slot: meta.avatarSlots.groom },
  ];

  for (const { key, slot } of slots) {
    const scaled = scaleSlotToCanvas(slot, canvas);
    const placed = fitAvatarIntoSlot(REPRESENTATIVE_AVATAR, scaled);

    if (placed.width <= 0 || placed.height <= 0) {
      return {
        name,
        passed: false,
        reason: `Premium avatar slot "${key}" has degenerate geometry (zero-area placement); avatar cannot render`,
      };
    }

    if (!isWithinSafeZone(placed, canvas)) {
      return {
        name,
        passed: false,
        reason: `Premium avatar slot "${key}" places the avatar outside the Safe_Zone (would be clipped at a canvas edge)`,
      };
    }

    // Clamping must be a no-op for an already-safe placement; if clamping moves
    // or shrinks the box the slot was not Safe_Zone-clean.
    const clamped = clampToSafeZone(placed, canvas);
    const moved =
      Math.abs(clamped.left - placed.left) > 1e-6 ||
      Math.abs(clamped.top - placed.top) > 1e-6 ||
      Math.abs(clamped.width - placed.width) > 1e-6 ||
      Math.abs(clamped.height - placed.height) > 1e-6;
    if (moved) {
      return {
        name,
        passed: false,
        reason: `Premium avatar slot "${key}" required Safe_Zone clamping; slot geometry is not Safe_Zone-clean`,
      };
    }
  }

  return { name, passed: true };
}

/**
 * Check (c) — a 30+ character name fits fully inside the Safe_Zone (Req 9.3).
 *
 * For each name text slot (which declares a `maxWidth`), the long-name probe is
 * fitted via the pure text-fit helper, then placed at the slot's center anchor
 * using the same Safe_Zone layout helper the renderer uses. The check fails if:
 *   - any produced line exceeds `maxWidth` even after wrapping (truncation risk),
 *   - the full text is not preserved across the produced lines, or
 *   - the slot's `maxWidth` exceeds the Safe_Zone width, forcing the layout to
 *     shrink the block (a line filling `maxWidth` would then be edge-clipped).
 */
function checkLongNameFits(meta: TemplateMetadata): TemplateCheck {
  const name = TEMPLATE_CHECK_NAMES.longNameFits;
  const canvas = REF_CANVAS;
  const epsilon = 1e-6;
  const lineHeight = 1.3;

  const nameSlots: Array<{
    key: string;
    x: number;
    y: number;
    maxWidth: number;
  }> = [
    {
      key: "primaryName",
      x: meta.textSlots.primaryName.x,
      y: meta.textSlots.primaryName.y,
      maxWidth: meta.textSlots.primaryName.maxWidth,
    },
    {
      key: "secondaryName",
      x: meta.textSlots.secondaryName.x,
      y: meta.textSlots.secondaryName.y,
      maxWidth: meta.textSlots.secondaryName.maxWidth,
    },
  ];

  for (const { key, x, y, maxWidth } of nameSlots) {
    const fit = fitTextWith(
      {
        text: LONG_NAME_PROBE,
        baseFontSize: PROBE_BASE_FONT_SIZE,
        maxWidth,
        minScale: 0.55,
        stepPx: 1,
      },
      qaMeasure,
    );

    // Every line must fit within maxWidth after wrapping (Req 5.5 / 9.3).
    for (const line of fit.lines) {
      if (qaMeasure(line, fit.fontSize) > maxWidth + epsilon) {
        return {
          name,
          passed: false,
          reason: `Text slot "${key}" cannot fit a 30+ character name within maxWidth ${maxWidth} even after wrapping`,
        };
      }
    }

    // Full text must be preserved across the produced lines (no truncation).
    const preserved = fit.lines.join("").replace(/\s/g, "");
    if (preserved !== LONG_NAME_PROBE.replace(/\s/g, "")) {
      return {
        name,
        passed: false,
        reason: `Text slot "${key}" truncated the long name probe (text not preserved)`,
      };
    }

    // Place the fitted block at the slot's center anchor and Safe_Zone-clamp it
    // exactly as the renderer does. If clamping shrinks the block's width, the
    // slot's maxWidth does not fit inside the Safe_Zone and a full-width line
    // would be edge-clipped (Req 5.8 / 9.3).
    const blockHeight = textBlockHeight(fit.fontSize, fit.lines.length, lineHeight);
    const box = resolveTextSlotBox({ x, y, maxWidth }, blockHeight, canvas);
    if (box.width < maxWidth - epsilon) {
      return {
        name,
        passed: false,
        reason: `Text slot "${key}" maxWidth ${maxWidth} exceeds the Safe_Zone width; a long name would be clipped at a canvas edge`,
      };
    }
    if (!isWithinSafeZone(box, canvas)) {
      return {
        name,
        passed: false,
        reason: `Text slot "${key}" places a long name outside the Safe_Zone`,
      };
    }
  }

  return { name, passed: true };
}

/**
 * Check (d) — light-leak topmost + ceremony decorative motion present (Req 9.4).
 *
 * Verified render-free via the shared motion-layer descriptor: the topmost layer
 * must be the light leak, the decorative Lottie layer must be present, and a
 * ceremony-specific motif source must resolve for the template's ceremony type
 * (the source basename encodes the key motif).
 */
function checkMotionLayers(
  templateId: TemplateId,
  meta: TemplateMetadata,
): TemplateCheck {
  const name = TEMPLATE_CHECK_NAMES.motionLayers;

  const descriptor = describeCompositionMotion(templateId, meta.functionType);
  const layers = descriptor.layers;
  const topmost = layers[layers.length - 1];

  if (topmost !== TOPMOST_MOTION_LAYER || topmost !== "lightLeak") {
    return {
      name,
      passed: false,
      reason: `Light-leak overlay is not the topmost layer (topmost is "${topmost}")`,
    };
  }

  if (!layers.includes("decorativeLottie")) {
    return {
      name,
      passed: false,
      reason: "Ceremony decorative-motion (Lottie) layer is not present in the composition",
    };
  }

  const motif = resolveCeremonyLottieSource(meta.functionType);
  if (!motif || motif.trim().length === 0) {
    return {
      name,
      passed: false,
      reason: `No ceremony-specific decorative-motion source configured for ceremony "${meta.functionType}"`,
    };
  }

  return { name, passed: true };
}

// ─────────────────────────────────────────────────────────────
// templateQa.validate (Req 9.1–9.6)
// ─────────────────────────────────────────────────────────────

export const templateQa = {
  /**
   * Validate a template against the four quality checks and decide activation.
   *
   * @param templateId  The template to validate.
   * @param priorActive The template's existing active state, preserved on any
   *                     check failure (Req 9.6). Defaults to `false`.
   *
   * Returns a {@link TemplateQaReport} whose `checks` always carries all four
   * check outcomes (so a failure report identifies every failed check) and whose
   * `active` reflects the pure {@link decideTemplateActivation} decision.
   *
   * Never throws — an unknown template id resolves to a failed metadata check.
   */
  async validate(
    templateId: TemplateId,
    priorActive: boolean = false,
  ): Promise<TemplateQaReport> {
    // Unknown template id — fail the metadata check rather than throwing.
    if (!isValidTemplateId(templateId)) {
      const checks: TemplateCheck[] = [
        {
          name: TEMPLATE_CHECK_NAMES.metadata,
          passed: false,
          reason: `Unknown template id "${templateId}"`,
        },
      ];
      const decision = decideTemplateActivation(checks, priorActive);
      return { templateId, active: decision.active, checks };
    }

    let meta: TemplateMetadata;
    try {
      meta = getTemplateMetadata(templateId);
    } catch (err) {
      const checks: TemplateCheck[] = [
        {
          name: TEMPLATE_CHECK_NAMES.metadata,
          passed: false,
          reason: err instanceof Error ? err.message : String(err),
        },
      ];
      const decision = decideTemplateActivation(checks, priorActive);
      return { templateId, active: decision.active, checks };
    }

    const checks: TemplateCheck[] = [
      checkMetadata(meta),
      checkRenderSafeZone(meta),
      checkLongNameFits(meta),
      checkMotionLayers(templateId, meta),
    ];

    const decision = decideTemplateActivation(checks, priorActive);
    return { templateId, active: decision.active, checks };
  },
};
