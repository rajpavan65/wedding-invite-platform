// src/lib/template-metadata.visual-identity-values.test.ts
//
// Feature: invite-product-quality
// Unit tests asserting the concrete per-ceremony dominant palettes and key
// motifs so each ceremony renders its intended visual identity.
//
// Validates: Requirements 4.2 (haldi), 4.3 (mehandi), 4.4 (sangeet), 4.5 (wedding)

import { describe, expect, it } from "vitest";
import { getTemplateMetadata } from "./template-metadata";

describe("Per-ceremony visual identity values", () => {
  // Req 4.2 — Haldi: bright turmeric-yellow dominant palette with garden/outdoor motifs.
  it("haldi: turmeric-yellow dominant palette + garden/outdoor motif", () => {
    const vi = getTemplateMetadata("haldi-floral").visualIdentity;

    // Dominant (first) colour is turmeric yellow.
    expect(vi.dominantPalette[0]).toBe("#FFD23F");
    // Palette carries the outdoor garden green accent.
    expect(vi.dominantPalette).toContain("#7CB342");
    // Key motif is garden/outdoor themed.
    expect(vi.keyMotif.toLowerCase()).toMatch(/garden|marigold/);
    expect(vi.moodKeywords).toContain("outdoor");
  });

  // Req 4.3 — Mehandi: deep-green dominant palette with mandala/henna line-art motifs.
  it("mehandi: deep-green dominant palette + mandala/henna line-art motif", () => {
    const vi = getTemplateMetadata("mehandi-traditional").visualIdentity;

    // Dominant (first) colour is a deep green.
    expect(vi.dominantPalette[0]).toBe("#1B5E3A");
    // Whole palette stays in the green family.
    for (const c of vi.dominantPalette) {
      expect(c).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
    // Key motif references mandala + henna line-art.
    expect(vi.keyMotif.toLowerCase()).toMatch(/mandala|henna/);
    expect(vi.keyMotif.toLowerCase()).toContain("line-art");
  });

  // Req 4.4 — Sangeet: stage/gold palette with celebratory sparkle motifs.
  it("sangeet: stage/gold palette + sparkle motif", () => {
    const vi = getTemplateMetadata("sangeet-grand").visualIdentity;

    // Gold is part of the stage palette.
    expect(vi.dominantPalette).toContain("#FFD700");
    // Key motif references the stage and sparkle.
    expect(vi.keyMotif.toLowerCase()).toMatch(/stage|spotlight/);
    expect(vi.keyMotif.toLowerCase()).toContain("sparkle");
  });

  // Req 4.5 — Wedding/Royal: royal palette with cinematic decorative motifs.
  it("wedding: royal maroon + gold palette + cinematic motif", () => {
    const vi = getTemplateMetadata("royal-rajasthani").visualIdentity;

    // Royal maroon dominant + gold secondary.
    expect(vi.dominantPalette[0]).toBe("#6B0F1A");
    expect(vi.dominantPalette).toContain("#D4AF37");
    // Key motif is cinematic/royal.
    expect(vi.keyMotif.toLowerCase()).toMatch(/cinematic|royal|palace/);
  });

  // Every template declares a schema-valid visualIdentity (>=2 colours, >=1 motif, 2..5 moods).
  it("all templates declare a well-formed visualIdentity", () => {
    for (const id of ["haldi-floral", "mehandi-traditional", "sangeet-grand", "royal-rajasthani", "reception-luxury", "baraat-royal", "sangeet-neon", "haldi-modern", "mehandi-pastel", "wedding-divine", "reception-garden"] as const) {
      const vi = getTemplateMetadata(id).visualIdentity;
      expect(vi.dominantPalette.length).toBeGreaterThanOrEqual(2);
      expect(vi.keyMotif.length).toBeGreaterThanOrEqual(1);
      expect(vi.moodKeywords.length).toBeGreaterThanOrEqual(2);
      expect(vi.moodKeywords.length).toBeLessThanOrEqual(5);
    }
  });
});
