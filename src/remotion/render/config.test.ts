// src/remotion/render/config.test.ts
//
// Feature: invite-product-quality — Render configuration smoke test.
// Asserts the fixed output contract: 1080×1920 / 9:16 portrait / 30fps.
//
// Validates: Requirements 8.1

import { describe, expect, it } from "vitest";
import {
  RENDER_WIDTH,
  RENDER_HEIGHT,
  RENDER_FPS,
  RENDER_ASPECT_RATIO,
  RENDER_VIDEO_CODEC,
  RENDER_CONFIG,
} from "./config";

describe("Render configuration constants (Req 8.1)", () => {
  it("renders at 1080×1920 resolution", () => {
    expect(RENDER_WIDTH).toBe(1080);
    expect(RENDER_HEIGHT).toBe(1920);
    expect(RENDER_CONFIG.width).toBe(1080);
    expect(RENDER_CONFIG.height).toBe(1920);
  });

  it("is 9:16 portrait orientation", () => {
    expect(RENDER_ASPECT_RATIO).toBe("9:16");
    // The numeric dimensions reduce to a 9:16 ratio (portrait: height > width).
    expect(RENDER_HEIGHT).toBeGreaterThan(RENDER_WIDTH);
    expect(RENDER_WIDTH / RENDER_HEIGHT).toBeCloseTo(9 / 16, 5);
  });

  it("renders at a constant 30 frames per second", () => {
    expect(RENDER_FPS).toBe(30);
    expect(RENDER_CONFIG.fps).toBe(30);
  });

  it("uses the h264 video codec for a single playable file", () => {
    expect(RENDER_VIDEO_CODEC).toBe("h264");
    expect(RENDER_CONFIG.videoCodec).toBe("h264");
  });

  it("exposes a frozen, immutable config contract", () => {
    expect(Object.isFrozen(RENDER_CONFIG)).toBe(true);
  });
});
