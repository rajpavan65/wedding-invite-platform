// src/lib/avatar/qa.test.ts
//
// Unit / integration tests for the Avatar QA Service (Design §Components/2).
//
// Covers:
//   - 2.1 generation completes → Pending_Review
//   - 2.6 admin approves → Approved
//   - 2.2 transparency auto-check on representative sample images
//   - 2.3 face auto-check (placeholder) on representative sample images
//
// The lifecycle methods are driven through an in-memory QaStore so the tests run
// without a live database. The auto-checks run against real PNG buffers produced
// by `sharp`, so the transparency analysis is exercised end-to-end.

import { describe, expect, it, beforeAll } from "vitest";
import sharp from "sharp";
import {
  avatarQa,
  checkFace,
  checkTransparency,
  heuristicFaceDetector,
  type QaStore,
} from "./qa";
import type { OrderAvatarQa } from "../types";
import type { AvatarAsset, CeremonyPose } from "./types";

// ─── Sample image fixtures ────────────────────────────────────────────────────

/** A 64×64 PNG: transparent background with a solid opaque square in the centre. */
async function subjectOnTransparent(): Promise<Buffer> {
  const size = 64;
  const subject = await sharp({
    create: { width: 32, height: 32, channels: 4, background: { r: 200, g: 120, b: 80, alpha: 1 } },
  })
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: subject, left: 16, top: 16 }])
    .png()
    .toBuffer();
}

/** A 64×64 fully-opaque PNG (no transparent background). */
async function fullyOpaque(): Promise<Buffer> {
  return sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 50, g: 50, b: 50, alpha: 1 } },
  })
    .png()
    .toBuffer();
}

/** A 64×64 fully-transparent PNG (no visible subject). */
async function fullyTransparent(): Promise<Buffer> {
  return sharp({
    create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .png()
    .toBuffer();
}

// ─── In-memory store + loader ─────────────────────────────────────────────────

function memoryStore(initial?: OrderAvatarQa): QaStore & { current?: OrderAvatarQa } {
  const state: { current?: OrderAvatarQa } = { current: initial };
  return {
    current: state.current,
    async load() {
      return state.current;
    },
    async save(_orderId, qa) {
      state.current = qa;
      this.current = qa;
    },
  };
}

function asset(pose: CeremonyPose, url: string): AvatarAsset {
  return { pose, url, identityScore: 0.95 };
}

let goodPng: Buffer;
let opaquePng: Buffer;
let transparentPng: Buffer;

beforeAll(async () => {
  [goodPng, opaquePng, transparentPng] = await Promise.all([
    subjectOnTransparent(),
    fullyOpaque(),
    fullyTransparent(),
  ]);
});

// ─── Auto-checks (Req 2.2, 2.3, 2.4) ──────────────────────────────────────────

describe("auto-checks on representative sample images", () => {
  it("detects a transparent background on a subject-on-transparent PNG (2.2)", async () => {
    expect(await checkTransparency(goodPng)).toBe(true);
  });

  it("flags a fully-opaque PNG as having no transparent background (2.2)", async () => {
    expect(await checkTransparency(opaquePng)).toBe(false);
  });

  it("detects a face (placeholder) when a visible subject is present (2.3)", async () => {
    expect(await checkFace(goodPng, heuristicFaceDetector)).toBe(true);
  });

  it("reports no face on a fully-transparent PNG (2.3)", async () => {
    expect(await checkFace(transparentPng, heuristicFaceDetector)).toBe(false);
  });

  it("marks a passing asset and a failing asset, identifying the failed check (2.4)", async () => {
    const loadImage = async (url: string): Promise<Buffer> =>
      url.includes("good") ? goodPng : opaquePng;

    const results = await avatarQa.runAutoChecks(
      [asset("haldi", "good-haldi.png"), asset("wedding", "opaque-wedding.png")],
      { loadImage },
    );

    const haldi = results.find((r) => r.pose === "haldi")!;
    const wedding = results.find((r) => r.pose === "wedding")!;

    expect(haldi.passed).toBe(true);
    expect(haldi.failedCheck).toBeUndefined();

    expect(wedding.passed).toBe(false);
    expect(wedding.failedCheck).toBe("transparency");
  });
});

// ─── Lifecycle transitions (Req 2.1, 2.6) ─────────────────────────────────────

describe("QA lifecycle transitions", () => {
  it("moves an order into Pending_Review when generation completes (2.1)", async () => {
    const store = memoryStore();
    const loadImage = async (): Promise<Buffer> => goodPng;

    const record = await avatarQa.beginReview(
      "order-1",
      [asset("haldi", "a.png"), asset("wedding", "b.png")],
      { store, checkDeps: { loadImage } },
    );

    expect(record.state).toBe("Pending_Review");
    expect(record.checks).toHaveLength(2);
    expect(record.checks.every((c) => c.passed)).toBe(true);
    expect(store.current?.state).toBe("Pending_Review");
    expect(store.current?.assets).toHaveLength(2);
  });

  it("moves a reviewed order to Approved on admin approval (2.6)", async () => {
    const store = memoryStore({
      state: "Pending_Review",
      attempts: 0,
      assets: [{ pose: "haldi", url: "a.png", identityScore: 0.9 }],
      checks: [{ pose: "haldi", passed: true }],
      updatedAt: new Date().toISOString(),
    });

    const record = await avatarQa.approve("order-1", { store });

    expect(record.state).toBe("Approved");
    expect(store.current?.state).toBe("Approved");
    expect(avatarQa.canRender(record)).toBe(true);
  });

  it("rejects → Rejected while regeneration budget remains (2.7)", async () => {
    const store = memoryStore({
      state: "Pending_Review",
      attempts: 0,
      assets: [{ pose: "haldi", url: "a.png", identityScore: 0.9 }],
      checks: [{ pose: "haldi", passed: false, failedCheck: "face" }],
      updatedAt: new Date().toISOString(),
    });

    let regenAttempt = -1;
    const record = await avatarQa.reject("order-1", {
      store,
      regenerate: async (_id, attempt) => {
        regenAttempt = attempt;
      },
    });

    expect(record.state).toBe("Rejected");
    expect(record.attempts).toBe(1);
    expect(regenAttempt).toBe(1);
    expect(avatarQa.canRender(record)).toBe(false);
  });
});
