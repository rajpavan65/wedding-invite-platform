// src/lib/avatar/select.ts
import type { AvatarVariant } from "./types";

/**
 * Select the best avatar variant from a set of generated candidates.
 *
 * Selection rule (Req 1.11):
 *   - choose the variant with the maximum `identityScore`;
 *   - break ties by selecting the lowest `index`.
 *
 * Pure, total and deterministic: the same input always yields the same output
 * and the function never throws.
 *
 * @param variants - the generated candidate variants for a single pose.
 * @returns the best variant, or `undefined` when `variants` is empty.
 */
export function selectBestVariant(
  variants: readonly AvatarVariant[],
): AvatarVariant | undefined {
  let best: AvatarVariant | undefined;

  for (const variant of variants) {
    if (best === undefined) {
      best = variant;
      continue;
    }

    if (variant.identityScore > best.identityScore) {
      best = variant;
    } else if (
      variant.identityScore === best.identityScore &&
      variant.index < best.index
    ) {
      best = variant;
    }
  }

  return best;
}
