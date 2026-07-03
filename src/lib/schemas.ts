/**
 * src/lib/schemas.ts
 *
 * Single source of truth for all Zod runtime validation schemas.
 * These are the canonical prop definitions for the Remotion render pipeline.
 *
 * PRD §7 — Remotion Zod Props Schema
 * PRD §5 — Template Slot System (TemplateMetadataSchema)
 */

import { z } from "zod";

// ─────────────────────────────────────────────────────────────
// Template metadata schema (stored in public/templates/{id}/metadata.json)
// Validated at template registration time
// ─────────────────────────────────────────────────────────────

const SlotSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  anchorBottom: z.boolean().default(false),
});

export const TemplateMetadataSchema = z.object({
  templateId: z.string(),
  functionType: z.enum([
    "haldi",
    "mehandi",
    "sangeet",
    "wedding",
    "reception",
    "baraat",
  ]),
  /** Fallback duration in frames — overridden at render time by audio length */
  durationFrames: z.number().default(900),
  /** Frame to use for auto-generated thumbnail via renderStill() */
  thumbnailFrame: z.number().default(90),
  avatarSlots: z.object({
    bride: SlotSchema,
    groom: SlotSchema,
  }),
  textSlots: z.object({
    primaryName: z.object({
      x: z.number(),
      y: z.number(),
      maxWidth: z.number(),
      fontFamily: z.string(),
    }),
    secondaryName: z.object({
      x: z.number(),
      y: z.number(),
      maxWidth: z.number(),
      fontFamily: z.string(),
    }),
    date: z.object({ x: z.number(), y: z.number() }),
    venue: z.object({ x: z.number(), y: z.number() }),
    ceremonyTitle: z.object({ x: z.number(), y: z.number() }),
  }),
  /**
   * Visual identity for differentiating similar ceremony types.
   * Required (Req 4.1): each template must declare a distinct palette, motif, and mood.
   */
  visualIdentity: z.object({
    /** Named colors driving the template's look — at least 2 */
    dominantPalette: z.array(z.string()).min(2),
    /** Primary motif description — non-empty */
    keyMotif: z.string().min(1),
    /** Optional richer motif list for more detailed differentiation */
    motifs: z.array(z.string()).min(1).optional(),
    /** Mood descriptors — between 2 and 5 inclusive */
    moodKeywords: z.array(z.string()).min(2).max(5),
  }),
  /** Optional per-template light-leak overlay intensity (0..1) */
  lightLeakIntensity: z.number().min(0).max(1).optional(),
});

export type TemplateMetadata = z.infer<typeof TemplateMetadataSchema>;

// ─────────────────────────────────────────────────────────────
// Main invite props schema — validated before every Remotion render
// PRD §7 InvitePropsSchema
// ─────────────────────────────────────────────────────────────

export const InvitePropsSchema = z.object({
  // ── Client identity ───────────────────────────────────────
  brideFirstName: z.string().min(1).max(40),
  groomFirstName: z.string().min(1).max(40),
  brideFamilyName: z.string().max(60).optional(),
  groomFamilyName: z.string().max(60).optional(),

  // ── Event details ─────────────────────────────────────────
  eventDate: z.string().min(1), // ISO 8601 or display string
  eventTime: z.string().optional(),
  venueName: z.string().min(1).max(100),
  venueCity: z.string().max(60).optional(),
  customMessage: z.string().max(200).optional(),

  // ── Wedding itinerary (for wedding / reception templates) ──
  itinerary: z
    .array(
      z.object({
        time: z.string(),
        event: z.string(),
      })
    )
    .max(6)
    .optional(),

  // ── Media assets — all S3 / CDN URLs ──────────────────────
  audioUrl: z.string().url(),
  /** Pre-made background video / gradient for this template */
  backgroundVideoUrl: z.string().url().optional(),
  /** PNG avatar with transparent background — Premium / Luxury tier */
  brideAvatarUrl: z.string().url().optional(),
  groomAvatarUrl: z.string().url().optional(),

  // ── Avatar type (v2.3 — Phase 1.5 evaluation hook) ────────
  /** Default 'png'. Use 'glb' only after Phase 1.5 A/B test passes. */
  avatarType: z.enum(["photo", "png", "video", "glb"]).default("png"),
  /** For GLB or video avatar types — single asset URL */
  avatarAssetUrl: z.string().url().optional(),

  // ── Template & tier selection ──────────────────────────────
  templateId: z.string(),
  functionType: z.enum([
    "haldi",
    "mehandi",
    "sangeet",
    "wedding",
    "reception",
    "baraat",
  ]),
  /** Standard and Premium are the only launch tiers. Luxury is gated. */
  tier: z.enum(["standard", "premium"]),

  // ── Luxury-only (reserved — not shown in UI until Phase 2) ─
  voiceoverEnabled: z.boolean().default(false),
  voiceoverText: z.string().max(300).optional(),

  // ── Preview gating (Phase 2) ──────────────────────────────
  /**
   * When true, every composition renders a diagonal watermark overlay. Set
   * only for the low-res, pre-payment preview render — never for the final
   * delivered video. Optional (absent ⇒ no watermark). PRD §10.1.
   */
  previewWatermark: z.boolean().optional(),

  // ── Legacy compat fields (kept for existing RoyalRajasthani composition) ─
  /** @deprecated use brideFirstName + brideFamilyName */
  brideName: z.string().optional(),
  /** @deprecated use groomFirstName + groomFamilyName */
  groomName: z.string().optional(),
  weddingDate: z.string().optional(),
  venue: z.string().optional(),
  groomCity: z.string().optional(),
  brideCity: z.string().optional(),
  style: z.string().optional(),
  scenes: z.array(z.string()).optional(),
  /** @deprecated pass brideAvatarUrl / groomAvatarUrl individually */
  photos: z.array(z.string()).optional(),
  musicUrl: z.string().optional(),
});

export type InviteProps = z.infer<typeof InvitePropsSchema>;

/**
 * Validates props at the API boundary before passing to Remotion Lambda.
 * Throws a descriptive ZodError if any field is invalid.
 */
export function validateInviteProps(raw: unknown): InviteProps {
  return InvitePropsSchema.parse(raw);
}

/**
 * Safe version — returns { success, data, error } instead of throwing.
 */
export function safeValidateInviteProps(raw: unknown) {
  return InvitePropsSchema.safeParse(raw);
}
