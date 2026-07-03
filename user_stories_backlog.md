# Digital Invites AI — User Stories Backlog
### Derived from PRD v2.3 | Status: Draft for Review

> **Priority Legend**
> - **P0** — Must-have for Phase 1 launch (blocks revenue)
> - **P1** — Required for Phase 1 completeness (degrades experience if missing)
> - **P2** — Phase 2 / Full Automation
> - **P3** — Phase 3 / Scale & Future

> **Status Legend**
> - ✅ Done — Implemented and verified
> - 🔲 Not Started
> - 🟡 Partial — Some implementation exists

---

## Epic 1: 3-Layer Compositing Model

*PRD §5 — Every video is built from three independent cached layers composed at render time.*

---

### US-1.1 — Template Slot System
**Priority: P0** · **Points: 8** · **Status: 🔲**

> **As an** admin,
> **I want** each background template to define named avatar slots and text slots with precise coordinates in a `metadata.json` file,
> **so that** any client can be placed into any template without hard-coding positions.

**Acceptance Criteria:**
- [ ] A `TemplateMetadataSchema` (Zod) is defined matching PRD §5 — includes `avatarSlots` (bride/groom with x, y, width, height, anchorBottom) and `textSlots` (primaryName, secondaryName, date, venue, ceremonyTitle with x, y, maxWidth, fontFamily)
- [ ] Every registered template has a valid `metadata.json` in `/public/templates/{templateId}/` or S3 equivalent
- [ ] Remotion compositions read slot coordinates from the metadata at render time — positions are never hardcoded in JSX
- [ ] Zod validation runs at template registration time; invalid metadata is rejected with a descriptive error
- [ ] `visualIdentity` optional field is present in schema (dominantPalette, keyMotif, moodKeywords)

**Dependencies:** None
**PRD Ref:** §5 — Template Slot System, lines 213–255

---

### US-1.2 — Background Layer Separation
**Priority: P0** · **Points: 5** · **Status: 🟡**

> **As a** developer,
> **I want** background scenes (Remotion 3D gradients, Veo 3 clips, static art) to be stored as independent cached assets — completely separate from avatar and text layers,
> **so that** backgrounds can be reused across all clients at zero per-order generation cost.

**Acceptance Criteria:**
- [ ] Background asset (video, image, or Remotion 3D component) is stored in `/templates/{templateId}/background.mp4` (or rendered inline via React component)
- [ ] No client-specific data (names, dates, photos) is baked into the background layer
- [ ] Background loops or trims to match composition duration via `calculateMetadata`
- [ ] Switching a background template for an order requires only changing the `templateId` prop — no code changes

**Dependencies:** US-1.1
**PRD Ref:** §5 — Layer 1, §2 — Rule 1

---

### US-1.3 — Avatar Layer Compositing
**Priority: P1** · **Points: 5** · **Status: 🔲**

> **As a** developer,
> **I want** a reusable `<AvatarSlot>` component that reads slot coordinates from template metadata and positions the client's avatar PNG at the correct location,
> **so that** Premium/Luxury orders display personalised Pixar-style avatars overlaid on any background.

**Acceptance Criteria:**
- [ ] `<AvatarSlot>` component accepts `brideUrl`, `groomUrl`, and `slots` (from metadata.json)
- [ ] Avatar renders as a transparent PNG overlay positioned at the slot coordinates
- [ ] Standard tier orders render correctly with no avatar (component gracefully hides)
- [ ] Avatar image loads from S3/CDN URL — not from local filesystem
- [ ] Avatar aspect ratio is maintained; images are never distorted

**Dependencies:** US-1.1, US-6.1 (Avatar Generation)
**PRD Ref:** §5 — Layer 2, §9.3 composition structure

---

### US-1.4 — Text Layer with InviteProps
**Priority: P0** · **Points: 5** · **Status: 🟡**

> **As a** developer,
> **I want** all client-specific text (names, date, venue, ceremony) to be rendered as a pure React props layer using spring-animated typography,
> **so that** text is never baked into backgrounds and can be changed by updating props alone.

**Acceptance Criteria:**
- [ ] `InvitePropsSchema` (Zod) is defined matching PRD §7 — all fields typed and validated
- [ ] Text components (`<SpringName>`, `<TypewriterCaption>`, `<FadeVenue>`, `<DateReveal>`) are reusable across templates
- [ ] Long names (30+ characters, e.g. "Venkatasubramaniam") auto-scale using `measuring-text` skill — no overflow or clipping
- [ ] Zod validation runs before any render is triggered; invalid props return a descriptive error to the admin
- [ ] Text positioning reads from `metadata.json` textSlots — not hardcoded

**Dependencies:** US-1.1
**PRD Ref:** §5 — Layer 3, §7 — InvitePropsSchema, §11.3

---

## Epic 2: Infrastructure & Storage

*PRD §8, §12 — Move from local mock services to production cloud infrastructure.*

---

### US-2.1 — Supabase Database Migration
**Priority: P0** · **Points: 8** · **Status: 🔲**

> **As an** admin,
> **I want** orders, clients, and render jobs stored in a real Supabase PostgreSQL database instead of local JSON files,
> **so that** data persists reliably, supports concurrent access, and scales with order volume.

**Acceptance Criteria:**
- [ ] `clients`, `orders`, and `render_jobs` tables created in Supabase matching PRD §12 schema
- [ ] `db.ts` abstract interface swapped from local JSON to Supabase client — no changes in caller code
- [ ] Payment idempotency enforced via `payment_id UNIQUE` constraint on `orders` table
- [ ] Order status transitions tracked: `PENDING → AVATAR_QA → AVATAR_READY → RENDERING → COMPLETE → DELIVERED → FAILED`
- [ ] `portal_token` field generates a unique token per order for client portal auth
- [ ] All existing test orders migrate successfully or DB starts clean with a seed script
- [ ] `render_jobs` table logs `remotion_render_id`, `progress`, `error`, `started_at`, `completed_at`

**Dependencies:** None
**PRD Ref:** §12 — Database Schema

---

### US-2.2 — AWS S3 + CloudFront Storage
**Priority: P0** · **Points: 8** · **Status: 🔲**

> **As an** admin,
> **I want** all assets (templates, avatars, renders, audio, Lottie) stored in AWS S3 with CloudFront CDN delivery,
> **so that** videos load fast for Indian clients and storage costs are optimised.

**Acceptance Criteria:**
- [ ] S3 bucket `digitalinvites-assets` created with folder structure matching PRD §12: `templates/`, `lottie/`, `audio/`, `avatars/`, `renders/`
- [ ] `cloud-storage.ts` abstract interface swapped from local `public/uploads/` to S3 — no changes in caller code
- [ ] CloudFront distribution configured in front of S3 bucket
- [ ] All asset URLs served via CloudFront (not raw S3 links)
- [ ] Cache-Control headers on rendered videos: `max-age=2592000` (30 days)
- [ ] S3 lifecycle policies active: `renders/*/final.mp4` → Glacier after 30 days; `renders/*/preview-watermarked.mp4` → delete after 7 days
- [ ] CloudFront signed URLs with 30-day expiry for rendered videos (not 7-day)

**Dependencies:** None
**PRD Ref:** §12 — S3 Bucket Structure, CloudFront CDN, S3 Lifecycle Policies

---

### US-2.3 — Abstract Service Interfaces
**Priority: P0** · **Points: 3** · **Status: ✅**

> **As a** developer,
> **I want** all external services accessed through abstract interfaces (`db.ts`, `cloud-storage.ts`, `ai-generator.ts`, `whatsapp.ts`),
> **so that** swapping from local mocks to production services means changing the implementation, not the callers.

**Acceptance Criteria:**
- [x] `db.ts` exposes async CRUD operations for orders — implementation-agnostic
- [x] `cloud-storage.ts` exposes upload/download/URL-generation — works with local and S3
- [x] `ai-generator.ts` exposes avatar generation with mock delay
- [x] `whatsapp.ts` exposes message delivery with mock console.log
- [x] All mocks simulate realistic async delay (200–800ms)

**Dependencies:** None
**PRD Ref:** §8.1 — Phase 0 Architecture Rules

---

## Epic 3: Render Pipeline

*PRD §8, §9, §10 — The core video rendering system from local to Lambda.*

---

### US-3.1 — Remotion Lambda Setup
**Priority: P0** · **Points: 8** · **Status: 🔲**

> **As an** admin,
> **I want** video rendering to happen on Remotion Lambda (AWS) instead of local `npx remotion render`,
> **so that** rendering is fast, scalable, and doesn't block my local machine.

**Acceptance Criteria:**
- [ ] Remotion Lambda function deployed in `ap-south-1` (Mumbai) region
- [ ] Memory configured at 1769MB with 300s timeout
- [ ] API route `/api/render` triggers Remotion Lambda (not local CLI) when env is production
- [ ] Render progress polled and displayed in admin dashboard (0→100%)
- [ ] Final `.mp4` uploaded to S3 `/renders/{orderId}/final.mp4`
- [ ] CloudFront CDN URL generated and stored in order record
- [ ] Local render mode preserved for development via environment flag

**Dependencies:** US-2.2
**PRD Ref:** §12 — Remotion Lambda Configuration

---

### US-3.2 — SQS Job Queue
**Priority: P0** · **Points: 5** · **Status: 🔲**

> **As a** system,
> **I want** render jobs pushed to an AWS SQS queue rather than invoking Lambda directly from webhooks or API routes,
> **so that** jobs are durable, retryable, and rate-limited even if Lambda is temporarily unavailable.

**Acceptance Criteria:**
- [ ] SQS queue created with 14-day message retention
- [ ] Dead-letter queue (DLQ) captures jobs that fail after 3 retries
- [ ] Admin receives SNS notification when jobs land in DLQ
- [ ] Lambda consumer picks jobs from SQS and triggers Remotion render
- [ ] Failed renders logged to `render_jobs` table with error detail
- [ ] Duplicate jobs rejected via idempotency check on `orderId`

**Dependencies:** US-2.1, US-3.1
**PRD Ref:** §9.2, §15 — Job Queue Durability

---

### US-3.3 — calculateMetadata Audio Sync
**Priority: P0** · **Points: 5** · **Status: 🔲**

> **As a** developer,
> **I want** the composition duration to be automatically calculated from the selected audio track's length using `calculateMetadata`,
> **so that** every video matches its music exactly — no awkward silence or abrupt cuts.

**Acceptance Criteria:**
- [ ] `calculateMetadata` implemented on all compositions — reads audio URL, fetches duration, sets `durationInFrames`
- [ ] `get-audio-duration` utility fetches audio file duration before render
- [ ] Audio has 1s fade-in at start and 2s fade-out at end (volume interpolation)
- [ ] Composition works correctly with audio tracks of different lengths (15s–90s tested)
- [ ] If audio URL is unreachable, falls back to a default track for the function type

**Dependencies:** None
**PRD Ref:** §7, §11.4 — Audio System

---

### US-3.4 — Thumbnail Auto-Generation
**Priority: P1** · **Points: 3** · **Status: 🔲**

> **As an** admin,
> **I want** a video thumbnail auto-generated from `renderStill()` at each template's `thumbnailFrame`,
> **so that** the storefront gallery, WhatsApp preview, and admin dashboard show visual previews without manual screenshots.

**Acceptance Criteria:**
- [ ] `renderStill()` invoked after each successful render at the template's configured `thumbnailFrame`
- [ ] Thumbnail saved to `/renders/{orderId}/thumbnail.jpg` in S3
- [ ] `thumbnail_url` stored in the order record in Supabase
- [ ] Admin dashboard and preview page display the thumbnail
- [ ] If `renderStill()` fails, first frame is used as fallback; error logged to Sentry

**Dependencies:** US-3.1
**PRD Ref:** §11.1, §15 — Error Handling

---

## Epic 4: Template Library

*PRD §13 — Build the 4-template launch set + expansion compositions.*

---

### US-4.1 — 4 Launch Templates Built
**Priority: P0** · **Points: 13** · **Status: ✅**

> **As an** admin,
> **I want** 4 complete Remotion compositions ready for production: `royal-rajasthani` (wedding), `haldi-floral` (haldi), `mehandi-traditional` (mehandi), `sangeet-grand` (sangeet),
> **so that** Phase 1 launch has a viable template set covering the 4 most-requested ceremony types.

**Acceptance Criteria:**
- [x] 4 compositions registered in `src/remotion/Root.tsx`
- [x] Each composition has: background scene, VFX (particles/bokeh), text animations, proper scene sequencing
- [x] `TEMPLATE_CONFIGS` registry in `types.ts` maps each composition to its metadata
- [x] Each template renders at 1080×1920 (9:16 portrait) at 30fps
- [x] Template picker in `/create` page shows all 4 with palette, description, and scene count
- [x] Admin dashboard shows template breakdown counts per composition
- [x] Live `@remotion/player` preview works on `/preview/[orderId]` for all 4 compositions

**Dependencies:** None
**PRD Ref:** §13 — Phase 1 Launch

---

### US-4.2 — Template Development Checklist (Per Template)
**Priority: P0** · **Points: 5 per template** · **Status: 🟡**

> **As a** developer,
> **I want** each template to pass a full quality checklist before activation,
> **so that** no template goes live with broken text overflow, missing effects, or misconfigured audio.

**Acceptance Criteria (per template):**
- [ ] Background asset created and uploaded to S3
- [ ] `metadata.json` with avatar/text slot coordinates
- [ ] Zod schema applied — all props typed
- [ ] `calculateMetadata` from audio length
- [ ] Light-leaks overlay applied
- [ ] Lottie animation integrated
- [ ] Text overflow tested with 30+ char Indian names
- [ ] Avatar slot tested at Standard (no avatar) and Premium (with PNG)
- [ ] Audio fade-in/out tested with 3 different track lengths
- [ ] `<Player>` preview confirmed in admin dashboard
- [ ] Lambda render tested — output quality verified
- [ ] Mobile 9:16 render tested

**Dependencies:** US-1.1, US-3.3
**PRD Ref:** §13 — Template Development Checklist

---

### US-4.3 — Expand to 10 Templates
**Priority: P2** · **Points: 21** · **Status: 🔲**

> **As an** admin,
> **I want** the template library expanded from 4 to 10 compositions (2 styles × 5 functions),
> **so that** clients have choice across all ceremony types and aesthetic preferences.

**Acceptance Criteria:**
- [ ] 6 additional templates built: `haldi-modern`, `mehandi-pastel`, `sangeet-neon`, `wedding-divine`, `reception-luxury`, `reception-garden`
- [ ] Each passes the US-4.2 quality checklist
- [ ] Template gallery shows all 10 with filtering by function type
- [ ] Admin can enable/disable templates without code changes

**Dependencies:** US-4.2, US-1.1
**PRD Ref:** §13 — Phase 1 Launch (10 compositions target)

---

## Epic 5: Admin Dashboard

*PRD §11.1 — All admin-facing features.*

---

### US-5.1 — Order Management Dashboard
**Priority: P0** · **Points: 8** · **Status: ✅**

> **As an** admin,
> **I want** a dashboard showing all orders with status badges, search/filter, render trigger, download links, and WhatsApp send,
> **so that** I can manage the full order lifecycle from one screen.

**Acceptance Criteria:**
- [x] Order list with: couple names, template, date, status badge, phone, photos count, video link
- [x] Status badges: PENDING, RENDERING, COMPLETE, DELIVERED (colour-coded)
- [x] Search by name, phone, or order ID
- [x] Filter by status
- [x] Render trigger button (triggers `/api/render`)
- [x] Download MP4 link when render is complete
- [x] Send via WhatsApp link
- [x] Delete order button
- [x] Expandable detail panel showing wedding details, scenes, and quick actions
- [x] Auto-refresh every 8 seconds

**Dependencies:** None
**PRD Ref:** §11.1 — Order History, Render Status

---

### US-5.2 — Template Manager
**Priority: P1** · **Points: 8** · **Status: 🔲**

> **As an** admin,
> **I want** a template manager page to register, preview, enable/disable Remotion compositions and their metadata JSON,
> **so that** I can control which templates are available to clients without deploying code.

**Acceptance Criteria:**
- [ ] Admin page lists all registered compositions with: name, function type, status (active/disabled), thumbnail
- [ ] Toggle to enable/disable a template — disabled templates hidden from client storefront
- [ ] Preview button opens `@remotion/player` with sample props for that template
- [ ] Upload/edit `metadata.json` for each template via the UI
- [ ] Display avatar slot and text slot positions visually over the template preview

**Dependencies:** US-1.1
**PRD Ref:** §11.1 — Template Manager, Template Builder

---

### US-5.3 — Avatar QA Gate
**Priority: P1** · **Points: 8** · **Status: 🔲**

> **As an** admin,
> **I want** a side-by-side view of generated avatars vs reference photos for Premium/Luxury orders,
> **so that** I can approve, reject, or trigger regeneration before the avatar is used in rendering.

**Acceptance Criteria:**
- [ ] When an order's status is `AVATAR_QA`, admin sees: reference photos (left) vs generated avatar poses (right)
- [ ] Admin can: ✅ Approve (status → `AVATAR_READY`) | ❌ Reject + Regenerate (re-triggers fal.ai) | ⬇️ Downgrade to Standard (no avatar)
- [ ] After 2 failed regeneration attempts, system auto-downgrades to Standard and alerts admin
- [ ] Avatar QA metrics tracked: approved/rejected/regenerated counts
- [ ] Auto-checks: transparent background detected? Face detected in image?

**Dependencies:** US-6.1
**PRD Ref:** §6 — Avatar QA Gate, §11.1

---

### US-5.4 — Error Log & Retry
**Priority: P1** · **Points: 3** · **Status: 🔲**

> **As an** admin,
> **I want** a Sentry-integrated error display with a retry button for failed jobs,
> **so that** I can diagnose and recover from rendering failures without SSH access.

**Acceptance Criteria:**
- [ ] Failed render jobs shown in admin dashboard with error message and timestamp
- [ ] "Retry" button re-submits the job to SQS
- [ ] Sentry captures and displays errors from Next.js API routes and Lambda consumer
- [ ] DLQ alerts visible in admin dashboard (not just SNS email)

**Dependencies:** US-3.2
**PRD Ref:** §11.1 — Error Log, §15 — Error Handling

---

### US-5.5 — Asset Manager
**Priority: P2** · **Points: 5** · **Status: 🔲**

> **As an** admin,
> **I want** a UI to browse S3 assets — template backgrounds, Lottie files, audio tracks, cached avatars,
> **so that** I can verify what's in storage and manage assets without using the AWS console.

**Acceptance Criteria:**
- [ ] Browse S3 bucket by folder: `templates/`, `lottie/`, `audio/`, `avatars/`
- [ ] Preview images/videos inline; play audio tracks
- [ ] Upload new assets (audio tracks, Lottie JSON, background videos)
- [ ] Delete unused assets with confirmation

**Dependencies:** US-2.2
**PRD Ref:** §11.1 — Asset Manager

---

## Epic 6: Avatar Generation System

*PRD §6 — Custom Pixar-style avatar pipeline for Premium/Luxury tiers.*

---

### US-6.1 — Avatar Generation Pipeline
**Priority: P1** · **Points: 13** · **Status: 🔲**

> **As a** system,
> **I want** to automatically generate 6 Pixar-style avatar poses from 2–3 client reference photos using fal.ai/Replicate,
> **so that** Premium clients receive personalised character avatars composited into their video.

**Acceptance Criteria:**
- [ ] Client uploads 2–3 face photos during order creation (Premium/Luxury flow)
- [ ] System calls fal.ai InstantID or Replicate PhotoMaker API with Pixar-style prompt
- [ ] 6 poses generated: haldi, mehandi, sangeet, wedding, reception, baraat
- [ ] 3 variants per pose generated; best match auto-selected (batch + cherry-pick)
- [ ] PNGs with transparent background stored in S3: `/avatars/{clientId}/{pose}.png`
- [ ] Order status transitions: `PENDING → AVATAR_QA` after generation
- [ ] `ai-generator.ts` interface swapped from mock to real fal.ai API
- [ ] Cost per avatar set: $0.12–$0.36 (within budget)

**Dependencies:** US-2.2
**PRD Ref:** §6 — Avatar Generation Flow

---

### US-6.2 — Avatar Animation (Luxury Tier)
**Priority: P3** · **Points: 8** · **Status: 🔲**

> **As a** system,
> **I want** to animate the static Pixar avatar PNG into a 3–5 second motion clip using Kling AI v2,
> **so that** Luxury tier clients receive videos with moving character animations instead of static images.

**Acceptance Criteria:**
- [ ] Kling AI v2 image-to-video API called with approved avatar PNG
- [ ] 3–5 second animated clip generated per pose
- [ ] Clip stored in S3: `/avatars/{clientId}/{pose}-animated.mp4`
- [ ] Remotion composition uses `<Video>` component instead of `<Img>` when animated clip exists
- [ ] Cost per animated clip: $0.14–$0.28 (tracked)

**Dependencies:** US-6.1
**PRD Ref:** §6 — Avatar Animation (Luxury Tier Only)

---

## Epic 7: Client Storefront

*PRD §11.2 — The client-facing booking experience (Phase 2).*

---

### US-7.1 — Template Gallery Page
**Priority: P0** · **Points: 5** · **Status: ✅**

> **As a** client,
> **I want** to browse templates by ceremony type, see video previews, palette swatches, and scene counts,
> **so that** I can choose the perfect style for my celebration.

**Acceptance Criteria:**
- [x] Landing page shows all available templates with: thumbnail, name, ceremony type, palette swatches, scene count, description
- [x] Each template card has a hover animation and "Use This Template" CTA → links to `/create`
- [x] Templates are visually differentiated by palette and ceremony type badge
- [x] Cards animate in on scroll (whileInView stagger)

**Dependencies:** US-4.1
**PRD Ref:** §11.2 — Template Gallery

---

### US-7.2 — Multi-Step Booking Form
**Priority: P0** · **Points: 8** · **Status: ✅**

> **As a** client,
> **I want** a guided multi-step form (template → details → scenes → photos → review)
> **so that** I can easily provide all the information needed for my video invite.

**Acceptance Criteria:**
- [x] Step 1: Template selection with visual picker (4 template cards)
- [x] Step 2: Wedding details (groom name, bride name, date, venue, cities)
- [x] Step 3: Scene selection with checkboxes
- [x] Step 4: Photo upload (drag-and-drop, preview thumbnails)
- [x] Step 5: Review summary with all details displayed
- [x] Form validation at each step — prevents progression with missing required fields
- [x] Submit creates order via `/api/orders` POST

**Dependencies:** US-4.1
**PRD Ref:** §11.2 — Booking Form

---

### US-7.3 — Payment Integration (Razorpay)
**Priority: P2** · **Points: 8** · **Status: 🔲**

> **As a** client,
> **I want** to pay for my invite package via Razorpay (India) or Stripe (international),
> **so that** my order is confirmed and rendering begins automatically after payment.

**Acceptance Criteria:**
- [ ] Razorpay checkout integrated on the review step — client selects tier and pays
- [ ] Payment webhook handler at `/api/webhooks/razorpay` receives payment confirmation
- [ ] Idempotency check: `payment_id` checked against `orders` table before processing
- [ ] On success: order created in Supabase → job pushed to SQS → status: `PENDING`
- [ ] On failure/timeout: client shown retry option
- [ ] Stripe fallback for international payments (optional for Phase 2)

**Dependencies:** US-2.1, US-3.2
**PRD Ref:** §10.1, §15 — Payment Idempotency

---

### US-7.4 — Watermarked Preview Before Payment
**Priority: P2** · **Points: 5** · **Status: 🔲**

> **As a** client,
> **I want** to see a watermarked low-res preview of my invite video before I pay,
> **so that** I can approve the composition and feel confident about my purchase.

**Acceptance Criteria:**
- [ ] After form submission and before payment, a 480p watermarked render is generated
- [ ] Preview shown in `@remotion/player` with a "PREVIEW — WATERMARK" overlay
- [ ] Client can: ✅ Approve & Pay | 📝 Request Adjustment (goes back to form)
- [ ] Preview stored temporarily in S3: `/renders/{orderId}/preview-watermarked.mp4`
- [ ] S3 lifecycle deletes preview after 7 days

**Dependencies:** US-3.1
**PRD Ref:** §11.2 — Watermarked Preview

---

### US-7.5 — Client Portal
**Priority: P2** · **Points: 5** · **Status: 🟡**

> **As a** client,
> **I want** to access my rendered invite video at `/invite/[orderId]` with email OTP verification,
> **so that** I can re-download my video and share the link with family.

**Acceptance Criteria:**
- [ ] Client portal page at `/invite/[orderId]` — shows couple names, template, and download link
- [ ] Access requires email OTP verification (OTP valid 10 min, rate-limited to 3 attempts/hour)
- [ ] CloudFront signed URL with 30-day expiry
- [ ] Admin can regenerate expired links on request
- [ ] Portal shows all function videos for the same client if they ordered a multi-function package
- [x] Preview page exists at `/preview/[orderId]` with live `@remotion/player` (current implementation — will be extended)

**Dependencies:** US-2.2, US-2.1
**PRD Ref:** §11.2 — Client Portal, §15 — Client Portal Security

---

### US-7.6 — Revision Request
**Priority: P2** · **Points: 5** · **Status: 🔲**

> **As a** client,
> **I want** to request one free revision within 48 hours (name correction, date change),
> **so that** minor mistakes don't require a new order.

**Acceptance Criteria:**
- [ ] "Request Revision" button visible on client portal for 48 hours after delivery
- [ ] Client can change: names, date, venue text only (not template or scenes)
- [ ] Revision triggers a re-render with updated props — same composition
- [ ] Only 1 free revision per order — subsequent revisions require admin approval
- [ ] Revision history logged in the order record

**Dependencies:** US-7.5, US-3.1
**PRD Ref:** §11.2 — Revision Request

---

## Epic 8: Delivery System

*PRD §3 Step 6, §9.2 — Automated video delivery to clients.*

---

### US-8.1 — WhatsApp Cloud API Delivery
**Priority: P0** · **Points: 5** · **Status: 🔲**

> **As a** system,
> **I want** the final video automatically sent to the client's WhatsApp number upon render completion,
> **so that** clients receive their invite within minutes of rendering — no manual intervention.

**Acceptance Criteria:**
- [ ] `whatsapp.ts` interface swapped from mock to WhatsApp Cloud API (Meta)
- [ ] Pre-approved message template (`invite_delivery_v1`) used with CDN download link
- [ ] Delivery triggered automatically when order status changes to `COMPLETE`
- [ ] If WhatsApp delivery fails (HTTP error), fallback to email with CDN link
- [ ] Order status updated to `DELIVERED` after successful send
- [ ] WhatsApp opt-in collected at booking form (post-payment)
- [ ] Delivery confirmation logged with timestamp

**Dependencies:** US-2.2, US-3.1
**PRD Ref:** §3 Step 6, §9.2, §15 — Error Handling

---

### US-8.2 — Email Delivery Fallback
**Priority: P1** · **Points: 3** · **Status: 🔲**

> **As a** system,
> **I want** to send an email confirmation with the CDN download link and client portal URL,
> **so that** clients who don't have WhatsApp or whose delivery fails still receive their video.

**Acceptance Criteria:**
- [ ] Email sent automatically alongside WhatsApp (or as fallback if WhatsApp fails)
- [ ] Email contains: couple names, ceremony type, CDN download link, client portal URL
- [ ] Email styled with brand template (gold/dark theme matching the platform)
- [ ] Sent via Resend, SendGrid, or AWS SES

**Dependencies:** US-2.1
**PRD Ref:** §10.2 — Send email confirmation

---

## Epic 9: Audio System

*PRD §11.4 — Music, voiceover, and audio sync.*

---

### US-9.1 — Audio Track Library
**Priority: P1** · **Points: 5** · **Status: 🔲**

> **As an** admin,
> **I want** a curated library of 15–20 audio tracks per function type stored in S3,
> **so that** clients can select ceremony-appropriate music for their invite.

**Acceptance Criteria:**
- [ ] Audio tracks stored in S3: `/audio/{functionType}/track-{n}.mp3`
- [ ] Admin can upload, preview, and manage tracks via the asset manager
- [ ] Booking form shows an audio picker with play preview for each track
- [ ] Default track assigned per function type if client doesn't select one
- [ ] Silence-detected and trimmed before use (start/end)

**Dependencies:** US-2.2
**PRD Ref:** §11.4 — Audio Library

---

### US-9.2 — ElevenLabs Voiceover (Luxury)
**Priority: P3** · **Points: 5** · **Status: 🔲**

> **As a** Luxury tier client,
> **I want** a personalised AI narration voiceover ("Join us for the wedding of Priya and Rahul…") synced to the video timeline,
> **so that** my invite feels premium and personal.

**Acceptance Criteria:**
- [ ] ElevenLabs TTS API called with personalised script (names, date, venue)
- [ ] Voiceover stored in S3: `/renders/{orderId}/voiceover.mp3`
- [ ] Voiceover ducked under music at -8dB
- [ ] Voiceover synced to text reveal timing in the Remotion composition
- [ ] Cost tracked: ~$0.02–$0.05 per voiceover

**Dependencies:** US-3.3
**PRD Ref:** §11.4 — Voiceover (Luxury)

---

## Epic 10: Remotion Skills & VFX

*PRD §7 — Composition quality and cinematic features.*

---

### US-10.1 — Light Leaks Overlay
**Priority: P1** · **Points: 2** · **Status: 🔲**

> **As a** developer,
> **I want** `@remotion/light-leaks` applied as a top overlay on all templates,
> **so that** every video gets a single-line upgrade to a luxury cinematic feel.

**Acceptance Criteria:**
- [ ] `@remotion/light-leaks` package installed and integrated
- [ ] Light leaks overlay rendered as the topmost visual layer on all compositions
- [ ] Intensity configurable per template via metadata
- [ ] Does not obscure text or avatar layers

**Dependencies:** None
**PRD Ref:** §7 — light-leaks skill

---

### US-10.2 — Lottie Animation Library
**Priority: P1** · **Points: 5** · **Status: 🟡**

> **As a** developer,
> **I want** function-specific Lottie animations sourced from LottieFiles.com — turmeric particles (haldi), mandala patterns (mehandi), sparkles (sangeet), flower petals (wedding),
> **so that** each ceremony type has distinctive decorative motion overlays.

**Acceptance Criteria:**
- [ ] Lottie JSON files stored in S3: `/lottie/{animation-name}.json`
- [ ] `<LottieOverlay>` reusable component loads and renders Lottie animations
- [ ] At least 4 function-specific animations: haldi-particles, mehandi-mandala, sangeet-sparkles, wedding-petals
- [ ] Animations licensed properly from LottieFiles
- [ ] Animations don't obscure text or avatar layers

**Dependencies:** US-2.2
**PRD Ref:** §7 — lottie skill, §13

---

### US-10.3 — SFX Audio Effects
**Priority: P2** · **Points: 3** · **Status: 🔲**

> **As a** developer,
> **I want** subtle sound effects — bell chime on name appearance, whoosh on scene transitions, confetti burst at final reveal,
> **so that** the video feels polished and professional.

**Acceptance Criteria:**
- [ ] SFX assets stored in S3: `/sfx/{effect-name}.mp3`
- [ ] SFX triggered at specific frame points in the composition
- [ ] SFX mixed with background music (not replacing it)
- [ ] Volume levels balanced — SFX audible but not overwhelming

**Dependencies:** US-3.3
**PRD Ref:** §7 — sfx skill

---

## Epic 11: Analytics & Conversion

*PRD §16 — Understand which templates convert and where the funnel drops.*

---

### US-11.1 — Funnel Tracking Events
**Priority: P2** · **Points: 5** · **Status: 🔲**

> **As an** admin,
> **I want** funnel events tracked at every stage — page view, template viewed, form started, form step completed, preview rendered, payment completed, video delivered,
> **so that** I can measure conversion rates and identify drop-off points.

**Acceptance Criteria:**
- [ ] Events tracked via Google Analytics or Plausible: `page_view`, `template_viewed`, `form_started`, `form_step_completed`, `preview_rendered`, `payment_initiated`, `payment_completed`, `video_delivered`, `portal_download`
- [ ] `template_viewed` includes `templateId` and `functionType` metadata
- [ ] `form_step_completed` includes step index
- [ ] Events fire on both client storefront and admin dashboard

**Dependencies:** None
**PRD Ref:** §16.1 — Funnel Tracking

---

### US-11.2 — Template Performance Dashboard
**Priority: P2** · **Points: 5** · **Status: 🔲**

> **As an** admin,
> **I want** a dashboard showing: conversion rate per template, popularity ranking, drop-off funnel by tier, average delivery time, and revision rate,
> **so that** I can make data-driven decisions about which templates to expand or retire.

**Acceptance Criteria:**
- [ ] Conversion rate per template: gallery view → payment completion
- [ ] Template popularity ranking (most ordered → least ordered)
- [ ] Drop-off funnel by tier (Standard vs Premium vs Luxury)
- [ ] Average time from order creation to delivery
- [ ] Revision rate per template

**Dependencies:** US-11.1, US-2.1
**PRD Ref:** §16.2 — Template Performance Dashboard

---

## Epic 12: Security & Reliability

*PRD §15 — Payment, portal, and operational security.*

---

### US-12.1 — Payment Idempotency
**Priority: P2** · **Points: 3** · **Status: 🔲**

> **As a** system,
> **I want** duplicate payment webhook calls silently skipped via `payment_id` unique check,
> **so that** a client is never double-charged or double-rendered.

**Acceptance Criteria:**
- [ ] `payment_id` column in `orders` table has UNIQUE constraint
- [ ] Webhook handler checks for existing order with same `payment_id` before processing
- [ ] If duplicate found: return `{ status: 'already_processed' }` with HTTP 200
- [ ] No error logged for duplicates — this is expected behaviour

**Dependencies:** US-2.1, US-7.3
**PRD Ref:** §15 — Payment Idempotency

---

### US-12.2 — Sentry Error Monitoring
**Priority: P1** · **Points: 3** · **Status: 🔲**

> **As an** admin,
> **I want** Sentry integrated across Next.js API routes and Lambda consumer,
> **so that** I get real-time alerts for rendering failures, API errors, and unhandled exceptions.

**Acceptance Criteria:**
- [ ] Sentry SDK installed and configured for both Next.js and Lambda
- [ ] All API route errors automatically captured with context (orderId, templateId)
- [ ] Lambda render failures captured with Remotion render ID and error details
- [ ] Sentry alerts configured for: render failure rate > 5%, DLQ depth > 0
- [ ] Source maps uploaded for readable stack traces

**Dependencies:** None
**PRD Ref:** §15 — Monitoring Stack

---

### US-12.3 — Lambda Warmup
**Priority: P1** · **Points: 2** · **Status: 🔲**

> **As a** system,
> **I want** EventBridge to ping the Remotion Lambda every 5 minutes during business hours (8am–10pm IST),
> **so that** cold-start latency is avoided for clients during peak hours.

**Acceptance Criteria:**
- [ ] EventBridge rule fires every 5 minutes from 8am to 10pm IST
- [ ] Lambda cold-start rate < 5% during business hours (measured via CloudWatch)
- [ ] Warmup pings are no-op — they don't trigger renders or consume credits

**Dependencies:** US-3.1
**PRD Ref:** §12 — Remotion Lambda Configuration, §18 — Success Metrics

---

## Epic 13: Quality Assurance

*PRD §18 — Success metrics and quality gates.*

---

### US-13.1 — Text Overflow Protection
**Priority: P0** · **Points: 3** · **Status: 🔲**

> **As a** developer,
> **I want** all text components to auto-scale when names exceed the slot width (using Remotion `measuring-text` skill),
> **so that** long Indian names (30+ characters) never overflow or get clipped.

**Acceptance Criteria:**
- [ ] `measuring-text` skill used in all `<SpringName>`, `<TypewriterCaption>` components
- [ ] Tested with: "Venkatasubramaniam" (18 chars), "Satyanarayana Murthy" (20 chars), "Padmanabhan Krishnaswamy" (24 chars)
- [ ] Text scales down proportionally — never truncated or hidden
- [ ] Text clipping error rate: 0% (PRD target)
- [ ] Visual regression tests for all 4 templates with max-length names

**Dependencies:** US-4.1
**PRD Ref:** §11.3, §18 — Success Metrics

---

### US-13.2 — Render Time SLA Monitoring
**Priority: P1** · **Points: 3** · **Status: 🔲**

> **As an** admin,
> **I want** render times tracked and alerted when they exceed SLA (90s for Standard/Premium, 10min for Luxury),
> **so that** I can proactively detect and resolve performance degradation.

**Acceptance Criteria:**
- [ ] `render_jobs` table records `started_at` and `completed_at`
- [ ] Admin dashboard shows average render time for recent orders
- [ ] Alert triggered when render time exceeds: 90s (Standard/Premium) or 600s (Luxury)
- [ ] Lambda memory profiling done — 1769MB confirmed as optimal or adjusted

**Dependencies:** US-2.1, US-3.1
**PRD Ref:** §18 — Success Metrics

---

## Summary — Priority Distribution

| Priority | Count | Description |
|----------|-------|-------------|
| **P0** | 13 stories | Must-have for Phase 1 launch — blocks revenue |
| **P1** | 12 stories | Required for Phase 1 completeness — degrades experience |
| **P2** | 12 stories | Phase 2 Full Automation features |
| **P3** | 3 stories | Phase 3 Scale & Future |

### Recommended Sprint Allocation

| Sprint | Focus | Stories |
|--------|-------|---------|
| Sprint 1–2 | 3-Layer Compositing + Zod Schema | US-1.1, US-1.2, US-1.4, US-13.1 |
| Sprint 3–4 | Infrastructure Setup | US-2.1, US-2.2, US-3.1, US-3.2 |
| Sprint 5–6 | Audio Sync + Template Quality | US-3.3, US-4.2, US-10.1, US-10.2 |
| Sprint 7–8 | Render Pipeline + Delivery | US-3.4, US-8.1, US-8.2, US-12.2 |
| Sprint 9–10 | Admin Enhancements + Avatar | US-5.2, US-5.3, US-6.1, US-1.3 |
| Sprint 11+ | Phase 2 — Storefront + Payments | US-7.3, US-7.4, US-7.5, US-7.6, US-11.* |
