# Requirements Document

## Introduction

This feature raises the visual and production quality of the wedding video invitation platform to a standard the studio is proud to sell. It focuses exclusively on the **product** — template design polish, real personalised couple avatars, and an overall design system covering motion, typography, and per-ceremony visual identity. The existing Phase 0/1 foundation (four Remotion compositions, the 3-layer compositing model, Zod schemas, Supabase + S3 wiring, and local/Lambda render paths) is treated as the baseline to be improved, not rebuilt.

The driving principle is "design first": before any commercialization, the platform must produce invitations that look high-end and luxury, with real Pixar/3D-style avatars personalised from couple photos, composited correctly into template avatar slots, and motion/typography that reads as premium.

### In Scope

- Template visual design quality and polish (luxury aesthetic, per-ceremony differentiation).
- Real bride and groom avatar generation (replacing the current `ai-generator.ts` mock) and correct compositing into template avatar slots.
- A design system covering motion/animation quality, typography, color, and visual identity per ceremony type (haldi vs mehandi vs sangeet vs wedding).
- Accurate text fitting (true text measurement) so names never overflow or clip.
- An avatar quality gate so only acceptable avatars reach a rendered invitation.

### Out of Scope (Deferred / Future)

The following are explicitly deferred and MUST NOT be addressed by this feature. They are recorded here only to bound scope:

- Payment gateway integration (Razorpay / Stripe).
- WhatsApp and automated delivery.
- Production deployment, Remotion Lambda warmup, SQS consumer, monitoring/Sentry, and analytics.
- Luxury-tier avatar animation (Kling AI image-to-video) and ElevenLabs voiceover are future tiers and are not required by this feature, except where the design must not block them.

## Glossary

- **Invitation_Platform**: The overall Next.js + Remotion system that produces wedding video invitations.
- **Template_Renderer**: The Remotion composition layer that composes a final invitation from a background template, avatar layer, and text layer at render time.
- **Background_Template**: A cached, client-independent animated scene (Layer 1) for a specific ceremony type, identified by `templateId`.
- **Avatar_Generator**: The service (`ai-generator.ts` and its provider integration) that produces personalised couple avatar images from uploaded reference photos.
- **Avatar_Asset**: A single generated, transparent-background avatar image for the bride or groom for a given ceremony pose.
- **Compositing_Engine**: The Remotion components (`AvatarSlot`, `AvatarPair`, and related) that position avatar assets and text into template slots (Layer 2 + Layer 3 placement).
- **Text_Renderer**: The Remotion components (`AutoScaleText`, `AnimatedText`) that render client text with fitting and animation.
- **Design_System**: The shared set of color palettes, typography, motion timing, and decorative-motion rules that define the platform's luxury visual identity.
- **Motion_System**: The animation and VFX layer including entrance animations, transitions, light leaks, and Lottie/decorative motion.
- **Avatar_QA_Service**: The automated and admin-assisted gate that validates avatar assets before they are used in a render.
- **Template_Metadata**: The Zod-validated `metadata.json` per template defining `avatarSlots`, `textSlots`, and `visualIdentity`.
- **Visual_Identity**: The per-ceremony palette, key motif, and mood keywords used to differentiate ceremony types (e.g., haldi vs mehandi).
- **Ceremony_Type**: One of the supported functions: haldi, mehandi, sangeet, wedding, reception, baraat.
- **Standard_Tier**: An invitation rendered without an avatar (text + background only).
- **Premium_Tier**: An invitation rendered with personalised static avatar assets composited into avatar slots.
- **Reference_Photo**: A client-uploaded face photo used as input to the Avatar_Generator.
- **Avatar_Provider**: The external generation API (fal.ai InstantID or Replicate PhotoMaker) integrated behind the Avatar_Generator interface.
- **Safe_Zone**: The region of the 1080×1920 canvas within which text and avatars must remain to avoid edge clipping.

## Requirements

### Requirement 1: Real Personalised Avatar Generation

**User Story:** As an admin, I want personalised Pixar/3D-style couple avatars generated from real client photos, so that Premium invitations show the actual couple rather than placeholder images.

#### Acceptance Criteria

1. WHEN an admin requests avatar generation for an order supplying between 1 and 3 Reference_Photos, THE Avatar_Generator SHALL produce avatar assets using the configured Avatar_Provider rather than placeholder image URLs.
2. IF an admin requests avatar generation for an order supplying zero Reference_Photos, THEN THE Avatar_Generator SHALL reject the request, SHALL return an error indicating that at least one Reference_Photo is required, and SHALL NOT invoke the Avatar_Provider.
3. IF an admin requests avatar generation supplying more than 3 Reference_Photos, THEN THE Avatar_Generator SHALL reject the request and SHALL return an error indicating that the Reference_Photo count must be between 1 and 3 inclusive.
4. THE Avatar_Generator SHALL produce avatar assets rendered in a Pixar/3D-cartoon style derived from the supplied Reference_Photo set, such that each generated pose for the same order shares a single consistent facial identity verifiable by a cross-pose identity-match score of at least 0.80 against a designated reference pose.
5. THE Avatar_Generator SHALL produce a separate Avatar_Asset for each requested Ceremony_Type pose among haldi, mehandi, sangeet, wedding, and reception.
6. THE Avatar_Generator SHALL produce each Avatar_Asset as a PNG with a transparent background at a resolution of 1024 by 1024 pixels.
7. WHERE the `REPLICATE_API_TOKEN` or `FAL_API_KEY` environment variable is absent, THE Avatar_Generator SHALL operate in a clearly labelled mock mode and SHALL return placeholder assets so that local development continues without provider credentials.
8. WHEN avatar generation succeeds, THE Avatar_Generator SHALL store each Avatar_Asset at the path `avatars/{clientId}/{ceremonyType}.png` and SHALL return the resolvable asset URLs.
9. IF the Avatar_Provider returns an error or no image, THEN THE Avatar_Generator SHALL return a descriptive error identifying the failed Ceremony_Type pose and SHALL NOT store a partial Avatar_Asset for that pose.
10. IF the Avatar_Provider does not return a completed image within 120 seconds for a given Ceremony_Type pose, THEN THE Avatar_Generator SHALL abort that pose request, SHALL return an error indicating a provider timeout for the failed Ceremony_Type pose, and SHALL NOT store a partial Avatar_Asset for that pose.
11. WHERE batch generation is configured, THE Avatar_Generator SHALL request exactly 3 variants per pose and SHALL select as the candidate Avatar_Asset the single variant with the highest cross-pose identity-match score against the designated reference pose, resolving ties by selecting the lowest variant index.

### Requirement 2: Avatar Quality Gate

**User Story:** As an admin, I want generated avatars validated before they are used, so that only acceptable-quality avatars reach a rendered invitation.

#### Acceptance Criteria

1. WHEN avatar generation completes for an order, THE Avatar_QA_Service SHALL set the order avatar state to Pending_Review before the Avatar_Assets are used in any render.
2. WHEN an order avatar state is set to Pending_Review, THE Avatar_QA_Service SHALL automatically verify that each Avatar_Asset has a transparent background within 30 seconds per Avatar_Asset.
3. WHEN an order avatar state is set to Pending_Review, THE Avatar_QA_Service SHALL automatically verify that each Avatar_Asset contains a detectable face within 30 seconds per Avatar_Asset.
4. IF an Avatar_Asset fails an automatic check, THEN THE Avatar_QA_Service SHALL mark that Avatar_Asset as failed and SHALL identify the failed check.
5. WHEN an admin reviews avatars, THE Avatar_QA_Service SHALL present each Avatar_Asset alongside the Reference_Photo set for side-by-side comparison.
6. WHEN an admin approves an order's avatars, THE Avatar_QA_Service SHALL set the avatar state to Approved and SHALL make the Avatar_Asset URLs available to the Compositing_Engine.
7. WHEN an admin rejects an order's avatars, THE Avatar_QA_Service SHALL set the avatar state to Rejected and SHALL regenerate the full Avatar_Asset set, up to a maximum of 2 regeneration attempts.
8. IF avatar regeneration fails the quality checks after 2 attempts, THEN THE Avatar_QA_Service SHALL downgrade the order to Standard_Tier and SHALL record the downgrade reason.
9. IF an order avatar state is not Approved, THEN THE Avatar_QA_Service SHALL prevent the order's Avatar_Assets from being used in any render.

### Requirement 3: Avatar Compositing Quality

**User Story:** As a developer, I want avatars composited cleanly into template avatar slots, so that the couple appears correctly positioned, proportioned, and undistorted on any background.

#### Acceptance Criteria

1. WHEN an order has approved bride and groom Avatar_Assets, THE Compositing_Engine SHALL position each Avatar_Asset at the coordinates defined in the template's `avatarSlots` Template_Metadata and SHALL scale each Avatar_Asset to fit within its slot's defined width and height bounds.
2. WHEN an Avatar_Asset is scaled to fit its slot, THE Compositing_Engine SHALL apply identical horizontal and vertical scale factors so that the asset's original width-to-height aspect ratio is preserved without stretching, squashing, or cropping.
3. WHILE the composition canvas size differs from the 1080×1920 reference canvas, THE Compositing_Engine SHALL scale slot coordinates proportionally so that avatars remain aligned to their intended positions.
4. WHERE an order is Standard_Tier with no Avatar_Asset, THE Compositing_Engine SHALL render the invitation with the avatar slot region showing only the background layer, with no placeholder graphic, partial avatar pixels, or residual overlay in the slot region.
5. WHEN an Avatar_Asset enters the scene, THE Compositing_Engine SHALL apply a spring-based entrance animation that settles to its final position and scale within a duration between 0.5 and 1.2 seconds inclusive.
6. THE Compositing_Engine SHALL keep each composited Avatar_Asset fully within the Safe_Zone so that no part of any avatar is clipped by a canvas edge.
7. IF an Avatar_Asset URL fails to load, THEN THE Compositing_Engine SHALL render that slot as Standard_Tier showing only the background layer with no partial avatar pixels and SHALL record the load failure identifying the affected slot.

### Requirement 4: Per-Ceremony Visual Identity

**User Story:** As an admin, I want each ceremony type to have a distinct, recognisable visual identity, so that haldi, mehandi, sangeet, and wedding invitations are clearly differentiated and on-theme.

#### Acceptance Criteria

1. THE Template_Metadata SHALL define a `visualIdentity` for each Background_Template containing a dominant palette of at least 2 named colors, at least 1 key motif, and between 2 and 5 mood keywords.
2. THE Design_System SHALL render haldi templates using a bright turmeric-yellow dominant palette with garden/outdoor decorative motifs.
3. THE Design_System SHALL render mehandi templates using a deep-green dominant palette with mandala and henna-inspired line-art motifs.
4. THE Design_System SHALL render sangeet templates using a stage/gold palette with celebratory sparkle motifs.
5. THE Design_System SHALL render wedding templates using a royal palette with cinematic decorative motifs.
6. WHEN two Background_Templates of different Ceremony_Types are rendered, THE Design_System SHALL apply each template's dominant palette and decorative motifs from its `visualIdentity` such that the two templates differ in both their dominant palette and their key motif.
7. WHEN a Background_Template is registered, THE Invitation_Platform SHALL validate its Template_Metadata against the Zod schema.
8. IF the `visualIdentity`, `avatarSlots`, or `textSlots` are missing or invalid, THEN THE Invitation_Platform SHALL reject the registration, SHALL return an error indicating which field failed validation, and SHALL NOT register the template.

### Requirement 5: Luxury Typography

**User Story:** As a client, I want elegant, readable typography on my invitation, so that the names and details look premium and never overflow or clip.

#### Acceptance Criteria

1. THE Text_Renderer SHALL render client text using the luxury font families defined for each template (for example Cormorant Garamond, Great Vibes, Playfair Display).
2. WHEN client text is rendered, THE Text_Renderer SHALL measure the rendered text width using true text measurement rather than character-width estimation.
3. IF the measured text width exceeds the slot `maxWidth`, THEN THE Text_Renderer SHALL reduce the font size in decrements of 1px or smaller, re-measuring the rendered text width after each decrement, and SHALL stop reducing when either the measured text width is at or below `maxWidth` or the font size reaches 55% of the configured base font size.
4. THE Text_Renderer SHALL keep the reduced font size at or above 55% of the configured base font size to preserve legibility.
5. IF the measured text width still exceeds the slot `maxWidth` after the font size has reached 55% of the configured base font size, THEN THE Text_Renderer SHALL wrap the text onto additional lines so that each line's measured width is at or below `maxWidth` and all text remains within the Safe_Zone.
6. WHEN a name of between 30 and 60 characters inclusive is rendered, THE Text_Renderer SHALL display the full name within its slot without truncation or clipping.
7. THE Text_Renderer SHALL position each text element at the coordinates defined in the template's `textSlots` Template_Metadata rather than at hardcoded positions.
8. THE Text_Renderer SHALL keep all rendered text within the Safe_Zone so that no character is clipped by a canvas edge.
9. IF a configured luxury font family fails to load, THEN THE Text_Renderer SHALL render the affected text using a defined fallback font family and SHALL record the font-load failure.

### Requirement 6: Motion and Animation Quality

**User Story:** As a client, I want polished, cinematic motion in my invitation, so that the video feels like a high-end production rather than a basic template.

#### Acceptance Criteria

1. THE Motion_System SHALL apply spring or eased timing curves to every entrance animation, each with an entrance duration between 0.3 and 1.5 seconds, so that no element appears or moves with linear motion or with an entrance shorter than 0.3 seconds.
2. THE Motion_System SHALL apply a light-leak overlay as the topmost visual layer on every template using the `@remotion/light-leaks` package.
3. THE Motion_System SHALL render the light-leak overlay at a peak opacity no greater than 35% so that every text element and avatar beneath it remains fully legible and visible.
4. THE Motion_System SHALL apply a ceremony-specific decorative-motion overlay to each template, sourced as a Lottie animation, matching the template's key motif.
5. WHEN transitioning between scenes within a single invitation, THE Motion_System SHALL apply a non-instant transition presentation with a duration between 0.3 and 1.0 seconds rather than an instant hard cut.
6. WHERE a template defines a light-leak intensity between 0.0 and 1.0 in its Template_Metadata, THE Motion_System SHALL apply that intensity value.
7. IF a template does not define a light-leak intensity in its Template_Metadata, THEN THE Motion_System SHALL apply a default light-leak intensity within the 0.0 to 1.0 range so that the overlay is always rendered.
8. IF the ceremony-specific Lottie decorative-motion asset for a template is missing or fails to load, THEN THE Motion_System SHALL render the invitation without the decorative-motion overlay and SHALL record an error indicating the missing overlay, without aborting the render.
9. THE Motion_System SHALL sequence element entrances so that the Background_Template entrance completes before any Avatar_Asset or text element begins its entrance.

### Requirement 7: Audio-Synced Duration and Polish

**User Story:** As a client, I want my invitation length to match its music with smooth audio, so that the video never ends abruptly or contains awkward silence.

#### Acceptance Criteria

1. WHEN a composition is prepared for render, THE Template_Renderer SHALL set `durationInFrames` via `calculateMetadata` by multiplying the selected audio track length in seconds by the composition frame rate and rounding to the nearest whole frame.
2. WHEN an invitation begins playback, THE Template_Renderer SHALL apply an audio fade-in over the first 1000ms, raising the audio volume from 0 to full.
3. WHEN an invitation reaches its final 2000ms, THE Template_Renderer SHALL apply an audio fade-out, lowering the audio volume from full to 0.
4. WHEN an audio track with a length from 15 to 90 seconds inclusive is used, THE Template_Renderer SHALL produce a composition whose `durationInFrames` equals the computed audio length in frames within a tolerance of ±1 frame.
5. IF the selected audio track length is below 15 seconds or above 90 seconds, THEN THE Template_Renderer SHALL clamp the composition duration to the nearest bound of the 15-to-90-second range.
6. IF the selected audio track is unreachable, THEN THE Template_Renderer SHALL fall back to a default track for the Ceremony_Type, SHALL record the fallback, and SHALL complete the render without interruption.

### Requirement 8: Render Output Quality

**User Story:** As an admin, I want each rendered invitation to meet a defined output quality standard, so that delivered videos look sharp and professional on mobile.

#### Acceptance Criteria

1. THE Template_Renderer SHALL render every invitation at 1080×1920 resolution in 9:16 portrait orientation at a constant 30 frames per second.
2. WHEN a render completes, THE Template_Renderer SHALL produce a single playable video file containing the composited Background_Template, text, motion overlays, and audio, and SHALL include the composited Avatar_Asset layer WHERE the order is Premium_Tier.
3. WHEN a render completes, THE Template_Renderer SHALL generate a still thumbnail image at 1080×1920 resolution captured at the frame index configured in the template's `thumbnailFrame`.
4. IF thumbnail generation fails or the configured `thumbnailFrame` is outside the range 0 to `durationInFrames` − 1, THEN THE Template_Renderer SHALL use the first frame as the thumbnail and SHALL record the failure with an indication of its cause.
5. IF the render fails to complete, THEN THE Template_Renderer SHALL NOT produce a partial output file and SHALL record a render failure identifying its cause.

### Requirement 9: Template Quality Acceptance

**User Story:** As an admin, I want each template to pass a quality checklist before it goes live, so that no template reaches clients with broken text, missing effects, or misconfigured avatars.

#### Acceptance Criteria

1. THE Invitation_Platform SHALL verify that each Background_Template's Template_Metadata validates against the Zod schema and contains non-empty `avatarSlots`, `textSlots`, and `visualIdentity` before the template is marked active.
2. WHEN a template is validated, THE Invitation_Platform SHALL confirm that the template renders to completion without error at Standard_Tier with the avatar slot empty and no visual artifact, and at Premium_Tier with each Avatar_Asset composited within the Safe_Zone.
3. WHEN a template is validated, THE Invitation_Platform SHALL confirm that a name of 30 or more characters is displayed within each `textSlot` fully inside the Safe_Zone with no truncation or edge clipping.
4. WHEN a template is validated, THE Invitation_Platform SHALL confirm that the light-leak overlay is present as the topmost visual layer and that the ceremony-specific decorative-motion overlay matching the template's key motif is present.
5. WHEN all template quality checks defined in criteria 1 through 4 pass, THE Invitation_Platform SHALL mark the template active.
6. IF any template quality check fails, THEN THE Invitation_Platform SHALL keep the template inactive, SHALL preserve the template's existing state unchanged, and SHALL produce a report identifying each failed check and its failure reason.
