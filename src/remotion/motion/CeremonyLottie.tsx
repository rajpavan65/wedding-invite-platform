/**
 * src/remotion/motion/CeremonyLottie.tsx
 *
 * Ceremony-specific decorative-motion overlay (Motion System, design §Components/5).
 *
 * Loads a ceremony-specific Lottie animation via `@remotion/lottie` whose motif
 * matches the template's `visualIdentity.keyMotif` (Req 6.4). The animation is
 * mounted as a non-interactive overlay layer in a composition.
 *
 * FAIL-SAFE BEHAVIOUR (Req 6.8): if the ceremony Lottie asset is missing, cannot
 * be fetched, or does not parse as valid Lottie JSON, this component:
 *   1. renders nothing (no overlay),
 *   2. records the error (console.error + optional `onError` callback), and
 *   3. NEVER aborts the render — it always releases the render-blocking handle
 *      via `continueRender` (it deliberately does NOT call `cancelRender`).
 *
 * ──────────────────────────────────────────────────────────────────────────
 * PLACEHOLDER NOTE — no licensed Lottie assets yet.
 *
 * We do not yet have licensed Lottie JSON files. This component resolves a
 * ceremony's animation from a configurable `ceremonyType -> public path` map
 * (see {@link CEREMONY_LOTTIE_SOURCES}); the expected files live under
 * `public/lottie/`. Until those files are dropped in, every ceremony hits the
 * Req 6.8 graceful-degradation path: the fetch fails, the error is recorded,
 * and the invitation renders without the decorative overlay.
 *
 * TODO(assets): add the following licensed Lottie JSON files to `public/lottie/`:
 *   - public/lottie/haldi-particles.json   (haldi   — garden/turmeric particles)
 *   - public/lottie/mehandi-mandala.json   (mehandi — henna mandala line-art)
 *   - public/lottie/sangeet-sparkles.json  (sangeet — stage sparkle motif)
 *   - public/lottie/wedding-petals.json    (wedding — falling petals, cinematic)
 * Do NOT fabricate these JSON files — they must be real, licensed animations.
 * ──────────────────────────────────────────────────────────────────────────
 *
 * Requirements: 6.4, 6.8; Design §Components/5.
 */

import { Lottie, type LottieAnimationData } from "@remotion/lottie";
import React, { useEffect, useState } from "react";
import { AbsoluteFill, continueRender, delayRender, staticFile } from "remotion";
import type { TemplateMetadata } from "@/lib/schemas";

// NOTE (Req 6.8): we intentionally do NOT import or call `cancelRender` here.
// A missing/failed decorative overlay must never abort the render — every error
// path below releases the render handle via `continueRender` instead.

/** Ceremony types this overlay can theme. Mirrors `functionType` in the schema. */
export type CeremonyType = TemplateMetadata["functionType"];

/**
 * Configurable map of ceremony type → public Lottie asset path (relative to
 * `public/`, resolved via Remotion's `staticFile`). The basename encodes the
 * key motif so the overlay matches the template's `visualIdentity.keyMotif`
 * (Req 6.4).
 *
 * `reception` and `baraat` reuse the cinematic wedding motif by default; adjust
 * here once dedicated assets exist. Any ceremony without an entry simply has no
 * decorative overlay (handled gracefully — Req 6.8).
 */
export const CEREMONY_LOTTIE_SOURCES: Record<CeremonyType, string | undefined> = {
  haldi: "lottie/haldi-particles.json",
  mehandi: "lottie/mehandi-mandala.json",
  sangeet: "lottie/sangeet-sparkles.json",
  wedding: "lottie/wedding-petals.json",
  reception: "lottie/wedding-petals.json",
  baraat: "lottie/wedding-petals.json",
};

/**
 * Resolve the public asset path for a ceremony's decorative Lottie. Returns
 * `undefined` when no motif asset is configured for the ceremony type.
 */
export function resolveCeremonyLottieSource(
  ceremonyType: CeremonyType,
): string | undefined {
  return CEREMONY_LOTTIE_SOURCES[ceremonyType];
}

/**
 * Pure description of the CeremonyLottie fail-safe contract (Req 6.4, 6.8),
 * mirroring the runtime behaviour of the component below so it can be asserted
 * in a Node test environment without a DOM or a full render.
 *
 * - When the decorative asset is available: the overlay renders, no error is
 *   recorded, and the render is never aborted.
 * - When the asset is missing or fails to load/parse: the overlay renders
 *   NOTHING, the error is recorded, and the render is NOT aborted — i.e. the
 *   invitation still renders without the decorative overlay (Req 6.8).
 *
 * `abortsRender` is ALWAYS false: a missing/failed decorative overlay must
 * never abort the render (the component deliberately never calls `cancelRender`).
 */
export interface CeremonyLottieFallback {
  rendersOverlay: boolean;
  recordsError: boolean;
  abortsRender: boolean;
}

export function ceremonyLottieFallback(
  assetAvailable: boolean,
): CeremonyLottieFallback {
  return {
    rendersOverlay: assetAvailable,
    recordsError: !assetAvailable,
    abortsRender: false,
  };
}

/** Loose structural guard that a parsed value looks like Lottie animation data. */
function isLottieAnimationData(value: unknown): value is LottieAnimationData {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const v = value as Record<string, unknown>;
  // Real Lottie JSON always carries these numeric fields (frame rate, width,
  // height, out-point). This rejects 404 HTML fallbacks served as 200 in dev.
  return (
    typeof v.fr === "number" &&
    typeof v.w === "number" &&
    typeof v.h === "number" &&
    typeof v.op === "number"
  );
}

export interface CeremonyLottieProps {
  /** Ceremony type whose key-motif Lottie should be rendered (Req 6.4). */
  ceremonyType: CeremonyType;
  /**
   * Explicit public asset path override (relative to `public/`). When omitted,
   * the path is resolved from {@link CEREMONY_LOTTIE_SOURCES}.
   */
  src?: string;
  /** Whether the decorative animation loops. Defaults to `true`. */
  loop?: boolean;
  /** Playback speed multiplier. Defaults to `1`. */
  playbackRate?: number;
  /** Extra styles applied to the overlay container. */
  style?: React.CSSProperties;
  /**
   * Called when the asset is missing or fails to load/parse (Req 6.8). The
   * render is NOT aborted; this is an observability hook for callers/QA.
   */
  onError?: (error: Error) => void;
}

/**
 * Decorative ceremony Lottie overlay. Renders nothing while loading and renders
 * nothing (recording the error) if the asset is missing or fails — without ever
 * aborting the render (Req 6.4, 6.8).
 */
export const CeremonyLottie: React.FC<CeremonyLottieProps> = ({
  ceremonyType,
  src,
  loop = true,
  playbackRate = 1,
  style,
  onError,
}) => {
  const assetPath = src ?? resolveCeremonyLottieSource(ceremonyType);

  const [animationData, setAnimationData] =
    useState<LottieAnimationData | null>(null);

  // Block the render until the asset resolves or definitively fails. When no
  // asset is configured at all, there is nothing to wait for.
  const [handle] = useState<number | null>(() =>
    assetPath ? delayRender(`Loading ceremony Lottie: ${ceremonyType}`) : null,
  );

  useEffect(() => {
    // No configured asset for this ceremony — degrade gracefully (Req 6.8).
    if (!assetPath) {
      const err = new Error(
        `No decorative-motion Lottie configured for ceremony "${ceremonyType}".`,
      );
      console.error(`[CeremonyLottie] ${err.message}`);
      onError?.(err);
      return;
    }

    let cancelled = false;

    const fail = (cause: unknown) => {
      if (cancelled) return;
      const err =
        cause instanceof Error
          ? cause
          : new Error(`Failed to load ceremony Lottie "${assetPath}": ${String(cause)}`);
      // Record the missing/failed overlay (Req 6.8) — do NOT cancelRender.
      console.error(
        `[CeremonyLottie] Missing or invalid decorative-motion asset for ceremony "${ceremonyType}" (${assetPath}). Rendering without overlay.`,
        err,
      );
      onError?.(err);
      // Release the render-blocking handle so the render continues uninterrupted.
      if (handle !== null) {
        continueRender(handle);
      }
    };

    fetch(staticFile(assetPath))
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Asset request for "${assetPath}" returned HTTP ${res.status}.`,
          );
        }
        return res.json();
      })
      .then((json: unknown) => {
        if (cancelled) return;
        if (!isLottieAnimationData(json)) {
          throw new Error(
            `Asset "${assetPath}" did not parse as valid Lottie animation data.`,
          );
        }
        setAnimationData(json);
        if (handle !== null) {
          continueRender(handle);
        }
      })
      .catch(fail);

    return () => {
      cancelled = true;
    };
    // `handle`/`assetPath`/`ceremonyType` are stable for a given mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Still loading, no asset configured, or the asset failed — render nothing.
  if (!animationData) {
    return null;
  }

  return (
    <AbsoluteFill style={{ pointerEvents: "none", ...style }}>
      <Lottie
        animationData={animationData}
        loop={loop}
        playbackRate={playbackRate}
        style={{ width: "100%", height: "100%" }}
      />
    </AbsoluteFill>
  );
};
