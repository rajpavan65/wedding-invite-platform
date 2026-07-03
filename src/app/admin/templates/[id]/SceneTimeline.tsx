"use client";

import React from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SceneDefinition } from "@/lib/types";

// ── Scene Chip (sortable item) ─────────────────────────────────────────────

function SceneChip({
  scene,
  index,
  isActive,
  onSelect,
  onDelete,
}: {
  scene: SceneDefinition;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: scene.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
    flexShrink: 0,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          background: isActive
            ? "rgba(212,175,55,0.14)"
            : "rgba(28,10,0,0.7)",
          border: `1.5px solid ${isActive ? "rgba(212,175,55,0.6)" : "rgba(212,175,55,0.15)"}`,
          borderRadius: 14,
          overflow: "hidden",
          width: 100,
          cursor: "pointer",
          transition: "border-color 0.18s, background 0.18s, box-shadow 0.18s",
          boxShadow: isActive ? "0 0 18px rgba(212,175,55,0.18)" : "none",
          userSelect: "none",
        }}
      >
        {/* Drag handle strip */}
        <div
          {...attributes}
          {...listeners}
          style={{
            padding: "5px 0 3px",
            display: "flex",
            justifyContent: "center",
            cursor: "grab",
            background: "rgba(212,175,55,0.05)",
            borderBottom: "1px solid rgba(212,175,55,0.1)",
          }}
          title="Drag to reorder"
        >
          <svg width="18" height="10" viewBox="0 0 18 10" fill="none">
            {[0, 3, 6].map((y) => (
              <g key={y}>
                <circle cx="5" cy={y + 2} r="1.2" fill="rgba(212,175,55,0.4)" />
                <circle cx="9" cy={y + 2} r="1.2" fill="rgba(212,175,55,0.4)" />
                <circle cx="13" cy={y + 2} r="1.2" fill="rgba(212,175,55,0.4)" />
              </g>
            ))}
          </svg>
        </div>

        {/* Chip body */}
        <div
          onClick={onSelect}
          style={{ padding: "10px 10px 6px", flex: 1 }}
        >
          {/* Scene number */}
          <div style={{
            fontSize: 10, fontWeight: 700, color: "rgba(212,175,55,0.5)",
            marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.05em",
          }}>
            #{index + 1}
          </div>

          {/* Name */}
          <div style={{
            fontWeight: 700, fontSize: 12, color: "#F5ECD7",
            marginBottom: 4, lineHeight: 1.3,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {scene.label}
          </div>

          {/* Duration badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 3,
            background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)",
            borderRadius: 10, padding: "2px 7px", fontSize: 10, color: "#D4AF37",
          }}>
            ⏱ {scene.durationSeconds}s
          </div>

          {/* Slot badges */}
          <div style={{ display: "flex", gap: 3, marginTop: 5, flexWrap: "wrap" }}>
            {scene.avatarSlots.length > 0 && (
              <span style={{ fontSize: 9, color: "rgba(245,236,215,0.4)", background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "1px 5px" }}>
                👤×{scene.avatarSlots.length}
              </span>
            )}
            {scene.textSlots.length > 0 && (
              <span style={{ fontSize: 9, color: "rgba(245,236,215,0.4)", background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "1px 5px" }}>
                📝×{scene.textSlots.length}
              </span>
            )}
            {scene.backgroundUrl && (
              <span style={{ fontSize: 9, color: "rgba(245,236,215,0.4)", background: "rgba(255,255,255,0.04)", borderRadius: 6, padding: "1px 5px" }}>
                🎥
              </span>
            )}
          </div>
        </div>

        {/* Action row */}
        <div style={{
          display: "flex", borderTop: "1px solid rgba(212,175,55,0.08)",
        }}>
          <button
            onClick={onSelect}
            title="Edit scene"
            style={{
              flex: 1, background: "none", border: "none", borderRight: "1px solid rgba(212,175,55,0.08)",
              color: "#D4AF37", cursor: "pointer", padding: "6px 0", fontSize: 13,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(212,175,55,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            ✏️
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            title="Remove scene"
            style={{
              flex: 1, background: "none", border: "none",
              color: "#fca5a5", cursor: "pointer", padding: "6px 0", fontSize: 13,
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(239,68,68,0.08)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Drag Overlay chip (shown while dragging) ───────────────────────────────

function DragOverlayChip({ scene }: { scene: SceneDefinition | null }) {
  if (!scene) return null;
  return (
    <div style={{
      width: 100, background: "rgba(212,175,55,0.18)",
      border: "1.5px solid rgba(212,175,55,0.6)",
      borderRadius: 14, padding: "10px", cursor: "grabbing",
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
    }}>
      <div style={{ fontWeight: 700, fontSize: 12, color: "#F5ECD7", marginBottom: 4 }}>
        {scene.label}
      </div>
      <div style={{ fontSize: 10, color: "#D4AF37" }}>⏱ {scene.durationSeconds}s</div>
    </div>
  );
}

// ── SceneTimeline ──────────────────────────────────────────────────────────

export function SceneTimeline({
  scenes,
  activeSceneId,
  onReorder,
  onSelectScene,
  onDeleteScene,
  onAddScene,
}: {
  scenes: SceneDefinition[];
  activeSceneId: string | null;
  onReorder: (newScenes: SceneDefinition[]) => void;
  onSelectScene: (id: string) => void;
  onDeleteScene: (id: string) => void;
  onAddScene: () => void;
}) {
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    })
  );

  const handleDragStart = (e: DragStartEvent) => {
    setDraggingId(String(e.active.id));
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setDraggingId(null);
    const { active, over } = e;
    if (over && active.id !== over.id) {
      const oldIdx = scenes.findIndex((s) => s.id === active.id);
      const newIdx = scenes.findIndex((s) => s.id === over.id);
      onReorder(arrayMove(scenes, oldIdx, newIdx));
    }
  };

  const draggingScene = draggingId ? scenes.find((s) => s.id === draggingId) ?? null : null;
  const totalSeconds = scenes.reduce((sum, s) => sum + s.durationSeconds, 0);

  return (
    <div style={{
      background: "rgba(10,5,0,0.7)",
      border: "1px solid rgba(212,175,55,0.12)",
      borderRadius: 20,
      padding: "16px 20px",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 14,
      }}>
        <div>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#F0D060",
            textTransform: "uppercase", letterSpacing: "0.1em",
          }}>
            🎬 Scenes in This Template
          </span>
          <span style={{ fontSize: 11, color: "rgba(245,236,215,0.3)", marginLeft: 10 }}>
            {scenes.length} scene{scenes.length !== 1 ? "s" : ""} · {totalSeconds}s total
          </span>
        </div>
        <button
          onClick={onAddScene}
          style={{
            background: "linear-gradient(135deg,#F0D060,#D4AF37,#A0832A)",
            color: "#0A0500", fontWeight: 700, border: "none", borderRadius: 10,
            cursor: "pointer", fontSize: 12, padding: "7px 14px",
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          + Add Scene
        </button>
      </div>

      {/* Scrollable strip */}
      {scenes.length === 0 ? (
        <div style={{
          border: "2px dashed rgba(212,175,55,0.12)", borderRadius: 14,
          padding: "24px", textAlign: "center", color: "rgba(245,236,215,0.3)", fontSize: 13,
        }}>
          🎬 No scenes yet — click &quot;+ Add Scene&quot; to start building
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={scenes.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            <div style={{
              display: "flex", gap: 12, overflowX: "auto",
              paddingBottom: 8,
              scrollbarWidth: "thin",
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              scrollbarColor: "rgba(212,175,55,0.2) transparent" as any,
            }}>
              {scenes.map((scene, index) => (
                <React.Fragment key={scene.id}>
                  <SceneChip
                    scene={scene}
                    index={index}
                    isActive={activeSceneId === scene.id}
                    onSelect={() => onSelectScene(scene.id)}
                    onDelete={() => {
                      if (confirm(`Remove "${scene.label}"?`)) onDeleteScene(scene.id);
                    }}
                  />
                  {/* Arrow between chips */}
                  {index < scenes.length - 1 && (
                    <div style={{
                      display: "flex", alignItems: "center",
                      color: "rgba(212,175,55,0.25)", fontSize: 16, flexShrink: 0,
                    }}>
                      →
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </SortableContext>
          <DragOverlay>
            <DragOverlayChip scene={draggingScene} />
          </DragOverlay>
        </DndContext>
      )}

      <div style={{ marginTop: 10, fontSize: 10, color: "rgba(245,236,215,0.2)", textAlign: "center" }}>
        ⠿ Drag to reorder · ✏️ to edit · 🗑️ to remove
      </div>
    </div>
  );
}
