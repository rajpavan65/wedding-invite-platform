/**
 * src/lib/template-overrides.db.ts
 *
 * Supabase-backed fetch/upsert for built-in template catalog overrides.
 *
 * Kept separate from the pure `template-overrides.ts` so importing the pure
 * merge logic never constructs a Supabase client (important for unit tests and
 * any client-bundled code).
 *
 * GRACEFUL DEGRADATION: if the `template_overrides` table does not exist yet
 * (migration not run) or any query fails, the fetch helpers return NO overrides,
 * so every caller falls back to the static {@link TEMPLATE_CONFIGS} defaults and
 * the app behaves exactly as before.
 */

import { supabaseAdmin } from "./supabase";
import {
  TEMPLATE_CONFIGS,
  TEMPLATE_IDS,
  type TemplateId,
} from "./types";
import {
  applyOverrideToConfig,
  type EffectiveTemplateConfig,
  type TemplateOverride,
} from "./template-overrides";

/** Postgres "undefined_table" error code — emitted before the migration runs. */
const UNDEFINED_TABLE = "42P01";

function rowToOverride(row: Record<string, unknown>): TemplateOverride {
  return {
    enabled: row.enabled === undefined ? undefined : (row.enabled as boolean),
    name: (row.name as string) ?? undefined,
    tagline: (row.tagline as string) ?? undefined,
    description: (row.description as string) ?? undefined,
    emoji: (row.emoji as string) ?? undefined,
    palette: (row.palette as TemplateOverride["palette"]) ?? undefined,
    thumbnailFrame:
      row.thumbnail_frame === undefined || row.thumbnail_frame === null
        ? undefined
        : (row.thumbnail_frame as number),
  };
}

/**
 * Fetch all template overrides keyed by templateId. Returns `{}` on any error
 * (including the table not existing yet) so callers fall back to defaults.
 */
export async function fetchTemplateOverrides(): Promise<
  Record<string, TemplateOverride>
> {
  try {
    const { data, error } = await supabaseAdmin
      .from("template_overrides")
      .select("*");

    if (error) {
      if (error.code === UNDEFINED_TABLE) {
        console.warn(
          "[template-overrides] table not found — run the template_overrides migration to enable built-in overrides. Falling back to defaults.",
        );
      } else {
        console.error("[template-overrides] fetch error:", error.message);
      }
      return {};
    }

    const map: Record<string, TemplateOverride> = {};
    for (const row of data ?? []) {
      const r = row as Record<string, unknown>;
      map[r.template_id as string] = rowToOverride(r);
    }
    return map;
  } catch (err) {
    console.error("[template-overrides] unexpected fetch error:", err);
    return {};
  }
}

/** Fetch a single template's override, or `undefined` if none / on error. */
export async function getTemplateOverride(
  templateId: string,
): Promise<TemplateOverride | undefined> {
  const all = await fetchTemplateOverrides();
  return all[templateId];
}

/**
 * Resolve the effective catalog configs for every built-in template, merging
 * any stored overrides over {@link TEMPLATE_CONFIGS}.
 */
export async function getEffectiveSystemConfigs(): Promise<
  Record<TemplateId, EffectiveTemplateConfig>
> {
  const overrides = await fetchTemplateOverrides();
  const out = {} as Record<TemplateId, EffectiveTemplateConfig>;
  for (const id of TEMPLATE_IDS) {
    out[id] = applyOverrideToConfig(TEMPLATE_CONFIGS[id], overrides[id]);
  }
  return out;
}

export type UpsertResult =
  | { ok: true; override: TemplateOverride }
  | { ok: false; error: string; needsMigration?: boolean };

/**
 * Upsert an override for a system template. Only known fields are persisted.
 * Returns a descriptive failure (with `needsMigration` when the table is
 * absent) instead of throwing, so the admin UI can show a friendly message.
 */
export async function upsertTemplateOverride(
  templateId: string,
  patch: TemplateOverride,
): Promise<UpsertResult> {
  if (!(templateId in TEMPLATE_CONFIGS)) {
    return { ok: false, error: `"${templateId}" is not a system template` };
  }

  const row: Record<string, unknown> = {
    template_id: templateId,
    updated_at: new Date().toISOString(),
  };
  if (patch.enabled !== undefined) row.enabled = patch.enabled;
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.tagline !== undefined) row.tagline = patch.tagline;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.emoji !== undefined) row.emoji = patch.emoji;
  if (patch.palette !== undefined) row.palette = patch.palette;
  if (patch.thumbnailFrame !== undefined) row.thumbnail_frame = patch.thumbnailFrame;

  try {
    const { data, error } = await supabaseAdmin
      .from("template_overrides")
      .upsert(row, { onConflict: "template_id" })
      .select()
      .single();

    if (error || !data) {
      if (error?.code === UNDEFINED_TABLE) {
        return {
          ok: false,
          needsMigration: true,
          error:
            "The template_overrides table does not exist yet. Run the template_overrides migration to enable built-in overrides.",
        };
      }
      return { ok: false, error: error?.message ?? "Upsert failed" };
    }
    return { ok: true, override: rowToOverride(data as Record<string, unknown>) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
