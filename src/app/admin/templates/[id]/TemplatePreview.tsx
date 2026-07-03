"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import type { DynamicTemplate } from "@/lib/types";

// Dynamically import Player to avoid SSR issues
const Player = dynamic(
  () => import("@remotion/player").then((m) => m.Player),
  { ssr: false, loading: () => <PlayerSkeleton /> }
);

// Dynamically import UniversalTemplate — it imports Remotion hooks that must be client-side
const UniversalTemplate = dynamic(
  () => import("@/remotion/compositions/UniversalTemplate").then((m) => m.UniversalTemplate),
  { ssr: false }
);

function PlayerSkeleton() {
  return (
    <div style={{
      width: "100%", aspectRatio: "9/16",
      background: "rgba(28,10,0,0.6)", borderRadius: 16,
      display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 8,
    }}>
      <div style={{
        width: 28, height: 28,
        border: "2px solid rgba(212,175,55,0.25)",
        borderTopColor: "#D4AF37", borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <p style={{ color: "rgba(245,236,215,0.3)", fontSize: 12, margin: 0 }}>
        Loading preview...
      </p>
    </div>
  );
}

// Dummy InviteProps for preview
function buildPreviewProps(template: DynamicTemplate) {
  return {
    brideFirstName: "Priya",
    groomFirstName: "Rahul",
    brideName: "Priya",
    groomName: "Rahul",
    eventDate: "15 February 2026",
    weddingDate: "15 February 2026",
    venueName: "The Grand Palace",
    venueCity: "Jaipur",
    venue: "The Grand Palace, Jaipur",
    brideCity: "Mumbai",
    groomCity: "Delhi",
    templateId: "universal-template",
    functionType: template.ceremony,
    tier: "standard" as const,
    voiceoverEnabled: false,
    style: "royal",
    scenes: ["intro", "outro"],
    photos: [],
    dynamicTemplate: template,
  };
}

function calcTotalFrames(scenes: DynamicTemplate["scenes"]) {
  const total = scenes.reduce((sum, s) => sum + Math.round(s.durationSeconds * 30), 0);
  return Math.max(total, 30);
}

// ── TemplatePreview ───────────────────────────────────────────────────────────

export function TemplatePreview({
  template,
}: {
  template: DynamicTemplate | null;
}) {
  const [key, setKey] = useState(0); // force re-mount on refresh

  if (!template || template.scenes.length === 0) {
    return (
      <div style={{
        width: "100%", aspectRatio: "9/16",
        background: "rgba(28,10,0,0.5)",
        border: "1px dashed rgba(212,175,55,0.15)", borderRadius: 16,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 8,
      }}>
        <div style={{ fontSize: 28 }}>🎬</div>
        <p style={{ color: "rgba(245,236,215,0.3)", fontSize: 12, textAlign: "center", margin: 0, padding: "0 16px" }}>
          Add scenes and save to see the live preview
        </p>
      </div>
    );
  }

  const inputProps = buildPreviewProps(template);
  const durationInFrames = calcTotalFrames(template.scenes);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 10, color: "rgba(245,236,215,0.3)", textTransform: "uppercase", letterSpacing: "0.08em", textAlign: "center" }}>
        Live Preview · {template.scenes.length} scenes · {Math.round(durationInFrames / 30)}s
      </div>

      <div style={{ width: "100%", borderRadius: 16, overflow: "hidden", border: "1px solid rgba(212,175,55,0.15)", position: "relative" }}>
        <Player
          key={key}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          component={UniversalTemplate as any}
          durationInFrames={durationInFrames}
          compositionWidth={1080}
          compositionHeight={1920}
          fps={30}
          style={{ width: "100%", borderRadius: 16 }}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          inputProps={inputProps as any}
          controls
          autoPlay={false}
          loop={false}
          clickToPlay
          showVolumeControls={false}
        />
      </div>

      {/* Refresh button */}
      <button
        onClick={() => setKey((k) => k + 1)}
        style={{
          background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)",
          borderRadius: 8, color: "#D4AF37", cursor: "pointer",
          fontSize: 11, padding: "6px 12px", display: "flex",
          alignItems: "center", justifyContent: "center", gap: 5,
        }}
      >
        🔄 Refresh Preview
      </button>

      <div style={{ fontSize: 10, color: "rgba(245,236,215,0.2)", textAlign: "center" }}>
        Save template first, then press ▶ to play
      </div>
    </div>
  );
}
