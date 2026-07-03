/**
 * src/remotion/render/thumbnail.ts
 *
 * Pure thumbnail-frame resolution for the render route
 * (design §Components/7 — Render Output & Thumbnail).
 *
 * `resolveThumbnailFrame` is a TOTAL pure function: it never throws, has no
 * side effects, and is deterministic, so the thumbnail clamping property
 * (Property 24) is testable without running a render. The render route uses
 * it to pick a safe `renderStill` frame for the 1080×1920 thumbnail.
 *
 * Requirements: 8.4.
 */

/**
 * Resolve the frame to capture a thumbnail at, clamped to a valid index within
 * the composition.
 *
 * The result always lies within `[0, durationInFrames - 1]`. A negative frame,
 * a frame greater than `durationInFrames - 1`, or any non-finite input resolves
 * to `0` (the first frame). When `durationInFrames <= 0` (or non-finite) there
 * is no valid frame range, so it returns `0` as a safe default.
 *
 * Requirement 8.4.
 */
export function resolveThumbnailFrame(
  frame: number,
  durationInFrames: number,
): number {
  // No valid frame range — return the safe default (first frame).
  if (!Number.isFinite(durationInFrames) || durationInFrames <= 0) {
    return 0;
  }

  const maxFrame = Math.floor(durationInFrames) - 1;

  // Out-of-range or non-finite frame resolves to frame 0 per Req 8.4.
  if (!Number.isFinite(frame)) {
    return 0;
  }

  const normalized = Math.floor(frame);
  if (normalized < 0 || normalized > maxFrame) {
    return 0;
  }

  return normalized;
}
