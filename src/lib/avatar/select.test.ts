// src/lib/avatar/select.test.ts
import { describe, expect, it } from "vitest";
import { selectBestVariant } from "./select";
import type { AvatarVariant } from "./types";

function variant(index: number, identityScore: number): AvatarVariant {
  return { index, identityScore, imageData: Buffer.alloc(0) };
}

describe("selectBestVariant", () => {
  it("returns undefined for an empty list", () => {
    expect(selectBestVariant([])).toBeUndefined();
  });

  it("returns the only variant for a single-element list", () => {
    const only = variant(0, 0.5);
    expect(selectBestVariant([only])).toBe(only);
  });

  it("selects the variant with the maximum identity score", () => {
    const best = variant(2, 0.95);
    const variants = [variant(0, 0.80), variant(1, 0.91), best, variant(3, 0.42)];
    expect(selectBestVariant(variants)).toBe(best);
  });

  it("breaks ties by lowest index", () => {
    const tieLowIndex = variant(1, 0.9);
    const variants = [variant(3, 0.9), tieLowIndex, variant(2, 0.9)];
    expect(selectBestVariant(variants)).toBe(tieLowIndex);
  });

  it("keeps the lowest index even when it appears later in the list", () => {
    const tieLowIndex = variant(0, 0.88);
    const variants = [variant(5, 0.88), variant(4, 0.88), tieLowIndex];
    expect(selectBestVariant(variants)).toBe(tieLowIndex);
  });

  it("is deterministic across repeated calls", () => {
    const variants = [variant(0, 0.7), variant(1, 0.9), variant(2, 0.9)];
    const first = selectBestVariant(variants);
    const second = selectBestVariant(variants);
    expect(first).toBe(second);
  });
});
