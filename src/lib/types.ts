// Types for the Wedding Invite Platform

export type WeddingStyle =
  | "royal"
  | "modern"
  | "haldi"
  | "bollywood"
  | "southindian"
  | "love";

export type SceneType =
  | "intro"
  | "firstmeet"
  | "proposal"
  | "family"
  | "wedding";

export type OrderStatus =
  | "received"
  | "rendering"
  | "ready"
  | "delivered";

export type PackageTier = "basic" | "standard" | "premium";

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

export interface OrderData {
  id: string;
  createdAt: string;
  customerPhone: string;
  customerEmail?: string;
  details: CustomerDetails;
  style: WeddingStyle;
  tier: PackageTier;
  scenes: SceneType[];
  musicTrack: string;
  photos: string[]; // URLs to uploaded photos
  status: OrderStatus;
  videoUrl?: string; // Rendered MP4 URL
  thumbnailUrl?: string;
  notes?: string;
}

export interface RenderRequest {
  orderId: string;
  compositionId: string;
  inputProps: WeddingVideoProps;
}

export interface WeddingVideoProps {
  groomName: string;
  brideName: string;
  weddingDate: string;
  venue: string;
  groomCity: string;
  brideCity: string;
  style: WeddingStyle;
  scenes: SceneType[];
  photos: string[];
  musicUrl: string;
}

export interface SceneConfig {
  id: SceneType;
  name: string;
  emoji: string;
  description: string;
  durationInFrames: number; // at 30fps
}

// Scene configurations
export const SCENE_CONFIGS: Record<SceneType, SceneConfig> = {
  intro: {
    id: "intro",
    name: "Intro / Names",
    emoji: "💫",
    description: "Couple names with elegant reveal animation",
    durationInFrames: 150, // 5 sec
  },
  firstmeet: {
    id: "firstmeet",
    name: "First Meet",
    emoji: "☕",
    description: "The story of how they met",
    durationInFrames: 150, // 5 sec
  },
  proposal: {
    id: "proposal",
    name: "The Proposal",
    emoji: "💍",
    description: "The magical moment",
    durationInFrames: 150, // 5 sec
  },
  family: {
    id: "family",
    name: "Family Blessings",
    emoji: "🏠",
    description: "Two families become one",
    durationInFrames: 150, // 5 sec
  },
  wedding: {
    id: "wedding",
    name: "Save The Date",
    emoji: "💒",
    description: "Grand wedding finale with date & venue",
    durationInFrames: 210, // 7 sec
  },
};

// Style configurations
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

// Package configurations
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
    tier: "basic",
    name: "Basic",
    price: 799,
    description: "Beautiful template-based video invite",
    features: [
      "3-scene animated video",
      "Your couple photos",
      "Elegant text overlays",
      "Background music",
      "1080×1920 HD (Reels-ready)",
      "Download MP4",
    ],
    scenes: 3,
  },
  {
    tier: "standard",
    name: "Standard",
    price: 1199,
    description: "Extended invite with more scenes",
    features: [
      "5-scene cinematic video",
      "Your couple photos",
      "Premium text animations",
      "Background music",
      "Gold particle effects",
      "Scene transitions",
      "Download MP4",
      "WhatsApp delivery",
    ],
    scenes: 5,
    popular: true,
  },
  {
    tier: "premium",
    name: "Premium",
    price: 1799,
    description: "Full cinematic experience + countdown",
    features: [
      "5-scene cinematic video",
      "Your couple photos",
      "Premium text animations",
      "Custom music choice",
      "Gold particle effects",
      "Cinematic transitions",
      "FREE 7-day countdown pack",
      "Priority delivery",
      "Unlimited revisions",
    ],
    scenes: 5,
  },
];

// Music track options
export interface MusicTrack {
  id: string;
  name: string;
  artist: string;
  mood: string;
  file: string; // path to audio file
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: "romantic-piano",
    name: "Romantic Piano",
    artist: "Royalty Free",
    mood: "Soft & Romantic",
    file: "/music/romantic-piano.mp3",
  },
  {
    id: "cinematic-wedding",
    name: "Cinematic Wedding",
    artist: "Royalty Free",
    mood: "Grand & Majestic",
    file: "/music/cinematic-wedding.mp3",
  },
  {
    id: "festive-dhol",
    name: "Festive Dhol",
    artist: "Royalty Free",
    mood: "Energetic & Festive",
    file: "/music/festive-dhol.mp3",
  },
];
