# PRD v2.3 Addendum — Alternative Character Rendering Architecture

## Key Changes
1. Rename Layer 2 from CLIENT AVATAR to CHARACTER LAYER.
2. Support Photo, PNG, Video and GLB character renderers.
3. Add Section 6.5: Alternative Character Rendering Architecture (Phase 1.5).
4. Extend InviteProps with avatarType and avatarAssetUrl.
5. Add GLB-specific template category.
6. Add Phase 1.5 evaluation roadmap.

## Section 6.5

Objective: Evaluate Avaturn/GLB avatars as an alternative character-rendering backend.

Architecture:
Client Photos -> Avaturn -> GLB Avatar -> Animation Library -> Remotion + React Three Fiber -> Render

Comparison:
- PNG: Higher emotional appeal, more QA, multiple generations.
- GLB: Better consistency, reusable animations, lower QA, unknown customer preference.

## Schema Extension

avatarType:
- photo
- png
- video
- glb

avatarAssetUrl: string

## Character-Centric Templates

- Royal Baraat Entry
- Couple Dance Intro
- Save-The-Date Story
- Proposal Story
- Wedding Trailer

## Phase 1.5 Validation

Build:
- Haldi GLB Template
- Save-The-Date GLB Template
- Baraat Entry GLB Template

Success Metrics:
- QA Pass Rate > 90%
- Face Similarity > 80%
- Customer Preference > 60%
- Cost Per Client < $0.50
- Render Overhead < 20%
