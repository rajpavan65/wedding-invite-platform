/**
 * src/remotion/layout/geometry.ts
 *
 * Pure compositing geometry helpers for the Remotion render layer
 * (design §Components/3 — Compositing Engine).
 *
 * Every function in this module is a TOTAL pure function: it never throws,
 * has no side effects, and depends on no React/Remotion runtime (only the
 * `SpringConfig` *type* is imported, which is erased at compile time). This
 * keeps the high-value correctness properties (aspect ratio, slot fit,
 * safe-zone containment, entrance settle time) unit/property-testable
 * without running a full render.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.5, 3.6.
 */

import type { SpringConfig } from "remotion";

// ─────────────────────────────────────────────────────────────
// Types (mirrors design §Components/3)
// ─────────────────────────────────────────────────────────────

/** A template avatar/text slot authored against the reference canvas. */
export interface Slot {
  x: number;
  y: number;
  width: number;
  height: number;
  /** When true, the slot is anchored to its bottom edge rather than its top. */
  anchorBottom?: boolean;
}

/** A 2D size in pixels. */
export interface Size {
  width: number;
  height: number;
}

/** A placed, absolutely-positioned box in canvas pixels. */
export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

/** Reference canvas that slot coordinates are authored against (1080×1920). */
export const REF_CANVAS: Size = { width: 1080, height: 1920 };

/** Safe-zone inset in pixels on the reference canvas. */
export const SAFE_ZONE_INSET = 40;

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Coerce a value to a finite number, falling back when NaN/Infinity. */
const finite = (value: number, fallback: number): number =>
  Number.isFinite(value) ? value : fallback;

/** Clamp `value` into the inclusive range [min, max]. Total even if min > max. */
const clamp = (value: number, min: number, max: number): number => {
  if (max < min) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

// ─────────────────────────────────────────────────────────────
// scaleSlotToCanvas (Req 3.3)
// ─────────────────────────────────────────────────────────────

/**
 * Scale a slot authored on the 1080×1920 reference canvas to an actual
 * canvas size. The x/width are multiplied by `canvas.width / 1080` and the
 * y/height by `canvas.height / 1920`, preserving the slot's relative position.
 *
 * Requirement 3.3.
 */
export function scaleSlotToCanvas(slot: Slot, canvas: Size): Slot {
  const scaleX = finite(canvas.width, REF_CANVAS.width) / REF_CANVAS.width;
  const scaleY = finite(canvas.height, REF_CANVAS.height) / REF_CANVAS.height;

  return {
    x: finite(slot.x, 0) * scaleX,
    y: finite(slot.y, 0) * scaleY,
    width: finite(slot.width, 0) * scaleX,
    height: finite(slot.height, 0) * scaleY,
    ...(slot.anchorBottom !== undefined
      ? { anchorBottom: slot.anchorBottom }
      : {}),
  };
}

// ─────────────────────────────────────────────────────────────
// fitAvatarIntoSlot (Req 3.1, 3.2)
// ─────────────────────────────────────────────────────────────

/**
 * Fit an asset of intrinsic size into a slot using a SINGLE uniform scale
 * factor so the original aspect ratio is preserved (never stretched,
 * squashed, or cropped). The placed box's width is at most the slot width and
 * its height is at most the slot height, centred horizontally; vertical
 * placement honours `anchorBottom` (otherwise centred).
 *
 * This replaces the previous non-uniform `scaleX`/`scaleY` stretch bug.
 *
 * Requirements 3.1, 3.2.
 */
export function fitAvatarIntoSlot(intrinsic: Size, slot: Slot): Box {
  const slotX = finite(slot.x, 0);
  const slotY = finite(slot.y, 0);
  const slotW = Math.max(0, finite(slot.width, 0));
  const slotH = Math.max(0, finite(slot.height, 0));

  const intrinsicW = finite(intrinsic.width, 0);
  const intrinsicH = finite(intrinsic.height, 0);

  // Degenerate intrinsic size: nothing meaningful to place. Return an empty
  // box at the slot origin (total, no throw, still within slot bounds).
  if (intrinsicW <= 0 || intrinsicH <= 0) {
    return { left: slotX, top: slotY, width: 0, height: 0 };
  }

  // Single uniform scale factor — the smaller of the two axis ratios.
  const scale = Math.min(slotW / intrinsicW, slotH / intrinsicH);

  const placedW = intrinsicW * scale;
  const placedH = intrinsicH * scale;

  const left = slotX + (slotW - placedW) / 2;
  const top = slot.anchorBottom
    ? slotY + (slotH - placedH)
    : slotY + (slotH - placedH) / 2;

  return { left, top, width: placedW, height: placedH };
}

// ─────────────────────────────────────────────────────────────
// clampToSafeZone (Req 3.6)
// ─────────────────────────────────────────────────────────────

/**
 * Clamp a box so it lies fully within the safe zone of `canvas`: its left/top
 * are at or beyond `inset` and its right/bottom at or before the canvas edge
 * minus `inset`. If the box is larger than the safe zone it is first shrunk to
 * fit, then repositioned so no part is clipped by a canvas edge.
 *
 * Requirement 3.6 (also underpins Requirements 5.8, 9.3).
 */
export function clampToSafeZone(
  box: Box,
  canvas: Size,
  inset: number = SAFE_ZONE_INSET,
): Box {
  const canvasW = Math.max(0, finite(canvas.width, REF_CANVAS.width));
  const canvasH = Math.max(0, finite(canvas.height, REF_CANVAS.height));
  const safeInset = Math.max(0, finite(inset, SAFE_ZONE_INSET));

  // Available safe-zone span on each axis (never negative).
  const safeW = Math.max(0, canvasW - safeInset * 2);
  const safeH = Math.max(0, canvasH - safeInset * 2);

  // Shrink to fit within the safe zone if oversized.
  const width = clamp(Math.max(0, finite(box.width, 0)), 0, safeW);
  const height = clamp(Math.max(0, finite(box.height, 0)), 0, safeH);

  // Reposition so the box stays fully inside [inset, edge - inset].
  const left = clamp(finite(box.left, safeInset), safeInset, safeInset + safeW - width);
  const top = clamp(finite(box.top, safeInset), safeInset, safeInset + safeH - height);

  return { left, top, width, height };
}

// ─────────────────────────────────────────────────────────────
// entranceDurationSeconds (Req 3.5)
// ─────────────────────────────────────────────────────────────

const DEFAULT_SPRING_CONFIG = {
  damping: 10,
  mass: 1,
  stiffness: 100,
  overshootClamping: false,
};

/** Resolved spring physics inputs, guaranteed positive/finite. */
interface ResolvedSpring {
  damping: number;
  mass: number;
  stiffness: number;
}

interface SpringNode {
  current: number;
  velocity: number;
  lastTimestamp: number;
}

/**
 * Closed-form single-frame advance of an under/critically-damped spring,
 * mirroring Remotion's internal `springCalculation` physics. Pure and total.
 */
function advanceSpring(
  node: SpringNode,
  now: number,
  config: ResolvedSpring,
): SpringNode {
  const toValue = 1;
  const deltaTime = Math.min(now - node.lastTimestamp, 64);

  const { damping: c, mass: m, stiffness: k } = config;

  const v0 = -node.velocity;
  const x0 = toValue - node.current;

  const zeta = c / (2 * Math.sqrt(k * m)); // damping ratio
  const omega0 = Math.sqrt(k / m); // undamped angular frequency (rad/ms)
  const omega1 = omega0 * Math.sqrt(1 - zeta ** 2); // exponential decay
  const t = deltaTime / 1000;

  const sin1 = Math.sin(omega1 * t);
  const cos1 = Math.cos(omega1 * t);

  // Under-damped solution.
  const underDampedEnvelope = Math.exp(-zeta * omega0 * t);
  const underDampedFrag1 =
    underDampedEnvelope *
    (sin1 * ((v0 + zeta * omega0 * x0) / omega1) + x0 * cos1);
  const underDampedPosition = toValue - underDampedFrag1;
  const underDampedVelocity =
    zeta * omega0 * underDampedFrag1 -
    underDampedEnvelope *
      (cos1 * (v0 + zeta * omega0 * x0) - omega1 * x0 * sin1);

  // Critically-damped solution.
  const criticallyDampedEnvelope = Math.exp(-omega0 * t);
  const criticallyDampedPosition =
    toValue - criticallyDampedEnvelope * (x0 + (v0 + omega0 * x0) * t);
  const criticallyDampedVelocity =
    criticallyDampedEnvelope *
    (v0 * (t * omega0 - 1) + t * x0 * omega0 * omega0);

  return {
    current: zeta < 1 ? underDampedPosition : criticallyDampedPosition,
    velocity: zeta < 1 ? underDampedVelocity : criticallyDampedVelocity,
    lastTimestamp: now,
  };
}

/**
 * Return how long (in seconds) a spring entrance takes to settle to its final
 * position/scale for the given config and frame rate. Mirrors the settle
 * measurement Remotion uses (`measureSpring`, rest threshold 0.005, stable for
 * 20 frames) but is fully pure and total — invalid inputs yield 0 rather than
 * throwing or looping forever.
 *
 * Requirement 3.5.
 */
export function entranceDurationSeconds(
  config: Partial<SpringConfig>,
  fps: number,
): number {
  const safeFps = finite(fps, 0);
  if (safeFps <= 0) return 0;

  const merged = { ...DEFAULT_SPRING_CONFIG, ...config };
  const resolved: ResolvedSpring = {
    // Damping must be > 0 or the spring never ends; fall back to default.
    damping: merged.damping > 0 ? merged.damping : DEFAULT_SPRING_CONFIG.damping,
    mass: merged.mass > 0 ? merged.mass : DEFAULT_SPRING_CONFIG.mass,
    stiffness:
      merged.stiffness > 0 ? merged.stiffness : DEFAULT_SPRING_CONFIG.stiffness,
  };

  const threshold = 0.005;
  const maxFrames = 100_000; // safety bound to keep the function total

  let node: SpringNode = { current: 0, velocity: 0, lastTimestamp: 0 };
  let frame = 0;
  const diff = (): number => Math.abs(node.current - 1);

  // Advance until the value first comes within the rest threshold.
  while (diff() >= threshold && frame < maxFrames) {
    frame++;
    node = advanceSpring(node, (frame / safeFps) * 1000, resolved);
  }

  // A bouncy spring can dip back out of the threshold, so require it to stay
  // settled for 20 consecutive frames (matching Remotion's measurement).
  let finishedFrame = frame;
  for (let i = 0; i < 20 && frame < maxFrames; i++) {
    frame++;
    node = advanceSpring(node, (frame / safeFps) * 1000, resolved);
    if (diff() >= threshold) {
      i = 0;
      finishedFrame = frame + 1;
    }
  }

  return finishedFrame / safeFps;
}
