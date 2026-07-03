"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import type { SceneDefinition, TextSlotDef, AvatarSlotDef } from "@/lib/types";

// ── Constants ─────────────────────────────────────────────────────────────────

/** Real Remotion canvas size (1080 × 1920) */
const REAL_W = 1080;
const REAL_H = 1920;

/** Canvas display size — 28% of real */
const CANVAS_W = 300;
const CANVAS_H = Math.round((CANVAS_W / REAL_W) * REAL_H); // 533px

const SCALE = CANVAS_W / REAL_W; // 0.2778

// ── Helpers ───────────────────────────────────────────────────────────────────

function toCanvas(realX: number, realY: number) {
  return { cx: realX * SCALE, cy: realY * SCALE };
}

function toReal(canvasX: number, canvasY: number) {
  return {
    rx: Math.round(canvasX / SCALE),
    ry: Math.round(canvasY / SCALE),
  };
}

// ── Slot types ────────────────────────────────────────────────────────────────

type SlotKind = "text" | "avatar";
type SlotId = string; // `text-0`, `avatar-1`, etc.

interface DragState {
  slotId: SlotId;
  kind: SlotKind;
  index: number;
  startMouseX: number;
  startMouseY: number;
  startRealX: number;
  startRealY: number;
}

// ── Individual slot overlay ───────────────────────────────────────────────────

function SlotOverlay({
  label,
  cx,
  cy,
  width,
  fontSize,
  color,
  selected,
  kind,
  onMouseDown,
  onClick,
}: {
  label: string;
  cx: number;
  cy: number;
  width?: number;
  fontSize?: number;
  color?: string;
  selected: boolean;
  kind: SlotKind;
  onMouseDown: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  const isText = kind === "text";
  const displayFontSize = fontSize ? Math.max(Math.round(fontSize * SCALE), 7) : 9;
  const boxW = width ? width * SCALE : isText ? 120 : 80;
  const boxH = isText ? displayFontSize + 10 : 80;

  return (
    <div
      onMouseDown={onMouseDown}
      onClick={onClick}
      title={`Drag to reposition · ${label}`}
      style={{
        position: "absolute",
        left: cx - boxW / 2,
        top: cy - boxH / 2,
        width: boxW,
        height: boxH,
        border: `1.5px ${selected ? "solid" : "dashed"} ${
          selected
            ? (color ?? "#D4AF37")
            : isText
            ? "rgba(212,175,55,0.55)"
            : "rgba(99,179,237,0.6)"
        }`,
        borderRadius: isText ? 4 : 8,
        background: selected
          ? isText
            ? "rgba(212,175,55,0.12)"
            : "rgba(99,179,237,0.12)"
          : isText
          ? "rgba(212,175,55,0.05)"
          : "rgba(99,179,237,0.07)",
        cursor: "grab",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        userSelect: "none",
        boxShadow: selected
          ? `0 0 0 2px ${color ?? "#D4AF37"}44`
          : "none",
        transition: "box-shadow 0.15s",
      }}
    >
      <span style={{
        fontSize: displayFontSize,
        fontWeight: isText ? 600 : 500,
        color: color ?? (isText ? "#D4AF37" : "#93c5fd"),
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
        maxWidth: "90%",
        pointerEvents: "none",
      }}>
        {label}
      </span>
    </div>
  );
}

// ── SlotCanvas ────────────────────────────────────────────────────────────────

export function SlotCanvas({
  scene,
  palette,
  selectedSlotId,
  onSelectSlot,
  onMoveTextSlot,
  onMoveAvatarSlot,
}: {
  scene: SceneDefinition;
  palette: { primary: string; secondary: string; accent: string; background: string };
  selectedSlotId: SlotId | null;
  onSelectSlot: (id: SlotId | null) => void;
  onMoveTextSlot: (index: number, x: number, y: number) => void;
  onMoveAvatarSlot: (index: number, x: number, y: number) => void;
}) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  // Live drag offset while dragging (delta from start)
  const [dragDelta, setDragDelta] = useState<{ id: SlotId; dx: number; dy: number } | null>(null);

  // ── Text slot display values (with live drag override) ──────────────────
  const textSlotPositions = scene.textSlots.map((slot, i) => {
    const id: SlotId = `text-${i}`;
    if (dragDelta?.id === id) {
      return {
        ...slot,
        x: slot.x + Math.round(dragDelta.dx / SCALE),
        y: slot.y + Math.round(dragDelta.dy / SCALE),
      };
    }
    return slot;
  });

  const avatarSlotPositions = scene.avatarSlots.map((slot, i) => {
    const id: SlotId = `avatar-${i}`;
    if (dragDelta?.id === id) {
      return {
        ...slot,
        x: slot.x + Math.round(dragDelta.dx / SCALE),
        y: slot.y + Math.round(dragDelta.dy / SCALE),
      };
    }
    return slot;
  });

  // ── Mouse event handlers ────────────────────────────────────────────────

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, kind: SlotKind, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      const id: SlotId = `${kind}-${index}`;
      const slot = kind === "text" ? scene.textSlots[index] : scene.avatarSlots[index];
      dragRef.current = {
        slotId: id,
        kind,
        index,
        startMouseX: e.clientX,
        startMouseY: e.clientY,
        startRealX: slot.x,
        startRealY: slot.y,
      };
      setDragDelta({ id, dx: 0, dy: 0 });
    },
    [scene.textSlots, scene.avatarSlots]
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startMouseX;
      const dy = e.clientY - drag.startMouseY;
      setDragDelta({ id: drag.slotId, dx, dy });
    };

    const handleMouseUp = (e: MouseEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const dx = e.clientX - drag.startMouseX;
      const dy = e.clientY - drag.startMouseY;
      const newRealX = Math.max(0, Math.min(REAL_W, drag.startRealX + Math.round(dx / SCALE)));
      const newRealY = Math.max(0, Math.min(REAL_H, drag.startRealY + Math.round(dy / SCALE)));

      if (drag.kind === "text") {
        onMoveTextSlot(drag.index, newRealX, newRealY);
      } else {
        onMoveAvatarSlot(drag.index, newRealX, newRealY);
      }

      dragRef.current = null;
      setDragDelta(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [onMoveTextSlot, onMoveAvatarSlot]);

  // ── Deselect on canvas click ────────────────────────────────────────────
  const handleCanvasClick = () => {
    if (!dragRef.current) onSelectSlot(null);
  };

  // ── Background resolve ──────────────────────────────────────────────────
  const bgUrl = scene.backgroundUrl;
  const isVideo = bgUrl?.match(/\.(mp4|webm|mov)(\?.*)?$/i);
  const isImage = bgUrl?.match(/\.(jpg|jpeg|png|gif|webp|avif)(\?.*)?$/i);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
      {/* Canvas label */}
      <div style={{ fontSize: 10, color: "rgba(245,236,215,0.3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
        Canvas — {REAL_W}×{REAL_H} @ {Math.round(SCALE * 100)}%
      </div>

      {/* The 9:16 canvas */}
      <div
        ref={canvasRef}
        onClick={handleCanvasClick}
        style={{
          position: "relative",
          width: CANVAS_W,
          height: CANVAS_H,
          borderRadius: 16,
          overflow: "hidden",
          border: "1.5px solid rgba(212,175,55,0.2)",
          boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
          cursor: "default",
          flexShrink: 0,
        }}
      >
        {/* Background — palette color always */}
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 50% 30%, ${palette.secondary}cc, ${palette.background})`,
        }} />

        {/* Background — image overlay if URL set */}
        {bgUrl && isImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgUrl}
            alt="bg"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
          />
        )}

        {/* Background — video thumbnail (first frame via <video>) */}
        {bgUrl && isVideo && (
          <video
            src={bgUrl}
            muted
            playsInline
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 0.7 }}
          />
        )}

        {/* Gradient overlay for readability */}
        <div style={{
          position: "absolute", inset: 0,
          background: `linear-gradient(180deg, ${palette.background}55 0%, transparent 40%, transparent 60%, ${palette.background}88 100%)`,
          pointerEvents: "none",
        }} />

        {/* Crosshair center reference */}
        <div style={{
          position: "absolute", left: CANVAS_W / 2 - 0.5, top: 0, bottom: 0,
          width: 1, background: "rgba(255,255,255,0.05)", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: CANVAS_H / 2 - 0.5, left: 0, right: 0,
          height: 1, background: "rgba(255,255,255,0.05)", pointerEvents: "none",
        }} />

        {/* Text slot overlays */}
        {textSlotPositions.map((slot, i) => {
          const id: SlotId = `text-${i}`;
          const { cx, cy } = toCanvas(slot.x, slot.y);
          const displayLabel = getSlotDisplayLabel(slot as TextSlotDef);
          return (
            <SlotOverlay
              key={id}
              label={displayLabel}
              cx={cx}
              cy={cy}
              fontSize={slot.fontSize}
              color={slot.color}
              selected={selectedSlotId === id}
              kind="text"
              onMouseDown={(e) => handleMouseDown(e, "text", i)}
              onClick={(e) => { e.stopPropagation(); onSelectSlot(id); }}
            />
          );
        })}

        {/* Avatar slot overlays */}
        {avatarSlotPositions.map((slot, i) => {
          const id: SlotId = `avatar-${i}`;
          const { cx, cy } = toCanvas(slot.x, slot.y);
          const avatarLabel = slot.key === "groomAvatar" ? "🤵 Groom" : "👰 Bride";
          const slotWidth = slot.width;
          return (
            <SlotOverlay
              key={id}
              label={avatarLabel}
              cx={cx}
              cy={cy}
              width={slotWidth}
              selected={selectedSlotId === id}
              kind="avatar"
              onMouseDown={(e) => handleMouseDown(e, "avatar", i)}
              onClick={(e) => { e.stopPropagation(); onSelectSlot(id); }}
            />
          );
        })}

        {/* Safe zone indicator */}
        <div style={{
          position: "absolute",
          inset: CANVAS_W * 0.05,
          border: "1px dashed rgba(255,255,255,0.06)",
          borderRadius: 8, pointerEvents: "none",
        }} />
      </div>

      {/* Hint */}
      <div style={{ fontSize: 10, color: "rgba(245,236,215,0.22)", textAlign: "center" }}>
        ← Drag elements to position · Click to select
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSlotDisplayLabel(slot: TextSlotDef): string {
  const LABELS: Record<string, string> = {
    groomName: '"Rahul"',
    brideName: '"Priya"',
    eventDate: '"15 Feb 2026"',
    venueName: '"The Grand Palace"',
    venueCity: '"Jaipur"',
    custom: slot.customText ? `"${slot.customText}"` : '"Custom"',
  };
  return LABELS[slot.key] ?? `"${slot.key}"`;
}

// Export helpers for use in page
export { toReal, CANVAS_W, CANVAS_H, REAL_W, REAL_H, SCALE };
export type { SlotId };
