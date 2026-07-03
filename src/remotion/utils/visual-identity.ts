/**
 * src/remotion/utils/visual-identity.ts
 *
 * Resolves a template's per-ceremony visual identity (palette + motifs) from the
 * validated Template_Metadata so compositions drive their look from data rather
 * than hardcoded palette literals.
 *
 * Each composition (HaldiFloral / MehandiTraditional / SangeetGrand /
 * RoyalRajasthani) reads its `AppliedVisualIdentity` here and applies the
 * resolved colours and motif. Because two templates of different ceremony types
 * have distinct `dominantPalette` and `keyMotif` values (Req 4.2–4.6,
 * Property 14), the applied palette and key motif differ between them.
 *
 * Design §Components/Visual Identity · Req 4.2, 4.3, 4.4, 4.5, 4.6
 */

import { getTemplateMetadata } from "../../lib/template-metadata";
import type { TemplateId } from "../../lib/types";

/**
 * The visual-identity values a composition applies to its scenes. Derived purely
 * from the template's `visualIdentity.dominantPalette` / `keyMotif` so the same
 * data that differentiates ceremonies (Property 14) drives the rendered look.
 */
export interface AppliedVisualIdentity {
  /** The full dominant palette as authored in metadata (>= 2 colours). */
  palette: string[];
  /** Dominant colour — `palette[0]`. Drives the primary accent of the scene. */
  primary: string;
  /** Secondary colour — `palette[1]`. Drives secondary accents/borders. */
  secondary: string;
  /** Tertiary accent — `palette[2]` when present, else falls back to secondary. */
  accent: string;
  /** Highlight colour — `palette[3]` when present, else falls back to primary. */
  highlight: string;
  /** The ceremony's key motif description. */
  keyMotif: string;
  /** Richer motif list when authored, else `[keyMotif]`. */
  motifs: string[];
  /** Mood descriptors (2..5). */
  moodKeywords: string[];
}

/**
 * Resolves the applied visual identity for a template from its validated
 * metadata. Total over registered template IDs; `getTemplateMetadata` throws for
 * unknown IDs (consistent with the rest of the metadata layer).
 */
export function resolveVisualIdentity(
  templateId: TemplateId
): AppliedVisualIdentity {
  const { visualIdentity } = getTemplateMetadata(templateId);
  const palette = visualIdentity.dominantPalette;
  return {
    palette,
    primary: palette[0],
    secondary: palette[1],
    accent: palette[2] ?? palette[1],
    highlight: palette[3] ?? palette[0],
    keyMotif: visualIdentity.keyMotif,
    motifs: visualIdentity.motifs ?? [visualIdentity.keyMotif],
    moodKeywords: visualIdentity.moodKeywords,
  };
}

/**
 * Converts a `#RRGGBB` hex colour to an `rgba(r,g,b,a)` string. Lets compositions
 * apply a metadata-driven palette colour at a chosen opacity for glows, tints,
 * and borders without hardcoding the colour channels. Falls back to the original
 * string when it is not a 6-digit hex (e.g. a named colour), so it is total.
 */
export function withAlpha(hex: string, alpha: number): string {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!match) return hex;
  const int = parseInt(match[1], 16);
  const r = (int >> 16) & 0xff;
  const g = (int >> 8) & 0xff;
  const b = int & 0xff;
  const a = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
