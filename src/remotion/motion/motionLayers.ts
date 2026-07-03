/**
 * src/remotion/motion/motionLayers.ts
 *
 * Pure, render-free description of every composition's motion layer stack.
 *
 * The four compositions render their visual layers in a fixed bottom→top order.
 * The Remotion JSX tree is not introspectable in a Node test environment without
 * a DOM/renderer, so each composition derives — and exports — a descriptor built
 * from {@link MOTION_LAYER_STACK}. Tests assert on these descriptors to verify
 * structural motion-system invariants (light-leak topmost — Req 6.2; decorative
 * Lottie present — Req 6.4) without running a full render.
 *
 * Keeping the stack in one shared constant guarantees the descriptor and the
 * actual render order cannot drift: every composition mounts its layers in this
 * exact order (background → content → decorative Lottie → capped light leak).
 *
 * Requirements: 6.2, 6.4; Design §Components/5.
 */

import type { TemplateMetadata } from "@/lib/schemas";

/** Identifiers for the ordered visual layers of a composition. */
export type MotionLayerId =
  | "background"
  | "content"
  | "decorativeLottie"
  | "lightLeak";

/**
 * The canonical bottom→top layer stack shared by every composition. The LAST
 * entry is the topmost visual layer (Req 6.2). The capped light leak is always
 * last so it sits above all content; the ceremony decorative Lottie sits just
 * beneath it (Req 6.4).
 */
export const MOTION_LAYER_STACK: readonly MotionLayerId[] = [
  "background",
  "content",
  "decorativeLottie",
  "lightLeak",
] as const;

/** The single topmost layer of every composition (Req 6.2). */
export const TOPMOST_MOTION_LAYER: MotionLayerId =
  MOTION_LAYER_STACK[MOTION_LAYER_STACK.length - 1];

/** True iff `id` is the topmost layer of the stack (Req 6.2). */
export function isTopmostLayer(id: MotionLayerId): boolean {
  return id === TOPMOST_MOTION_LAYER;
}

export type CeremonyType = TemplateMetadata["functionType"];

/** Structural description of a composition's motion layers. */
export interface CompositionMotionDescriptor {
  templateId: string;
  ceremonyType: CeremonyType;
  /** Bottom→top layer order; the last entry is the topmost layer. */
  layers: readonly MotionLayerId[];
}

/**
 * Build the motion descriptor for a composition. Every composition uses the
 * shared {@link MOTION_LAYER_STACK} so the descriptor mirrors the real render
 * order (light leak topmost, decorative Lottie present).
 */
export function describeCompositionMotion(
  templateId: string,
  ceremonyType: CeremonyType,
): CompositionMotionDescriptor {
  return { templateId, ceremonyType, layers: MOTION_LAYER_STACK };
}
