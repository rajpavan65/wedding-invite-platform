// src/lib/avatar/providers/mock.ts
//
// MockAvatarProvider — the no-credentials fallback (Req 1.7).
//
// It implements the AvatarProvider seam and produces deterministic
// 1024x1024 transparent-background placeholder PNGs, each clearly labelled
// "MOCK", one per requested variant. It performs NO network / external API
// calls so local development works without provider credentials.

import sharp from "sharp";
import type { AvatarProvider, AvatarVariant, CeremonyPose } from "../types";

/** The fixed avatar canvas size (Req 1.6). */
const AVATAR_SIZE = 1024;

/**
 * Deterministic 32-bit FNV-1a hash. Used to derive a stable identity score
 * per (pose, index) so the mock output is fully reproducible.
 */
function fnv1a(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    // 32-bit FNV prime multiply via shifts to stay in integer range.
    hash = Math.imul(hash, 0x01000193);
  }
  // Force unsigned 32-bit.
  return hash >>> 0;
}

/**
 * Deterministic identity score in the inclusive range [0.80, 0.99] for a
 * given pose + variant index. Kept >= 0.80 so mock assets behave like
 * acceptable candidates (mirrors the Req 1.4 identity-match floor) while
 * remaining distinct per variant so selection logic has something to order.
 */
function deterministicIdentityScore(pose: CeremonyPose, index: number): number {
  const h = fnv1a(`${pose}#${index}`);
  // Map into 0..0.19 then offset by 0.80 -> [0.80, 0.99].
  const fractional = (h % 2000) / 10000; // 0.0000 .. 0.1999
  const score = 0.8 + fractional;
  // Round to 4 decimals for stable, readable values.
  return Math.round(score * 10000) / 10000;
}

/** Escape text for safe embedding inside the SVG label. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Build the deterministic SVG label overlay. The background is fully
 * transparent; only the "MOCK" text and pose/variant labels are painted, so
 * the resulting PNG keeps a transparent background (Req 1.6).
 */
function buildLabelSvg(pose: CeremonyPose, index: number): string {
  const safePose = escapeXml(pose);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${AVATAR_SIZE}" height="${AVATAR_SIZE}">`,
    // Dashed outline so the placeholder slot is visible against any background.
    `<rect x="32" y="32" width="${AVATAR_SIZE - 64}" height="${AVATAR_SIZE - 64}" `,
    `fill="none" stroke="#888888" stroke-width="8" stroke-dasharray="24 24" rx="48"/>`,
    `<text x="50%" y="44%" text-anchor="middle" `,
    `font-family="sans-serif" font-size="220" font-weight="700" fill="#444444">MOCK</text>`,
    `<text x="50%" y="58%" text-anchor="middle" `,
    `font-family="sans-serif" font-size="96" font-weight="500" fill="#666666">${safePose}</text>`,
    `<text x="50%" y="66%" text-anchor="middle" `,
    `font-family="sans-serif" font-size="56" font-weight="400" fill="#888888">variant ${index}</text>`,
    `</svg>`,
  ].join("");
}

/**
 * Render a deterministic 1024x1024 transparent PNG buffer labelled "MOCK"
 * for the given pose + variant index.
 */
async function renderMockPng(pose: CeremonyPose, index: number): Promise<Buffer> {
  const overlay = Buffer.from(buildLabelSvg(pose, index));
  return sharp({
    create: {
      width: AVATAR_SIZE,
      height: AVATAR_SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 }, // transparent background
    },
  })
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

export class MockAvatarProvider implements AvatarProvider {
  readonly name = "mock";

  /**
   * Generate `variants` deterministic placeholder variants for a single pose.
   * Makes no external API calls (Req 1.7). `timeoutMs` is accepted to satisfy
   * the provider contract but is unused — local generation never times out.
   */
  async generatePose(input: {
    referencePhotos: string[];
    pose: CeremonyPose;
    variants: number;
    timeoutMs: number;
  }): Promise<AvatarVariant[]> {
    const count = Math.max(0, Math.floor(input.variants));
    const indexes = Array.from({ length: count }, (_, i) => i);

    return Promise.all(
      indexes.map(async (index) => ({
        index,
        imageData: await renderMockPng(input.pose, index),
        identityScore: deterministicIdentityScore(input.pose, index),
      })),
    );
  }
}
