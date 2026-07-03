"use client";

import React, { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { OrderData, TEMPLATE_CONFIGS, WeddingVideoProps, SCENE_CONFIGS, type TemplateId } from "@/lib/types";
import dynamic from "next/dynamic";

const RemotionPlayer = dynamic(() => import("./RemotionPlayer"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: "100%",
        aspectRatio: "9/16",
        background: "rgba(28,10,0,0.6)",
        borderRadius: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 36, animation: "pulse 1.5s ease-in-out infinite" }}>🎬</div>
      <p style={{ color: "rgba(245,236,215,0.35)", fontSize: 13, margin: 0 }}>Loading preview...</p>
    </div>
  ),
});

const STATUS_STEPS = ["PENDING", "RENDERING", "COMPLETE", "DELIVERED"] as const;
type OrderStatus = (typeof STATUS_STEPS)[number];

function daysUntil(dateStr: string): number | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const target = new Date(dateStr);
  if (isNaN(target.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default function PreviewPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [renderProgress, setRenderProgress] = useState(0);
  const [triggeringRender, setTriggeringRender] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [generatingPreview, setGeneratingPreview] = useState(false);
  const previewPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const renderIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders?id=${orderId}`);
      if (res.ok) {
        setOrder(await res.json());
      }
    } catch (err) {
      console.error("Error fetching order:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    // Poll every 4s to pick up render completions
    pollingRef.current = setInterval(fetchOrder, 4000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (renderIntervalRef.current) clearInterval(renderIntervalRef.current);
      if (previewPollRef.current) clearInterval(previewPollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // Stop polling once we have a completed video
  useEffect(() => {
    if (order?.status === "COMPLETE" || order?.status === "DELIVERED") {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setRenderProgress(100);
      if (renderIntervalRef.current) {
        clearInterval(renderIntervalRef.current);
        renderIntervalRef.current = null;
      }
    }
  }, [order?.status]);

  const triggerRender = async () => {
    if (triggeringRender) return;
    setTriggeringRender(true);
    setRenderProgress(0);

    // Start fake progress animation
    renderIntervalRef.current = setInterval(() => {
      setRenderProgress((prev) => {
        if (prev >= 90) return prev;
        return Math.min(prev + Math.random() * 3 + 1, 90);
      });
    }, 1500);

    try {
      await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      setOrder((prev) => (prev ? { ...prev, status: "RENDERING" } : null));
    } catch (err) {
      console.error("Render error:", err);
    } finally {
      setTriggeringRender(false);
    }
  };

  // Generate a free, watermarked low-res preview (PRD §10.1) before payment.
  const triggerPreview = async () => {
    if (generatingPreview) return;
    setGeneratingPreview(true);
    try {
      await fetch("/api/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, preview: true }),
      });
      // Poll the render endpoint until the watermarked preview artifact exists.
      if (previewPollRef.current) clearInterval(previewPollRef.current);
      previewPollRef.current = setInterval(async () => {
        try {
          const res = await fetch(`/api/render?orderId=${orderId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.previewUrl) {
              setPreviewUrl(data.previewUrl as string);
              setGeneratingPreview(false);
              if (previewPollRef.current) {
                clearInterval(previewPollRef.current);
                previewPollRef.current = null;
              }
            }
          }
        } catch {
          /* keep polling */
        }
      }, 4000);
    } catch (err) {
      console.error("Preview error:", err);
      setGeneratingPreview(false);
    }
  };

  if (loading && !order) {
    return (
      <main style={{ minHeight: "100vh", background: "#0A0500", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }}>💍</div>
          <p style={{ color: "rgba(245,236,215,0.45)", fontSize: 15 }}>Loading your invite...</p>
        </div>
      </main>
    );
  }

  if (!order) {
    return (
      <main style={{ minHeight: "100vh", background: "#0A0500", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>❌</div>
          <p style={{ color: "rgba(245,236,215,0.45)", fontSize: 15, marginBottom: 16 }}>Order not found</p>
          <Link href="/create" style={{ color: "#D4AF37", textDecoration: "none", fontSize: 14 }}>Create a new invite →</Link>
        </div>
      </main>
    );
  }

  // Resolve template config
  const templateId = ((order as unknown as { templateId?: string }).templateId || order.style || "royal-rajasthani") as TemplateId;
  const tc = TEMPLATE_CONFIGS[templateId] ?? TEMPLATE_CONFIGS["royal-rajasthani"];
  const days = daysUntil(order.details.weddingDate);
  const isReady = order.status === "COMPLETE" || order.status === "DELIVERED";

  const videoProps: WeddingVideoProps = {
    // ── Canonical InviteProps fields ──
    brideFirstName: order.details.brideName,
    groomFirstName: order.details.groomName,
    eventDate: order.details.weddingDate,
    venueName: order.details.venue || "",
    audioUrl: "",
    avatarType: "png" as const,
    templateId,
    functionType: tc.functionType as WeddingVideoProps["functionType"],
    tier: (order.tier === "premium" ? "premium" : "standard") as "standard" | "premium",
    voiceoverEnabled: false,
    // ── Legacy compat fields ──
    groomName: order.details.groomName,
    brideName: order.details.brideName,
    weddingDate: order.details.weddingDate,
    venue: order.details.venue || "",
    groomCity: order.details.groomCity || "",
    brideCity: order.details.brideCity || "",
    style: order.style,
    scenes: order.scenes,
    photos: order.photos,
    musicUrl: "",
  };

  const sceneDurations: Record<string, number> = {
    intro: 150, haldi: 150, sangeet: 150, varmala: 180,
    outro: 150, wedding: 210, firstmeet: 150, proposal: 150, family: 150,
  };
  // Use template fixed duration for new compositions; per-scene for royal-rajasthani
  const totalFrames = tc && templateId !== "royal-rajasthani"
    ? tc.durationInFrames
    : order.scenes.reduce((sum, s) => sum + (sceneDurations[s] || 150), 0)
      + Math.max(0, order.scenes.length - 1) * 15;

  const statusStepIndex = STATUS_STEPS.indexOf(order.status as OrderStatus);

  return (
    <main style={{ minHeight: "100vh", background: "#0A0500", color: "#F5ECD7" }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.45} }
        @keyframes spin  { to { transform: rotate(360deg) } }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes floatUp {
          0%   { transform: translateY(0); opacity: 0.7; }
          100% { transform: translateY(-24px); opacity: 0; }
        }
        .phone-frame {
          background: linear-gradient(160deg,#2a2a2a 0%,#111 50%,#222 100%);
          border-radius: 42px;
          padding: 14px 10px;
          box-shadow:
            0 0 0 1.5px #444,
            0 0 0 3px #222,
            0 30px 80px rgba(0,0,0,0.7),
            0 0 60px rgba(212,175,55,0.12);
          position: relative;
        }
        .phone-frame::before {
          content: '';
          position: absolute;
          top: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 60px;
          height: 6px;
          background: #333;
          border-radius: 3px;
        }
        .gold-btn {
          background: linear-gradient(135deg, #F0D060 0%, #D4AF37 50%, #A0832A 100%);
          color: #0A0500;
          font-weight: 700;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          font-size: 15px;
          transition: filter 0.2s, transform 0.1s, box-shadow 0.2s;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .gold-btn:hover { filter: brightness(1.1); transform: translateY(-2px); box-shadow: 0 8px 28px rgba(212,175,55,0.3); }
        .gold-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .wa-btn {
          background: rgba(37,211,102,0.1);
          border: 1px solid rgba(37,211,102,0.35);
          color: #4ade80;
          font-weight: 700;
          border-radius: 14px;
          font-size: 15px;
          transition: all 0.2s;
          text-decoration: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .wa-btn:hover { background: rgba(37,211,102,0.18); transform: translateY(-1px); }
        .card {
          background: rgba(28,10,0,0.55);
          border: 1px solid rgba(212,175,55,0.14);
          border-radius: 20px;
          padding: 24px;
          backdrop-filter: blur(8px);
        }
        .step-dot {
          width: 28px; height: 28px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700;
          flex-shrink: 0;
          transition: all 0.3s;
        }
      `}</style>

      {/* ── Nav ── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 28px",
        borderBottom: "1px solid rgba(212,175,55,0.1)",
        background: "rgba(10,5,0,0.85)",
        backdropFilter: "blur(20px)",
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <Link href="/" style={{
          fontFamily: "var(--font-playfair, serif)", fontSize: 18, fontWeight: 700,
          background: "linear-gradient(135deg,#F0D060,#D4AF37,#A0832A)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          textDecoration: "none",
        }}>
          💍 Digital Invites AI
        </Link>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {/* Status pill */}
          <span style={{
            padding: "4px 14px",
            borderRadius: 20,
            fontSize: 12,
            fontWeight: 700,
            background: isReady ? "rgba(34,197,94,0.12)" : order.status === "RENDERING" ? "rgba(251,146,60,0.12)" : "rgba(59,130,246,0.12)",
            color: isReady ? "#86efac" : order.status === "RENDERING" ? "#fdba74" : "#93c5fd",
            border: `1px solid ${isReady ? "rgba(34,197,94,0.3)" : order.status === "RENDERING" ? "rgba(251,146,60,0.3)" : "rgba(59,130,246,0.3)"}`,
          }}>
            {isReady ? "✅ Ready" : order.status === "RENDERING" ? "⚙️ Rendering" : "📥 Received"}
          </span>
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href).then(() => {
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              });
            }}
            style={{
              background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)",
              borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#D4AF37",
              cursor: "pointer", fontWeight: 600, transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 5,
            }}
          >
            {linkCopied ? "✅ Copied!" : "🔗 Copy Link"}
          </button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <div style={{
        background: "linear-gradient(180deg, rgba(212,175,55,0.06) 0%, transparent 60%)",
        padding: "40px 24px 0",
      }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 10 }}
            >
            <span style={{ color: tc.palette.primary }}>{tc.emoji} {tc.name}</span>
            <span style={{ color: "rgba(245,236,215,0.4)" }}> &nbsp;·&nbsp; </span>
            <span style={{ color: "rgba(245,236,215,0.6)", textTransform: "capitalize" }}>{tc.functionType} Invite</span>
          </div>
          <h1 style={{
            fontFamily: "var(--font-playfair, serif)",
            fontSize: "clamp(28px, 6vw, 48px)",
            fontWeight: 700,
            margin: "0 0 8px",
            lineHeight: 1.2,
          }}>
            {order.details.groomName}
            <span style={{ color: "#D4AF37", margin: "0 12px" }}>×</span>
            {order.details.brideName}
          </h1>
          <p style={{ color: "rgba(245,236,215,0.45)", fontSize: 15, margin: 0 }}>
            📅 {order.details.weddingDate}
            {order.details.venue && <span> &nbsp;·&nbsp; 📍 {order.details.venue}</span>}
          </p>
          {days !== null && days >= 0 && (
            <div style={{
              display: "inline-block",
              marginTop: 14,
              padding: "6px 18px",
              background: "rgba(212,175,55,0.1)",
              border: "1px solid rgba(212,175,55,0.25)",
              borderRadius: 24,
              fontSize: 13,
              color: "#F0D060",
              fontWeight: 600,
            }}>
              {days === 0 ? "🎉 Today is the big day!" : days === 1 ? "⏳ 1 day to go!" : `⏳ ${days} days to go`}
            </div>
          )}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div style={{ maxWidth: 1050, margin: "0 auto", padding: "0 20px 60px", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.2fr)", gap: 32, alignItems: "start" }}>

        {/* ── LEFT: Video Player ── */}
        <div style={{ position: "sticky", top: 88 }}>
          <div className="phone-frame" style={{ maxWidth: 300, margin: "0 auto" }}>
            {/* Use actual MP4 when rendered; Remotion live preview otherwise */}
            {isReady && order.videoUrl ? (
              <div style={{ borderRadius: 28, overflow: "hidden", aspectRatio: "9/16" }}>
                <video
                  src={order.videoUrl}
                  controls
                  loop
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  poster={order.thumbnailUrl}
                />
              </div>
            ) : (
              <RemotionPlayer videoProps={videoProps} totalFrames={totalFrames} templateId={templateId} />
            )}
          </div>

          {/* Player caption */}
          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(245,236,215,0.25)", marginTop: 12 }}>
            {isReady ? "🎬 Final rendered video" : "🔴 Live preview · Final video uses your photos"}
          </p>

          {/* Order ID */}
          <p style={{ textAlign: "center", fontSize: 10, color: "rgba(245,236,215,0.18)", fontFamily: "monospace", marginTop: 4 }}>
            {order.id}
          </p>
        </div>

        {/* ── RIGHT: Info + Actions ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 8 }}>

          {/* ── Status Timeline ── */}
          <div className="card">
            <h3 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 700, color: "#F0D060", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              📍 Order Status
            </h3>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
              {STATUS_STEPS.map((step, i) => {
                const done = i <= statusStepIndex;
                const active = i === statusStepIndex;
                const stepLabels: Record<string, string> = {
                  PENDING: "Order Received",
                  RENDERING: "Creating Video",
                  COMPLETE: "Complete / Ready",
                  DELIVERED: "Complete / Ready",
                };
                return (
                  <React.Fragment key={step}>
                    <div style={{ flex: "0 0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                      <div className="step-dot" style={{
                        background: done ? "linear-gradient(135deg,#F0D060,#D4AF37)" : "rgba(212,175,55,0.1)",
                        color: done ? "#0A0500" : "rgba(245,236,215,0.25)",
                        border: active ? "2px solid #F0D060" : done ? "none" : "1px solid rgba(212,175,55,0.2)",
                        boxShadow: active ? "0 0 14px rgba(212,175,55,0.4)" : "none",
                        animation: active && step === "RENDERING" ? "pulse 1.5s ease-in-out infinite" : "none",
                      }}>
                        {done ? "✓" : i + 1}
                      </div>
                      <div style={{ fontSize: 10, color: done ? "#F0D060" : "rgba(245,236,215,0.3)", textAlign: "center", maxWidth: 58, lineHeight: 1.3, fontWeight: done ? 600 : 400 }}>
                        {stepLabels[step]}
                      </div>
                    </div>
                    {i < STATUS_STEPS.length - 1 && (
                      <div style={{
                        flex: 1,
                        height: 2,
                        background: i < statusStepIndex ? "linear-gradient(90deg,#D4AF37,#F0D060)" : "rgba(212,175,55,0.1)",
                        marginTop: 13,
                        transition: "background 0.4s",
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Render progress bar (only when rendering) */}
            {order.status === "RENDERING" && (
              <div style={{ marginTop: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                  <span style={{ color: "rgba(245,236,215,0.45)" }}>Rendering your invite...</span>
                  <span style={{ color: "#F0D060", fontWeight: 700 }}>{renderProgress.toFixed(0)}%</span>
                </div>
                <div style={{ height: 6, background: "rgba(212,175,55,0.1)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${renderProgress}%`,
                    background: "linear-gradient(90deg,#F0D060,#D4AF37)",
                    borderRadius: 3,
                    transition: "width 0.7s ease",
                  }} />
                </div>
                <p style={{ fontSize: 11, color: "rgba(245,236,215,0.3)", marginTop: 6, textAlign: "center" }}>
                  Takes 2–5 minutes · You can close this page
                </p>
              </div>
            )}
          </div>

          {/* ── Download / Actions ── */}
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#F0D060", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              🎥 Your Video
            </h3>

            {order.status === "PENDING" && (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontSize: 14, color: "rgba(245,236,215,0.5)", marginBottom: 16, lineHeight: 1.6 }}>
                  Your order is confirmed! Click below to start rendering your cinematic video invite.
                </p>
                <button
                  onClick={triggerRender}
                  disabled={triggeringRender}
                  className="gold-btn"
                  style={{ width: "100%", padding: "14px 20px" }}
                >
                  {triggeringRender ? (
                    <>
                      <span style={{ width: 16, height: 16, border: "2px solid rgba(10,5,0,0.3)", borderTopColor: "#0A0500", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                      Starting...
                    </>
                  ) : "🎬 Start Rendering"}
                </button>

                {/* ── Free watermarked preview (PRD §10.1) ── */}
                <div style={{ marginTop: 14 }}>
                  {previewUrl ? (
                    <video
                      src={previewUrl}
                      controls
                      loop
                      playsInline
                      style={{ width: "100%", borderRadius: 12, border: "1px solid rgba(212,175,55,0.2)", background: "#000" }}
                    />
                  ) : (
                    <button
                      onClick={triggerPreview}
                      disabled={generatingPreview}
                      style={{
                        width: "100%",
                        padding: "12px 18px",
                        background: "transparent",
                        border: "1px solid rgba(212,175,55,0.35)",
                        borderRadius: 12,
                        color: "#D4AF37",
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: generatingPreview ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      {generatingPreview ? (
                        <>
                          <span style={{ width: 14, height: 14, border: "2px solid rgba(212,175,55,0.3)", borderTopColor: "#D4AF37", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
                          Generating preview...
                        </>
                      ) : "👁 Generate Free Watermarked Preview"}
                    </button>
                  )}
                  <p style={{ fontSize: 11, color: "rgba(245,236,215,0.3)", marginTop: 6, textAlign: "center" }}>
                    A low-res, watermarked preview — see it before you render the full HD video.
                  </p>
                </div>
              </div>
            )}

            {order.status === "RENDERING" && (
              <div style={{ textAlign: "center", padding: "8px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 8, animation: "spin 2s linear infinite", display: "inline-block" }}>⚙️</div>
                <p style={{ fontSize: 14, color: "#fdba74", fontWeight: 600, margin: "0 0 4px" }}>Rendering in progress...</p>
                <p style={{ fontSize: 12, color: "rgba(245,236,215,0.35)", margin: 0 }}>This page will update automatically</p>
              </div>
            )}

            {isReady && order.videoUrl && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <a
                  href={order.videoUrl}
                  download={`${order.details.groomName}-${order.details.brideName}-invite.mp4`}
                  className="gold-btn"
                  style={{ padding: "14px 20px" }}
                >
                  ⬇️ Download HD Video (MP4)
                </a>

                {order.customerPhone && (
                  <a
                    href={`https://wa.me/${order.customerPhone.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `💍 *${order.details.groomName} & ${order.details.brideName}* — Your wedding video invite is ready!\n\n📅 ${order.details.weddingDate}\n\nDownload your video 👇\nhttp://localhost:3000${order.videoUrl}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wa-btn"
                    style={{ padding: "13px 20px" }}
                  >
                    💬 Send via WhatsApp
                  </a>
                )}

                <div style={{
                  padding: "12px 16px",
                  background: "rgba(34,197,94,0.06)",
                  border: "1px solid rgba(34,197,94,0.15)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "rgba(134,239,172,0.7)",
                  textAlign: "center",
                }}>
                  🎉 Your invite is ready! Share it with family & friends.
                </div>
              </div>
            )}
          </div>

          {/* ── Couple Details Card ── */}
          <div className="card">
            <h3 style={{ margin: "0 0 16px", fontSize: 14, fontWeight: 700, color: "#F0D060", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              💍 Wedding Details
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 16px" }}>
              {[
                ["👫 Groom", order.details.groomName],
                ["👰 Bride", order.details.brideName],
                ["📅 Date", order.details.weddingDate || "—"],
                ["📍 Venue", order.details.venue || "—"],
                ["🏙️ Cities", `${order.details.groomCity || "—"} × ${order.details.brideCity || "—"}`],
                ["🎨 Style", `${tc.emoji} ${tc.name}`],
              ].map(([label, val]) => (
                <div key={label}>
                  <div style={{ fontSize: 10, color: "rgba(245,236,215,0.3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, color: "#F5ECD7" }}>{val}</div>
                </div>
              ))}
            </div>

            {/* Scene list */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid rgba(212,175,55,0.1)" }}>
              <div style={{ fontSize: 10, color: "rgba(245,236,215,0.3)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>
                Scene Sequence
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {order.scenes.map((s, i) => (
                  <span key={i} style={{
                    fontSize: 11,
                    padding: "4px 12px",
                    background: "rgba(212,175,55,0.08)",
                    border: "1px solid rgba(212,175,55,0.2)",
                    borderRadius: 20,
                    color: "#D4AF37",
                    fontWeight: 600,
                  }}>
                    {SCENE_CONFIGS[s]?.emoji} {SCENE_CONFIGS[s]?.name || s}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Photos Gallery ── */}
          {order.photos.length > 0 && (
            <div className="card">
              <h3 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: "#F0D060", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                📸 Your Photos ({order.photos.length})
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(90px, 1fr))", gap: 8 }}>
                {order.photos.map((url, i) => (
                  <div key={i} style={{
                    aspectRatio: "3/4",
                    borderRadius: 12,
                    overflow: "hidden",
                    border: "1px solid rgba(212,175,55,0.2)",
                    background: "rgba(28,10,0,0.5)",
                  }}>
                    <img
                      src={url}
                      alt={`Photo ${i + 1}`}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Footer CTA ── */}
          <div style={{ textAlign: "center", paddingTop: 4 }}>
            <Link
              href="/create"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                color: "#D4AF37",
                fontSize: 13,
                textDecoration: "none",
                fontWeight: 600,
                padding: "8px 20px",
                border: "1px solid rgba(212,175,55,0.2)",
                borderRadius: 24,
                transition: "all 0.2s",
              }}
            >
              ✨ Create Another Invite
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
