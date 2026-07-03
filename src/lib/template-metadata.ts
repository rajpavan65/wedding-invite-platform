/**
 * src/lib/template-metadata.ts
 *
 * Loads and validates template metadata files against TemplateMetadataSchema.
 * Cached in memory for the lifetime of the process.
 *
 * Usage in compositions:
 *   const meta = getTemplateMetadata("haldi-floral");
 *   <AvatarPair brideSlot={meta.avatarSlots.bride} ... />
 *
 * PRD §5 — Template Slot System
 * Design §Components/8 — template registration validation (Req 4.7, 4.8, 9.1)
 */

import { TemplateMetadataSchema, type TemplateMetadata } from "./schemas";
import type { TemplateId } from "./types";

// ─────────────────────────────────────────────────────────────
// Static metadata registry — pre-loaded from JSON files.
// In production these would come from S3; in dev they live
// in public/templates/{id}/metadata.json.
// ─────────────────────────────────────────────────────────────

import royalRajasthaniRaw from "../../public/templates/royal-rajasthani/metadata.json";
import haldiFloralRaw from "../../public/templates/haldi-floral/metadata.json";
import mehandiTraditionalRaw from "../../public/templates/mehandi-traditional/metadata.json";
import sangeetGrandRaw from "../../public/templates/sangeet-grand/metadata.json";
import receptionLuxuryRaw from "../../public/templates/reception-luxury/metadata.json";
import baraatRoyalRaw from "../../public/templates/baraat-royal/metadata.json";
import sangeetNeonRaw from "../../public/templates/sangeet-neon/metadata.json";
import haldiModernRaw from "../../public/templates/haldi-modern/metadata.json";
import mehandiPastelRaw from "../../public/templates/mehandi-pastel/metadata.json";
import weddingDivineRaw from "../../public/templates/wedding-divine/metadata.json";
import receptionGardenRaw from "../../public/templates/reception-garden/metadata.json";

// ─────────────────────────────────────────────────────────────
// Registration validation (Req 4.7, 4.8, 9.1)
// ─────────────────────────────────────────────────────────────

/**
 * Result of validating raw template metadata for registration.
 * On success the parsed, typed metadata is returned. On failure the
 * `field` identifies which metadata field failed validation so the
 * caller can produce a descriptive error and avoid registering the
 * template (Req 4.8, 9.1).
 */
export type TemplateValidationResult =
  | { success: true; data: TemplateMetadata }
  | { success: false; field: string; error: string };

/**
 * Validates raw template metadata against `TemplateMetadataSchema` and
 * asserts that `avatarSlots` and `textSlots` are present and non-empty.
 *
 * Reusable, pure function used by the loader at registration time.
 * - Validates the full Zod schema (Req 4.7). The schema already makes
 *   `visualIdentity` required with bounds.
 * - Asserts non-empty `avatarSlots` / `textSlots` (Req 9.1).
 * - On any failure, returns the failing field path so the caller can
 *   reject registration with a descriptive error (Req 4.8).
 *
 * Never throws — returns a discriminated result instead.
 */
export function validateTemplateMetadata(
  raw: unknown
): TemplateValidationResult {
  const parsed = TemplateMetadataSchema.safeParse(raw);
  if (!parsed.success) {
    // Extract the first failing field path from the Zod issues so the
    // error names the field that failed validation (Req 4.8).
    const issue = parsed.error.issues[0];
    const field =
      issue && issue.path.length > 0 ? issue.path.join(".") : "(root)";
    const message = issue ? issue.message : "invalid template metadata";
    return {
      success: false,
      field,
      error: `Template metadata validation failed at "${field}": ${message}`,
    };
  }

  // Explicit non-empty assertion for the slot maps (Req 9.1). The schema
  // guarantees the keys exist, but registration must reject metadata whose
  // slot maps carry no entries.
  const { avatarSlots, textSlots } = parsed.data;
  if (!avatarSlots || Object.keys(avatarSlots).length === 0) {
    return {
      success: false,
      field: "avatarSlots",
      error: 'Template metadata validation failed at "avatarSlots": must define at least one avatar slot',
    };
  }
  if (!textSlots || Object.keys(textSlots).length === 0) {
    return {
      success: false,
      field: "textSlots",
      error: 'Template metadata validation failed at "textSlots": must define at least one text slot',
    };
  }

  return { success: true, data: parsed.data };
}

/**
 * Registers a single template's raw metadata after validation.
 * Throws an error identifying the failing field if validation fails,
 * and does NOT return metadata for the caller to register (Req 4.8).
 */
function registerTemplate(templateId: string, raw: unknown): TemplateMetadata {
  const result = validateTemplateMetadata(raw);
  if (!result.success) {
    throw new Error(
      `[template-metadata] Refusing to register template "${templateId}": ${result.error}`
    );
  }
  return result.data;
}

/** Validate all metadata at module load time — fails fast if any JSON is invalid */
const VALIDATED_METADATA: Record<TemplateId, TemplateMetadata> = {
  "royal-rajasthani": registerTemplate("royal-rajasthani", royalRajasthaniRaw),
  "haldi-floral": registerTemplate("haldi-floral", haldiFloralRaw),
  "mehandi-traditional": registerTemplate(
    "mehandi-traditional",
    mehandiTraditionalRaw
  ),
  "sangeet-grand": registerTemplate("sangeet-grand", sangeetGrandRaw),
  "reception-luxury": registerTemplate("reception-luxury", receptionLuxuryRaw),
  "baraat-royal": registerTemplate("baraat-royal", baraatRoyalRaw),
  "sangeet-neon": registerTemplate("sangeet-neon", sangeetNeonRaw),
  "haldi-modern": registerTemplate("haldi-modern", haldiModernRaw),
  "mehandi-pastel": registerTemplate("mehandi-pastel", mehandiPastelRaw),
  "wedding-divine": registerTemplate("wedding-divine", weddingDivineRaw),
  "reception-garden": registerTemplate("reception-garden", receptionGardenRaw),
};

/**
 * Returns the validated TemplateMetadata for a given template.
 * Throws if the template ID is not registered.
 */
export function getTemplateMetadata(templateId: TemplateId): TemplateMetadata {
  const meta = VALIDATED_METADATA[templateId];
  if (!meta) {
    throw new Error(
      `[template-metadata] Unknown template ID: "${templateId}". ` +
      `Valid IDs: ${Object.keys(VALIDATED_METADATA).join(", ")}`
    );
  }
  return meta;
}

/**
 * Returns all registered template metadata entries.
 */
export function getAllTemplateMetadata(): Record<TemplateId, TemplateMetadata> {
  return VALIDATED_METADATA;
}

/**
 * Checks if a given string is a valid registered template ID.
 * "universal-template" is always valid — it is registered in Root.tsx and
 * renders any database-driven DynamicTemplate without a static metadata file.
 */
export function isValidTemplateId(id: string): id is TemplateId {
  if (id === "universal-template") return true;
  return id in VALIDATED_METADATA;
}
