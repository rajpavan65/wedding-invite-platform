/**
 * src/lib/system-template-duplicate.ts
 *
 * "Duplicate as Custom" — lets an admin clone a built-in (system) template into
 * an editable {@link DynamicTemplate} (Supabase `custom_templates`), which is
 * then fully editable in the visual Template Manager / SlotCanvas without any
 * code change or redeploy.
 *
 * This module owns the PURE seed builder ({@link buildCustomTemplateSeed}) that
 * derives a 3-scene `DynamicTemplate` scaffold from a system template's
 * `TEMPLATE_CONFIGS` entry + validated `metadata.json` (avatar/text slots,
 * palette). The API route persists the returned seed.
 *
 * NOTE — fidelity caveat: the clone is rendered by the generic
 * `UniversalTemplate` engine (background + avatar slots + text slots + Lottie),
 * so it intentionally does NOT carry the built-in's bespoke hand-coded VFX
 * (chandeliers, neon grids, rotating mandalas, dhol pulses). It is meant for
 * layout / palette / text customisation, not VFX reproduction.
 */

import { getTemplateMetadata } from "./template-metadata";
import {
  TEMPLATE_CONFIGS,
  type TemplateId,
  type DynamicTemplate,
  type DynamicTemplatePalette,
  type SceneDefinition,
  type AvatarSlotDef,
  type TextSlotDef,
} from "./types";
import type { TemplateMetadata } from "./schemas";

/** Convert a metadata avatar slot (top-left + size) into a centre-anchored {@link AvatarSlotDef}. */
function toAvatarSlot(
  key: "groomAvatar" | "brideAvatar",
  slot: TemplateMetadata["avatarSlots"]["bride"],
): AvatarSlotDef {
  const width = slot.width;
  const height = slot.height;
  return {
    key,
    // DynamicTemplate avatar slots are centre-anchored; metadata slots are top-left.
    x: Math.round(slot.x + width / 2),
    y: Math.round(slot.y + height / 2),
    width,
    aspectRatio: height > 0 && width > 0 ? +(height / width).toFixed(3) : 1.333,
  };
}

/** Build a text slot at the given metadata coordinate. */
function textSlot(
  key: string,
  x: number,
  y: number,
  fontSize: number,
  color: string,
  fontFamily?: string,
  customText?: string,
): TextSlotDef {
  return { key, x, y, fontSize, color, align: "center", fontFamily, customText };
}

/**
 * Derive a complete, editable {@link DynamicTemplate} seed from a built-in
 * system template. Pure and total over registered template ids — throws only if
 * the id is not a registered system template (mirrors `getTemplateMetadata`).
 *
 * @param systemId  A registered system TemplateId (e.g. "reception-luxury").
 * @param newId     The id to assign the cloned custom template.
 * @param name      Optional display name; defaults to "<System Name> (Custom)".
 */
export function buildCustomTemplateSeed(
  systemId: TemplateId,
  newId: string,
  name?: string,
): Omit<DynamicTemplate, "createdAt" | "updatedAt"> {
  const config = TEMPLATE_CONFIGS[systemId];
  if (!config) {
    throw new Error(
      `[duplicate] "${systemId}" is not a registered system template. ` +
        `Valid ids: ${Object.keys(TEMPLATE_CONFIGS).join(", ")}`,
    );
  }
  const meta = getTemplateMetadata(systemId);

  const palette: DynamicTemplatePalette = {
    primary: config.palette.primary,
    secondary: config.palette.secondary,
    accent: config.palette.accent,
    background: config.palette.background,
  };

  const ts = meta.textSlots;
  const nameColor = config.palette.accent || config.palette.primary;
  const detailColor = config.palette.primary;

  const scenes: SceneDefinition[] = [
    {
      id: "reveal",
      label: "Names Reveal",
      durationSeconds: 4,
      transitionIn: "fade",
      transitionOut: "fade",
      avatarSlots: [
        toAvatarSlot("groomAvatar", meta.avatarSlots.groom),
        toAvatarSlot("brideAvatar", meta.avatarSlots.bride),
      ],
      textSlots: [
        textSlot("groomName", ts.primaryName.x, ts.primaryName.y, 64, nameColor, ts.primaryName.fontFamily),
        textSlot("brideName", ts.secondaryName.x, ts.secondaryName.y, 64, nameColor, ts.secondaryName.fontFamily),
      ],
    },
    {
      id: "details",
      label: "Event Details",
      durationSeconds: 4,
      transitionIn: "fade",
      transitionOut: "fade",
      avatarSlots: [],
      textSlots: [
        textSlot("eventDate", ts.date.x, ts.date.y, 44, detailColor),
        textSlot("venueName", ts.venue.x, ts.venue.y, 30, nameColor),
      ],
    },
    {
      id: "finale",
      label: "Invitation",
      durationSeconds: 4,
      transitionIn: "fade",
      transitionOut: "fade",
      avatarSlots: [],
      textSlots: [
        textSlot("custom", ts.ceremonyTitle.x, Math.max(0, ts.ceremonyTitle.y - 80), 34, nameColor, undefined, "Together with our families"),
        textSlot("eventDate", ts.date.x, ts.date.y, 44, detailColor),
        textSlot("venueName", ts.venue.x, ts.venue.y, 30, nameColor),
      ],
    },
  ];

  return {
    id: newId,
    name: name ?? `${config.name} (Custom)`,
    status: "draft",
    ceremony: config.functionType,
    emoji: config.emoji,
    palette,
    scenes,
  };
}

/**
 * Build a URL-safe custom-template id from a system id, with an optional suffix
 * to avoid collisions (the API appends a short timestamp).
 */
export function customCloneId(systemId: string, suffix?: string): string {
  const base = `${systemId}-custom`;
  return suffix ? `${base}-${suffix}` : base;
}
