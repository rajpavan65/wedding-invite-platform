/**
 * src/lib/types.ts
 *
 * Platform-wide TypeScript types.
 * Remotion prop types are DERIVED from the Zod schemas in schemas.ts —
 * this ensures runtime validation and compile-time types stay in sync.
 *
 * PRD §7, §12
 */

import type { InviteProps } from "./schemas";
import type { CeremonyPose } from "./avatar/types";
import type { AvatarState, AvatarCheck } from "./avatar/qa-state";

// Re-export the canonical Remotion prop type
export type { InviteProps };

// ─────────────────────────────────────────────────────────────
// Legacy aliases (kept while RoyalRajasthani composition is
// being refactored to the 3-layer model — remove once done)
// ─────────────────────────────────────────────────────────────

/** @deprecated Use InviteProps from schemas.ts */
export type WeddingVideoProps = InviteProps;

// ─────────────────────────────────────────────────────────────
// Enum-like types (match PRD exactly)
// ─────────────────────────────────────────────────────────────

/** PRD §12 Supabase orders.status column */
export type OrderStatus =
  | "PENDING"
  | "AVATAR_QA"
  | "AVATAR_READY"
  | "RENDERING"
  | "COMPLETE"
  | "DELIVERED"
  | "FAILED";

/**
 * Launch tiers — Standard + Premium only.
 * Luxury is gated behind manual admin flow (Phase 2).
 * PRD §1 Product Tiers
 */
export type PackageTier = "standard" | "premium";

/** PRD §13 Template Library — function types */
export type FunctionType =
  | "haldi"
  | "mehandi"
  | "sangeet"
  | "wedding"
  | "reception"
  | "baraat";

/** PRD §13 Template Library — style identifiers */
export type WeddingStyle =
  | "royal"
  | "modern"
  | "haldi"
  | "bollywood"
  | "southindian"
  | "love";

/**
 * @deprecated Legacy create-form state type.
 * Will be replaced by InviteProps in Phase 1 create-form refactor.
 */
export interface CustomerDetails {
  groomName: string;
  brideName: string;
  weddingDate: string;
  venue: string;
  groomCity: string;
  brideCity: string;
  groomProfession?: string;
  brideProfession?: string;
}


/** Scene component IDs used by RoyalRajasthani (legacy) */
export type SceneType =
  | "intro"
  | "haldi"
  | "sangeet"
  | "varmala"
  | "wedding"
  | "outro"
  | "firstmeet"
  | "proposal"
  | "family";

// ─────────────────────────────────────────────────────────────
// Database model types (match Supabase schema — PRD §12)
// ─────────────────────────────────────────────────────────────

export interface ClientRecord {
  id: string;
  name: string;
  phone: string;
  email?: string;
  /** S3 path to avatar folder e.g. /avatars/{clientId}/ */
  avatar_cache_path?: string;
  created_at: string;
}

export interface OrderRecord {
  id: string;
  client_id: string;
  /** Razorpay / Stripe payment ID — used as idempotency key */
  payment_id: string;
  tier: PackageTier;
  function_type: FunctionType;
  template_id: string;
  /** Full InviteProps snapshot stored as JSONB */
  props: InviteProps;
  status: OrderStatus;
  render_url?: string;
  /** Auto-generated via renderStill() at thumbnailFrame */
  thumbnail_url?: string;
  /** OTP token for /invite/[orderId] portal */
  portal_token?: string;
  created_at: string;
  delivered_at?: string;
}

export interface RenderJobRecord {
  id: string;
  order_id: string;
  remotion_render_id?: string;
  progress: number;
  error?: string;
  started_at?: string;
  completed_at?: string;
}

// ─────────────────────────────────────────────────────────────
// Legacy OrderData type (kept for existing admin dashboard UI)
// Remove once dashboard is updated to use OrderRecord
// ─────────────────────────────────────────────────────────────

/**
 * Persisted avatar QA sub-state on an order (Supabase `orders.avatar_qa` JSONB).
 *
 * Mirrors the in-memory QA state machine in `src/lib/avatar/qa-state.ts` but is
 * the durable, render-gating snapshot stored on the order so QA decisions survive
 * restarts (Req 2.1, 2.6, 2.9; Design §Order Avatar State). `assets` carries the
 * resolvable avatar URLs + identity scores; `checks` carries the auto-check
 * outcomes per pose; `attempts` is the consumed regeneration budget (0..2).
 */
export interface OrderAvatarQa {
  state: AvatarState;
  /** Regeneration attempts consumed (0..2). */
  attempts: number;
  assets: { pose: CeremonyPose; url: string; identityScore: number }[];
  checks: { pose: CeremonyPose; passed: boolean; failedCheck?: AvatarCheck }[];
  /** Present only once the order has been downgraded (state === "Downgraded"). */
  downgradeReason?: string;
  /** ISO timestamp of the last QA state change. */
  updatedAt: string;
}

/** @deprecated Use OrderRecord */
export interface OrderData {
  id: string;
  createdAt: string;
  customerPhone: string;
  customerEmail?: string;
  details: {
    groomName: string;
    brideName: string;
    weddingDate: string;
    venue?: string;
    groomCity?: string;
    brideCity?: string;
    groomProfession?: string;
    brideProfession?: string;
    otpCode?: string;
    otpExpires?: number;
    revisionCount?: number;
  };
  style: WeddingStyle;
  tier: PackageTier;
  scenes: SceneType[];
  musicTrack: string;
  photos: string[];
  status: OrderStatus;
  videoUrl?: string;
  thumbnailUrl?: string;
  notes?: string;
  /** Avatar QA sub-state; absent until avatars are generated (Design §Order Avatar State). */
  avatarQa?: OrderAvatarQa;
}

// ─────────────────────────────────────────────────────────────
// Render request types
// ─────────────────────────────────────────────────────────────

export interface RenderRequest {
  orderId: string;
  compositionId: string;
  inputProps: InviteProps;
}

// ─────────────────────────────────────────────────────────────
// Scene config (used by create form + admin)
// ─────────────────────────────────────────────────────────────

export interface SceneConfig {
  id: SceneType;
  name: string;
  emoji: string;
  description: string;
  durationInFrames: number;
}

export const SCENE_CONFIGS: Record<SceneType, SceneConfig> = {
  intro: {
    id: "intro",
    name: "Intro / Names",
    emoji: "💫",
    description: "Couple names with elegant cinematic reveal",
    durationInFrames: 150,
  },
  haldi: {
    id: "haldi",
    name: "Haldi Carnival",
    emoji: "🌼",
    description: "Yellow turmeric celebration & fun rituals",
    durationInFrames: 150,
  },
  sangeet: {
    id: "sangeet",
    name: "Sangeet & Engagement",
    emoji: "🎶",
    description: "Dance, music & ring ceremony night",
    durationInFrames: 150,
  },
  varmala: {
    id: "varmala",
    name: "Varmala & Pheras",
    emoji: "🌺",
    description: "Sacred mandap rituals & vows",
    durationInFrames: 180,
  },
  wedding: {
    id: "wedding",
    name: "Save The Date",
    emoji: "💒",
    description: "Grand finale with wedding date & venue",
    durationInFrames: 210,
  },
  outro: {
    id: "outro",
    name: "Join Us!",
    emoji: "🎉",
    description: "Final RSVP & event details screen",
    durationInFrames: 150,
  },
  firstmeet: {
    id: "firstmeet",
    name: "First Meet",
    emoji: "☕",
    description: "The story of how they met",
    durationInFrames: 150,
  },
  proposal: {
    id: "proposal",
    name: "The Proposal",
    emoji: "💍",
    description: "The magical moment",
    durationInFrames: 150,
  },
  family: {
    id: "family",
    name: "Family Blessings",
    emoji: "🏠",
    description: "Two families become one",
    durationInFrames: 150,
  },
};

// ─────────────────────────────────────────────────────────────
// Style configs (used by admin + create form + Remotion)
// ─────────────────────────────────────────────────────────────

export interface StyleConfig {
  id: WeddingStyle;
  name: string;
  emoji: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
}

export const STYLE_CONFIGS: Record<WeddingStyle, StyleConfig> = {
  royal: {
    id: "royal",
    name: "Royal Rajasthani",
    emoji: "👑",
    description: "Gold, maroon, majestic palace vibes",
    primaryColor: "#6B0F1A",
    secondaryColor: "#D4AF37",
    accentColor: "#F0D060",
    textColor: "#FFF8EE",
    fontFamily: "Playfair Display",
  },
  modern: {
    id: "modern",
    name: "Modern Minimal",
    emoji: "✨",
    description: "Clean ivory, subtle gold elegance",
    primaryColor: "#1a1a2e",
    secondaryColor: "#e2d1c3",
    accentColor: "#D4AF37",
    textColor: "#FFFFFF",
    fontFamily: "Poppins",
  },
  haldi: {
    id: "haldi",
    name: "Haldi Mehendi",
    emoji: "🌸",
    description: "Vibrant yellow, festive flowers",
    primaryColor: "#F5A623",
    secondaryColor: "#FF6B9D",
    accentColor: "#FFD700",
    textColor: "#FFFFFF",
    fontFamily: "Poppins",
  },
  bollywood: {
    id: "bollywood",
    name: "Bollywood Filmy",
    emoji: "🎬",
    description: "Dramatic, cinematic, filmy vibes",
    primaryColor: "#C41E3A",
    secondaryColor: "#FFD700",
    accentColor: "#FF4500",
    textColor: "#FFFFFF",
    fontFamily: "Playfair Display",
  },
  southindian: {
    id: "southindian",
    name: "South Indian",
    emoji: "🪷",
    description: "Temple gold, Kanjivaram silk, spiritual",
    primaryColor: "#1B3A4B",
    secondaryColor: "#D4AF37",
    accentColor: "#E8C547",
    textColor: "#FFF8EE",
    fontFamily: "Playfair Display",
  },
  love: {
    id: "love",
    name: "Love Journey",
    emoji: "🗺️",
    description: "Romantic timeline, milestone moments",
    primaryColor: "#2C1810",
    secondaryColor: "#D4AF37",
    accentColor: "#FF6B9D",
    textColor: "#FFF8EE",
    fontFamily: "Playfair Display",
  },
};

// ─────────────────────────────────────────────────────────────
// Template Registry (PRD §13 Template Library)
// Maps Remotion composition IDs → UI metadata + palette
// This is the authoritative list of available video templates.
// ─────────────────────────────────────────────────────────────

export type TemplateId =
  | "royal-rajasthani"
  | "haldi-floral"
  | "mehandi-traditional"
  | "sangeet-grand"
  | "reception-luxury"
  | "baraat-royal"
  | "sangeet-neon"
  | "haldi-modern"
  | "mehandi-pastel"
  | "wedding-divine"
  | "reception-garden";

export interface TemplateConfig {
  /** Remotion composition ID — used in selectComposition() */
  id: TemplateId;
  name: string;
  emoji: string;
  tagline: string;
  description: string;
  functionType: FunctionType;
  /** Duration in frames (at 30fps) */
  durationInFrames: number;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  /** Scene count in the composition */
  scenes: number;
}

export const TEMPLATE_CONFIGS: Record<TemplateId, TemplateConfig> = {
  "royal-rajasthani": {
    id: "royal-rajasthani",
    name: "Royal Rajasthani",
    emoji: "👑",
    tagline: "Majestic · Grand · Traditional",
    description: "Gold & maroon splendour — 5-scene full wedding ceremony video with palace-inspired visuals.",
    functionType: "wedding",
    durationInFrames: 810,
    palette: {
      primary: "#6B0F1A",
      secondary: "#D4AF37",
      accent: "#F0D060",
      background: "#0A0500",
    },
    scenes: 5,
  },
  "haldi-floral": {
    id: "haldi-floral",
    name: "Haldi Floral",
    emoji: "🌼",
    tagline: "Festive · Vibrant · Colourful",
    description: "Warm golden marigold palette — 3-scene Haldi ceremony video with turmeric glow & petal VFX.",
    functionType: "haldi",
    durationInFrames: 390,
    palette: {
      primary: "#FFD700",
      secondary: "#FF8C42",
      accent: "#FFE566",
      background: "#1A0800",
    },
    scenes: 3,
  },
  "mehandi-traditional": {
    id: "mehandi-traditional",
    name: "Mehandi Traditional",
    emoji: "🌿",
    tagline: "Intimate · Artistic · Romantic",
    description: "Deep forest-green palette — 3-scene Mehandi night with mandala rings & bokeh VFX.",
    functionType: "mehandi",
    durationInFrames: 390,
    palette: {
      primary: "#D4AF37",
      secondary: "#3CB371",
      accent: "#90EE90",
      background: "#03100A",
    },
    scenes: 3,
  },
  "sangeet-grand": {
    id: "sangeet-grand",
    name: "Sangeet Grand",
    emoji: "🎶",
    tagline: "Electric · Glamorous · Celebratory",
    description: "Electric purple palette — 3-scene Sangeet night with DJ light beams, fireworks & music VFX.",
    functionType: "sangeet",
    durationInFrames: 390,
    palette: {
      primary: "#C89EFF",
      secondary: "#D4AF37",
      accent: "#FF80CC",
      background: "#06001A",
    },
    scenes: 3,
  },
  "reception-luxury": {
    id: "reception-luxury",
    name: "Reception Luxury",
    emoji: "🥂",
    tagline: "Elegant · Luxurious · Refined",
    description: "Midnight navy & platinum-silver palette — 3-scene grand reception with crystal chandeliers, champagne bokeh & confetti shimmer.",
    functionType: "reception",
    durationInFrames: 390,
    palette: {
      primary: "#E8E8F0",
      secondary: "#D4AF37",
      accent: "#C0C0C8",
      background: "#0B0E1A",
    },
    scenes: 3,
  },
  "baraat-royal": {
    id: "baraat-royal",
    name: "Baraat Royal",
    emoji: "🥁",
    tagline: "Festive · Energetic · Grand",
    description: "Saffron & marigold-gold palette — 3-scene grand baraat procession with dhol pulses, marigold garlands & firecracker bursts.",
    functionType: "baraat",
    durationInFrames: 390,
    palette: {
      primary: "#FFC300",
      secondary: "#E8541E",
      accent: "#FFE08A",
      background: "#2A0A04",
    },
    scenes: 3,
  },
  "sangeet-neon": {
    id: "sangeet-neon",
    name: "Sangeet Neon",
    emoji: "🪩",
    tagline: "Electric · Youthful · Vibrant",
    description: "Neon magenta & electric-cyan palette — 3-scene club-style sangeet with laser grids, glow bars & firework bursts.",
    functionType: "sangeet",
    durationInFrames: 390,
    palette: {
      primary: "#FF2D95",
      secondary: "#00E5FF",
      accent: "#FFE600",
      background: "#0A0014",
    },
    scenes: 3,
  },
  "haldi-modern": {
    id: "haldi-modern",
    name: "Haldi Modern",
    emoji: "🌼",
    tagline: "Modern · Minimal · Bright",
    description: "Bright amber & clean white palette — 3-scene minimal haldi with geometric sunbursts and crisp typography.",
    functionType: "haldi",
    durationInFrames: 390,
    palette: {
      primary: "#FF9E00",
      secondary: "#FFFFFF",
      accent: "#FFD98A",
      background: "#FFFDF7",
    },
    scenes: 3,
  },
  "mehandi-pastel": {
    id: "mehandi-pastel",
    name: "Mehandi Pastel",
    emoji: "❀",
    tagline: "Soft · Boho · Romantic",
    description: "Dusty-rose & sage-green palette — 3-scene boho mehandi with watercolour blooms and pastel henna line-art.",
    functionType: "mehandi",
    durationInFrames: 390,
    palette: {
      primary: "#D88FA8",
      secondary: "#A7C957",
      accent: "#7FB069",
      background: "#FBF4EC",
    },
    scenes: 3,
  },
  "wedding-divine": {
    id: "wedding-divine",
    name: "Wedding Divine",
    emoji: "🪔",
    tagline: "Sacred · Serene · Timeless",
    description: "Temple-teal & sacred-gold palette — 3-scene divine wedding with rotating mandala geometry and diya glow.",
    functionType: "wedding",
    durationInFrames: 390,
    palette: {
      primary: "#1B7C84",
      secondary: "#E8C547",
      accent: "#F4E4BC",
      background: "#0A2E36",
    },
    scenes: 3,
  },
  "reception-garden": {
    id: "reception-garden",
    name: "Reception Garden",
    emoji: "🌿",
    tagline: "Romantic · Natural · Warm",
    description: "Garden-green & blush palette — 3-scene twilight reception with hanging string-lights and drifting fireflies.",
    functionType: "reception",
    durationInFrames: 390,
    palette: {
      primary: "#4F8A6D",
      secondary: "#F7CAC9",
      accent: "#E6A57E",
      background: "#16241C",
    },
    scenes: 3,
  },
};

/** All public-facing template IDs in display order */
export const TEMPLATE_IDS: TemplateId[] = [
  "royal-rajasthani",
  "haldi-floral",
  "mehandi-traditional",
  "sangeet-grand",
  "reception-luxury",
  "baraat-royal",
  "sangeet-neon",
  "haldi-modern",
  "mehandi-pastel",
  "wedding-divine",
  "reception-garden",
];

// ─────────────────────────────────────────────────────────────
// Package configs (Standard + Premium only — Luxury hidden)
// PRD §1
// ─────────────────────────────────────────────────────────────

export interface PackageConfig {
  tier: PackageTier;
  name: string;
  price: number;
  description: string;
  features: string[];
  scenes: number;
  popular?: boolean;
}

export const PACKAGE_CONFIGS: PackageConfig[] = [
  {
    tier: "standard",
    name: "Standard",
    price: 1199,
    description: "Beautiful template-based cinematic video invite",
    features: [
      "5-scene animated video",
      "Your couple photos",
      "Premium text animations",
      "Background music",
      "Gold particle effects",
      "Scene transitions",
      "1080×1920 HD (Reels-ready)",
      "WhatsApp delivery",
    ],
    scenes: 5,
    popular: true,
  },
  {
    tier: "premium",
    name: "Premium",
    price: 1799,
    description: "Full cinematic experience with Pixar-style couple avatars",
    features: [
      "5-scene cinematic video",
      "Custom Pixar-style couple avatars",
      "Premium text animations",
      "Custom music choice",
      "Gold particle effects",
      "Cinematic transitions",
      "FREE 7-day countdown pack",
      "Priority delivery",
      "1 free revision within 48h",
    ],
    scenes: 5,
  },
];

// ─────────────────────────────────────────────────────────────
// Music track options
// ─────────────────────────────────────────────────────────────

export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  mood: string;
  functionTypes: FunctionType[];
  file: string;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "romantic-piano",
    name: "Romantic Piano",
    artist: "Royalty Free",
    mood: "Soft & Romantic",
    functionTypes: ["wedding", "mehandi"],
    file: "/music/Jashn.mp3",
  },
  {
    id: "cinematic-wedding",
    name: "Cinematic Wedding",
    artist: "Royalty Free",
    mood: "Grand & Majestic",
    functionTypes: ["wedding", "reception"],
    file: "/music/Jashn.mp3",
  },
  {
    id: "festive-dhol",
    name: "Festive Dhol",
    artist: "Royalty Free",
    mood: "Energetic & Festive",
    functionTypes: ["haldi", "sangeet", "baraat"],
    file: "/music/Jashn.mp3",
  },
];

// ─────────────────────────────────────────────────────────────
// Dynamic Template types (Template Manager — Phase 1)
// Database-driven templates that can be created via Admin UI
// without writing any Remotion component code.
// ─────────────────────────────────────────────────────────────

/** Text alignment options for text slots */
export type TextAlign = "left" | "center" | "right";

/** Transition effect between scenes */
export type TransitionEffect = "fade" | "slide-up" | "slide-left" | "wipe" | "none";

/** A text overlay slot inside a scene */
export interface TextSlotDef {
  /** Key maps to InviteProps fields: "groomName" | "brideName" | "eventDate" | "venueName" | "venueCity" | "custom" */
  key: string;
  /** Custom text override (only used when key === "custom") */
  customText?: string;
  /** X position in the 1080px-wide canvas */
  x: number;
  /** Y position in the 1920px-tall canvas */
  y: number;
  /** Font size in pixels */
  fontSize: number;
  /** Text colour as hex string */
  color: string;
  align: TextAlign;
  fontFamily?: string;
}

/** An avatar image slot inside a scene */
export interface AvatarSlotDef {
  /** "groomAvatar" | "brideAvatar" | "custom" */
  key: string;
  /** X centre position in the 1080px canvas */
  x: number;
  /** Y centre position in the 1920px canvas */
  y: number;
  /** Width in pixels (height auto-calculated from aspectRatio) */
  width: number;
  /** Height/width ratio — default 1.333 (portrait) */
  aspectRatio?: number;
}

/** A single scene/frame inside a dynamic template */
export interface SceneDefinition {
  /** Unique within the template — used as React key */
  id: string;
  /** Human-readable label shown in the Admin UI */
  label: string;
  /** Duration in seconds */
  durationSeconds: number;
  /** CDN URL of the background video or image */
  backgroundUrl?: string;
  /** Transition applied when entering this scene */
  transitionIn: TransitionEffect;
  /** Transition applied when leaving this scene */
  transitionOut: TransitionEffect;
  /** Avatar overlay slots */
  avatarSlots: AvatarSlotDef[];
  /** Text overlay slots */
  textSlots: TextSlotDef[];
  /** CDN URL of a Lottie JSON animation overlay (optional) */
  lottieUrl?: string;
}

/** Colour palette for a dynamic template */
export interface DynamicTemplatePalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
}

/** Status of a custom template */
export type DynamicTemplateStatus = "draft" | "active" | "inactive";

/**
 * A complete database-driven template definition.
 * Stored in `public.custom_templates` and rendered by `UniversalTemplate.tsx`.
 */
export interface DynamicTemplate {
  /** URL-safe slug, e.g. "baraat-grand" */
  id: string;
  name: string;
  status: DynamicTemplateStatus;
  /** Ceremony type this template is designed for */
  ceremony: FunctionType;
  emoji: string;
  palette: DynamicTemplatePalette;
  /** Ordered list of scenes — the render order matches this array */
  scenes: SceneDefinition[];
  createdAt?: string;
  updatedAt?: string;
}

/** Preset scene templates for quick-add in the editor */
export const PRESET_SCENES: Record<string, Omit<SceneDefinition, "id">> = {
  intro: {
    label: "Intro / Names",
    durationSeconds: 4,
    transitionIn: "fade",
    transitionOut: "fade",
    avatarSlots: [],
    textSlots: [
      { key: "groomName", x: 540, y: 750, fontSize: 64, color: "#D4AF37", align: "center" },
      { key: "brideName", x: 540, y: 860, fontSize: 64, color: "#D4AF37", align: "center" },
    ],
  },
  haldi: {
    label: "Haldi Carnival",
    durationSeconds: 8,
    transitionIn: "slide-up",
    transitionOut: "fade",
    avatarSlots: [
      { key: "groomAvatar", x: 270, y: 960, width: 380, aspectRatio: 1.333 },
      { key: "brideAvatar", x: 810, y: 960, width: 380, aspectRatio: 1.333 },
    ],
    textSlots: [
      { key: "groomName", x: 270, y: 1370, fontSize: 38, color: "#FFD700", align: "center" },
      { key: "brideName", x: 810, y: 1370, fontSize: 38, color: "#FFD700", align: "center" },
    ],
  },
  sangeet: {
    label: "Sangeet Night",
    durationSeconds: 8,
    transitionIn: "slide-left",
    transitionOut: "fade",
    avatarSlots: [
      { key: "groomAvatar", x: 270, y: 960, width: 380, aspectRatio: 1.333 },
      { key: "brideAvatar", x: 810, y: 960, width: 380, aspectRatio: 1.333 },
    ],
    textSlots: [
      { key: "groomName", x: 270, y: 1370, fontSize: 38, color: "#C89EFF", align: "center" },
      { key: "brideName", x: 810, y: 1370, fontSize: 38, color: "#FF80CC", align: "center" },
    ],
  },
  varmala: {
    label: "Varmala & Pheras",
    durationSeconds: 10,
    transitionIn: "fade",
    transitionOut: "fade",
    avatarSlots: [
      { key: "groomAvatar", x: 270, y: 900, width: 420, aspectRatio: 1.333 },
      { key: "brideAvatar", x: 810, y: 900, width: 420, aspectRatio: 1.333 },
    ],
    textSlots: [
      { key: "eventDate", x: 540, y: 1600, fontSize: 32, color: "#F5ECD7", align: "center" },
      { key: "venueName", x: 540, y: 1660, fontSize: 24, color: "#D4AF37", align: "center" },
    ],
  },
  outro: {
    label: "Join Us!",
    durationSeconds: 4,
    transitionIn: "fade",
    transitionOut: "fade",
    avatarSlots: [],
    textSlots: [
      { key: "custom", customText: "We cordially invite you", x: 540, y: 700, fontSize: 32, color: "#F5ECD7", align: "center" },
      { key: "eventDate", x: 540, y: 900, fontSize: 48, color: "#D4AF37", align: "center" },
      { key: "venueName", x: 540, y: 980, fontSize: 28, color: "#F5ECD7", align: "center" },
      { key: "venueCity", x: 540, y: 1030, fontSize: 22, color: "#D4AF37", align: "center" },
    ],
  },
};

