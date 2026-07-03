// src/lib/system-template-duplicate.test.ts
//
// Verifies the pure "Duplicate as Custom" seed builder: a system template is
// cloned into an editable DynamicTemplate scaffold seeded from its config +
// validated metadata (palette, avatar/text slots), ready for the SlotCanvas.

import { describe, it, expect } from "vitest";
import {
  buildCustomTemplateSeed,
  customCloneId,
} from "./system-template-duplicate";
import { TEMPLATE_IDS, TEMPLATE_CONFIGS } from "./types";
import { getTemplateMetadata } from "./template-metadata";

describe("buildCustomTemplateSeed", () => {
  it.each(TEMPLATE_IDS)(
    "%s clones into a valid editable DynamicTemplate seed",
    (systemId) => {
      const cloneId = customCloneId(systemId, "test");
      const seed = buildCustomTemplateSeed(systemId, cloneId);
      const config = TEMPLATE_CONFIGS[systemId];

      // Identity + status
      expect(seed.id).toBe(cloneId);
      expect(seed.status).toBe("draft");
      expect(seed.name).toContain(config.name);
      expect(seed.ceremony).toBe(config.functionType);
      expect(seed.emoji).toBe(config.emoji);

      // Palette carried from the system config
      expect(seed.palette.primary).toBe(config.palette.primary);
      expect(seed.palette.background).toBe(config.palette.background);

      // Three editable scenes, the first carrying both avatar slots
      expect(seed.scenes).toHaveLength(3);
      const reveal = seed.scenes[0];
      expect(reveal.avatarSlots.map((a) => a.key).sort()).toEqual([
        "brideAvatar",
        "groomAvatar",
      ]);
      // Every scene has at least one text slot, all centre-anchored
      for (const scene of seed.scenes) {
        expect(scene.textSlots.length).toBeGreaterThan(0);
        for (const t of scene.textSlots) {
          expect(t.align).toBe("center");
          expect(Number.isFinite(t.x)).toBe(true);
          expect(Number.isFinite(t.y)).toBe(true);
        }
        for (const a of scene.avatarSlots) {
          expect(a.width).toBeGreaterThan(0);
          expect(a.aspectRatio).toBeGreaterThan(0);
        }
      }
    },
  );

  it("centre-anchors avatar slots derived from top-left metadata slots", () => {
    const meta = getTemplateMetadata("reception-luxury");
    const seed = buildCustomTemplateSeed("reception-luxury", "reception-luxury-custom-x");
    const groom = seed.scenes[0].avatarSlots.find((a) => a.key === "groomAvatar")!;
    expect(groom.x).toBe(Math.round(meta.avatarSlots.groom.x + meta.avatarSlots.groom.width / 2));
    expect(groom.y).toBe(Math.round(meta.avatarSlots.groom.y + meta.avatarSlots.groom.height / 2));
  });

  it("throws for an unregistered system template id", () => {
    // @ts-expect-error — intentionally invalid id
    expect(() => buildCustomTemplateSeed("not-a-template", "x")).toThrow();
  });
});
