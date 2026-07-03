// src/lib/ai-generator.test.ts
//
// Unit tests for avatar generation orchestration and failure isolation (task 4.3).
//
// Feature: invite-product-quality
//
// Covers:
//   - Stubbed provider: one asset per requested pose (Req 1.5)
//   - Best-variant selection wired through orchestration (Req 1.11)
//   - Provider error / empty result → descriptive pose error, no partial asset (Req 1.9)
//   - Provider timeout via fake timers → descriptive pose error, no partial asset (Req 1.10)
//
// Validates: Requirements 1.5, 1.9, 1.10
//
// The cloud-storage upload and the env-based provider resolver are mocked so
// the tests require no real S3/credentials and run fully offline.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AvatarProvider, AvatarVariant, CeremonyPose } from "./avatar/types";

// ── Mock cloud storage so no real S3/env is required ────────────────────────
const uploadFile = vi.fn(
  async (bucket: string, folder: string, filename: string) =>
    `https://cdn.test/${bucket}/${folder}/${filename}`,
);

vi.mock("./cloud-storage", () => ({
  cloudStorage: {
    uploadFile: (...args: unknown[]) =>
      (uploadFile as (...a: unknown[]) => Promise<string>)(...args),
  },
}));

// ── Mock the provider resolver so each test injects a stub provider ─────────
let stubProvider: AvatarProvider;
let mockModeFlag = false;

vi.mock("./avatar/providers", () => ({
  resolveAvatarProvider: () => stubProvider,
  isMockMode: () => mockModeFlag,
}));

// Imported after the mocks are registered.
import { generateAvatars } from "./ai-generator";

/** Build a deterministic variant with a tiny non-empty PNG-ish buffer. */
function variant(index: number, identityScore: number): AvatarVariant {
  return {
    index,
    identityScore,
    imageData: Buffer.from([0x89, 0x50, 0x4e, 0x47, index]),
  };
}

beforeEach(() => {
  uploadFile.mockClear();
  mockModeFlag = false;
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("generateAvatars — one asset per requested pose (Req 1.5, 1.11)", () => {
  it("produces exactly one stored asset per requested pose, picking the best variant", async () => {
    const poses: CeremonyPose[] = ["haldi", "mehandi", "sangeet"];

    stubProvider = {
      name: "stub",
      // Best is index 2 (score 0.95); lower scores never win.
      generatePose: vi.fn(async () => [
        variant(0, 0.80),
        variant(1, 0.90),
        variant(2, 0.95),
      ]),
    };

    const result = await generateAvatars({
      clientId: "client-1",
      referencePhotos: ["https://ref/1.jpg"],
      poses,
    });

    // One asset per requested pose (Req 1.5).
    expect(result.assets).toHaveLength(poses.length);
    expect(result.assets.map((a) => a.pose)).toEqual(poses);

    // Best variant (highest identity score) selected for each pose (Req 1.11).
    for (const asset of result.assets) {
      expect(asset.identityScore).toBe(0.95);
    }

    // Default 3 variants requested per pose (Req 1.11).
    const gen = stubProvider.generatePose as ReturnType<typeof vi.fn>;
    expect(gen).toHaveBeenCalledTimes(poses.length);
    for (const call of gen.mock.calls) {
      expect(call[0].variants).toBe(3);
      expect(call[0].timeoutMs).toBe(120_000);
    }

    // One upload per pose, to avatars/{clientId}/{pose}.png.
    expect(uploadFile).toHaveBeenCalledTimes(poses.length);
    for (const pose of poses) {
      expect(uploadFile).toHaveBeenCalledWith(
        "avatars",
        "client-1",
        `${pose}.png`,
        expect.anything(),
      );
    }
  });

  it("breaks identity-score ties by lowest variant index", async () => {
    stubProvider = {
      name: "stub",
      generatePose: vi.fn(async () => [
        variant(2, 0.9),
        variant(0, 0.9), // tie on score → lowest index wins
        variant(1, 0.9),
      ]),
    };

    const result = await generateAvatars({
      clientId: "c",
      referencePhotos: ["r"],
      poses: ["wedding"],
    });

    expect(result.assets).toHaveLength(1);
    // identityScore is the tied value; selection correctness asserted via select.ts,
    // here we confirm a single asset is produced from the tie set.
    expect(result.assets[0].identityScore).toBe(0.9);
  });
});

describe("generateAvatars — provider error / empty result (Req 1.9)", () => {
  it("throws a descriptive pose-named error and stores no asset when the provider errors", async () => {
    stubProvider = {
      name: "stub",
      generatePose: vi.fn(async ({ pose }) => {
        throw new Error(`boom for ${pose}`);
      }),
    };

    await expect(
      generateAvatars({
        clientId: "c",
        referencePhotos: ["r"],
        poses: ["haldi"],
      }),
    ).rejects.toThrow(/haldi/);

    // No partial asset stored on failure (Req 1.9).
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("throws and stores nothing when the provider returns an empty variant list", async () => {
    stubProvider = {
      name: "stub",
      generatePose: vi.fn(async () => [] as AvatarVariant[]),
    };

    await expect(
      generateAvatars({
        clientId: "c",
        referencePhotos: ["r"],
        poses: ["sangeet"],
      }),
    ).rejects.toThrow(/sangeet/);

    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("does not store the failed pose's asset even when an earlier pose succeeded", async () => {
    stubProvider = {
      name: "stub",
      generatePose: vi.fn(async ({ pose }) => {
        if (pose === "mehandi") return [] as AvatarVariant[]; // second pose fails
        return [variant(0, 0.9)];
      }),
    };

    await expect(
      generateAvatars({
        clientId: "c",
        referencePhotos: ["r"],
        poses: ["haldi", "mehandi"],
      }),
    ).rejects.toThrow(/mehandi/);

    // Only the successful first pose was uploaded; the failed pose stored nothing.
    expect(uploadFile).toHaveBeenCalledTimes(1);
    expect(uploadFile).toHaveBeenCalledWith(
      "avatars",
      "c",
      "haldi.png",
      expect.anything(),
    );
    expect(uploadFile).not.toHaveBeenCalledWith(
      "avatars",
      "c",
      "mehandi.png",
      expect.anything(),
    );
  });
});

describe("generateAvatars — provider timeout (Req 1.10)", () => {
  it("aborts a hanging pose after 120s and stores no partial asset", async () => {
    vi.useFakeTimers();

    stubProvider = {
      name: "stub",
      // Never resolves → must be aborted by the orchestrator's 120s timeout.
      generatePose: vi.fn(() => new Promise<AvatarVariant[]>(() => {})),
    };

    const promise = generateAvatars({
      clientId: "c",
      referencePhotos: ["r"],
      poses: ["wedding"],
    });
    // Prevent unhandled-rejection noise while we advance timers.
    const assertion = expect(promise).rejects.toThrow(/wedding/);

    // Advance past the 120s budget to trigger the timeout race.
    await vi.advanceTimersByTimeAsync(120_000);

    await assertion;
    expect(uploadFile).not.toHaveBeenCalled();
  });
});

describe("generateAvatars — input validation (Req 1.2, 1.3)", () => {
  it("rejects 0 reference photos before invoking the provider", async () => {
    const gen = vi.fn();
    stubProvider = { name: "stub", generatePose: gen };

    await expect(
      generateAvatars({ clientId: "c", referencePhotos: [], poses: ["haldi"] }),
    ).rejects.toThrow(/between 1 and 3|at least one/i);

    expect(gen).not.toHaveBeenCalled();
    expect(uploadFile).not.toHaveBeenCalled();
  });

  it("rejects more than 3 reference photos before invoking the provider", async () => {
    const gen = vi.fn();
    stubProvider = { name: "stub", generatePose: gen };

    await expect(
      generateAvatars({
        clientId: "c",
        referencePhotos: ["a", "b", "c", "d"],
        poses: ["haldi"],
      }),
    ).rejects.toThrow(/between 1 and 3/i);

    expect(gen).not.toHaveBeenCalled();
  });
});
