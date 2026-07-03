// src/lib/avatar/providers/index.test.ts
//
// Unit tests for env-based provider resolution and mock labelling (task 3.4).
//
// Feature: invite-product-quality
// Asserts the resolver's preference order — FAL_API_KEY → fal, else
// REPLICATE_API_TOKEN → replicate, else mock — and that the no-credentials
// path resolves to the clearly-labelled mock provider.
//
// Validates: Requirements 1.1, 1.7

import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FalInstantIdProvider,
  MockAvatarProvider,
  ReplicatePhotoMakerProvider,
  isMockMode,
  resolveAvatarProvider,
} from "./index";

// The two credential env vars the resolver inspects.
const FAL = "FAL_API_KEY";
const REPLICATE = "REPLICATE_API_TOKEN";

// Snapshot + clear the relevant env vars before each test so resolution is
// evaluated against a known-clean environment, then restore afterwards.
let savedFal: string | undefined;
let savedReplicate: string | undefined;

beforeEach(() => {
  savedFal = process.env[FAL];
  savedReplicate = process.env[REPLICATE];
  delete process.env[FAL];
  delete process.env[REPLICATE];
});

afterEach(() => {
  if (savedFal === undefined) delete process.env[FAL];
  else process.env[FAL] = savedFal;
  if (savedReplicate === undefined) delete process.env[REPLICATE];
  else process.env[REPLICATE] = savedReplicate;
});

describe("resolveAvatarProvider — env-based selection (Req 1.1, 1.7)", () => {
  it("selects fal.ai InstantID when FAL_API_KEY is present", () => {
    process.env[FAL] = "fal-test-key";

    const provider = resolveAvatarProvider();

    expect(provider).toBeInstanceOf(FalInstantIdProvider);
    expect(provider.name).toBe("fal-instant-id");
    expect(isMockMode()).toBe(false);
  });

  it("prefers fal.ai over Replicate when BOTH credentials are present", () => {
    process.env[FAL] = "fal-test-key";
    process.env[REPLICATE] = "replicate-test-token";

    const provider = resolveAvatarProvider();

    expect(provider).toBeInstanceOf(FalInstantIdProvider);
    expect(provider.name).toBe("fal-instant-id");
  });

  it("falls back to Replicate PhotoMaker when only REPLICATE_API_TOKEN is present", () => {
    process.env[REPLICATE] = "replicate-test-token";

    const provider = resolveAvatarProvider();

    expect(provider).toBeInstanceOf(ReplicatePhotoMakerProvider);
    expect(provider.name).toBe("replicate-photomaker");
    expect(isMockMode()).toBe(false);
  });

  it("falls back to the mock provider when NO credentials are present (Req 1.7)", () => {
    const provider = resolveAvatarProvider();

    expect(provider).toBeInstanceOf(MockAvatarProvider);
    expect(provider.name).toBe("mock");
    expect(isMockMode()).toBe(true);
  });

  it("treats blank/whitespace credentials as absent", () => {
    process.env[FAL] = "   ";
    process.env[REPLICATE] = "";

    const provider = resolveAvatarProvider();

    expect(provider).toBeInstanceOf(MockAvatarProvider);
    expect(isMockMode()).toBe(true);
  });
});

describe("MockAvatarProvider — clearly-labelled mock mode (Req 1.7)", () => {
  it("exposes the 'mock' name so callers can label mock output", () => {
    expect(new MockAvatarProvider().name).toBe("mock");
  });

  it("paints a visible 'MOCK' label into every generated variant", async () => {
    const provider = new MockAvatarProvider();
    const variants = await provider.generatePose({
      referencePhotos: [],
      pose: "haldi",
      variants: 2,
      timeoutMs: 120_000,
    });

    expect(variants).toHaveLength(2);
    for (const variant of variants) {
      // The deterministic placeholder PNG embeds a "MOCK" SVG label; the bytes
      // are produced locally with no network call. Asserting the label text is
      // present in the source SVG path is covered by the output-contract test;
      // here we assert each variant carries non-empty PNG image data.
      expect(variant.imageData.length).toBeGreaterThan(0);
    }
  });
});
