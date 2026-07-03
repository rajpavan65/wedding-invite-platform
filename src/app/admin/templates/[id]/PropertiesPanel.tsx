"use client";

import React, { useState } from "react";
import type { SceneDefinition, TextSlotDef, AvatarSlotDef, TransitionEffect } from "@/lib/types";
import type { SlotId } from "./SlotCanvas";

// ── Constants ─────────────────────────────────────────────────────────────────

const TRANSITIONS: TransitionEffect[] = ["fade", "slide-up", "slide-left", "wipe", "none"];
const TEXT_KEYS = ["groomName", "brideName", "eventDate", "venueName", "venueCity", "custom"];
const TEXT_KEY_LABELS: Record<string, string> = {
  groomName: "Groom Name",
  brideName: "Bride Name",
  eventDate: "Event Date",
  venueName: "Venue Name",
  venueCity: "Venue City",
  custom: "Custom Text",
};

// ── Styled helpers ────────────────────────────────────────────────────────────

const baseInput: React.CSSProperties = {
  background: "rgba(28,10,0,0.6)",
  border: "1px solid rgba(212,175,55,0.2)",
  borderRadius: 8,
  color: "#F5ECD7",
  padding: "7px 10px",
  fontSize: 12,
  width: "100%",
  outline: "none",
  boxSizing: "border-box",
};

const numInput: React.CSSProperties = { ...baseInput, width: 72, textAlign: "center" as const };
const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "#D4AF37",
  textTransform: "uppercase" as const, letterSpacing: "0.07em", marginBottom: 10,
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10, color: "rgba(245,236,215,0.4)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
      {children}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(212,175,55,0.08)", margin: "16px 0" }} />;
}

// ── PropertiesPanel ───────────────────────────────────────────────────────────

export function PropertiesPanel({
  scene,
  selectedSlotId,
  uploading,
  onChange,
  onUpload,
}: {
  scene: SceneDefinition;
  selectedSlotId: SlotId | null;
  uploading: boolean;
  onChange: (patch: Partial<SceneDefinition>) => void;
  onUpload: (field: "backgroundUrl" | "lottieUrl", file: File) => Promise<string>;
}) {
  const [textSlotsExpanded, setTextSlotsExpanded] = useState(true);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const updateTextSlot = (i: number, patch: Partial<TextSlotDef>) => {
    const slots = [...scene.textSlots];
    slots[i] = { ...slots[i], ...patch };
    onChange({ textSlots: slots });
  };

  const updateAvatarSlot = (i: number, patch: Partial<AvatarSlotDef>) => {
    const slots = [...scene.avatarSlots];
    slots[i] = { ...slots[i], ...patch };
    onChange({ avatarSlots: slots });
  };

  const addTextSlot = () => onChange({
    textSlots: [...scene.textSlots, { key: "groomName", x: 540, y: 960, fontSize: 48, color: "#D4AF37", align: "center" }],
  });

  const addAvatarSlot = () => onChange({
    avatarSlots: [...scene.avatarSlots, { key: "groomAvatar", x: 300, y: 1000, width: 380, aspectRatio: 1.333 }],
  });

  const removeTextSlot = (i: number) => onChange({ textSlots: scene.textSlots.filter((_, idx) => idx !== i) });
  const removeAvatarSlot = (i: number) => onChange({ avatarSlots: scene.avatarSlots.filter((_, idx) => idx !== i) });

  // Resolve selected slot
  const selectedKind = selectedSlotId?.startsWith("text") ? "text" : selectedSlotId?.startsWith("avatar") ? "avatar" : null;
  const selectedIdx = selectedSlotId ? parseInt(selectedSlotId.split("-")[1]) : null;

  return (
    <div style={{
      display: "flex", flexDirection: "column", gap: 0,
      height: "100%", overflowY: "auto",
      scrollbarWidth: "thin",
    }}>
      {/* ── Scene Basic Info ── */}
      <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
        <div style={sectionLabel}>📋 Scene Info</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 80px", gap: 10 }}>
          <div>
            <FieldLabel>Label</FieldLabel>
            <input
              style={baseInput}
              value={scene.label}
              onChange={(e) => onChange({ label: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel>Duration (s)</FieldLabel>
            <input
              style={numInput}
              type="number" min={1} max={30}
              value={scene.durationSeconds}
              onChange={(e) => onChange({ durationSeconds: Number(e.target.value) })}
            />
          </div>
        </div>
      </div>

      {/* ── Background ── */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
        <div style={sectionLabel}>📁 Background</div>

        {scene.backgroundUrl ? (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.18)",
            borderRadius: 10, padding: "8px 12px",
          }}>
            <span style={{ fontSize: 18 }}>
              {scene.backgroundUrl.match(/\.(mp4|webm)(\?.*)?$/i) ? "🎥" : "🖼️"}
            </span>
            <div style={{ flex: 1, overflow: "hidden" }}>
              <div style={{ fontSize: 11, color: "#F5ECD7", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {scene.backgroundUrl.split("/").pop()}
              </div>
            </div>
            <label style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 7, padding: "5px 10px", fontSize: 11, color: "#D4AF37", cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
              {uploading ? "⏳" : "Change"}
              <input type="file" accept="video/mp4,video/webm,image/*" style={{ display: "none" }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) { const url = await onUpload("backgroundUrl", f); onChange({ backgroundUrl: url }); }
                }} />
            </label>
            <button onClick={() => onChange({ backgroundUrl: undefined })}
              style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 12, padding: "0 2px" }}>
              ✕
            </button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 8 }}>
            <input
              style={{ ...baseInput, flex: 1 }}
              placeholder="Paste URL or upload →"
              value=""
              onChange={(e) => onChange({ backgroundUrl: e.target.value || undefined })}
            />
            <label style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#D4AF37", cursor: "pointer", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 4 }}>
              {uploading ? "⏳" : "📤 Upload"}
              <input type="file" accept="video/mp4,video/webm,image/*" style={{ display: "none" }}
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) { const url = await onUpload("backgroundUrl", f); onChange({ backgroundUrl: url }); }
                }} />
            </label>
          </div>
        )}
      </div>

      {/* ── Avatar Slots ── */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
        <div style={sectionLabel}>👤 Avatar Slots</div>
        {scene.avatarSlots.map((slot, i) => {
          const id: SlotId = `avatar-${i}`;
          const isSelected = selectedSlotId === id;
          return (
            <div key={i} style={{
              marginBottom: 10, padding: "10px 12px",
              background: isSelected ? "rgba(99,179,237,0.08)" : "rgba(28,10,0,0.4)",
              border: `1px solid ${isSelected ? "rgba(99,179,237,0.4)" : "rgba(212,175,55,0.1)"}`,
              borderRadius: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <select
                  style={{ ...baseInput, width: "auto", fontSize: 11 }}
                  value={slot.key}
                  onChange={(e) => updateAvatarSlot(i, { key: e.target.value })}
                >
                  <option value="groomAvatar">🤵 Groom Avatar</option>
                  <option value="brideAvatar">👰 Bride Avatar</option>
                </select>
                <button onClick={() => removeAvatarSlot(i)}
                  style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 13 }}>
                  🗑️
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                <div>
                  <FieldLabel>X</FieldLabel>
                  <input style={numInput} type="number" value={slot.x}
                    onChange={(e) => updateAvatarSlot(i, { x: Number(e.target.value) })} />
                </div>
                <div>
                  <FieldLabel>Y</FieldLabel>
                  <input style={numInput} type="number" value={slot.y}
                    onChange={(e) => updateAvatarSlot(i, { y: Number(e.target.value) })} />
                </div>
                <div>
                  <FieldLabel>Width</FieldLabel>
                  <input style={numInput} type="number" value={slot.width}
                    onChange={(e) => updateAvatarSlot(i, { width: Number(e.target.value) })} />
                </div>
              </div>
              <div style={{ marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 11, color: "rgba(245,236,215,0.45)" }}>
                  <input type="checkbox" defaultChecked
                    style={{ accentColor: "#D4AF37", width: 13, height: 13 }} />
                  🔒 Lock Aspect Ratio
                </label>
              </div>
            </div>
          );
        })}
        <button onClick={addAvatarSlot} style={{ background: "rgba(212,175,55,0.06)", border: "1px dashed rgba(212,175,55,0.25)", borderRadius: 8, color: "#D4AF37", padding: "6px 14px", fontSize: 11, cursor: "pointer", width: "100%" }}>
          + Add Avatar Slot
        </button>
      </div>

      {/* ── Text Slots ── */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
        <button
          onClick={() => setTextSlotsExpanded(!textSlotsExpanded)}
          style={{ width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: textSlotsExpanded ? 10 : 0 }}
        >
          <span style={sectionLabel}>📝 Text Slots ({scene.textSlots.length})</span>
          <span style={{ color: "rgba(212,175,55,0.4)", fontSize: 12, transition: "transform 0.2s", transform: textSlotsExpanded ? "rotate(180deg)" : "none", display: "inline-block" }}>▾</span>
        </button>

        {textSlotsExpanded && (
          <>
            {scene.textSlots.map((slot, i) => {
              const id: SlotId = `text-${i}`;
              const isSelected = selectedSlotId === id;
              return (
                <div key={i} style={{
                  marginBottom: 10, padding: "10px 12px",
                  background: isSelected ? "rgba(212,175,55,0.06)" : "rgba(28,10,0,0.4)",
                  border: `1px solid ${isSelected ? "rgba(212,175,55,0.4)" : "rgba(212,175,55,0.1)"}`,
                  borderRadius: 10,
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <select style={{ ...baseInput, width: "auto", fontSize: 11 }}
                      value={slot.key}
                      onChange={(e) => updateTextSlot(i, { key: e.target.value })}>
                      {TEXT_KEYS.map((k) => (
                        <option key={k} value={k}>{TEXT_KEY_LABELS[k]}</option>
                      ))}
                    </select>
                    <button onClick={() => removeTextSlot(i)}
                      style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 13 }}>
                      🗑️
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <FieldLabel>X</FieldLabel>
                      <input style={numInput} type="number" value={slot.x}
                        onChange={(e) => updateTextSlot(i, { x: Number(e.target.value) })} />
                    </div>
                    <div>
                      <FieldLabel>Y</FieldLabel>
                      <input style={numInput} type="number" value={slot.y}
                        onChange={(e) => updateTextSlot(i, { y: Number(e.target.value) })} />
                    </div>
                    <div>
                      <FieldLabel>Size</FieldLabel>
                      <input style={numInput} type="number" min={8} max={200} value={slot.fontSize}
                        onChange={(e) => updateTextSlot(i, { fontSize: Number(e.target.value) })} />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "60px 1fr", gap: 8 }}>
                    <div>
                      <FieldLabel>Color</FieldLabel>
                      <input type="color" value={slot.color}
                        onChange={(e) => updateTextSlot(i, { color: e.target.value })}
                        style={{ width: "100%", height: 34, background: "transparent", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 6, cursor: "pointer", padding: 2 }} />
                    </div>
                    <div>
                      <FieldLabel>Align</FieldLabel>
                      <select style={{ ...baseInput, fontSize: 11 }} value={slot.align}
                        onChange={(e) => updateTextSlot(i, { align: e.target.value as TextSlotDef["align"] })}>
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>
                  </div>
                  {slot.key === "custom" && (
                    <div style={{ marginTop: 8 }}>
                      <FieldLabel>Custom Text</FieldLabel>
                      <input style={baseInput} placeholder="Enter custom text..."
                        value={slot.customText ?? ""}
                        onChange={(e) => updateTextSlot(i, { customText: e.target.value })} />
                    </div>
                  )}
                </div>
              );
            })}
            <button onClick={addTextSlot}
              style={{ background: "rgba(212,175,55,0.06)", border: "1px dashed rgba(212,175,55,0.25)", borderRadius: 8, color: "#D4AF37", padding: "6px 14px", fontSize: 11, cursor: "pointer", width: "100%" }}>
              + Add Text Slot
            </button>
          </>
        )}
      </div>

      {/* ── Lottie ── */}
      <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(212,175,55,0.08)" }}>
        <div style={sectionLabel}>🎭 Lottie Overlay</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {scene.lottieUrl ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, background: "rgba(134,239,172,0.06)", border: "1px solid rgba(134,239,172,0.2)", borderRadius: 8, padding: "6px 10px" }}>
              <span style={{ fontSize: 11, color: "#86efac", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                ✅ {scene.lottieUrl.split("/").pop()}
              </span>
              <button onClick={() => onChange({ lottieUrl: undefined })}
                style={{ background: "none", border: "none", color: "#fca5a5", cursor: "pointer", fontSize: 12 }}>✕</button>
            </div>
          ) : (
            <input style={{ ...baseInput, flex: 1 }}
              placeholder="Paste .json URL or upload →"
              value={scene.lottieUrl ?? ""}
              onChange={(e) => onChange({ lottieUrl: e.target.value || undefined })} />
          )}
          <label style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#D4AF37", cursor: "pointer", whiteSpace: "nowrap" }}>
            {uploading ? "⏳" : "📤 Upload"}
            <input type="file" accept="application/json,.json" style={{ display: "none" }}
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) { const url = await onUpload("lottieUrl", f); onChange({ lottieUrl: url }); }
              }} />
          </label>
        </div>
      </div>

      {/* ── Transitions ── */}
      <div style={{ padding: "14px 18px" }}>
        <div style={sectionLabel}>⚡ Transitions</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <FieldLabel>Transition In</FieldLabel>
            <select style={{ ...baseInput, fontSize: 11 }}
              value={scene.transitionIn}
              onChange={(e) => onChange({ transitionIn: e.target.value as TransitionEffect })}>
              {TRANSITIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <FieldLabel>Transition Out</FieldLabel>
            <select style={{ ...baseInput, fontSize: 11 }}
              value={scene.transitionOut}
              onChange={(e) => onChange({ transitionOut: e.target.value as TransitionEffect })}>
              {TRANSITIONS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
