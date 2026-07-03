"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { OrderData } from "@/lib/types";
import { MAX_REGENERATION_ATTEMPTS } from "@/lib/avatar/qa-state";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type QaAction = "approve" | "reject" | "downgrade";
type ActionState = "idle" | "loading" | "done" | "error";

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function PhotoCard({ url, index }: { url: string; index: number }) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  return (
    <div style={{
      aspectRatio: "3/4",
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid rgba(212,175,55,0.2)",
      background: "rgba(28,10,0,0.6)",
      position: "relative",
    }}>
      {!loaded && !errored && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(245,236,215,0.2)", fontSize: 24,
          animation: "pulse 1.5s ease-in-out infinite",
        }}>
          📸
        </div>
      )}
      {errored ? (
        <div style={{
          height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 8,
          color: "rgba(245,236,215,0.25)", fontSize: 12,
        }}>
          <span style={{ fontSize: 28 }}>🖼️</span>
          Photo {index + 1}
        </div>
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={`Reference photo ${index + 1}`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          style={{
            width: "100%", height: "100%", objectFit: "cover", display: "block",
            opacity: loaded ? 1 : 0, transition: "opacity 0.3s",
          }}
        />
      )}
      <div style={{
        position: "absolute", bottom: 6, right: 6,
        background: "rgba(10,5,0,0.7)", borderRadius: 8,
        padding: "2px 7px", fontSize: 10, color: "rgba(245,236,215,0.5)",
      }}>
        #{index + 1}
      </div>
    </div>
  );
}

function AvatarCard({
  pose,
  url,
  checkPassed,
  failedCheck,
  selected,
  onClick,
}: {
  pose: string;
  url: string;
  checkPassed: boolean;
  failedCheck?: string;
  selected: boolean;
  onClick: () => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const isPlaceholder = !url || url.startsWith("placeholder:");

  return (
    <div
      onClick={onClick}
      style={{
        borderRadius: 14, overflow: "hidden",
        border: `2px solid ${selected ? "#D4AF37" : "rgba(212,175,55,0.15)"}`,
        background: "rgba(28,10,0,0.6)",
        cursor: "pointer",
        transition: "border-color 0.2s, box-shadow 0.2s",
        boxShadow: selected ? "0 0 18px rgba(212,175,55,0.25)" : "none",
      }}
    >
      <div style={{ aspectRatio: "3/4", position: "relative" }}>
        {isPlaceholder ? (
          <div style={{
            height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            background: `linear-gradient(160deg, rgba(212,175,55,0.08), rgba(28,10,0,0.5))`,
            gap: 10, padding: 16,
          }}>
            <div style={{ fontSize: 36 }}>
              {pose === "wedding" ? "💒" : pose === "haldi" ? "🌼" : pose === "sangeet" ? "🎶" : pose === "baraat" ? "🎺" : pose === "mehandi" ? "🌿" : "🥂"}
            </div>
            <div style={{ fontSize: 11, color: "rgba(245,236,215,0.4)", textAlign: "center" }}>
              {url?.replace("placeholder:", "") || "Avatar preview"}
            </div>
          </div>
        ) : (
          <>
            {!loaded && (
              <div style={{
                position: "absolute", inset: 0, display: "flex",
                alignItems: "center", justifyContent: "center",
                color: "rgba(245,236,215,0.2)", fontSize: 28,
                animation: "pulse 1.5s ease-in-out infinite",
              }}>
                🎨
              </div>
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`${pose} avatar`}
              onLoad={() => setLoaded(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: loaded ? 1 : 0, transition: "opacity 0.3s" }}
            />
          </>
        )}
        {/* Check badge */}
        <div style={{
          position: "absolute", top: 8, right: 8,
          background: checkPassed ? "rgba(34,197,94,0.9)" : "rgba(239,68,68,0.9)",
          borderRadius: 8, padding: "3px 8px", fontSize: 10, fontWeight: 700,
          color: "#fff", backdropFilter: "blur(4px)",
        }}>
          {checkPassed ? "✅ Pass" : `⚠️ ${failedCheck ?? "Fail"}`}
        </div>
        {selected && (
          <div style={{
            position: "absolute", inset: 0, border: "3px solid #D4AF37",
            borderRadius: 12, pointerEvents: "none",
          }} />
        )}
      </div>
      <div style={{ padding: "8px 12px", background: "rgba(10,5,0,0.6)" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#F5ECD7", textTransform: "capitalize" }}>{pose}</div>
        <div style={{ fontSize: 10, color: "rgba(245,236,215,0.35)", marginTop: 2 }}>
          {checkPassed ? "All checks passed" : `Failed: ${failedCheck ?? "unknown"}`}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function AvatarQaPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionState, setActionState] = useState<ActionState>("idle");
  const [actionResult, setActionResult] = useState<string | null>(null);
  const [selectedAvatarIdx, setSelectedAvatarIdx] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/orders?id=${orderId}`);
        if (res.ok) setOrder(await res.json());
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  const handleAction = async (action: QaAction) => {
    if (!order) return;
    setActionState("loading");
    setActionResult(null);

    try {
      const res = await fetch("/api/avatar-qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          action,
          reason: action === "downgrade" ? "Admin manually downgraded to Standard tier" : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");

      setActionState("done");
      if (action === "approve") {
        setActionResult("✅ Avatars approved! Order is now AVATAR_READY and can be rendered.");
        setOrder((o) => o ? { ...o, status: "AVATAR_READY" } : null);
      } else if (action === "reject") {
        const remaining = MAX_REGENERATION_ATTEMPTS - data.attempts;
        if (data.state === "Downgraded") {
          setActionResult("⚠️ Regeneration budget exhausted — order downgraded to Standard tier.");
          setOrder((o) => o ? { ...o, status: "AVATAR_READY", tier: "standard" } : null);
        } else {
          setActionResult(`↩️ Rejected — regeneration triggered (${remaining} attempt${remaining !== 1 ? "s" : ""} remaining).`);
        }
      } else {
        setActionResult("⬇️ Downgraded to Standard tier — avatars bypassed. Order is AVATAR_READY.");
        setOrder((o) => o ? { ...o, status: "AVATAR_READY", tier: "standard" } : null);
      }
    } catch (err) {
      setActionState("error");
      setActionResult(`❌ ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // ── Build avatar assets from avatarQa or fallback to uploaded photos as stand-ins ──
  const avatarAssets: { pose: string; url: string; passed: boolean; failedCheck?: string }[] = (() => {
    if (order?.avatarQa?.assets && order.avatarQa.assets.length > 0) {
      return order.avatarQa.assets.map((asset, i) => {
        const check = order.avatarQa?.checks?.[i];
        return {
          pose: asset.pose,
          url: asset.url,
          passed: check?.passed ?? true,
          failedCheck: check?.failedCheck,
        };
      });
    }
    // Fallback: use uploaded reference photos as stand-ins with placeholder labels
    if (order?.photos && order.photos.length > 0) {
      return order.photos.slice(0, 4).map((url, i) => ({
        pose: ["wedding", "haldi", "sangeet", "reception"][i] ?? `pose-${i + 1}`,
        url,
        passed: true,
      }));
    }
    // If no photos, show placeholders
    return ["wedding", "haldi", "sangeet", "reception"].map((pose) => ({
      pose,
      url: `placeholder:Stand-in photo (AI not yet generated)`,
      passed: true,
    }));
  })();

  const attempts = order?.avatarQa?.attempts ?? 0;
  const remainingAttempts = MAX_REGENERATION_ATTEMPTS - attempts;
  const isActionable = order?.status === "AVATAR_QA";

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#0A0500", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "rgba(245,236,215,0.4)" }}>
          <div style={{ width: 32, height: 32, border: "2px solid rgba(212,175,55,0.3)", borderTopColor: "#D4AF37", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          Loading order...
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main style={{ minHeight: "100vh", background: "#0A0500", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
          <p style={{ color: "rgba(245,236,215,0.45)", fontSize: 15 }}>Order not found</p>
          <Link href="/admin" style={{ color: "#D4AF37", textDecoration: "none", fontSize: 14 }}>← Back to Dashboard</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0A0500", color: "#F5ECD7" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: none } }
      `}</style>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px",
        borderBottom: "1px solid rgba(212,175,55,0.1)",
        background: "rgba(10,5,0,0.85)", backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/admin" style={{ color: "rgba(245,236,215,0.4)", textDecoration: "none", fontSize: 13 }}>
            ← Dashboard
          </Link>
          <span style={{ color: "rgba(212,175,55,0.3)" }}>|</span>
          <span style={{
            fontFamily: "var(--font-playfair, serif)", fontSize: 16, fontWeight: 700,
            background: "linear-gradient(135deg,#F0D060,#D4AF37)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            🎨 Avatar QA Review
          </span>
          <span style={{
            padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: "rgba(168,85,247,0.12)", color: "#c084fc",
            border: "1px solid rgba(168,85,247,0.3)",
          }}>
            {order.status}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "rgba(245,236,215,0.4)" }}>
            {order.details.groomName} × {order.details.brideName}
          </span>
          <span style={{ fontFamily: "monospace", fontSize: 10, color: "rgba(245,236,215,0.2)" }}>
            {order.id}
          </span>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 24px 60px" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "var(--font-playfair, serif)", fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>
            Avatar Quality Review
          </h1>
          <p style={{ color: "rgba(245,236,215,0.45)", fontSize: 14, margin: 0 }}>
            Compare the AI-generated avatars against the client&apos;s reference photos. Approve, reject &amp; regenerate, or downgrade to Standard tier.
          </p>
          {attempts > 0 && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              marginTop: 10, padding: "5px 14px",
              background: attempts >= MAX_REGENERATION_ATTEMPTS ? "rgba(239,68,68,0.1)" : "rgba(251,146,60,0.1)",
              border: `1px solid ${attempts >= MAX_REGENERATION_ATTEMPTS ? "rgba(239,68,68,0.3)" : "rgba(251,146,60,0.3)"}`,
              borderRadius: 20, fontSize: 12, fontWeight: 600,
              color: attempts >= MAX_REGENERATION_ATTEMPTS ? "#fca5a5" : "#fdba74",
            }}>
              ⚡ Attempt {attempts} / {MAX_REGENERATION_ATTEMPTS} · {remainingAttempts > 0 ? `${remainingAttempts} remaining` : "Budget exhausted — next reject will downgrade"}
            </div>
          )}
        </div>

        {/* ── Result Banner ── */}
        {actionResult && (
          <div style={{
            marginBottom: 24, padding: "14px 20px", borderRadius: 14,
            background: actionState === "done" ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)",
            border: `1px solid ${actionState === "done" ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`,
            fontSize: 14, fontWeight: 600,
            color: actionState === "done" ? "#86efac" : "#fca5a5",
            animation: "fadeIn 0.3s ease",
          }}>
            {actionResult}
          </div>
        )}

        {/* ── Main Split ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 28, alignItems: "start" }}>

          {/* LEFT — Reference Photos */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#D4AF37",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              📸 Reference Photos
              <span style={{ background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.2)", borderRadius: 20, padding: "2px 9px", fontSize: 10, color: "#D4AF37" }}>
                {order.photos.length} uploaded
              </span>
            </div>

            {order.photos.length === 0 ? (
              <div style={{
                border: "2px dashed rgba(212,175,55,0.15)", borderRadius: 16,
                padding: "32px", textAlign: "center", color: "rgba(245,236,215,0.3)",
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                No photos uploaded for this order
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {order.photos.map((url, i) => (
                  <PhotoCard key={i} url={url} index={i} />
                ))}
              </div>
            )}

            {/* Client details */}
            <div style={{
              marginTop: 18, padding: "16px 18px",
              background: "rgba(28,10,0,0.55)", border: "1px solid rgba(212,175,55,0.1)",
              borderRadius: 14,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#D4AF37", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>
                Order Details
              </div>
              {[
                ["Couple", `${order.details.groomName} × ${order.details.brideName}`],
                ["Date", order.details.weddingDate || "—"],
                ["Venue", order.details.venue || "—"],
                ["Tier", order.tier.toUpperCase()],
                ["Scenes", order.scenes.join(", ")],
              ].map(([label, val]) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between", marginBottom: 7, fontSize: 12 }}>
                  <span style={{ color: "rgba(245,236,215,0.4)" }}>{label}</span>
                  <span style={{ color: "#F5ECD7", fontWeight: 600 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT — Generated Avatars + Actions */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: "#c084fc",
              textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              🎨 Generated Avatars
              {order.avatarQa?.assets?.length === 0 && (
                <span style={{ background: "rgba(251,146,60,0.1)", border: "1px solid rgba(251,146,60,0.3)", borderRadius: 20, padding: "2px 9px", fontSize: 10, color: "#fdba74" }}>
                  Using stand-in photos (AI pending)
                </span>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10, marginBottom: 20 }}>
              {avatarAssets.map((asset, i) => (
                <AvatarCard
                  key={i}
                  pose={asset.pose}
                  url={asset.url}
                  checkPassed={asset.passed}
                  failedCheck={asset.failedCheck}
                  selected={selectedAvatarIdx === i}
                  onClick={() => setSelectedAvatarIdx(selectedAvatarIdx === i ? null : i)}
                />
              ))}
            </div>

            {/* Auto-check summary */}
            <div style={{
              padding: "14px 18px", background: "rgba(28,10,0,0.5)",
              border: "1px solid rgba(212,175,55,0.1)", borderRadius: 14, marginBottom: 20,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#F0D060", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                🤖 Auto-Check Results
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  { label: "Transparent Background", passed: avatarAssets.every((a) => a.failedCheck !== "transparency"), icon: "🔲" },
                  { label: "Face Detected", passed: avatarAssets.every((a) => a.failedCheck !== "face"), icon: "👤" },
                  { label: "All Poses Generated", passed: avatarAssets.length >= (order.scenes.length || 1), icon: "🎭" },
                ].map(({ label, passed, icon }) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12 }}>
                    <span style={{
                      width: 22, height: 22, borderRadius: 6,
                      background: passed ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      border: `1px solid ${passed ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, flexShrink: 0,
                    }}>
                      {passed ? "✓" : "✕"}
                    </span>
                    <span style={{ color: passed ? "rgba(134,239,172,0.8)" : "#fca5a5" }}>{icon} {label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              padding: "20px", background: "rgba(28,10,0,0.6)",
              border: "1px solid rgba(212,175,55,0.15)", borderRadius: 16,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(245,236,215,0.5)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 16 }}>
                Admin Decision
              </div>

              {!isActionable ? (
                <div style={{ textAlign: "center", padding: "16px", color: "rgba(245,236,215,0.4)", fontSize: 13 }}>
                  This order is in <strong>{order.status}</strong> status — no review action needed.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {/* Approve */}
                  <button
                    onClick={() => handleAction("approve")}
                    disabled={actionState === "loading"}
                    style={{
                      background: "linear-gradient(135deg, #22c55e, #16a34a)",
                      border: "none", borderRadius: 12, color: "#fff",
                      fontWeight: 700, fontSize: 14, padding: "13px 20px",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 8, transition: "filter 0.2s",
                      opacity: actionState === "loading" ? 0.6 : 1,
                    }}
                  >
                    {actionState === "loading" ? <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> : null}
                    ✅ Approve Avatars → Proceed to Render
                  </button>

                  {/* Reject */}
                  <button
                    onClick={() => handleAction("reject")}
                    disabled={actionState === "loading"}
                    style={{
                      background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.35)",
                      borderRadius: 12, color: "#fca5a5",
                      fontWeight: 700, fontSize: 14, padding: "12px 20px",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 8, transition: "all 0.2s",
                      opacity: actionState === "loading" ? 0.6 : 1,
                    }}
                  >
                    {remainingAttempts > 0
                      ? `❌ Reject + Regenerate (${remainingAttempts} attempt${remainingAttempts !== 1 ? "s" : ""} left)`
                      : "❌ Reject → Auto-Downgrade to Standard"
                    }
                  </button>

                  {/* Downgrade */}
                  <button
                    onClick={() => handleAction("downgrade")}
                    disabled={actionState === "loading"}
                    style={{
                      background: "transparent", border: "1px solid rgba(245,236,215,0.12)",
                      borderRadius: 12, color: "rgba(245,236,215,0.45)",
                      fontWeight: 600, fontSize: 13, padding: "11px 20px",
                      cursor: "pointer", display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 6, transition: "all 0.2s",
                    }}
                  >
                    ⬇️ Skip Avatars — Downgrade to Standard Tier
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
