"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import type { DynamicTemplate, SceneDefinition, FunctionType } from "@/lib/types";

import { SceneTimeline } from "./SceneTimeline";
import { SlotCanvas, type SlotId } from "./SlotCanvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { TemplatePreview } from "./TemplatePreview";

// ── Constants ─────────────────────────────────────────────────────────────────

const CEREMONIES: FunctionType[] = ["wedding", "haldi", "mehandi", "sangeet", "baraat", "reception"];
const CEREMONY_EMOJI: Record<string, string> = {
  wedding: "💒", haldi: "🌼", mehandi: "🌿", sangeet: "🎶", baraat: "🎺", reception: "🥂",
};
const DEFAULT_PALETTE = { primary: "#D4AF37", secondary: "#0A0500", accent: "#F0D060", background: "#0A0500" };

const DEFAULT_TEMPLATE: Omit<DynamicTemplate, "createdAt" | "updatedAt"> = {
  id: "",
  name: "",
  status: "draft",
  ceremony: "wedding",
  emoji: "🎬",
  palette: DEFAULT_PALETTE,
  scenes: [],
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function slugify(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const isNew = params.id === "new";

  const [template, setTemplate] = useState<Omit<DynamicTemplate, "createdAt" | "updatedAt">>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Editor State
  const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<SlotId | null>(null);
  const [rightTab, setRightTab] = useState<"properties" | "preview">("properties");

  // Load existing template
  useEffect(() => {
    if (isNew) return;
    (async () => {
      const res = await fetch(`/api/templates/${params.id}`);
      if (res.ok) {
        const data = await res.json();
        setTemplate(data);
        if (data.scenes.length > 0) {
          setActiveSceneId(data.scenes[0].id);
        }
      }
      setLoading(false);
    })();
  }, [params.id, isNew]);

  const updateTemplate = (patch: Partial<typeof template>) =>
    setTemplate((prev) => ({ ...prev, ...patch }));

  const activeScene = useMemo(() => {
    return template.scenes.find((s) => s.id === activeSceneId) || null;
  }, [template.scenes, activeSceneId]);

  const updateActiveScene = useCallback((patch: Partial<SceneDefinition>) => {
    if (!activeSceneId) return;
    setTemplate((prev) => ({
      ...prev,
      scenes: prev.scenes.map((s) => (s.id === activeSceneId ? { ...s, ...patch } : s)),
    }));
  }, [activeSceneId]);

  const handleReorderScenes = useCallback((newScenes: SceneDefinition[]) => {
    updateTemplate({ scenes: newScenes });
  }, []);

  const handleAddScene = useCallback(() => {
    const newScene: SceneDefinition = {
      id: uid(),
      label: "New Scene",
      durationSeconds: 6,
      transitionIn: "fade",
      transitionOut: "fade",
      avatarSlots: [],
      textSlots: [],
    };
    setTemplate((prev) => ({ ...prev, scenes: [...prev.scenes, newScene] }));
    setActiveSceneId(newScene.id);
    setRightTab("properties");
  }, []);

  const handleDeleteScene = useCallback((id: string) => {
    setTemplate((prev) => {
      const newScenes = prev.scenes.filter((s) => s.id !== id);
      return { ...prev, scenes: newScenes };
    });
    if (activeSceneId === id) {
      setActiveSceneId(null);
      setSelectedSlotId(null);
    }
  }, [activeSceneId]);

  const handleUpload = useCallback(async (field: "backgroundUrl" | "lottieUrl", file: File): Promise<string> => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("folder", field === "lottieUrl" ? "lotties" : "backgrounds");
      const res = await fetch("/api/templates/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      return url as string;
    } finally {
      setUploading(false);
    }
  }, []);

  const handleSave = async () => {
    if (!template.name || !template.ceremony) {
      alert("Please fill in template name and ceremony type.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...template,
        id: template.id || slugify(template.name),
      };

      let res: Response;
      if (isNew) {
        res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/templates/${params.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (res.ok) {
        const savedData = await res.json();
        setTemplate(savedData);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
        if (isNew) router.replace(`/admin/templates/${savedData.id}`);
      } else {
        const err = await res.json();
        alert(err.error ?? "Save failed");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async () => {
    const newStatus = template.status === "active" ? "inactive" : "active";
    const res = await fetch(`/api/templates/${template.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      const updated = await res.json();
      updateTemplate({ status: updated.status });
    }
  };

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#0A0500", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "rgba(245,236,215,0.4)" }}>
          <div style={{ width: 32, height: 32, border: "2px solid rgba(212,175,55,0.3)", borderTopColor: "#D4AF37", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          Loading template...
        </div>
      </main>
    );
  }

  return (
    <main style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0A0500", color: "#F5ECD7", overflow: "hidden" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-6px) } to { opacity: 1; transform: translateY(0) } }
        .gold-btn {
          background: linear-gradient(135deg,#F0D060,#D4AF37,#A0832A);
          color: #0A0500; font-weight: 700; border: none; border-radius: 10px;
          cursor: pointer; font-size: 13px; padding: 9px 18px;
          transition: filter 0.2s, transform 0.1s;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .gold-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .gold-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .ghost-btn {
          background: transparent; border: 1px solid rgba(212,175,55,0.2);
          color: #D4AF37; font-weight: 600; border-radius: 10px;
          cursor: pointer; font-size: 13px; padding: 8px 16px;
          transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px;
        }
        .ghost-btn:hover { border-color: rgba(212,175,55,0.45); background: rgba(212,175,55,0.06); }
        input:focus, select:focus { outline: none; border-color: rgba(212,175,55,0.5) !important; box-shadow: 0 0 0 2px rgba(212,175,55,0.1); }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px",
        borderBottom: "1px solid rgba(212,175,55,0.1)",
        background: "rgba(10,5,0,0.85)", flexShrink: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/admin/templates" style={{ color: "rgba(245,236,215,0.4)", textDecoration: "none", fontSize: 13 }}>
            ← Templates
          </Link>
          <span style={{ color: "rgba(212,175,55,0.3)" }}>|</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              style={{
                background: "transparent", border: "none", color: "#F0D060",
                fontFamily: "var(--font-playfair, serif)", fontSize: 16, fontWeight: 700,
                outline: "none", width: 180,
              }}
              placeholder="Template Name"
              value={template.name}
              onChange={(e) => updateTemplate({ name: e.target.value })}
            />
            <select
              style={{ background: "rgba(28,10,0,0.6)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 6, color: "#F5ECD7", padding: "4px 8px", fontSize: 12 }}
              value={template.ceremony}
              onChange={(e) => updateTemplate({ ceremony: e.target.value as FunctionType })}
            >
              {CEREMONIES.map((c) => (
                <option key={c} value={c}>{CEREMONY_EMOJI[c]} {c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>
          {template.status && (
            <span style={{
              padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
              background: template.status === "active" ? "rgba(34,197,94,0.1)" : "rgba(59,130,246,0.1)",
              color: template.status === "active" ? "#86efac" : "#93c5fd",
              border: `1px solid ${template.status === "active" ? "rgba(34,197,94,0.3)" : "rgba(59,130,246,0.3)"}`,
            }}>
              {template.status}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {saved && (
            <span style={{ fontSize: 12, color: "#86efac", animation: "fadeIn 0.3s ease" }}>✅ Saved!</span>
          )}
          {!isNew && (
            <button onClick={handleActivate} className="ghost-btn" style={{
              color: template.status === "active" ? "#fca5a5" : "#86efac",
              borderColor: template.status === "active" ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)",
            }}>
              {template.status === "active" ? "⏸ Deactivate" : "▶ Activate"}
            </button>
          )}
          <button onClick={handleSave} disabled={saving} className="gold-btn">
            {saving ? "Saving..." : "💾 Save Template"}
          </button>
        </div>
      </nav>

      {/* ── Main Layout (Split) ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        
        {/* LEFT PANEL: Canvas Preview */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0A0500", position: "relative" }}>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(212,175,55,0.08)", fontSize: 11, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.08em", textTransform: "uppercase", background: "rgba(10,5,0,0.4)", zIndex: 5 }}>
            {activeScene ? `Editing: ${activeScene.label}` : "Canvas Preview"}
          </div>
          
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "auto", padding: 20 }}>
            {activeScene ? (
              <SlotCanvas
                scene={activeScene}
                palette={template.palette}
                selectedSlotId={selectedSlotId}
                onSelectSlot={setSelectedSlotId}
                onMoveTextSlot={(idx, x, y) => {
                  const slots = [...activeScene.textSlots];
                  slots[idx] = { ...slots[idx], x, y };
                  updateActiveScene({ textSlots: slots });
                }}
                onMoveAvatarSlot={(idx, x, y) => {
                  const slots = [...activeScene.avatarSlots];
                  slots[idx] = { ...slots[idx], x, y };
                  updateActiveScene({ avatarSlots: slots });
                }}
              />
            ) : (
              <div style={{ color: "rgba(245,236,215,0.3)", fontSize: 13, border: "2px dashed rgba(212,175,55,0.15)", borderRadius: 16, padding: "40px", textAlign: "center" }}>
                Select a scene from the timeline below to edit on canvas
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Properties / Live Preview Tabs */}
        <div style={{ width: 380, display: "flex", flexDirection: "column", background: "rgba(18,8,0,0.8)", borderLeft: "1px solid rgba(212,175,55,0.1)", flexShrink: 0, zIndex: 5, boxShadow: "-8px 0 32px rgba(0,0,0,0.4)" }}>
          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid rgba(212,175,55,0.1)", background: "rgba(10,5,0,0.6)" }}>
            <button
              onClick={() => setRightTab("properties")}
              style={{ flex: 1, padding: "14px 0", background: "transparent", border: "none", borderBottom: rightTab === "properties" ? "2px solid #D4AF37" : "2px solid transparent", color: rightTab === "properties" ? "#D4AF37" : "rgba(245,236,215,0.5)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.2s" }}
            >
              ⚙️ Properties
            </button>
            <button
              onClick={() => setRightTab("preview")}
              style={{ flex: 1, padding: "14px 0", background: "transparent", border: "none", borderBottom: rightTab === "preview" ? "2px solid #D4AF37" : "2px solid transparent", color: rightTab === "preview" ? "#D4AF37" : "rgba(245,236,215,0.5)", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", cursor: "pointer", transition: "all 0.2s" }}
            >
              ▶️ Live Preview
            </button>
          </div>

          <div style={{ flex: 1, overflow: "hidden" }}>
            {rightTab === "properties" ? (
              activeScene ? (
                <PropertiesPanel
                  scene={activeScene}
                  selectedSlotId={selectedSlotId}
                  uploading={uploading}
                  onChange={updateActiveScene}
                  onUpload={handleUpload}
                />
              ) : (
                <div style={{ padding: 40, textAlign: "center", color: "rgba(245,236,215,0.3)", fontSize: 13 }}>
                  No scene selected
                </div>
              )
            ) : (
              <div style={{ padding: 20, height: "100%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
                <TemplatePreview template={template as DynamicTemplate} />
                
                {/* Global Palette Settings in Preview Tab for quick access */}
                <div style={{ marginTop: 20, padding: 16, background: "rgba(28,10,0,0.4)", borderRadius: 12, border: "1px solid rgba(212,175,55,0.1)" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#D4AF37", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                    🎨 Global Palette
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                    {(Object.keys(template.palette) as Array<keyof typeof template.palette>).map((key) => (
                      <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <input type="color" value={template.palette[key]}
                          onChange={(e) => updateTemplate({ palette: { ...template.palette, [key]: e.target.value } })}
                          style={{ width: 28, height: 28, background: "transparent", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 6, cursor: "pointer", padding: 1 }} />
                        <span style={{ fontSize: 11, color: "rgba(245,236,215,0.7)", textTransform: "capitalize" }}>{key}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* BOTTOM SECTION: Timeline */}
      <div style={{ borderTop: "1px solid rgba(212,175,55,0.2)", background: "rgba(18,8,0,0.95)", flexShrink: 0, padding: "16px 24px", boxShadow: "0 -8px 32px rgba(0,0,0,0.3)", zIndex: 10 }}>
        <SceneTimeline
          scenes={template.scenes}
          activeSceneId={activeSceneId}
          onReorder={handleReorderScenes}
          onSelectScene={(id) => { setActiveSceneId(id); setSelectedSlotId(null); setRightTab("properties"); }}
          onDeleteScene={handleDeleteScene}
          onAddScene={handleAddScene}
        />
      </div>

    </main>
  );
}
