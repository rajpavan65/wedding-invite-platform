/**
 * src/lib/template-overrides.ts
 *
 * Catalog-level admin overrides for the built-in (system) templates — PURE layer.
 *
 * Built-in templates are code (compositions + static metadata), so they can't be
 * edited from the UI. This layer lets an admin override the CATALOG-level fields
 * a built-in exposes — enable/disable, display name/tagline/description/emoji,
 * gallery palette, and thumbnail frame — without touching code or losing the
 * composition's bespoke VFX.
 *
 * This module holds ONLY pure, dependency-free logic (types + the merge
 * functions) so it can be imported anywhere — including unit tests — without
 * pulling in the Supabase client. The Supabase-backed fetch/upsert helpers live
 * in `template-overrides.db.ts`.
 *
 * SCOPE (step 1): catalog/orchestration-level fields only. In-video overrides
 * (slot coordinates, the palette baked into the animation) are a separate,
 * larger change handled elsewhere.
 */

import type { TemplateConfig } from "./types";

/** Editable catalog-level override fields for a built-in template. */
export interface TemplateOverride {
  /** When false, the template is hidden from the storefront/create gallery. Default true. */
  enabled?: boolean;
  name?: string;
  tagline?: string;
  description?: string;
  emoji?: string;
  /** Partial gallery palette override (merged field-by-field over the default). */
  palette?: Partial<TemplateConfig["palette"]>;
  /** Frame used for the auto-generated thumbnail (renderStill). */
  thumbnailFrame?: number;
}

/** A {@link TemplateConfig} with the resolved `enabled` flag applied. */
export type EffectiveTemplateConfig = TemplateConfig & { enabled: boolean };

/** Resolve the enabled flag for an override (absent ⇒ enabled). */
export function isEnabled(override?: TemplateOverride): boolean {
  return override?.enabled !== false;
}

/**
 * Merge a catalog override over a base {@link TemplateConfig}, producing the
 * effective config used by the storefront/admin/render. Pure and total:
 * undefined/empty overrides yield the base config with `enabled: true`. Only
 * defined override fields take effect; palette is merged field-by-field so a
 * partial palette override keeps the remaining default channels.
 */
export function applyOverrideToConfig(
  base: TemplateConfig,
  override?: TemplateOverride,
): EffectiveTemplateConfig {
  if (!override) {
    return { ...base, enabled: true };
  }
  return {
    ...base,
    enabled: isEnabled(override),
    ...(override.name ? { name: override.name } : {}),
    ...(override.tagline ? { tagline: override.tagline } : {}),
    ...(override.description ? { description: override.description } : {}),
    ...(override.emoji ? { emoji: override.emoji } : {}),
    palette: {
      ...base.palette,
      ...(override.palette ?? {}),
    },
  };
}
