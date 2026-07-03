"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DynamicTemplate } from "@/lib/types";
import type { EffectiveTemplateConfig } from "@/lib/template-overrides";
import { TEMPLATE_CONFIGS, TEMPLATE_IDS } from "@/lib/types";

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { bg: string; color: string; border: string; label: string }> = {
  active:   { bg: "rgba(34,197,94,0.1)",  color: "#86efac", border: "rgba(34,197,94,0.3)",  label: "Active"   },
  draft:    { bg: "rgba(59,130,246,0.1)", color: "#93c5fd", border: "rgba(59,130,246,0.3)", label: "Draft"    },
  inactive: { bg: "rgba(239,68,68,0.1)",  color: "#fca5a5", border: "rgba(239,68,68,0.3)",  label: "Inactive" },
};

const CEREMONY_EMOJI: Record<string, string> = {
  wedding: "💒", haldi: "🌼", mehandi: "🌿", sangeet: "🎶", baraat: "🎺", reception: "🥂",
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function TemplatesListPage() {
  const router = useRouter();
  const [customTemplates, setCustomTemplates] = useState<DynamicTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState<string | null>(null);
  const [duplicating, setDuplicating] = useState<string | null>(null);
  const [systemConfigs, setSystemConfigs] = useState<EffectiveTemplateConfig[] | null>(null);
  const [systemBusy, setSystemBusy] = useState<string | null>(null);

  const loadTemplates = async () => {
    try {
      const res = await fetch("/api/templates");
      if (res.ok) setCustomTemplates(await res.json());
    } catch (e) {
      console.error("Failed to load templates", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadTemplates(); loadSystemConfigs(); }, []);

  const loadSystemConfigs = async () => {
    try {
      const res = await fetch("/api/templates/system");
      if (res.ok) setSystemConfigs(await res.json());
    } catch (e) {
      console.error("Failed to load system template configs", e);
    }
  };

  const handleToggleSystem = async (cfg: EffectiveTemplateConfig) => {
    if (systemBusy) return;
    setSystemBusy(cfg.id);
    try {
      const res = await fetch(`/api/templates/system/${cfg.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: cfg.enabled === false }),
      });
      if (res.ok) {
        const updated = await res.json();
        setSystemConfigs((prev) =>
          prev ? prev.map((c) => (c.id === cfg.id ? updated : c)) : prev,
        );
      } else {
        const err = await res.json().catch(() => ({}));
        alert(
          err.needsMigration
            ? "Enable/disable needs the template_overrides table. Run supabase/migrations/0001_template_overrides.sql in Supabase, then try again."
            : `Could not update template: ${err.error ?? res.statusText}`,
        );
      }
    } catch (e) {
      console.error("Toggle system template failed", e);
    } finally {
      setSystemBusy(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await fetch(`/api/templates/${id}`, { method: "DELETE" });
      setCustomTemplates((prev) => prev.filter((t) => t.id !== id));
    } finally {
      setDeleting(null);
    }
  };

  const handleDuplicate = async (systemId: string) => {
    if (duplicating) return;
    setDuplicating(systemId);
    try {
      const res = await fetch(`/api/templates/system/${systemId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const created = await res.json();
        // Open the new editable clone in the visual editor.
        router.push(`/admin/templates/${created.id}`);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Could not duplicate template: ${err.error ?? res.statusText}`);
      }
    } catch (e) {
      console.error("Duplicate failed", e);
      alert("Could not duplicate template. Please try again.");
    } finally {
      setDuplicating(null);
    }
  };

  const handleToggleStatus = async (tpl: DynamicTemplate) => {
    const newStatus = tpl.status === "active" ? "inactive" : "active";
    setTogglingStatus(tpl.id);
    try {
      const res = await fetch(`/api/templates/${tpl.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        const updated = await res.json();
        setCustomTemplates((prev) => prev.map((t) => (t.id === tpl.id ? updated : t)));
      }
    } finally {
      setTogglingStatus(null);
    }
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0A0500", color: "#F5ECD7" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .tpl-card {
          background: rgba(28,10,0,0.6);
          border: 1px solid rgba(212,175,55,0.15);
          border-radius: 20px;
          padding: 22px;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .tpl-card:hover { border-color: rgba(212,175,55,0.35); box-shadow: 0 4px 24px rgba(212,175,55,0.08); }
        .gold-btn {
          background: linear-gradient(135deg,#F0D060,#D4AF37,#A0832A);
          color: #0A0500; font-weight: 700; border: none; border-radius: 10px;
          cursor: pointer; font-size: 13px; padding: 8px 16px;
          transition: filter 0.2s, transform 0.1s;
          text-decoration: none; display: inline-flex; align-items: center; gap: 6px;
        }
        .gold-btn:hover { filter: brightness(1.1); transform: translateY(-1px); }
        .ghost-btn {
          background: transparent; border: 1px solid rgba(212,175,55,0.25);
          color: #D4AF37; font-weight: 600; border-radius: 10px;
          cursor: pointer; font-size: 13px; padding: 8px 16px;
          transition: all 0.2s; text-decoration: none;
          display: inline-flex; align-items: center; gap: 6px;
        }
        .ghost-btn:hover { border-color: rgba(212,175,55,0.5); background: rgba(212,175,55,0.06); }
        .danger-btn {
          background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);
          color: #fca5a5; font-weight: 600; border-radius: 10px;
          cursor: pointer; font-size: 13px; padding: 8px 16px;
          transition: all 0.2s;
        }
        .danger-btn:hover { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.4); }
        .status-badge {
          padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;
          border: 1px solid; display: inline-block;
        }
      `}</style>

      {/* Nav */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px",
        borderBottom: "1px solid rgba(212,175,55,0.1)",
        background: "rgba(10,5,0,0.85)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/admin" style={{ color: "rgba(245,236,215,0.4)", textDecoration: "none", fontSize: 13 }}>
            ← Admin
          </Link>
          <span style={{ color: "rgba(212,175,55,0.3)" }}>|</span>
          <span style={{
            fontFamily: "var(--font-playfair, serif)", fontSize: 16, fontWeight: 700,
            background: "linear-gradient(135deg,#F0D060,#D4AF37)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            🎨 Template Manager
          </span>
        </div>
        <Link href="/admin/templates/new" className="gold-btn">
          ✨ New Template
        </Link>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* ── Section: System Templates (read-only) ── */}
        <section style={{ marginBottom: 48 }}>
          <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(245,236,215,0.4)", textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 16 }}>
            🔒 System Templates (Built-in)
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {(systemConfigs ?? TEMPLATE_IDS.map((id) => ({ ...TEMPLATE_CONFIGS[id], enabled: true }))).map((tc) => {
              const id = tc.id;
              const disabled = tc.enabled === false;
              return (
                <div key={id} className="tpl-card" style={disabled ? { opacity: 0.55 } : undefined}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 28 }}>{tc.emoji}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{tc.name}</div>
                      <div style={{ fontSize: 11, color: "rgba(245,236,215,0.4)", marginTop: 2 }}>
                        {CEREMONY_EMOJI[tc.functionType]} {tc.functionType} · {tc.scenes} scenes
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    <span className="status-badge" style={{ background: "rgba(212,175,55,0.08)", color: "#D4AF37", borderColor: "rgba(212,175,55,0.2)" }}>
                      System
                    </span>
                    <span className="status-badge" style={disabled
                      ? { background: "rgba(239,68,68,0.1)", color: "#fca5a5", borderColor: "rgba(239,68,68,0.3)" }
                      : { background: "rgba(34,197,94,0.1)", color: "#86efac", borderColor: "rgba(34,197,94,0.3)" }}>
                      {disabled ? "Disabled" : "Active"}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "rgba(245,236,215,0.35)", marginTop: 10, lineHeight: 1.5 }}>
                    {tc.tagline}
                  </p>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                    <button
                      onClick={() => handleToggleSystem(tc)}
                      disabled={systemBusy === id}
                      className="ghost-btn"
                      style={{ color: disabled ? "#86efac" : "#fca5a5", borderColor: disabled ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)" }}
                    >
                      {systemBusy === id ? "..." : disabled ? "▶ Enable" : "⏸ Disable"}
                    </button>
                    <button
                      onClick={() => handleDuplicate(id)}
                      disabled={duplicating === id}
                      className="ghost-btn"
                      title="Create an editable copy you can customise (background, slots, palette, text). Note: the copy uses the generic renderer and does not include the built-in's bespoke animated effects."
                    >
                      {duplicating === id ? "Duplicating..." : "📋 Duplicate"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Section: Custom Templates ── */}
        <section>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, color: "rgba(245,236,215,0.4)", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              ✨ Custom Templates ({customTemplates.length})
            </h2>
          </div>

          {loading && (
            <div style={{ textAlign: "center", padding: "40px 0", color: "rgba(245,236,215,0.3)" }}>
              <div style={{ width: 24, height: 24, border: "2px solid rgba(212,175,55,0.3)", borderTopColor: "#D4AF37", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
              Loading templates...
            </div>
          )}

          {!loading && customTemplates.length === 0 && (
            <div style={{
              border: "2px dashed rgba(212,175,55,0.15)", borderRadius: 20,
              padding: "48px 24px", textAlign: "center",
            }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
              <p style={{ color: "rgba(245,236,215,0.4)", fontSize: 15, marginBottom: 20 }}>
                No custom templates yet. Create your first one!
              </p>
              <Link href="/admin/templates/new" className="gold-btn" style={{ margin: "0 auto" }}>
                ✨ Create First Template
              </Link>
            </div>
          )}

          {!loading && customTemplates.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
              {customTemplates.map((tpl) => {
                const st = STATUS_STYLE[tpl.status] ?? STATUS_STYLE.draft;
                return (
                  <div key={tpl.id} className="tpl-card">
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 28 }}>{tpl.emoji}</span>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14 }}>{tpl.name}</div>
                          <div style={{ fontSize: 11, color: "rgba(245,236,215,0.4)", marginTop: 2 }}>
                            {CEREMONY_EMOJI[tpl.ceremony] ?? "🎬"} {tpl.ceremony} · {tpl.scenes.length} scene{tpl.scenes.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>
                      <span className="status-badge" style={{ background: st.bg, color: st.color, borderColor: st.border }}>
                        {st.label}
                      </span>
                    </div>

                    {/* Palette preview */}
                    <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
                      {Object.values(tpl.palette).slice(0, 4).map((c, i) => (
                        <div key={i} style={{ width: 18, height: 18, borderRadius: 4, background: c as string, border: "1px solid rgba(255,255,255,0.1)" }} />
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <Link href={`/admin/templates/${tpl.id}`} className="ghost-btn">
                        ✏️ Edit
                      </Link>
                      <button
                        onClick={() => handleToggleStatus(tpl)}
                        disabled={togglingStatus === tpl.id}
                        className="ghost-btn"
                        style={{ color: tpl.status === "active" ? "#fca5a5" : "#86efac", borderColor: tpl.status === "active" ? "rgba(239,68,68,0.25)" : "rgba(34,197,94,0.25)" }}
                      >
                        {togglingStatus === tpl.id ? "..." : tpl.status === "active" ? "⏸ Deactivate" : "▶ Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(tpl.id, tpl.name)}
                        disabled={deleting === tpl.id}
                        className="danger-btn"
                      >
                        {deleting === tpl.id ? "..." : "🗑️"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
