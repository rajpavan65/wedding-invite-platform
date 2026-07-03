# Product Requirements Document (PRD)
# @digitalinvites.ai — AI-Powered Wedding Invite Automation Platform
### Version 2.3 — Revised, Optimised, Gap-Corrected & GLB Avatar Evaluation Added
**Last updated:** June 2026  
**Status:** In active development (Phase 0 complete — local MVP validated)  
**Prepared by:** digitalinvites.ai Studio Team  
**Reviewed by:** Engineering (gap analysis completed against working prototype)

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Architecture Philosophy](#2-architecture-philosophy)
3. [End-to-End Production Workflow](#3-end-to-end-production-workflow)
4. [Core Technologies](#4-core-technologies)
5. [The 3-Layer Compositing Model](#5-the-3-layer-compositing-model)
6. [Custom Avatar System](#6-custom-avatar-system)
7. [Remotion Skills Integration](#7-remotion-skills-integration)
8. [Workflow 0 — Local Development (Phase 0)](#8-workflow-0--local-development-phase-0)
9. [Workflow 1 — Hybrid (Phase 1)](#9-workflow-1--hybrid-phase-1)
10. [Workflow 2 — Full Automation (Phase 2)](#10-workflow-2--full-automation-phase-2)
11. [Functional Requirements](#11-functional-requirements)
12. [Infrastructure & Storage](#12-infrastructure--storage)
13. [Template Library Specification](#13-template-library-specification)
14. [Cost Analysis & Optimisation](#14-cost-analysis--optimisation)
15. [Security & Reliability](#15-security--reliability)
    - [§6.5 ⚗️ Phase 1.5 Research: GLB/3D Avatar Alternative](#65-️-phase-15-research-glb3d-avatar-alternative)
16. [Analytics & Conversion Tracking](#16-analytics--conversion-tracking)
17. [Missing Pieces from v1 — All Addressed](#17-missing-pieces-from-v1--all-addressed)
18. [Success Metrics](#18-success-metrics)
19. [Development Roadmap](#19-development-roadmap)

---

## 1. Product Overview

**Product name:** Digital Invites AI Auto-Renderer  
**Studio:** @digitalinvites.ai  

### Objective

Transition a fully manual, event-based video invitation creation workflow into a scalable, programmatic rendering pipeline. The system accepts client photos and event details as input and delivers personalised, function-specific animated video invites (haldi, mehandi, sangeet, wedding, reception) — complete with custom Pixar-style couple avatars, luxury motion graphics, and AI-synced audio — with minimal to zero manual effort per order.

### Target Users

| User | Role |
|------|------|
| **End-Client** | Engaged couple purchasing a digital invite package |
| **Admin / Studio Operator** | Manages template library, QA, and exception handling |
| **AI Agent (Claude Code)** | Builds and maintains the Remotion composition library (development time only) |

### Product Tiers

| Tier | Description | Delivery Time | Avatar |
|------|-------------|---------------|--------|
| **Standard** | Pre-built Remotion motion-graphic templates, text overlays | < 2 min | No avatar |
| **Premium** | Cached Pixar avatar composited into function scenes | < 5 min | Static Pixar PNG |
| **Luxury** | Post-launch concierge tier: animated avatar (Kling AI), ElevenLabs voiceover, 3D scene | < 15 min | Animated avatar clip |

**Recommended launch scope:** Standard + Premium only. Keep Luxury behind a manual approval gate until avatar consistency, QA time, and pricing are validated with paying customers.

---

## 2. Architecture Philosophy

### The Two Critical Rules

**Rule 1 — Separate WHAT from WHO.**  
The background template (scene, decorations, motion) is completely separate from the client avatar and client text. These three layers are composed at render time, never baked together during creation. This means any client can be placed into any template.

**Rule 2 — Generate once, render many.**  
AI generation (Veo 3, Pixar avatar) is a one-time cost per asset, not a per-order cost. Templates are generated once and cached indefinitely. Client avatars are generated once per client and cached. Only the final Remotion render (< $0.01) happens per order.

### What Changed from PRD v1

| v1 Assumption | v2 Reality |
|---|---|
| Veo 3 generates video per order | Veo 3 used once to build template library; cached forever |
| AI agent writes Remotion code per order | AI agent builds templates at development time; runtime is props-only |
| 10-minute delivery with Veo 3 | Veo 3 takes 15–45 min; used as a template tool, not a real-time tool |
| $0.05/video target unreachable with AI gen | $0.05 target achieved via Remotion-native motion graphics |
| No queue — payment webhook fires Lambda directly | SQS queue between webhook and pipeline for durability and concurrency |
| Canva for text overlays | Remotion text-animations skill handles all typography natively |

---

## 3. End-to-End Production Workflow

### Full Pipeline (Per Client Order)

```
CLIENT PHOTOS (upload)
        │
        ▼
┌─────────────────────────────┐
│  STEP 1: PHOTO INTAKE        │  Google Drive / S3 shared folder
│  Sort by function tag        │  EXIF timestamp + event schedule match
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  STEP 2: AI PHOTO CULLING   │  Aftershoot / Narrative Select
│  Remove blurry, dark, dupes │  Rank best N photos per function
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  STEP 3: AVATAR GENERATION  │  fal.ai + PhotoMaker / InstantID
│  Pixar-style from face photo │  6 poses generated ONCE, cached in S3
│  (Premium + Luxury tiers)   │
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  STEP 4: BACKGROUND REMOVAL │  remove.bg API (batch)
│  For selected photos         │  PNG output → S3
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  STEP 5: REMOTION RENDER    │  Lambda + Remotion
│  3 layers composited:        │  (1) cached template background
│  bg + avatar + text props    │  (2) cached client avatar PNG
│  Zod schema validates all   │  (3) text props from booking form
└─────────────┬───────────────┘
              │
              ▼
┌─────────────────────────────┐
│  STEP 6: EXPORT + DELIVER   │  CloudFront CDN link
│  WhatsApp Cloud API / email  │  Client portal at /invite/[orderId]
└─────────────────────────────┘
```

### What Is Manual vs Automated

| Step | Standard | Premium | Luxury |
|------|----------|---------|--------|
| Photo intake & sorting | Auto | Auto | Auto |
| Photo culling | Auto (AI) | Auto (AI) | Auto (AI) |
| Avatar generation | N/A | Auto (API) | Auto (API) |
| Avatar animation | N/A | N/A | Auto (Kling) |
| Background removal | Auto | Auto | Auto |
| Frame compositing | Auto (Remotion) | Auto (Remotion) | Auto (Remotion) |
| Music sync | Auto (calculateMetadata) | Auto | Auto |
| Text overlays | Auto (Remotion props) | Auto | Auto |
| Voiceover | None | None | Auto (ElevenLabs) |
| QA step | Admin | Admin | Admin |
| Delivery | Auto | Auto | Auto |

---

## 4. Core Technologies

### Primary Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend / Backend** | Next.js 14+ (App Router) | Storefront, admin dashboard, API routes (tested with Next.js 16) |
| **Video Engine** | Remotion 4.x | Parametric React-based video rendering |
| **Cloud Rendering** | Remotion Lambda (AWS) | Distributed video encoding at scale |
| **Database** | Supabase (PostgreSQL) | Orders, clients, render status, asset refs |
| **Job Queue** | AWS SQS + Lambda consumer | Durable async order processing |
| **Storage** | AWS S3 + CloudFront CDN | All asset storage and video delivery |
| **Payment** | Razorpay (primary) / Stripe | Payment processing with webhook events |
| **Delivery** | WhatsApp Cloud API | Final video delivery to client |
| **AI Agent (build time)** | Claude Code + Remotion Skills | Template composition library development |

### AI Generation Tools (Template Creation Only — Not Per Order)

| Tool | Usage | Frequency |
|------|-------|-----------|
| **Google Veo 3** | Photorealistic background scenes (palace, garden) | Once per premium template |
| **Nano Banana Pro / Midjourney** | Motion-graphic template art direction | Once per template style |
| **fal.ai + PhotoMaker / InstantID** | Client Pixar avatar from reference photos | Once per client |
| **Kling AI v2** | Animate static Pixar avatar into motion clip | Once per client (Luxury tier) |
| **ElevenLabs TTS** | Personalised narration voiceover | Per order (Luxury tier only, ~$0.03) |

### What Remotion Replaces (No External Tool Needed)

| Previously needed | Now handled by Remotion |
|---|---|
| Canva — text overlays | `text-animations` + `typography` skill |
| Manual music-to-video sync | `calculate-metadata` + `get-audio-duration` skill |
| External particle/VFX tools | `lottie` + `transparent-videos` skill |
| After Effects — transitions | `@remotion/transitions` package (`TransitionSeries`, `presentationEffect`) |
| External light-leak presets | `@remotion/light-leaks` package |
| Manual duration hardcoding | `calculate-metadata` dynamic frames |
| External thumbnail tools | Remotion `renderStill()` — auto-generate video thumbnails at render time |

---

## 5. The 3-Layer Compositing Model

Every video — regardless of tier or function — is built from three independent cached layers composed by Remotion at render time.

```
┌────────────────────────────────────────────┐
│  LAYER 3 — TEXT PROPS                      │  Zero cost — pure React props
│  Bride name, groom name, date, venue,      │  Zod-validated from booking form
│  ceremony name, custom message             │  spring-animated by Remotion
├────────────────────────────────────────────┤
│  LAYER 2 — CLIENT AVATAR                  │  Generated once per client
│  Pixar/3D-style couple PNG                 │  Transparent background
│  Function-specific pose (haldi, sangeet…)  │  Cached in S3 per client ID
├────────────────────────────────────────────┤
│  LAYER 1 — BACKGROUND TEMPLATE            │  Created once, used for all clients
│  Animated scene (Remotion 3D / Veo 3)     │  Cached in S3 per template ID
│  Lottie effects, light leaks, particles    │  Function-specific theme
└────────────────────────────────────────────┘
```

### Template Slot System

Each background template defines named "avatar slots" — absolute or relative positions where the avatar layer is anchored. The Remotion composition reads the slot coordinates from the template's metadata JSON and positions the avatar accordingly.

```typescript
// Template metadata schema (stored in S3 alongside each template)
// MUST be validated with Zod at template registration time
import { z } from 'zod';

const SlotSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  anchorBottom: z.boolean(),
});

export const TemplateMetadataSchema = z.object({
  templateId: z.string(),
  functionType: z.enum(['haldi', 'mehandi', 'sangeet', 'wedding', 'reception', 'baraat']),
  durationFrames: z.number(), // overridden at render time by audio length
  thumbnailFrame: z.number().default(90), // frame number to use for auto-generated thumbnail
  avatarSlots: z.object({
    bride: SlotSchema,
    groom: SlotSchema,
  }),
  textSlots: z.object({
    primaryName: z.object({ x: z.number(), y: z.number(), maxWidth: z.number(), fontFamily: z.string() }),
    secondaryName: z.object({ x: z.number(), y: z.number(), maxWidth: z.number(), fontFamily: z.string() }),
    date: z.object({ x: z.number(), y: z.number() }),
    venue: z.object({ x: z.number(), y: z.number() }),
    ceremonyTitle: z.object({ x: z.number(), y: z.number() }),
  }),
  // v2.1 addition: Visual identity notes for differentiating similar functions
  visualIdentity: z.object({
    dominantPalette: z.array(z.string()), // e.g. ["#F5A623", "#FFD700"] for haldi
    keyMotif: z.string(),                 // e.g. "turmeric powder" vs "mandala patterns"
    moodKeywords: z.array(z.string()),    // e.g. ["festive", "joyful"] vs ["intricate", "intimate"]
  }).optional(),
});

export type TemplateMetadata = z.infer<typeof TemplateMetadataSchema>;
```

> **v2.1 Note — Mehandi vs Haldi Visual Differentiation:**  
> These two pre-wedding functions share similar warm palettes but must be visually distinct. Haldi templates use **bright yellows, turmeric powder particles, and outdoor garden energy**. Mehandi templates use **deep greens, intricate mandala line-art overlays, and intimate indoor atmosphere** with henna-inspired geometric patterns. The `visualIdentity` field in metadata enforces this distinction at the template registration level.

---

## 6. Custom Avatar System

### Overview

Clients who order Premium or Luxury tiers receive personalised Pixar/3D-cartoon-style avatars of the couple. These avatars are generated once from 2–3 reference photos, cover all function-specific poses, and are cached permanently in S3. All subsequent function videos for the same client reuse the same cached avatars at zero additional AI cost.

### Avatar Generation Flow

```
Client uploads 2–3 face photos (booking form)
              │
              ▼
      fal.ai / Replicate API
      PhotoMaker or InstantID model
      Prompt: "Pixar 3D animation style, [description],
               [pose], transparent background, PNG"
              │
              ├── Pose 1: Haldi — couple throwing turmeric, laughing
              ├── Pose 2: Mehandi — bride seated, getting mehandi applied
              ├── Pose 3: Sangeet — couple dancing together
              ├── Pose 4: Wedding — couple standing in wedding attire
              ├── Pose 5: Reception — couple waving, celebratory
              └── Pose 6: Baraat — groom on horse (optional)
              │
              ▼
      ┌─────────────────────────────────┐
      │  AVATAR QA GATE (v2.1)          │
      │  Auto-check: transparent bg?    │
      │  Auto-check: face detected?     │
      │  Admin review for Premium/Lux   │
      │  Status: AVATAR_QA → APPROVED   │
      └─────────────┬───────────────────┘
                    │
                    ▼
      6 PNGs with transparent background
      → Stored in S3: /avatars/{clientId}/{pose}.png
      → Reused across all function videos for this client
```

> **⚠️ v2.1 Reality Check — Face Consistency:**  
> Generating 6 consistent Pixar-style poses from 2–3 reference photos with different expressions, clothing, and body positions is challenging with current models. **Expect 50–70% consistency** across poses in practice, not the idealised 5/5 stars. Mitigations:  
> 1. **Batch generation + cherry-pick** — Generate 3 variants per pose, auto-select the best match.  
> 2. **Admin QA gate** — All Premium/Luxury avatars pass through admin review before being used.  
> 3. **Fallback** — If avatar QA fails after 2 attempts, downgrade to Standard tier render (no avatar) and alert admin.

### Recommended Avatar Generation Tools

| Tool | Face Consistency | API Access | Cost/Image | Best For |
|------|-----------------|------------|------------|---------|
| **InstantID** (via fal.ai) | ⭐⭐⭐⭐ (good, not perfect) | Yes | ~$0.02–0.04 | Production pipeline (auto) |
| **PhotoMaker** (via Replicate) | ⭐⭐⭐ (acceptable with cherry-pick) | Yes | ~$0.03–0.06 | Production pipeline (auto) |
| **Midjourney v7 (--cref)** | ⭐⭐⭐⭐⭐ (best, manual) | Admin-only | ~$0.04–0.08 | Luxury tier (admin-run QA) |
| **IP-Adapter FaceID** (self-hosted) | ⭐⭐⭐ | Self-hosted | ~$0.005 | High-volume cost saving |

### Avatar Animation (Luxury Tier Only)

For the Luxury tier, Kling AI v2 animates the static Pixar PNG into a 3–5 second motion clip using image-to-video generation. This clip is then embedded into the Remotion template as a `<Video>` component rather than a static `<Img>`.

- **Tool:** Kling AI v2 (image-to-video)
- **Cost:** ~$0.14–0.28 per 5-second animated clip
- **Generated:** Once per client per pose
- **Cached:** `/avatars/{clientId}/{pose}-animated.mp4`

### Avatar Cost Per Client (All Poses)

| Tier | Avatar Type | Generation Cost | Reuse Value (5 videos) |
|------|-------------|-----------------|------------------------|
| Standard | None | $0 | — |
| Premium | 6× static Pixar PNGs | $0.12–$0.36 | Used in all 5 function videos |
| Luxury | 6× animated clips (Kling) | $0.84–$1.68 | Used in all 5 function videos |

### 6.5 ⚗️ Phase 1.5 Research: GLB/3D Avatar Alternative

> **Status: HYPOTHESIS — not adopted.** This section proposes an alternative to the PNG-based Pixar avatar pipeline. It should be evaluated after the first 30–50 paid orders, using the success criteria below as the decision gate. Do not implement before Phase 1 launch.

#### The Problem It Solves

The PNG pipeline (§6.1) achieves 50–70% face consistency, requires admin QA per pose, and generates 6 separate static images. A 3D rigged GLB avatar is generated once, reused with any animation, and may achieve higher consistency — but at the cost of render complexity and unknown customer preference.

#### Proposed Pipeline

```
Client Photos → Avaturn → GLB Avatar file
                               │
                               ▼
                    Animation Library (idle, wave, dance…)
                               │
                               ▼
              Remotion + React Three Fiber (R3F)
                               │
                               ▼
                       Final MP4 render
```

#### PNG vs GLB Comparison

| Dimension | PNG (Current — decided) | GLB (Proposed — evaluate) |
|-----------|------------------------|---------------------------|
| Face consistency | 50–70% | Higher (rigged 3D mesh) |
| QA overhead | High — admin reviews each pose | Lower — one mesh, reuse animations |
| Reusable animations | No — static per pose | Yes — animation library |
| Emotional / illustrated appeal | High | Unknown — needs A/B test |
| Render complexity | Low | Higher — R3F in Lambda |
| Cost per client | $0.12–$0.36 (6 PNGs) | TBD — Avaturn API pricing |
| Integration effort | Done | ~2 weeks (R3F + Remotion) |

#### Schema Extension (if GLB adopted)

Add to `InvitePropsSchema` (§7) — already included in schema below:

```typescript
avatarType: z.enum(['photo', 'png', 'video', 'glb']).default('png'),
avatarAssetUrl: z.string().url().optional(), // for GLB/video avatar types
```

#### GLB-Specific Template Ideas

These composition types become possible only with a rigged, animatable character:

| Template ID | Function | Character Action |
|-------------|----------|-----------------|
| `royal-baraat-entry` | Baraat | Groom character riding horse animation |
| `couple-dance-intro` | Sangeet | Couple dance loop animation |
| `save-the-date-story` | Pre-wedding | Animated couple walking hand-in-hand |
| `proposal-story` | Engagement | Proposal pose with animated ring reveal |
| `wedding-trailer` | Wedding | Cinematic walk toward mandap |

#### Phase 1.5 Decision Gate

Build **3 GLB templates** in parallel with the PNG pipeline after Phase 1 launch:
- `haldi-glb` — couple throwing turmeric
- `save-the-date-glb` — couple walking animation
- `baraat-entry-glb` — groom on horse

Then run a customer preference A/B test. **Adopt GLB fully only if ALL of the following pass:**

| Metric | Required Threshold |
|--------|-------------------|
| QA Pass Rate | > 90% (vs 80% for PNG) |
| Face Similarity (blind test) | > 80% |
| Customer Preference (A/B) | > 60% prefer GLB over PNG |
| Cost Per Client | < $0.50 total |
| Render Time Overhead | < 20% longer than PNG render |

> If any threshold is missed, **stay on PNG** and reassess in Phase 3.

---

## 7. Remotion Skills Integration

### The Correct Usage of Remotion Agent Skills

> **Important:** Remotion Agent Skills are tools for **building** the composition library during development — not for generating code at render time. The v1 PRD incorrectly proposed the AI agent writing React code per order. This is replaced by prop-driven rendering against pre-built, tested compositions.

| Phase | Agent Role | Skills Used |
|-------|-----------|-------------|
| **Development (one-time)** | Claude Code builds all Remotion compositions | All relevant skills below |
| **Runtime (per order)** | Agent selects composition ID + fills Zod props | None — pure prop injection |

### Skills Used Per Template Component

#### Tier 1 — Core Skills (Required for All Templates)

| Skill | File | Application in Invite Pipeline |
|-------|------|-------------------------------|
| `text-animations` | `rules/text-animations.md` | Spring-animated name reveals, typewriter ceremony text, staggered line-by-line entrance for bride and groom names |
| `timing` | `rules/timing.md` | Bézier easing curves for all motion, spring damping configuration for name entrance, frame-precise animation control |
| `transitions` | `rules/transitions.md` | Scene-to-scene cuts between function segments within a single video (haldi intro → name reveal → closing) |
| `sequencing` | `rules/sequencing.md` | Stagger itinerary events, delay avatar entrance after background settles, control reveal sequence order |
| `parameters` | `rules/parameters.md` | Zod schema for all client props — brideFirstName, groomFirstName, eventDate, venueName, audioUrl, templateId, avatarUrl |
| `calculate-metadata` | `rules/calculate-metadata.md` | Dynamically set `durationInFrames` from audio file length — composition is always exactly as long as its music |
| `get-audio-duration` | `rules/get-audio-duration.md` | Fetch audio file duration via Mediabunny before render to feed into calculateMetadata |
| `lottie` | `rules/lottie.md` | Function-specific decorative animations: haldi turmeric particles, mehandi mandala patterns, sangeet sparkles, wedding petals — sourced from LottieFiles.com |
| `transparent-videos` | `rules/transparent-videos.md` | Pre-rendered VFX overlays with alpha channel: flower showers, confetti bursts, light rays — composited over any background |
| `light-leaks` | `rules/light-leaks.md` | `@remotion/light-leaks` package applied as top overlay on all templates — single line upgrade to luxury cinematic feel |
| `audio` | `rules/audio.md` | Music fade-in at start, fade-out at end, volume ducking under voiceover |
| `google-fonts` | `rules/google-fonts.md` | Cormorant Garamond, Great Vibes, Playfair Display for luxury typography |

#### Tier 2 — Premium Skills (Phase 2 + Luxury Tier)

| Skill | File | Application |
|-------|------|-------------|
| `3d` | `rules/3d.md` | Three.js + React Three Fiber for 3D particle systems, animated marigold garlands, rotating mandala geometry — replaces Veo 3 for non-photorealistic templates |
| `audio-visualization` | `rules/audio-visualization.md` | Bass-reactive background pulses and spectrum overlays in sangeet/reception templates — visuals that respond to the music beat |
| `voiceover` | `rules/voiceover.md` | ElevenLabs TTS integration for personalised narration synced to the Remotion timeline: "Join us for the wedding of Priya and Rahul…" |
| `charts` | `rules/charts.md` | Animated wedding itinerary timeline — each event (Baraat 4pm, Pheras 6pm, Reception 8pm) animates in sequentially, driven by booking form data |
| `sfx` | `rules/sfx.md` | Bell chime on name appearance, subtle whoosh on scene transitions, confetti burst at final reveal |
| `local-fonts` | `rules/local-fonts.md` | Proprietary calligraphy fonts bundled in the project for brand consistency |

#### Tier 3 — Utility Skills (Supporting)

| Skill | File | Application |
|-------|------|-------------|
| `measuring-text` | `rules/measuring-text.md` | Auto-scale long names (Venkatasubramaniam) to fit the name title slot without overflow |
| `images` | `rules/images.md` | Precise positioning of avatar PNGs in their template slots, dynamic path resolution from S3 |
| `videos` | `rules/videos.md` | Trim and loop cached Veo 3 background clips to match composition duration |
| `trimming` | `rules/trimming.md` | Cut silence from start/end of renders, trim background video pre-roll |
| `silence-detection` | `rules/silence-detection.md` | Auto-trim silence from start of client-selected audio tracks |
| `compositions` | `rules/compositions.md` | Nested composition structure: one root composition per function × style combination |
| `gifs` | `rules/gifs.md` | Small decorative animated GIF accents (diya flame, peacock feather) in corner positions |
| `ffmpeg` | `rules/ffmpeg.md` | Post-process background clips, format conversion, silence trim on server before S3 upload |
| `assets` | `rules/assets.md` | `public/` folder structure: `backgrounds/`, `avatars/`, `lottie/`, `sfx/`, `fonts/` organised per function |

### Remotion Zod Props Schema

```typescript
import { z } from 'zod';

export const InvitePropsSchema = z.object({
  // Client details
  brideFirstName: z.string().max(40),
  groomFirstName: z.string().max(40),
  brideFamilyName: z.string().max(60).optional(),
  groomFamilyName: z.string().max(60).optional(),
  eventDate: z.string(), // ISO 8601
  eventTime: z.string().optional(),
  venueName: z.string().max(100),
  venueCity: z.string().max(60),
  customMessage: z.string().max(200).optional(),

  // Itinerary (for wedding/reception templates)
  itinerary: z.array(z.object({
    time: z.string(),
    event: z.string(),
  })).max(6).optional(),

  // Assets (all S3/CDN URLs)
  audioUrl: z.string().url(),
  backgroundVideoUrl: z.string().url(),        // cached template bg
  brideAvatarUrl: z.string().url().optional(), // premium/luxury tier (PNG)
  groomAvatarUrl: z.string().url().optional(),
  // v2.3: Extended for GLB/video avatar types (Phase 1.5 evaluation)
  avatarType: z.enum(['photo', 'png', 'video', 'glb']).default('png'),
  avatarAssetUrl: z.string().url().optional(), // used when avatarType is 'glb' or 'video'

  // Template selection
  templateId: z.string(),
  functionType: z.enum(['haldi', 'mehandi', 'sangeet', 'wedding', 'reception', 'baraat']),
  tier: z.enum(['standard', 'premium', 'luxury']),

  // Luxury-only
  voiceoverEnabled: z.boolean().default(false),
  voiceoverText: z.string().max(300).optional(),
});

export type InviteProps = z.infer<typeof InvitePropsSchema>;
```

---

## 8. Workflow 0 — Local Development (Phase 0)

*Foundation phase. Validate the rendering pipeline, scene architecture, and admin UX locally before any cloud infrastructure is provisioned.*

> **v2.1 Addition:** The original PRD v2.0 assumed AWS infrastructure from day 1. Phase 0 establishes a local development environment with mock services that mirror the production interfaces, enabling rapid iteration on compositions and UI without cloud costs.

### 8.0 What Phase 0 Delivers

| Component | Local Implementation | Production Equivalent |
|-----------|---------------------|----------------------|
| **Database** | `db.ts` — async interface backed by local JSON file | Supabase PostgreSQL |
| **Storage** | `cloud-storage.ts` — writes to `public/uploads/` | AWS S3 + CloudFront |
| **Avatar AI** | `ai-generator.ts` — returns placeholder images | fal.ai / Replicate API |
| **Rendering** | `npx remotion render` (local) | Remotion Lambda |
| **Delivery** | `whatsapp.ts` — console.log mock | WhatsApp Cloud API |
| **Job Queue** | Synchronous API route | AWS SQS + Lambda consumer |

### 8.1 Phase 0 Architecture Rules

1. **All external services are accessed through abstract interfaces** — `db.ts`, `cloud-storage.ts`, `ai-generator.ts`, `whatsapp.ts`. Swapping to production services means changing the implementation, not the callers.
2. **Every mock simulates realistic async delay** — database queries take 200–400ms, uploads take 800ms. This ensures the UI correctly handles loading states.
3. **The composition library is developed and tested entirely locally** — Using `@remotion/player` for preview and `npx remotion render` for output validation.
4. **Types are shared between Next.js and Remotion** — A single `types.ts` file defines all interfaces used by both the web app and video engine.

### 8.2 Phase 0 Completion Checklist

- [x] Next.js app scaffold with App Router
- [x] Admin dashboard with order list, status tracking, render trigger
- [x] Multi-step customer creation form (details → style → scenes → photos → review)
- [x] Preview page with Remotion `<Player>` and download link
- [x] At least 1 complete Remotion composition (Royal Rajasthani)
- [x] VFX components (particles, bokeh, lens flare, transitions)
- [x] Text animation system (fade, rise, zoom, spring, blurFade, typewriter)
- [x] Premium landing page with conversion-focused design
- [x] Mock database, storage, AI, and WhatsApp services
- [ ] 3-layer compositing model refactor (background + avatar slot + text)
- [ ] Zod schema validation for all render props
- [ ] `calculateMetadata` for audio-driven duration

---

## 9. Workflow 1 — Hybrid (Phase 1)

*Immediate goal. Admin operates the pipeline manually per order. All rendering is automated.*

**Launch scope note:** keep the first external launch to Standard + Premium. Treat Luxury as a gated pilot, not a default checkout option.

### 9.1 Admin Flow

1. Admin generates base background video asset using **Nano Banana Pro** or **Veo 3** (one-time per template — not per client).
2. Admin uploads the `.mp4` to the designated S3 bucket under `/templates/{templateId}/background.mp4`.
3. Admin logs into the **Next.js Admin Dashboard**.
4. Admin fills the client details form: Bride Name, Groom Name, Event Date, Venue, Function Type, Audio Track, Template selection, Avatar URLs (if premium).
5. Admin previews the composition live using **Remotion `<Player>`** in the browser — sees the full video before rendering.
6. Admin clicks **"Render"**.

### 9.2 System Action

- Next.js API route pushes a render job to **AWS SQS**.
- Lambda consumer picks the job and triggers **Remotion Lambda** with validated props.
- Remotion composites: cached background + client avatar (if premium) + text from props + Lottie effects + light-leaks overlay + audio.
- Composition duration auto-calculated from audio length via `calculateMetadata`.
- Final `.mp4` uploaded to `/renders/{orderId}/final.mp4` on S3.
- CloudFront CDN URL generated.
- Admin dashboard shows render progress (0%→100% via polling) and download link.
- WhatsApp delivery triggered automatically on render completion.

### 9.3 Phase 1 Remotion Composition Structure

```
<Composition> [calculateMetadata: durationInFrames from audio]
  ├── <Audio src={audioUrl} />                    [audio skill — fade in/out]
  ├── <LightLeaks />                              [light-leaks package]
  │
  ├── <Sequence from={0} durationInFrames={...}>
  │     <Video src={backgroundVideoUrl} />        [videos skill — loop/trim]
  │   </Sequence>
  │
  ├── <Sequence from={30}>                        [sequencing skill]
  │     <LottieOverlay src={functionLottie} />    [lottie skill]
  │   </Sequence>
  │
  ├── <Sequence from={60}>
  │     {tier !== 'standard' && (
  │       <AvatarLayer                            [images skill — slot positioning]
  │         brideUrl={brideAvatarUrl}
  │         groomUrl={groomAvatarUrl}
  │         slots={template.avatarSlots}
  │       />
  │     )}
  │   </Sequence>
  │
  └── <Sequence from={90}>
        <TextRevealScene                          [text-animations skill]
          bride={brideFirstName}
          groom={groomFirstName}
          date={eventDate}
          venue={venueName}
        />
      </Sequence>
```

---

## 10. Workflow 2 — Full Automation (Phase 2)

*Fully automated zero-touch pipeline. Client pays → video delivered. No admin action required for standard and premium orders.*

### 10.1 Client-Facing Flow

1. Client visits the **Next.js storefront**.
2. Client browses template styles by function (haldi, mehandi, sangeet, etc.) and tier (Standard, Premium, Luxury).
3. Client fills the **booking form** — Names, Dates, Venue, Itinerary, preferred Audio Track, and for Premium/Luxury uploads 2–3 face reference photos.
4. Client sees a **watermarked low-res preview** (standard comp render at 480p) before payment — approves or requests adjustment.
5. Client completes payment via **Razorpay / Stripe**.
6. Client receives the final full-quality video via **WhatsApp** and can re-download via **personal client portal** at `/invite/[orderId]`.

### 10.2 System Action (Event-Driven)

```
Payment Success Webhook (Razorpay/Stripe)
              │
              ├─ [Idempotency check] — skip if payment_id already processed
              │
              ▼
      Create order record in Supabase
      Status: PENDING
              │
              ▼
      Push job to AWS SQS queue
      (durable, retryable, rate-limited)
              │
              ▼
      Lambda Consumer picks job
              │
              ├── [If Premium/Luxury] → Call fal.ai PhotoMaker API
              │   Generate 6 Pixar avatar poses from reference photos
              │   → Cache in S3: /avatars/{clientId}/{pose}.png
              │   → Status: AVATAR_READY
              │
              ├── [If Luxury] → Call Kling AI v2
              │   Animate avatar PNG → 5s motion clip
              │   → Cache: /avatars/{clientId}/{pose}-animated.mp4
              │
              ├── [If Luxury] → Call ElevenLabs TTS
              │   Generate personalised voiceover audio
              │   → /renders/{orderId}/voiceover.mp3
              │
              ▼
      Trigger Remotion Lambda
      Pass fully validated InviteProps (Zod schema)
      (Select composition ID — no code generation)
      → Status: RENDERING
              │
              ▼
      Poll Remotion Lambda progress
      On complete: copy to /renders/{orderId}/final.mp4
      → CloudFront CDN URL generated
      → Status: COMPLETE
              │
              ▼
      Send WhatsApp message (Cloud API)
      Template: invite_delivery_v1
      Contains: CDN download link + expiry
              │
              ▼
      Update Supabase: DELIVERED
      Send email confirmation with client portal link
```

### 10.3 AI Agent Role at Runtime (Phase 2)

The AI agent's job at runtime is strictly **selection + validation** — not code generation.

```typescript
// What the agent does at order time — NOT code generation
const agentTask = async (clientForm: BookingFormData): Promise<RenderJob> => {
  // 1. Select the best composition for this client's style and function
  const templateId = await selectTemplate(clientForm.style, clientForm.functionType);

  // 2. Fill Zod-validated props — ALL THAT CHANGES PER ORDER
  const props: InviteProps = InvitePropsSchema.parse({
    brideFirstName: clientForm.brideName,
    groomFirstName: clientForm.groomName,
    eventDate: clientForm.date,
    venueName: clientForm.venue,
    audioUrl: clientForm.selectedAudioTrack,
    backgroundVideoUrl: templates[templateId].backgroundUrl,
    templateId,
    functionType: clientForm.functionType,
    tier: clientForm.tier,
    // ... other props
  });

  return { compositionId: templateId, props };
};
// No React code written. No Remotion JSX generated. Pure data.
```

---

## 11. Functional Requirements

### 11.1 Next.js Admin Dashboard

| Feature | Description |
|---------|-------------|
| **Template Manager** | Register, preview, enable/disable Remotion composition IDs and their metadata JSON |
| **Template Builder (v2.1)** | Admin UI for positioning avatar slots and text slots visually on a template background — outputs `metadata.json` with slot coordinates. Eliminates manual coordinate guessing. |
| **Client Form** | Dynamic fields: Names, Date, Venue, Function Type, Tier, Audio Track picker, Avatar upload |
| **Live Player** | `@remotion/player` embedded — real-time preview in browser before cloud render |
| **Render Status** | Polling display: PENDING → AVATAR\_QA → AVATAR\_READY → RENDERING → COMPLETE → DELIVERED |
| **Avatar QA (v2.1)** | For Premium/Luxury orders: side-by-side view of generated avatars vs reference photos. Admin approve/reject/regenerate. |
| **Thumbnail Preview** | Auto-generated thumbnail from `renderStill()` at the template's `thumbnailFrame` — used for storefront gallery and WhatsApp preview |
| **Error Log** | Sentry-integrated error display, failed job retry button |
| **Asset Manager** | Browse S3 template backgrounds, Lottie files, audio tracks, cached avatars |
| **Order History** | List all orders with status, client name, render duration, delivery confirmation |

### 11.2 Client Storefront (Phase 2)

| Feature | Description |
|---------|-------------|
| **Template Gallery** | Browse by function type and tier; preview video loops for each template |
| **Booking Form** | Multi-step: style → details → photo upload → audio selection → review → payment |
| **Watermarked Preview** | Low-res render shown before payment for client approval |
| **Payment Gateway** | Razorpay (India primary) + Stripe (international) |
| **Client Portal** | `/invite/[orderId]` — protected by email OTP, shows all rendered videos with download |
| **Revision Request** | One free revision within 48 hours — name correction, date change — triggers re-render |

### 11.3 Remotion Composition Library

| Requirement | Detail |
|-------------|--------|
| **Minimum compositions** | 2 styles × 5 functions = 10 compositions for Phase 1 launch |
| **Target library size** | 4 styles × 5 functions = 20 compositions by Phase 2 launch |
| **Typography components** | Reusable: `<SpringName>`, `<TypewriterCaption>`, `<FadeVenue>`, `<DateReveal>` |
| **Effect components** | Reusable: `<LottieParticles>`, `<LightLeakOverlay>`, `<AvatarSlot>`, `<AudioPulse>` |
| **Itinerary component** | `<AnimatedItinerary events={itinerary} />` — staggered animated event list |
| **Prop validation** | All compositions have Zod schema; validation happens before Lambda is called |
| **Duration** | Dynamic via `calculateMetadata` — always matches audio length |
| **Text overflow protection** | `measuring-text` skill used — long names auto-scale to fit slot |

### 11.4 Audio System

| Feature | Detail |
|---------|--------|
| **Audio library** | 15–20 curated tracks per function type, stored in S3 |
| **Duration sync** | `get-audio-duration` + `calculateMetadata` — video always matches track length |
| **Fade handling** | 1s fade-in, 2s fade-out using `audio` skill volume interpolation |
| **Voiceover (Luxury)** | ElevenLabs TTS, ducked under music at -8dB, synced to text reveals |
| **Client-provided audio** | Upload accepted, silence-detected and trimmed before use |

---

## 12. Infrastructure & Storage

### S3 Bucket Structure

```
s3://digitalinvites-assets/
  ├── templates/
  │   ├── {templateId}/
  │   │   ├── background.mp4          # Veo 3 / Remotion 3D pre-rendered
  │   │   ├── metadata.json           # Avatar slots, text slots, theme config
  │   │   └── thumbnail.jpg           # Storefront preview image
  │   └── ...
  ├── lottie/
  │   ├── haldi-particles.json
  │   ├── mehandi-mandala.json
  │   ├── sangeet-sparkles.json
  │   └── wedding-petals.json
  ├── audio/
  │   ├── haldi/                      # Function-specific track sets
  │   ├── mehandi/
  │   ├── sangeet/
  │   └── wedding/
  ├── avatars/
  │   └── {clientId}/
  │       ├── bride-haldi.png
  │       ├── bride-sangeet.png
  │       ├── groom-haldi.png
  │       ├── ... (6 poses × 2 = 12 PNGs)
  │       └── animated/               # Luxury tier animated clips
  └── renders/
      └── {orderId}/
          ├── preview-watermarked.mp4
          ├── final.mp4
          ├── thumbnail.jpg              # Auto-generated via renderStill()
          └── voiceover.mp3           # Luxury tier
```

### S3 Lifecycle Policies (Cost Optimisation)

| Path | Action | After |
|------|--------|-------|
| `renders/*/final.mp4` | Move to S3 Glacier Instant Retrieval | 30 days |
| `renders/*/preview-watermarked.mp4` | Delete | 7 days |
| `renders/*/voiceover.mp3` | Delete | 30 days |
| `avatars/**` | Keep in S3 Standard | Indefinitely (client reorders) |
| `templates/**` | Keep in S3 Standard | Indefinitely |

### CloudFront CDN

- All asset URLs served via CloudFront (not raw S3 links)
- Cache-Control headers set on rendered videos: `max-age=2592000` (30 days)
- Saves ~60–70% on S3 egress bandwidth cost vs direct S3 links
- WhatsApp and email delivery use CDN URLs, not S3 URLs

> **⚠️ v2.1 Note — URL Expiry:**  
> The v2.0 PRD specified 7-day signed URL expiry. This is too aggressive — couples share invites 2–4 weeks before the event, and guests who click the link later would get a broken page. **Use 30-day expiry** for signed CDN URLs. Admin can regenerate expired links on request.

### Remotion Lambda Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| Memory | 1769MB (profile first) | Half of max; cuts cost ~40% if render time stable |
| Timeout | 300s | Headroom for long compositions |
| Region | ap-south-1 (Mumbai) | Lowest latency for Indian client base |
| Concurrency | 20 (Phase 1), 100 (Phase 2) | Scale with order volume |
| Warmup | EventBridge ping every 5 min (8am–10pm IST) | Avoid cold-start latency during business hours |

### Database Schema (Supabase)

```sql
-- Core tables

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  email TEXT,
  avatar_cache_path TEXT,          -- S3 path to avatar folder
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id),
  payment_id TEXT UNIQUE NOT NULL, -- idempotency key
  tier TEXT NOT NULL,
  function_type TEXT NOT NULL,
  template_id TEXT NOT NULL,
  props JSONB NOT NULL,            -- full InviteProps snapshot
  status TEXT DEFAULT 'PENDING',   -- PENDING|AVATAR_QA|AVATAR_READY|RENDERING|COMPLETE|DELIVERED|FAILED
  render_url TEXT,
  thumbnail_url TEXT,               -- v2.1: auto-generated video thumbnail
  portal_token TEXT UNIQUE,        -- for /invite/[orderId] auth
  created_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ
);

CREATE TABLE render_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  remotion_render_id TEXT,
  progress INT DEFAULT 0,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

---

## 13. Template Library Specification

### Phase 1 Launch — 10 Compositions (long-term target)

> **Launch recommendation:** start with 4 templates only — haldi-floral, mehandi-traditional, sangeet-grand, and wedding-royal. Keep the remaining templates as expansion inventory after the first 30–50 paid orders.

| Template ID | Function | Style | Background Source | Key Remotion Features |
|-------------|----------|-------|-------------------|----------------------|
| `haldi-floral` | Haldi | Floral / Yellow | Remotion 3D (marigolds) | Lottie turmeric particles, spring name, light leaks |
| `haldi-modern` | Haldi | Modern / Minimal | Gradient + Remotion shapes | Typewriter text, geometric transitions |
| `mehandi-traditional` | Mehandi | Green / Mandala | Remotion 3D (mandala) | Lottie mandala patterns, calligraphy fonts |
| `mehandi-pastel` | Mehandi | Pastel / Boho | Watercolour static + Lottie | Stagger text reveal, floral Lottie |
| `sangeet-grand` | Sangeet | Stage / Gold | Veo 3 (stage with lights) | Audio-visualization bass pulse, sparkle Lottie |
| `sangeet-neon` | Sangeet | Neon / Party | Remotion 3D (particles) | Audio-visualization spectrum bars, SFX |
| `wedding-royal` | Wedding | Royal / Maroon | Veo 3 (palace exterior) | Voiceover-ready, animated itinerary, light leaks |
| `wedding-divine` | Wedding | Temple / Gold | Remotion 3D (mandala 3D) | Three.js rotating geometry, typewriter shloka |
| `reception-luxury` | Reception | Ballroom / Silver | Veo 3 (ballroom) | Champagne Lottie, animated itinerary |
| `reception-garden` | Reception | Garden / Pastel | Remotion 3D (garden) | Flower shower transparent video, spring text |

### Template Development Checklist (Per Composition)

- [ ] Background asset created (Remotion 3D or Veo 3) and uploaded to S3
- [ ] `metadata.json` written with avatar slot coordinates and text slot positions
- [ ] Zod schema applied — all props typed and validated
- [ ] `calculateMetadata` implemented — duration from audio length
- [ ] Light-leaks overlay applied
- [ ] Lottie animation selected from LottieFiles, licensed, integrated
- [ ] Text overflow tested with maximum-length Indian names (30+ chars)
- [ ] Avatar slot tested at both Standard (no avatar) and Premium (with PNG) configs
- [ ] Audio fade-in / fade-out tested with 3 different track lengths
- [ ] Remotion `<Player>` preview confirmed in admin dashboard
- [ ] Lambda render tested — output quality and duration verified
- [ ] Mobile aspect ratio (9:16) render tested alongside 16:9

---

## 14. Cost Analysis & Optimisation

### 14.0 Stack simplification recommendations

The current AWS + Remotion core is sound. Keep the render path simple and only swap components when a real cost or reliability problem appears.

- Keep **Remotion Lambda** for final renders; it is designed for scalable serverless rendering and pay-only-when-rendering usage.
- Keep **S3 lifecycle rules** for renders and previews; transition or expire objects automatically instead of managing storage manually.
- Keep **CloudFront signed URLs** for private delivery of paid invites.
- Consider **Cloudflare R2** only if storage egress becomes a material cost driver, because it advertises zero egress fees. That swap adds operational complexity, so it is a “later” optimization, not a launch requirement.
- Consolidate external AI vendors where possible. The biggest savings will come from using fewer vendors, fewer model calls, and fewer retries.

### Per-Video Cost Breakdown (Revised)

| Cost Item | Phase 1 | Phase 2 Standard | Phase 2 Premium | Phase 2 Luxury |
|-----------|---------|-----------------|----------------|----------------|
| AI background gen | $0 (pre-built) | $0 (cached) | $0 (cached) | $0 (cached) |
| Avatar generation | N/A | N/A | $0.02–$0.06 (÷ videos) | $0.03–$0.08 (÷ videos) |
| ElevenLabs voiceover | $0 | $0 | $0 | $0.02–$0.05 |
| Remotion Lambda render | $0.008–$0.015 | $0.008–$0.015 | $0.010–$0.018 | $0.012–$0.020 |
| S3 storage + CDN | $0.003 | $0.003 | $0.003 | $0.004 |
| WhatsApp delivery | $0.005 | $0.005 | $0.005 | $0.005 |
| SQS + misc. infra | $0.001 | $0.001 | $0.001 | $0.001 |
| **Total per video** | **~$0.017** | **~$0.017** | **~$0.04–0.09** | **~$0.07–0.13** |

> **Note:** Avatar cost is amortised across all function videos for the same client. A 5-function package means avatar gen cost is divided by 5 per video.

### The $0.05 Target

The original PRD's $0.05/video target is now achievable across Standard and Premium tiers. Luxury tier sits at $0.07–$0.13 — justified by a premium price point of ₹5000+ per package vs ₹1000–2000 for Standard.

### Template Creation Cost (One-Time, Not Per Order)

| Asset | Tool | One-Time Cost | Videos Served |
|-------|------|---------------|---------------|
| Photorealistic background (Veo 3) | Google Veo 3 | ~$3–8 per template | Unlimited |
| Motion-graphic background | Remotion 3D (Three.js) | Dev time only | Unlimited |
| Lottie animations | LottieFiles.com | $0–$20/license | Unlimited |
| Premium audio tracks | Artlist / Epidemic Sound | $200/year subscription | All templates |

### Cost Optimisation Checklist

- [x] **Cached templates** — AI generation done once, reused for all clients
- [x] **Cached avatars** — generated once per client, reused across all function videos
- [x] **Remotion-native motion graphics** — Three.js + Lottie replaces Veo 3 for 70% of templates
- [x] **CloudFront CDN** — 60–70% reduction in S3 egress cost
- [x] **Lambda memory profiling** — 1769MB default, profile to find minimum viable memory
- [x] **S3 lifecycle** — rendered videos archived to Glacier after 30 days (83% storage cost reduction)
- [x] **Lambda warmup** — avoid cold-start latency, EventBridge ping every 5 min in business hours
- [x] **Lambda region** — ap-south-1 (Mumbai) for lowest latency to primary Indian client base

---

## 15. Security & Reliability

### Payment Idempotency

```typescript
// In the payment webhook handler
const existing = await supabase
  .from('orders')
  .select('id')
  .eq('payment_id', event.paymentId)
  .single();

if (existing.data) {
  return Response.json({ status: 'already_processed' }, { status: 200 });
}
// Only proceed if this payment_id has not been seen before
```

### Job Queue Durability (SQS)

- Payment webhook pushes to SQS (does not call Lambda directly)
- SQS message retention: 14 days
- Dead-letter queue (DLQ) captures jobs that fail after 3 retries
- Admin alerted via SNS when jobs land in DLQ
- All failed renders logged to Supabase `render_jobs` table with error detail

### Prop Validation — No Code Execution at Runtime

- All InviteProps passed through Zod schema before Lambda invocation
- Remotion compositions are pre-compiled static bundles — no dynamic code is written or executed per order
- Lambda IAM role scoped to: S3 read (templates, avatars) + S3 write (renders/) only

### Error Handling

| Failure Point | Detection | Response |
|--------------|-----------|----------|
| Avatar generation fails (fal.ai) | HTTP 4xx/5xx | Retry once; fallback to no-avatar render; alert admin |
| Avatar QA fails (v2.1) | Admin rejects generated avatar | Regenerate with different seed; after 2 fails, downgrade to Standard tier |
| Remotion Lambda render fails | Error callback | Retry once via SQS; alert admin; refund if 2nd fails |
| WhatsApp delivery fails | HTTP error from Meta API | Fallback to email delivery with CDN link |
| Payment webhook duplicate | Idempotency check | Silently skip; return 200 |
| Audio URL unreachable | Pre-render asset check | Fall back to default audio track for function type |
| Thumbnail generation fails | renderStill() error | Use first frame as fallback thumbnail; log to Sentry |

### Monitoring Stack

| Tool | Purpose |
|------|---------|
| **Sentry** | Error tracking across Next.js API routes and Lambda consumer |
| **AWS CloudWatch** | Lambda logs, SQS queue depth, DLQ alarm |
| **Supabase dashboard** | Order status monitoring, delivery confirmation rates |
| **Custom admin dashboard** | Real-time render queue and status overview |

### Client Portal Security

- Portal at `/invite/[orderId]` requires email OTP verification before revealing download link
- OTP valid for 10 minutes; rate limited to 3 attempts per hour per email
- CDN URLs are signed (CloudFront signed URLs) with **30-day expiry** (v2.1: extended from 7 days — couples share invites 2–4 weeks before the event); admin can regenerate

---

## 16. Analytics & Conversion Tracking

> **v2.1 Addition:** The original PRD did not include any analytics or A/B testing strategy. For a product aiming at scale, understanding which templates convert best and where the funnel drops off is critical.

### 16.1 Funnel Tracking

| Stage | Event Name | Where Tracked |
|-------|-----------|---------------|
| Landing page visit | `page_view` | Google Analytics / Plausible |
| Template gallery browse | `template_viewed` | Custom event with `templateId`, `functionType` |
| Booking form started | `form_started` | Custom event with `tier` |
| Booking form step N completed | `form_step_completed` | Custom event with step index |
| Preview rendered | `preview_rendered` | Supabase + custom event |
| Payment initiated | `payment_initiated` | Razorpay/Stripe event |
| Payment completed | `payment_completed` | Webhook confirmation |
| Video delivered | `video_delivered` | Supabase status change |
| Client portal re-download | `portal_download` | CloudFront access logs |

### 16.2 Template Performance Dashboard

| Metric | Purpose |
|--------|---------|
| **Conversion rate per template** | Which templates actually drive purchases (gallery view → payment) |
| **Template popularity ranking** | Inform which styles to expand first |
| **Drop-off funnel by tier** | Understand if Luxury pricing causes abandonment |
| **Average time to delivery** | Track render performance over time |
| **Revision rate per template** | Identify templates that frequently need corrections |

### 16.3 A/B Testing Strategy (Phase 2+)

- **Landing page CTA variants** — Test "Start Creating Free" vs "Create Your Invite" vs "See Templates"
- **Pricing display** — Test showing per-video price vs per-package price
- **Template gallery order** — Test popularity-sorted vs curated-sorted vs newest-first
- **Preview gate** — Test watermarked preview before payment vs payment first

---

## 17. Missing Pieces from v1 — All Addressed

| v1 Gap | v2 Solution |
|--------|-------------|
| No database | Supabase PostgreSQL — orders, clients, render jobs, avatars |
| No job queue | AWS SQS between payment webhook and Lambda consumer |
| No watermarked preview | Low-res watermarked render shown before payment |
| No revision workflow | One free revision within 48h — prop change + re-render, same composition |
| No client portal | `/invite/[orderId]` — email-OTP protected, permanent download link |
| No error handling | Sentry + SNS + DLQ + retry logic at every failure point |
| No payment idempotency | payment_id unique check before processing any job |
| No CDN | CloudFront in front of all S3 assets |
| No S3 lifecycle | Glacier archive at 30 days for rendered videos |
| WhatsApp template restriction | Pre-approved message template + post-payment opt-in collection |
| Lambda cold start | EventBridge warmup ping every 5 min during business hours |
| Veo 3 timing vs 10-min SLA | Veo 3 used only for template creation; runtime is sub-2-min |
| No local dev story (v2.1) | Phase 0 with mock services mirroring production interfaces |
| No avatar QA (v2.1) | Admin QA gate for Premium/Luxury avatars before rendering |
| No thumbnails (v2.1) | Auto-generated via `renderStill()` at template's `thumbnailFrame` |
| No analytics (v2.1) | Full funnel tracking + template performance dashboard |
| CDN links expire too fast (v2.1) | Extended from 7-day to 30-day signed URL expiry |

---

## 18. Success Metrics

| Metric | Target | How Measured |
|--------|--------|--------------|
| Render time — Standard/Premium | < 90 seconds | Supabase: `completed_at - started_at` |
| Render time — Luxury | < 10 minutes | Supabase: includes avatar generation |
| Cost per video — Standard | < $0.025 | Monthly AWS + fal.ai bill ÷ orders |
| Cost per video — Premium | < $0.10 | Monthly cost ÷ orders by tier |
| Delivery success rate | > 99% | Orders with status DELIVERED ÷ total |
| Revision rate | < 15% | Orders with revisions ÷ total |
| Text overflow / clipping errors | 0% | QA checklist before template activation |
| Lambda cold-start rate | < 5% during business hours | CloudWatch Lambda init duration metric |
| Client portal re-download rate | Tracked | CloudFront access logs per orderId |
| Landing page → form conversion | > 5% (v2.1) | Analytics funnel tracking |
| Form → payment conversion | > 40% (v2.1) | Analytics funnel tracking |
| Avatar QA pass rate | > 80% (v2.1) | Supabase: approved avatars ÷ generated |

---

## 19. Development Roadmap

### Phase 0 — Local Development & Prototyping (Weeks 0–2) ✅ COMPLETE

| Week | Milestone | Status |
|------|-----------|--------|
| 0–1 | Next.js scaffold, Remotion integration, types system, mock services | ✅ Done |
| 0–1 | Admin dashboard with order list, render trigger, status tracking | ✅ Done |
| 1–2 | Multi-step customer creation form and preview page | ✅ Done |
| 1–2 | First Remotion composition (Royal Rajasthani) with VFX suite | ✅ Done |
| 2 | Premium landing page with framer-motion, glassmorphism | ✅ Done |
| 2 | 3-layer compositing refactor + Zod schema + `calculateMetadata` | 🔲 Pending |

### Phase 1 — Hybrid (Weeks 3–10)

| Week | Milestone |
|------|-----------|
| 3–4 | **3-layer compositing refactor** — Restructure all scenes to separate background template + avatar slot + text props |
| 4–5 | Set up Supabase (real DB) + AWS S3 + CloudFront CDN |
| 5–6 | Build first 4 Remotion compositions using `remotion-best-practices` skill (haldi-floral, mehandi-traditional, sangeet-grand, wedding-royal) |
| 6–7 | Implement `calculateMetadata` audio sync, `@remotion/light-leaks`, Lottie integrations |
| 7–8 | Remotion Lambda setup + SQS queue + Lambda consumer + render status polling |
| 8–9 | WhatsApp Cloud API delivery + Sentry monitoring + DLQ alerting |
| 9–10 | Template Builder admin UI + QA all 4 compositions with full client data; launch Phase 1 |

### Phase 1.5 — Avatar Architecture Evaluation (after first 30–50 paid orders) ⚗️

> Run this in parallel with early Phase 2 work. It does not block Phase 2 delivery.

| Step | Action |
|------|--------|
| 1 | Build 3 GLB templates: `haldi-glb`, `save-the-date-glb`, `baraat-entry-glb` using Avaturn + React Three Fiber |
| 2 | Set up Avaturn API integration — generate GLB for 5 test clients |
| 3 | Collect face similarity blind ratings from internal team |
| 4 | A/B test: show 20 real paying customers both PNG and GLB versions of the same invite |
| 5 | Measure all 5 decision-gate metrics (§6.5) |
| **Decision** | If ALL thresholds pass → adopt GLB as the Premium/Luxury default. Otherwise → stay on PNG, reassess in Phase 3. |

### Phase 2 — Full Automation (Weeks 11–20)

| Week | Milestone |
|------|-----------|
| 11–12 | Client storefront — template gallery with thumbnails + multi-step booking form |
| 12–13 | Payment integration (Razorpay) + webhook + idempotency |
| 13–14 | Avatar generation pipeline — fal.ai PhotoMaker + S3 caching + Avatar QA gate |
| 14–15 | Watermarked preview render + client approval gate |
| 15–16 | Client portal + email OTP + CloudFront 30-day signed URLs |
| 16–17 | Remaining 6 compositions (complete 10-template library) |
| 17–18 | Luxury tier — Kling animation + ElevenLabs voiceover integration |
| 18–19 | Analytics & conversion tracking setup (funnel events + template dashboard) |
| 19–20 | Load testing (50 concurrent orders), Lambda concurrency tuning; soft launch |

### Phase 3 — Scale & Intelligence (Month 6+)

- Build remaining 10 templates (4 styles × 5 functions = 20 total)
- Self-service template builder for admin using Claude Code + Remotion skills
- Automated AI photo culling integration (Aftershoot API)
- Multi-language support (Hindi, Tamil, Telugu text rendering in Remotion)
- Video reels / short format (9:16 Instagram reel version auto-rendered alongside 16:9)
- Client referral portal + package upsell flows
- A/B testing framework for landing page and pricing experiments

---


## 20. Suggested Future Invitation Formats

These are good follow-on template families once the 4-template launch set is stable:

- **Save-the-date teaser** — 10–15 second short video for WhatsApp/Instagram.
- **RSVP reminder** — lightweight reminder invite sent 7–10 days before the event.
- **Reception-only luxury cut** — slower, more cinematic version for family sharing.
- **Haldi/Mehandi combo invite** — one combined pre-wedding flow for families that bundle ceremonies.
- **Thank-you / after-event reel** — post-wedding appreciation video using the same compositing engine.
- **Multi-language version** — Hindi + English, later Tamil/Telugu support as a growth lever.


*End of PRD v2.3 — @digitalinvites.ai*  
*All cost estimates as of June 2026. AI API pricing subject to change.*  
*v2.3 changes: Merged v2.3 Addendum — Added §6.5 GLB/Avaturn alternative avatar architecture as a Phase 1.5 research gate; extended `InvitePropsSchema` with `avatarType` and `avatarAssetUrl`; added Phase 1.5 evaluation roadmap block; added GLB-specific template ideas. The v2.3 Addendum file is now archived.*
