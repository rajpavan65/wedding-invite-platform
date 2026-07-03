/**
 * src/remotion/render/config.ts
 *
 * Fixed render-output configuration for every invitation
 * (design §Components/7 — Render Output & Thumbnail; Req 8.1).
 *
 * Every invitation renders at a constant 1080×1920 (9:16 portrait) at 30fps.
 * These constants are the single source of truth shared by the render route
 * (so the composition's width/height/fps are forced to these values before
 * `renderMedia`/`renderStill`) and by the configuration smoke test, so the
 * 1080×1920 / 9:16 / 30fps contract can be asserted without running a render.
 */

/** Output width in pixels (Req 8.1). */
export const RENDER_WIDTH = 1080;

/** Output height in pixels (Req 8.1). */
export const RENDER_HEIGHT = 1920;

/** Constant frame rate (Req 8.1). */
export const RENDER_FPS = 30;

/** Portrait aspect ratio label (Req 8.1). */
export const RENDER_ASPECT_RATIO = "9:16";

/** Video codec for the single playable output file (Req 8.2). */
export const RENDER_VIDEO_CODEC = "h264" as const;

/** Still image format for the generated thumbnail (Req 8.3). */
export const THUMBNAIL_IMAGE_FORMAT = "jpeg" as const;

/**
 * Fixed render configuration object (1080×1920 / 9:16 / 30fps).
 * Frozen so callers cannot mutate the shared contract at runtime.
 */
export const RENDER_CONFIG = Object.freeze({
  width: RENDER_WIDTH,
  height: RENDER_HEIGHT,
  fps: RENDER_FPS,
  aspectRatio: RENDER_ASPECT_RATIO,
  videoCodec: RENDER_VIDEO_CODEC,
  thumbnailImageFormat: THUMBNAIL_IMAGE_FORMAT,
});
