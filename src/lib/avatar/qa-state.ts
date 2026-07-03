// src/lib/avatar/qa-state.ts
//
// Pure QA decision helpers for the avatar quality gate.
//
// Every function in this module is PURE, TOTAL, and DETERMINISTIC: it never
// mutates its inputs, never throws, and never performs I/O (no provider, DB, or
// image-analysis calls — those live in `qa.ts` and `db.ts`). Each transition
// returns a brand-new `AvatarQaRecord`, which makes the QA state machine cheap
// to property-test.
//
// Requirements covered:
//   - 2.4 — mark an asset failed and identify the failed check
//   - 2.7 — admin rejection regenerates the avatar set, up to 2 attempts
//   - 2.8 — after 2 regeneration attempts have failed, downgrade to Standard tier
//            with a recorded reason
//   - 2.9 — an order's assets are usable in a render only when state is "Approved"
//
// Design: §Components/2 (Avatar QA Service), §Order Avatar State.

import type { CeremonyPose } from "./types";

/**
 * The QA lifecycle state of an order's avatars.
 *
 * None           → no avatars generated yet
 * Pending_Review → generation completed, awaiting auto-checks + admin review (2.1)
 * Approved       → admin approved; assets may be used in a render (2.6, 2.9)
 * Rejected       → admin rejected; a regeneration attempt is pending (2.7)
 * Downgraded     → regeneration budget exhausted; order falls back to Standard tier (2.8)
 */
export type AvatarState =
  | "None"
  | "Pending_Review"
  | "Approved"
  | "Rejected"
  | "Downgraded";

/** The automatic checks a single avatar asset must pass. */
export type AvatarCheck = "transparency" | "face";

/** The outcome of running the automatic checks against a single avatar asset. */
export interface AvatarCheckResult {
  pose: CeremonyPose;
  passed: boolean;
  /** Present only when `passed` is false; names a check that actually failed. */
  failedCheck?: AvatarCheck;
}

/** The persisted QA sub-state of an order (see Design §Order Avatar State). */
export interface AvatarQaRecord {
  orderId: string;
  state: AvatarState;
  /** Regeneration attempts already consumed; never exceeds MAX_REGENERATION_ATTEMPTS. */
  attempts: number;
  checks: AvatarCheckResult[];
  /** Present only once the order has been downgraded (state === "Downgraded"). */
  downgradeReason?: string;
}

/**
 * The raw outcome of the two automatic checks for one asset, before it is folded
 * into an `AvatarCheckResult`. `true` means the check passed.
 */
export interface AutoCheckOutcome {
  pose: CeremonyPose;
  transparencyPassed: boolean;
  facePassed: boolean;
}

/**
 * Maximum number of regeneration attempts allowed before an order is downgraded
 * to Standard tier (Req 2.7, 2.8).
 */
export const MAX_REGENERATION_ATTEMPTS = 2;

/** A fresh record for an order that has no avatars yet. */
export function createInitialRecord(orderId: string): AvatarQaRecord {
  return { orderId, state: "None", attempts: 0, checks: [] };
}

/**
 * Fold the raw transparency/face outcomes for a single asset into an
 * `AvatarCheckResult`, marking the asset failed iff at least one check failed and
 * naming a check that actually failed (Req 2.4).
 *
 * Transparency is reported first when both checks fail, since it is the cheaper
 * signal; the reported `failedCheck` is always one that genuinely failed.
 */
export function evaluateAvatarCheck(outcome: AutoCheckOutcome): AvatarCheckResult {
  const passed = outcome.transparencyPassed && outcome.facePassed;
  if (passed) {
    return { pose: outcome.pose, passed: true };
  }
  const failedCheck: AvatarCheck = outcome.transparencyPassed ? "face" : "transparency";
  return { pose: outcome.pose, passed: false, failedCheck };
}

/** Evaluate a batch of asset outcomes into per-asset check results (Req 2.4). */
export function evaluateAvatarChecks(outcomes: AutoCheckOutcome[]): AvatarCheckResult[] {
  return outcomes.map(evaluateAvatarCheck);
}

/** True when every recorded check passed (no asset was marked failed). */
export function allChecksPassed(checks: AvatarCheckResult[]): boolean {
  return checks.every((c) => c.passed);
}

/**
 * Generation completed for the order: move it into review and attach the
 * automatic-check results (Req 2.1). Returns a new record.
 */
export function beginReview(
  record: AvatarQaRecord,
  checks: AvatarCheckResult[],
): AvatarQaRecord {
  return { ...record, state: "Pending_Review", checks: [...checks] };
}

/** Admin approves the order's avatars (Req 2.6). Returns a new record. */
export function approve(record: AvatarQaRecord): AvatarQaRecord {
  return { ...record, state: "Approved" };
}

/**
 * Admin rejects the order's avatars, which fail the quality checks.
 *
 * While the order still has regeneration budget (`attempts` below the cap), this
 * consumes one attempt and moves the order to `Rejected` so the full avatar set
 * can be regenerated (Req 2.7). Once the budget is exhausted — i.e. both allowed
 * regeneration attempts have already been used and the avatars failed again — the
 * order is downgraded to Standard tier with the supplied reason (Req 2.8).
 *
 * `attempts` is always clamped to `MAX_REGENERATION_ATTEMPTS`, so the recorded
 * count never exceeds the cap. Returns a new record; the input is never mutated.
 */
export function rejectAndRegenerate(
  record: AvatarQaRecord,
  downgradeReason: string,
): AvatarQaRecord {
  if (record.attempts >= MAX_REGENERATION_ATTEMPTS) {
    return {
      ...record,
      state: "Downgraded",
      attempts: MAX_REGENERATION_ATTEMPTS,
      downgradeReason,
    };
  }
  return {
    ...record,
    state: "Rejected",
    attempts: record.attempts + 1,
  };
}

/**
 * The single authority used by the render route to decide whether an order's
 * avatar URLs may be passed to the Compositing Engine: true only when the order's
 * avatar state is `Approved` (Req 2.9).
 */
export function canRender(record: AvatarQaRecord): boolean {
  return record.state === "Approved";
}
