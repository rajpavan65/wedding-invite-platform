// src/lib/template-overrides.test.ts
//
// Pure-logic tests for catalog-level built-in template overrides: the merge
// precedence, enabled resolution, and partial-palette behaviour. (Supabase I/O
// is not exercised here — the fetch/upsert helpers degrade gracefully and are
// covered by the API/integration layer.)

import { describe, it, expect } from "vitest";
import {
  applyOverrideToConfig,
  isEnabled,
  type TemplateOverride,
} from "./template-overrides";
import { TEMPLATE_CONFIGS } from "./types";

const base = TEMPLATE_CONFIGS["reception-luxury"];

describe("isEnabled", () => {
  it("defaults to enabled when no override / no flag", () => {
    expect(isEnabled(undefined)).toBe(true);
    expect(isEnabled({})).toBe(true);
    expect(isEnabled({ enabled: true })).toBe(true);
  });
  it("is disabled only when explicitly false", () => {
    expect(isEnabled({ enabled: false })).toBe(false);
  });
});

describe("applyOverrideToConfig", () => {
  it("returns the base config (enabled) when no override is given", () => {
    const eff = applyOverrideToConfig(base);
    expect(eff.enabled).toBe(true);
    expect(eff.name).toBe(base.name);
    expect(eff.palette).toEqual(base.palette);
  });

  it("applies display-field overrides while leaving others untouched", () => {
    const override: TemplateOverride = {
      name: "Royal Reception",
      tagline: "Bespoke · Elegant",
      emoji: "👑",
    };
    const eff = applyOverrideToConfig(base, override);
    expect(eff.name).toBe("Royal Reception");
    expect(eff.tagline).toBe("Bespoke · Elegant");
    expect(eff.emoji).toBe("👑");
    // Untouched fields keep defaults
    expect(eff.description).toBe(base.description);
    expect(eff.functionType).toBe(base.functionType);
  });

  it("merges a partial palette field-by-field over the default", () => {
    const eff = applyOverrideToConfig(base, { palette: { primary: "#123456" } });
    expect(eff.palette.primary).toBe("#123456");
    // Other channels retained from the default palette
    expect(eff.palette.secondary).toBe(base.palette.secondary);
    expect(eff.palette.accent).toBe(base.palette.accent);
    expect(eff.palette.background).toBe(base.palette.background);
  });

  it("carries the disabled flag through", () => {
    expect(applyOverrideToConfig(base, { enabled: false }).enabled).toBe(false);
  });

  it("ignores empty-string display overrides (treated as not set)", () => {
    const eff = applyOverrideToConfig(base, { name: "" });
    expect(eff.name).toBe(base.name);
  });
});
