"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { OrderData, TEMPLATE_CONFIGS, TEMPLATE_IDS, type TemplateId, OrderStatus } from "@/lib/types";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; icon: string; bg: string; text: string; border: string }
> = {
  PENDING: {
    label: "PENDING",
    icon: "📥",
    bg: "rgba(59,130,246,0.12)",
    text: "#93c5fd",
    border: "rgba(59,130,246,0.3)",
  },
  AVATAR_QA: {
    label: "AVATAR QA",
    icon: "🎨",
    bg: "rgba(168,85,247,0.12)",
    text: "#c084fc",
    border: "rgba(168,85,247,0.3)",
  },
  AVATAR_READY: {
    label: "AVATAR READY",
    icon: "✨",
    bg: "rgba(99,102,241,0.12)",
    text: "#a5b4fc",
    border: "rgba(99,102,241,0.3)",
  },
  RENDERING: {
    label: "RENDERING",
    icon: "⚙️",
    bg: "rgba(251,146,60,0.12)",
    text: "#fdba74",
    border: "rgba(251,146,60,0.3)",
  },
  COMPLETE: {
    label: "COMPLETE",
    icon: "✅",
    bg: "rgba(34,197,94,0.12)",
    text: "#86efac",
    border: "rgba(34,197,94,0.3)",
  },
  DELIVERED: {
    label: "DELIVERED",
    icon: "📦",
    bg: "rgba(156,163,175,0.12)",
    text: "#9ca3af",
    border: "rgba(156,163,175,0.25)",
  },
  FAILED: {
    label: "FAILED",
    icon: "❌",
    bg: "rgba(239,68,68,0.12)",
    text: "#fca5a5",
    border: "rgba(239,68,68,0.3)",
  },
};

type FilterStatus = OrderStatus | "all";

export default function AdminPage() {
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [renderingIds, setRenderingIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error("Error fetching orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    // Auto-refresh every 8s to pick up render completions
    const interval = setInterval(fetchOrders, 8000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const triggerRender = async (orderId: string) => {
    setRenderingIds((prev) => new Set(prev).add(orderId));
    try {
      const res = await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      if (res.ok) {
        showToast(`🎬 Render started for ${orderId}`);
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: "RENDERING" } : o))
        );
      } else {
        const err = await res.json();
        showToast(`❌ ${err.error || "Render failed"}`);
      }
    } catch {
      showToast("❌ Network error while starting render");
    } finally {
      setRenderingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const updateStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      await fetch(`/api/orders?id=${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      showToast(`Status updated → ${newStatus}`);
    } catch {
      showToast("❌ Failed to update status");
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm(`Delete order ${orderId}? This cannot be undone.`)) return;
    try {
      await fetch(`/api/orders?id=${orderId}`, { method: "DELETE" });
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showToast("🗑️ Order deleted");
    } catch {
      showToast("❌ Failed to delete order");
    }
  };

  // Approve / reject an order's generated avatars via the Avatar QA Service (Req 2.5, 2.6, 2.7).
  const [reviewingIds, setReviewingIds] = useState<Set<string>>(new Set());
  const reviewAvatars = async (orderId: string, action: "approve" | "reject") => {
    setReviewingIds((prev) => new Set(prev).add(orderId));
    try {
      const res = await fetch("/api/avatar-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast(
          action === "approve"
            ? `✅ Avatars approved for ${orderId}`
            : data.state === "Downgraded"
              ? `⚠️ ${orderId} downgraded to Standard (regeneration budget exhausted)`
              : `↩️ Avatars rejected — regenerating (attempt ${data.attempts})`,
        );
        await fetchOrders();
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(`❌ ${err.error || "Avatar review failed"}`);
      }
    } catch {
      showToast("❌ Network error during avatar review");
    } finally {
      setReviewingIds((prev) => {
        const next = new Set(prev);
        next.delete(orderId);
        return next;
      });
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (filter !== "all" && o.status !== filter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        o.details.groomName.toLowerCase().includes(q) ||
        o.details.brideName.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q) ||
        o.customerPhone.includes(q)
      );
    }
    return true;
  });

  const stats = {
    total: orders.length,
    received: orders.filter((o) => o.status === "PENDING").length,
    rendering: orders.filter((o) => o.status === "RENDERING").length,
    ready: orders.filter((o) => o.status === "COMPLETE").length,
    delivered: orders.filter((o) => o.status === "DELIVERED").length,
  };

  // Count orders per template
  const templateStats = TEMPLATE_IDS.map((id) => ({
    id,
    tc: TEMPLATE_CONFIGS[id],
    count: orders.filter((o) => {
      const tid = (o as unknown as { templateId?: string }).templateId || o.style;
      return tid === id;
    }).length,
  }));


  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <main style={{ minHeight: "100vh", background: "#0A0500", color: "#F5ECD7" }}>
      {/* Toast */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "#1C0A00",
            border: "1px solid rgba(212,175,55,0.4)",
            borderRadius: 12,
            padding: "12px 20px",
            fontSize: 14,
            zIndex: 9999,
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            animation: "fadeSlideUp 0.3s ease",
          }}
        >
          {toastMsg}
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%,100% { opacity:1; } 50% { opacity:0.5; }
        }
        .admin-row { transition: background 0.15s; }
        .admin-row:hover { background: rgba(212,175,55,0.04); }
        .btn-primary {
          background: linear-gradient(135deg, #F0D060, #D4AF37);
          color: #0A0500;
          font-weight: 700;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: filter 0.2s, transform 0.1s;
        }
        .btn-primary:hover:not(:disabled) { filter: brightness(1.12); transform: translateY(-1px); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-ghost {
          background: transparent;
          border: 1px solid rgba(212,175,55,0.2);
          color: #D4AF37;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-ghost:hover { background: rgba(212,175,55,0.1); border-color: rgba(212,175,55,0.4); }
        input[type="text"] {
          background: rgba(28,10,0,0.7);
          border: 1px solid rgba(212,175,55,0.2);
          color: #F5ECD7;
          border-radius: 10px;
          padding: 8px 14px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }
        input[type="text"]:focus { border-color: rgba(212,175,55,0.5); }
        input[type="text"]::placeholder { color: rgba(245,236,215,0.3); }
        select {
          background: rgba(28,10,0,0.7);
          border: 1px solid rgba(212,175,55,0.2);
          color: #F5ECD7;
          border-radius: 10px;
          padding: 8px 12px;
          font-size: 13px;
          outline: none;
          cursor: pointer;
        }
      `}</style>

      {/* Navbar */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 32px",
          borderBottom: "1px solid rgba(212,175,55,0.12)",
          background: "rgba(10,5,0,0.85)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-playfair, serif)",
              fontSize: 20,
              fontWeight: 700,
              background: "linear-gradient(135deg, #F0D060, #D4AF37, #A0832A)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              textDecoration: "none",
            }}
          >
            💍 Digital Invites AI
          </Link>
          <span
            style={{
              background: "rgba(212,175,55,0.12)",
              border: "1px solid rgba(212,175,55,0.25)",
              color: "#D4AF37",
              fontSize: 11,
              fontWeight: 700,
              padding: "2px 10px",
              borderRadius: 20,
              letterSpacing: "0.08em",
            }}
          >
            ADMIN
          </span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button
            onClick={fetchOrders}
            className="btn-ghost"
            style={{ padding: "7px 14px", fontSize: 13 }}
          >
            🔄 Refresh
          </button>
          <Link
            href="/admin/templates"
            className="btn-ghost"
            style={{ padding: "7px 14px", fontSize: 13, textDecoration: "none" }}
          >
            🎨 Templates
          </Link>
          <Link
            href="/create"
            className="btn-primary"
            style={{ padding: "8px 18px", fontSize: 13, borderRadius: 10, textDecoration: "none" }}
          >
            + New Order
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        {/* Page Header */}
        <div style={{ marginBottom: 28 }}>
          <h1
            style={{
              fontFamily: "var(--font-playfair, serif)",
              fontSize: 28,
              fontWeight: 700,
              margin: 0,
            }}
          >
            Orders Dashboard
          </h1>
          <p style={{ color: "rgba(245,236,215,0.45)", fontSize: 14, marginTop: 4, marginBottom: 0 }}>
            Manage wedding video invite orders, trigger renders and track delivery
          </p>
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: 12,
            marginBottom: 24,
          }}
        >
          {(
            [
              { key: "total", label: "Total", icon: "📊", val: stats.total, color: "#F0D060" },
              { key: "PENDING", label: "PENDING", icon: "📥", val: stats.received, color: "#93c5fd" },
              { key: "RENDERING", label: "RENDERING", icon: "⚙️", val: stats.rendering, color: "#fdba74" },
              { key: "COMPLETE", label: "COMPLETE", icon: "✅", val: stats.ready, color: "#86efac" },
              { key: "DELIVERED", label: "DELIVERED", icon: "📦", val: stats.delivered, color: "#9ca3af" },
            ] as const
          ).map((s) => (
            <button
              key={s.key}
              onClick={() => setFilter(s.key === "total" ? "all" : (s.key as FilterStatus))}
              style={{
                background:
                  (filter === s.key || (filter === "all" && s.key === "total"))
                    ? "rgba(212,175,55,0.12)"
                    : "rgba(28,10,0,0.5)",
                border:
                  (filter === s.key || (filter === "all" && s.key === "total"))
                    ? "1px solid rgba(212,175,55,0.4)"
                    : "1px solid rgba(212,175,55,0.12)",
                borderRadius: 14,
                padding: "14px 10px",
                cursor: "pointer",
                textAlign: "center",
                transition: "all 0.2s",
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
              <div style={{ fontSize: 11, color: "rgba(245,236,215,0.4)", marginTop: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                {s.label}
              </div>
            </button>
          ))}
        </div>

        {/* Template Breakdown */}
        {orders.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {templateStats.map(({ id, tc, count }) => (
              <div
                key={id}
                style={{
                  borderRadius: 12,
                  border: `1px solid ${tc.palette.primary}28`,
                  background: `${tc.palette.background}cc`,
                  overflow: "hidden",
                }}
              >
                {/* palette strip */}
                <div
                  style={{
                    height: 3,
                    background: `linear-gradient(90deg, ${tc.palette.background}, ${tc.palette.secondary}, ${tc.palette.primary}, ${tc.palette.accent})`,
                  }}
                />
                <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: tc.palette.primary }}>
                      {tc.emoji} {tc.name}
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(245,236,215,0.35)", textTransform: "capitalize", marginTop: 1 }}>
                      {tc.functionType}
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: count > 0 ? tc.palette.primary : "rgba(245,236,215,0.2)" }}>
                    {count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Search + Filter Bar */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <input
            id="admin-search"
            type="text"
            placeholder="Search by name, phone, or order ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1, minWidth: 220 }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            {(["all", "PENDING", "RENDERING", "COMPLETE", "DELIVERED"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "7px 14px",
                  fontSize: 12,
                  fontWeight: 600,
                  borderRadius: 8,
                  border: filter === f ? "1px solid rgba(212,175,55,0.45)" : "1px solid rgba(212,175,55,0.15)",
                  background: filter === f ? "rgba(212,175,55,0.12)" : "transparent",
                  color: filter === f ? "#D4AF37" : "rgba(245,236,215,0.4)",
                  cursor: "pointer",
                  transition: "all 0.2s",
                  textTransform: "capitalize",
                }}
              >
                {f === "all" ? "All" : (STATUS_CONFIG[f]?.icon + " " + STATUS_CONFIG[f]?.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Orders Table */}
        <div
          style={{
            background: "rgba(28,10,0,0.6)",
            border: "1px solid rgba(212,175,55,0.14)",
            borderRadius: 18,
            overflow: "hidden",
          }}
        >
          {/* Table Header */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 110px 90px 80px 160px",
              padding: "12px 20px",
              borderBottom: "1px solid rgba(212,175,55,0.1)",
              fontSize: 11,
              color: "rgba(245,236,215,0.4)",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              background: "rgba(0,0,0,0.2)",
            }}
          >
            <span>Order / Couple</span>
            <span style={{ textAlign: "center" }}>Status</span>
            <span style={{ textAlign: "center" }}>Photos</span>
            <span style={{ textAlign: "center" }}>Video</span>
            <span style={{ textAlign: "right" }}>Actions</span>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: "center", color: "rgba(245,236,215,0.35)" }}>
              <div style={{ fontSize: 28, marginBottom: 8, animation: "pulse 1.5s ease-in-out infinite" }}>⚙️</div>
              <div>Loading orders...</div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>
                {searchQuery ? "🔍" : "📭"}
              </div>
              <p style={{ color: "rgba(245,236,215,0.35)", fontSize: 15, margin: 0 }}>
                {searchQuery ? `No orders matching "${searchQuery}"` : "No orders yet"}
              </p>
              {!searchQuery && (
                <Link
                  href="/create"
                  style={{ color: "#D4AF37", fontSize: 13, textDecoration: "none", marginTop: 8, display: "inline-block" }}
                >
                  Create first invite →
                </Link>
              )}
            </div>
          ) : (
            <div>
              {filteredOrders.map((order) => {
                const templateId = ((order as unknown as { templateId?: string }).templateId || order.style) as TemplateId;
                const tc = TEMPLATE_CONFIGS[templateId] ?? TEMPLATE_CONFIGS["royal-rajasthani"];
                const statusCfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.PENDING;
                const isExpanded = expandedId === order.id;
                const isRenderingLocally = renderingIds.has(order.id);

                return (
                  <div key={order.id} style={{ borderBottom: "1px solid rgba(212,175,55,0.07)" }}>
                    {/* Main Row */}
                    <div
                      className="admin-row"
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 110px 90px 80px 160px",
                        padding: "14px 20px",
                        alignItems: "center",
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedId(isExpanded ? null : order.id)}
                    >
                      {/* Order Info */}
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontWeight: 700, fontSize: 15 }}>
                            {order.details.groomName} <span style={{ color: "#D4AF37" }}>×</span> {order.details.brideName}
                          </span>
                          {order.tier === "premium" && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: "rgba(212,175,55,0.18)", color: "#D4AF37", padding: "1px 7px", borderRadius: 20, border: "1px solid rgba(212,175,55,0.3)" }}>
                              PREMIUM
                            </span>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 10, fontSize: 12, color: "rgba(245,236,215,0.4)", alignItems: "center" }}>
                          {/* Template palette strip */}
                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <span style={{ display: "inline-flex", gap: 2 }}>
                              {[tc.palette.primary, tc.palette.secondary, tc.palette.accent].map((c, i) => (
                                <span key={i} style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: c, border: "1px solid rgba(255,255,255,0.15)" }} />
                              ))}
                            </span>
                            <span style={{ color: tc.palette.primary, fontWeight: 600 }}>{tc.emoji} {tc.name}</span>
                          </span>
                          <span>•</span>
                          <span>📅 {order.details.weddingDate}</span>
                          <span>•</span>
                          <span style={{ fontFamily: "monospace", fontSize: 10, opacity: 0.6 }}>{order.id}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(245,236,215,0.28)", marginTop: 2 }}>
                          📱 {order.customerPhone || "No phone"} · Created {formatDate(order.createdAt)}
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div style={{ textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
                        <select
                          value={order.status}
                          onChange={(e) => updateStatus(order.id, e.target.value as OrderStatus)}
                          style={{
                            background: statusCfg.bg,
                            border: `1px solid ${statusCfg.border}`,
                            color: statusCfg.text,
                            borderRadius: 20,
                            padding: "4px 8px",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {(["PENDING", "RENDERING", "COMPLETE", "DELIVERED"] as const).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_CONFIG[s].icon} {STATUS_CONFIG[s].label}
                            </option>
                          ))}
                        </select>
                        {order.status === "RENDERING" && (
                          <div style={{ fontSize: 10, color: "#fdba74", marginTop: 3, animation: "pulse 1.5s ease-in-out infinite" }}>
                            Processing...
                          </div>
                        )}
                      </div>

                      {/* Photo Count */}
                      <div style={{ textAlign: "center", fontSize: 13, color: "rgba(245,236,215,0.5)" }}>
                        {order.photos.length > 0 ? (
                          <span style={{ color: "#86efac" }}>📸 {order.photos.length}</span>
                        ) : (
                          <span style={{ color: "#f87171" }}>⚠️ 0</span>
                        )}
                      </div>

                      {/* Video Status */}
                      <div style={{ textAlign: "center" }}>
                        {order.videoUrl ? (
                          <a
                            href={order.videoUrl}
                            download={`invite-${order.id}.mp4`}
                            style={{ color: "#86efac", fontSize: 18, textDecoration: "none" }}
                            onClick={(e) => e.stopPropagation()}
                            title="Download MP4"
                          >
                            ⬇️
                          </a>
                        ) : (
                          <span style={{ color: "rgba(245,236,215,0.2)", fontSize: 13 }}>—</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div
                        style={{ display: "flex", gap: 6, justifyContent: "flex-end", flexWrap: "wrap" }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Avatar QA Review Button — prominent for AVATAR_QA orders */}
                        {order.status === "AVATAR_QA" && (
                          <Link
                            href={`/admin/orders/${order.id}/avatar-qa`}
                            style={{
                              padding: "6px 12px", fontSize: 12, fontWeight: 700,
                              background: "rgba(168,85,247,0.15)",
                              border: "1px solid rgba(168,85,247,0.45)",
                              borderRadius: 8, color: "#c084fc",
                              textDecoration: "none", display: "inline-flex",
                              alignItems: "center", gap: 4,
                              transition: "all 0.2s", animation: "pulse 2s ease-in-out infinite",
                            }}
                          >
                            🎨 Review Avatars
                          </Link>
                        )}
                        {/* Render Button */}
                        {!order.videoUrl && order.status !== "RENDERING" && order.photos.length > 0 && (
                          <button
                            className="btn-primary"
                            onClick={() => triggerRender(order.id)}
                            disabled={isRenderingLocally}
                            style={{ padding: "6px 12px", fontSize: 12 }}
                          >
                            {isRenderingLocally ? "⏳..." : "🎬 Render"}
                          </button>
                        )}
                        {order.status === "RENDERING" && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#fdba74" }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #fdba74", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                            Rendering
                          </div>
                        )}
                        {/* Re-render Button (video exists) */}
                        {order.videoUrl && (
                          <button
                            className="btn-ghost"
                            onClick={() => triggerRender(order.id)}
                            disabled={isRenderingLocally || order.status === "RENDERING"}
                            style={{ padding: "6px 10px", fontSize: 11 }}
                            title="Re-render video"
                          >
                            🔄
                          </button>
                        )}
                        {/* View button */}
                        <Link
                          href={`/preview/${order.id}`}
                          style={{
                            padding: "6px 12px",
                            fontSize: 12,
                            fontWeight: 600,
                            border: "1px solid rgba(212,175,55,0.2)",
                            borderRadius: 8,
                            color: "#D4AF37",
                            textDecoration: "none",
                            transition: "all 0.2s",
                          }}
                        >
                          View
                        </Link>
                        {/* Expand toggle */}
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : order.id)}
                          style={{
                            background: "transparent",
                            border: "1px solid rgba(212,175,55,0.15)",
                            color: "rgba(245,236,215,0.4)",
                            borderRadius: 8,
                            padding: "6px 8px",
                            cursor: "pointer",
                            fontSize: 12,
                            transition: "all 0.2s",
                          }}
                        >
                          {isExpanded ? "▲" : "▼"}
                        </button>
                      </div>
                    </div>

                    {/* Expanded Details Panel */}
                    {isExpanded && (
                      <div
                        style={{
                          padding: "16px 20px 20px",
                          background: "rgba(0,0,0,0.25)",
                          borderTop: "1px solid rgba(212,175,55,0.08)",
                        }}
                      >
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr 1fr",
                            gap: 16,
                          }}
                        >
                          {/* Left: Details */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,236,215,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                              Wedding Details
                            </div>
                            {[
                              ["👫 Groom", order.details.groomName],
                              ["👰 Bride", order.details.brideName],
                              ["📅 Date", order.details.weddingDate],
                              ["📍 Venue", order.details.venue || "—"],
                              ["🏙️ Cities", `${order.details.groomCity || "—"} × ${order.details.brideCity || "—"}`],
                            ].map(([label, val]) => (
                              <div key={label} style={{ display: "flex", gap: 8, fontSize: 13, marginBottom: 5 }}>
                                <span style={{ color: "rgba(245,236,215,0.4)", minWidth: 80 }}>{label}</span>
                                <span style={{ color: "#F5ECD7" }}>{val}</span>
                              </div>
                            ))}
                          </div>

                          {/* Middle: Template & Scenes */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,236,215,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                              Template &amp; Scenes
                            </div>
                            {/* Template palette header */}
                            <div
                              style={{
                                height: 4,
                                borderRadius: 4,
                                marginBottom: 8,
                                background: `linear-gradient(90deg, ${tc.palette.background}, ${tc.palette.secondary}, ${tc.palette.primary}, ${tc.palette.accent})`,
                              }}
                            />
                            <div style={{ fontSize: 12, color: "rgba(245,236,215,0.5)", marginBottom: 8 }}>
                              🎬 Template: <span style={{ color: tc.palette.primary, fontWeight: 600 }}>{tc.emoji} {tc.name}</span>
                            </div>
                            <div style={{ fontSize: 12, color: "rgba(245,236,215,0.4)", marginBottom: 8 }}>
                              🎭 Ceremony: <span style={{ color: "#F5ECD7", textTransform: "capitalize" }}>{tc.functionType}</span>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                              {order.scenes.map((s) => (
                                <span
                                  key={s}
                                  style={{
                                    fontSize: 11,
                                    padding: "3px 10px",
                                    borderRadius: 20,
                                    background: `${tc.palette.primary}18`,
                                    border: `1px solid ${tc.palette.primary}33`,
                                    color: tc.palette.primary,
                                  }}
                                >
                                  {s}
                                </span>
                              ))}
                            </div>
                            <div style={{ fontSize: 12, color: "rgba(245,236,215,0.4)" }}>
                              📦 Tier: <span style={{ color: "#F5ECD7", textTransform: "capitalize" }}>{order.tier}</span>
                            </div>
                          </div>

                          {/* Right: Actions & Links */}
                          <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(245,236,215,0.35)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }}>
                              Quick Actions
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                              {order.videoUrl ? (
                                <>
                                  <a
                                    href={order.videoUrl}
                                    download={`invite-${order.id}.mp4`}
                                    style={{
                                      display: "block",
                                      padding: "8px 14px",
                                      background: "rgba(34,197,94,0.12)",
                                      border: "1px solid rgba(34,197,94,0.3)",
                                      borderRadius: 10,
                                      color: "#86efac",
                                      textDecoration: "none",
                                      fontSize: 13,
                                      fontWeight: 600,
                                      textAlign: "center",
                                    }}
                                  >
                                    ⬇️ Download MP4
                                  </a>
                                  <a
                                    href={`https://wa.me/${order.customerPhone?.replace(/\D/g, "")}?text=Your+wedding+video+is+ready!+%0A%0ADownload+here:+http://localhost:3000${order.videoUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      display: "block",
                                      padding: "8px 14px",
                                      background: "rgba(37,211,102,0.12)",
                                      border: "1px solid rgba(37,211,102,0.3)",
                                      borderRadius: 10,
                                      color: "#4ade80",
                                      textDecoration: "none",
                                      fontSize: 13,
                                      fontWeight: 600,
                                      textAlign: "center",
                                    }}
                                  >
                                    💬 Send via WhatsApp
                                  </a>
                                </>
                              ) : (
                                <div
                                  style={{
                                    padding: "8px 14px",
                                    background: "rgba(251,146,60,0.08)",
                                    border: "1px solid rgba(251,146,60,0.2)",
                                    borderRadius: 10,
                                    color: "rgba(253,186,116,0.7)",
                                    fontSize: 12,
                                    textAlign: "center",
                                  }}
                                >
                                  Video not yet rendered
                                </div>
                              )}

                              <Link
                                href={`/preview/${order.id}`}
                                style={{
                                  display: "block",
                                  padding: "8px 14px",
                                  background: "rgba(212,175,55,0.08)",
                                  border: "1px solid rgba(212,175,55,0.2)",
                                  borderRadius: 10,
                                  color: "#D4AF37",
                                  textDecoration: "none",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  textAlign: "center",
                                }}
                              >
                                🎥 Open Preview Page
                              </Link>

                              <button
                                onClick={() => deleteOrder(order.id)}
                                style={{
                                  display: "block",
                                  width: "100%",
                                  padding: "8px 14px",
                                  background: "rgba(239,68,68,0.08)",
                                  border: "1px solid rgba(239,68,68,0.2)",
                                  borderRadius: 10,
                                  color: "#fca5a5",
                                  fontSize: 12,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  textAlign: "center",
                                }}
                              >
                                🗑️ Delete Order
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* 🗂️ Asset Manager (US-5.5) */}
                        <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(212,175,55,0.08)" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#D4AF37", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                            🗂️ Asset Manager
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                            {/* 1. User Uploads */}
                            <div>
                              <div style={{ fontSize: 11, color: "rgba(245,236,215,0.4)", marginBottom: 8, textTransform: "uppercase" }}>
                                📸 User Uploads ({order.photos.length})
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                {order.photos.length > 0 ? (
                                  order.photos.map((src, i) => (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      key={i}
                                      src={src}
                                      alt={`Reference photo ${i + 1}`}
                                      style={{ width: 80, height: 80, objectFit: "cover", borderRadius: 8, border: "1px solid rgba(212,175,55,0.25)" }}
                                    />
                                  ))
                                ) : (
                                  <span style={{ fontSize: 12, color: "#f87171" }}>⚠️ No photos uploaded</span>
                                )}
                              </div>
                            </div>

                            {/* 2. AI Avatars (Avatar QA) */}
                            {order.avatarQa && order.avatarQa.assets.length > 0 && (
                              <div data-testid="avatar-review">
                                <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "rgba(245,236,215,0.4)", textTransform: "uppercase", marginBottom: 8 }}>
                                  🎨 Generated Avatars
                                  <span data-testid="avatar-qa-state" style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(168,85,247,0.14)", border: "1px solid rgba(168,85,247,0.3)", color: "#c084fc" }}>
                                    {order.avatarQa.state} {order.avatarQa.attempts > 0 ? `· attempt ${order.avatarQa.attempts}/2` : ""}
                                  </span>
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                                  {order.avatarQa.assets.map((avatarAsset) => {
                                    const check = order.avatarQa!.checks.find((c) => c.pose === avatarAsset.pose);
                                    const failed = check ? !check.passed : false;
                                    return (
                                      <div key={avatarAsset.pose} data-testid="avatar-asset" style={{ width: 140, border: `1px solid ${failed ? "rgba(239,68,68,0.35)" : "rgba(212,175,55,0.2)"}`, borderRadius: 12, padding: 10, background: "rgba(0,0,0,0.2)" }}>
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={avatarAsset.url} alt={avatarAsset.pose} style={{ width: "100%", aspectRatio: "1/1", objectFit: "contain", borderRadius: 8, background: "repeating-conic-gradient(rgba(255,255,255,0.05) 0% 25%, transparent 0% 50%) 50% / 16px 16px" }} />
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 6, fontSize: 11 }}>
                                          <span style={{ textTransform: "capitalize", color: "#F5ECD7" }}>{avatarAsset.pose}</span>
                                          <span style={{ fontSize: 10, color: failed ? "#fca5a5" : "#86efac" }}>{failed ? `✕ failed` : `✓ ${Math.round(avatarAsset.identityScore * 100)}%`}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                                  <button className="btn-primary" onClick={() => reviewAvatars(order.id, "approve")} disabled={reviewingIds.has(order.id) || order.avatarQa.state === "Approved" || order.avatarQa.state === "Downgraded"} style={{ padding: "6px 14px", fontSize: 12 }}>
                                    {reviewingIds.has(order.id) ? "⏳..." : "✅ Approve Avatars"}
                                  </button>
                                  <button onClick={() => reviewAvatars(order.id, "reject")} disabled={reviewingIds.has(order.id) || order.avatarQa.state === "Downgraded"} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, borderRadius: 10, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5", cursor: "pointer" }}>
                                    ↩️ Reject &amp; Regenerate
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* 3. Render Artifacts (Video & Thumbnail) */}
                            <div>
                              <div style={{ fontSize: 11, color: "rgba(245,236,215,0.4)", marginBottom: 8, textTransform: "uppercase" }}>
                                🎬 Final Artifacts
                              </div>
                              <div style={{ display: "flex", gap: 16 }}>
                                {order.thumbnailUrl && !order.videoUrl && (
                                  <div>
                                    <div style={{ fontSize: 10, color: "rgba(245,236,215,0.3)", marginBottom: 4 }}>Thumbnail</div>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={order.thumbnailUrl} alt="Thumbnail" style={{ width: 120, borderRadius: 8, border: "1px solid rgba(212,175,55,0.2)" }} />
                                  </div>
                                )}
                                
                                {order.videoUrl ? (
                                  <div style={{ width: 200 }}>
                                    <div style={{ fontSize: 10, color: "rgba(245,236,215,0.3)", marginBottom: 4 }}>Rendered Video (1080x1920)</div>
                                    <video 
                                      src={order.videoUrl} 
                                      poster={order.thumbnailUrl}
                                      preload="metadata"
                                      controls 
                                      playsInline
                                      style={{ width: "100%", borderRadius: 8, border: "1px solid rgba(212,175,55,0.4)", background: "rgba(212,175,55,0.05)" }} 
                                    />
                                  </div>
                                ) : (
                                  order.status === "RENDERING" ? (
                                    <div style={{ padding: "20px 40px", background: "rgba(251,146,60,0.05)", border: "1px dashed rgba(251,146,60,0.3)", borderRadius: 12, color: "#fdba74", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                                      <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid #fdba74", borderTopColor: "transparent", animation: "spin 0.8s linear infinite" }} />
                                      Rendering video...
                                    </div>
                                  ) : (
                                    <div style={{ padding: "20px 40px", background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 12, color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
                                      No video artifacts yet.
                                    </div>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer count */}
        {!loading && filteredOrders.length > 0 && (
          <div style={{ textAlign: "center", fontSize: 12, color: "rgba(245,236,215,0.25)", marginTop: 16 }}>
            Showing {filteredOrders.length} of {orders.length} orders · Auto-refreshes every 8s
          </div>
        )}
      </div>
    </main>
  );
}

