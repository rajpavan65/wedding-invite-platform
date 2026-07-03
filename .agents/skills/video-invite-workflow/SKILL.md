---
name: video-invite-workflow
description: Documents the exact internal video generation pipeline for the Digital Invites AI wedding platform — from raw couple photos to final MP4. Use this whenever working on scenes, render pipeline, photo processing, or animations.
---

# Video Invite Generation — Internal Workflow

## The Manual Workflow We Are Automating

This is what was done manually before this system was built:

```
Step 1: Receive raw couple photos from customer
         ↓
Step 2: Create styled "event frame images" for each function
        • Take the raw photo
        • Apply event-specific color grading (Haldi = warm yellow, Sangeet = purple, etc.)
        • Place it inside a designed event template/frame (marigold border for Haldi,
          mandap arch for Varmala, fairy lights for Sangeet, etc.)
        • Result: A single styled composite image per event (like a designer card)
         ↓
Step 3: Animate those styled frame images
        • Ken Burns zoom/pan on the styled image
        • Add motion elements (floating petals, particles, glows)
         ↓
Step 4: Merge in Canva with text overlays + music
        • Couple names, wedding date, venue
        • Event labels (Haldi Carnival, Varmala & Pheras, etc.)
        • Background music track
         ↓
Step 5: Export final video → share via WhatsApp
```

---

## How Our Automated System Maps to That Workflow

| Manual Step | Our System | Status |
|---|---|---|
| Receive photos | `/api/upload` → `public/uploads/{orderId}/photo_N.jpg` | ✅ Done |
| **Style/frame each photo** | `POST /api/process-photos` (sharp library) | ❌ **MISSING** |
| Animate styled images | Remotion scenes (`IntroScene`, `HaldiScene`, etc.) | ✅ Done (needs enrichment) |
| Text overlays | `AnimatedText` component in each scene | ✅ Done |
| Music | `<Audio>` in `RoyalRajasthani.tsx` | ✅ Done |
| Export MP4 | `renderMedia()` → `public/renders/{orderId}.mp4` | ✅ Done |
| WhatsApp delivery | Twilio / WhatsApp Business API | ❌ Not built |

---

## The Critical Missing Step — Photo Pre-Processing

### What Needs to Happen (Before Remotion Renders)

For each uploaded photo + its assigned scene, produce a **styled composite image**:

```
public/uploads/{orderId}/photo_1.jpg  (raw, any size)
           +
public/templates/frame-haldi.png      (1080×1920 decorated frame, transparent center)
           ↓
       sharp pipeline:
         1. Resize raw photo → 1080×1920 (cover crop)
         2. Apply color grade (event-specific modulate)
         3. Composite template PNG on top (blend: 'over')
         4. Save as JPEG quality 90
           ↓
public/uploads/{orderId}/styled_haldi.jpg   ← this goes into Remotion
```

### Color Grades Per Event
```javascript
const SCENE_GRADES = {
  intro:   { brightness: 1.0,  saturation: 1.1, hue: 5   },  // warm neutral
  haldi:   { brightness: 1.05, saturation: 1.4, hue: 15  },  // warm yellow
  mehandi: { brightness: 1.0,  saturation: 0.9, hue: -5  },  // warm-green
  sangeet: { brightness: 0.95, saturation: 0.9, hue: -20 },  // cool purple
  varmala: { brightness: 1.0,  saturation: 1.2, hue: 8   },  // golden warm
  outro:   { brightness: 0.85, saturation: 0.7, hue: 0   },  // cinematic dark
};
```

### Template PNGs Needed
```
public/templates/
  ├── frame-intro.png     → ornate gold border, filigree corners
  ├── frame-haldi.png     → marigold garlands, turmeric splashes
  ├── frame-sangeet.png   → fairy lights, musical notes, purple accents
  ├── frame-varmala.png   → flower garland arch, mandap columns
  └── frame-outro.png     → grand palace gate arch, gold filigree
```

---

## Remotion Scene Layer Structure (per scene)

Every scene renders as stacked `<AbsoluteFill>` layers:

```
Layer 1 (bottom): Styled photo (Ken Burns zoom/pan via CSS transform)
Layer 2:          Color/gradient overlay (dark vignette for text readability)
Layer 3:          Atmospheric glow (radial-gradient, event-specific color)
Layer 4:          Particle system (GoldParticles — floating dots)
Layer 5:          Event-specific decorations (SVG petals, flames, notes)
Layer 6:          Decorative border/frame (CSS border + corner accents)
Layer 7 (top):    Text content (AnimatedText components — name, date, venue)
```

---

## Frame Duration Reference

```
Scene       Frames   Seconds   Notes
─────────   ──────   ───────   ─────────────────────────────
intro         150       5s     Names spring in, Ken Burns
haldi         150       5s     Horizontal drift, warm glow
sangeet       150       5s     Cool tones, music elements
varmala       180       6s     Sacred fire pulse, vow texts
outro         150       5s     Event cards slide in, RSVP
transition     15      0.5s    Gold curtain wipe (between each)
─────────────────────────────────────────────────────────────
Total (5 scenes): 840 frames = 28 seconds
```

---

## Animation Primitives

### interpolate — the only animation tool
```tsx
// CSS transitions/animations are FORBIDDEN in Remotion
const frame = useCurrentFrame();

// Linear mapping
const scale = interpolate(frame, [0, 150], [1.0, 1.15], { extrapolateRight: "clamp" });

// With easing
const opacity = interpolate(frame, [0, 20], [0, 1], {
  extrapolateRight: "clamp",
  easing: Easing.inOut(Easing.cubic),
});

// Keyframed
const wipeWidth = interpolate(progress, [0, 0.3, 0.7, 1.0], [0, 100, 100, 0]);
```

### spring — for bouncy entrances
```tsx
const { fps } = useVideoConfig();
const springVal = spring({
  frame: Math.max(0, frame - delay),  // delay shifts start point
  fps,
  config: { damping: 12, stiffness: 80, mass: 0.5 },
});
// springVal goes 0→1 with slight overshoot (bouncy feel)
```

### Math functions — for organic motion
```tsx
// Pulsing glow
const glow = 0.4 + Math.sin(frame * 0.09) * 0.2;

// Side drift
const xDrift = Math.sin(frame * 0.03 * driftFactor) * 15;

// Particle loop (mod to repeat)
const progress = (adjustedFrame * speed * 0.5) % 120;
```

---

## Photo URL Rules

**CRITICAL:** Remotion renders inside Headless Chrome. Chrome blocks `file://` local paths.

```typescript
// ❌ WRONG — Chrome will refuse to load this
photo = "D:\\Automations\\wedding-invite-platform\\public\\uploads\\WI-XXX\\photo_1.jpg"

// ✅ CORRECT — serve over HTTP
photo = "http://localhost:3000/uploads/WI-XXX/photo_1.jpg"

// In buildVideoProps():
if (url.startsWith("/")) {
  return `http://localhost:${port}${url}`;
}
```

---

## Next Features to Build (Ordered by Priority)

### P1 — Photo Pre-processing (Critical for quality)
- `npm install sharp`
- `POST /api/process-photos`
- Design/generate template PNGs for each scene
- Update scenes to prefer `styled_{scene}.jpg`

### P2 — Enrich Remotion Scenes (Visual quality)
- Add event-specific SVG decorations per scene
- Animated marigold petals (Haldi), sacred fire (Varmala), music notes (Sangeet)
- Improve typography hierarchy and text animations

### P3 — Admin Dashboard
- `/admin` — view all orders, filter by status
- Manually trigger renders, mark as delivered
- Download link management

### P4 — WhatsApp Delivery
- After `status = "ready"`, auto-send via Twilio WhatsApp API
- Message template: video download link + couple name

### P5 — Persistent Storage
- Replace in-memory `Map` in `storage.ts` with JSON file store
- Later: Supabase PostgreSQL + R2/S3 for video files
