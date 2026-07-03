"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { OrderData, TEMPLATE_CONFIGS, type TemplateId } from "@/lib/types";

export default function ClientPortalPage() {
  const params = useParams();
  const orderId = params.orderId as string;
  
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [authStatus, setAuthStatus] = useState<"checking" | "unauthorized" | "authorized">("checking");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [revisionForm, setRevisionForm] = useState({ groomName: "", brideName: "", weddingDate: "", venue: "" });
  const [submittingRevision, setSubmittingRevision] = useState(false);
  const [revisionError, setRevisionError] = useState("");

  const openRevisionModal = () => {
    if (order) {
      setRevisionForm({
        groomName: order.details.groomName || "",
        brideName: order.details.brideName || "",
        weddingDate: order.details.weddingDate || "",
        venue: order.details.venue || "",
      });
      setShowRevisionModal(true);
      setRevisionError("");
    }
  };

  const submitRevision = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRevision(true);
    setRevisionError("");
    try {
      const res = await fetch("/api/orders/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, details: revisionForm }),
      });
      const data = await res.json();
      if (res.ok) {
        setShowRevisionModal(false);
        // Reload order to show RENDERING status
        fetchOrderAndAuth();
      } else {
        setRevisionError(data.error || "Failed to submit revision.");
      }
    } catch (err) {
      setRevisionError("A network error occurred.");
    } finally {
      setSubmittingRevision(false);
    }
  };

  const fetchOrderAndAuth = async () => {
    try {
      const res = await fetch(`/api/orders?id=${orderId}`);
      if (res.ok) {
        const orderData = await res.json();
        setOrder(orderData);
        
        // Check if we have the secure cookie for this session
        // Note: the cookie is HttpOnly, so we can't read it via JS. 
        // We'll add a quick ping to a new verify-session endpoint, 
        // OR we can just rely on the server rendering or a dedicated endpoint.
        // For simplicity in this mock, we will rely on a new endpoint `/api/otp/session`.
        const sessionRes = await fetch(`/api/otp/session?orderId=${orderId}`);
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          if (session.authorized) {
            setAuthStatus("authorized");
          } else {
            setAuthStatus("unauthorized");
          }
        } else {
          setAuthStatus("unauthorized");
        }
      } else {
        setAuthStatus("unauthorized");
      }
    } catch (err) {
      console.error("Error fetching order:", err);
      setAuthStatus("unauthorized");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderAndAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleSendOTP = async () => {
    setSendingOtp(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpSent(true);
      } else {
        setErrorMsg(data.error || "Failed to send OTP.");
      }
    } catch (err) {
      setErrorMsg("A network error occurred.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrorMsg("Please enter a 6-digit code.");
      return;
    }
    setVerifyingOtp(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, code: otpCode }),
      });
      const data = await res.json();
      if (res.ok) {
        setAuthStatus("authorized");
      } else {
        setErrorMsg(data.error || "Invalid OTP code.");
      }
    } catch (err) {
      setErrorMsg("A network error occurred.");
    } finally {
      setVerifyingOtp(false);
    }
  };

  if (loading || authStatus === "checking") {
    return (
      <main style={{ minHeight: "100vh", background: "#0A0500", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", color: "rgba(245,236,215,0.45)" }}>
          <div style={{ fontSize: 40, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }}>💍</div>
          <p>Loading your secure portal...</p>
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
        </div>
      </main>
    );
  }

  const templateId = ((order as unknown as { templateId?: string }).templateId || order.style || "royal-rajasthani") as TemplateId;
  const tc = TEMPLATE_CONFIGS[templateId] ?? TEMPLATE_CONFIGS["royal-rajasthani"];
  const isReady = order.status === "COMPLETE" || order.status === "DELIVERED";

  // ─── UNAUTHORIZED STATE (OTP FLOW) ─────────────────────────────────────────
  if (authStatus === "unauthorized") {
    return (
      <main style={{ minHeight: "100vh", background: "#0A0500", color: "#F5ECD7", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
        {/* Background Effects */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-20%", left: "50%", width: 800, height: 800, transform: "translateX(-50%)", background: "#D4AF37", opacity: 0.07, borderRadius: "50%", filter: "blur(120px)" }} />
          <div style={{ position: "absolute", top: "20%", left: "-10%", width: 600, height: 600, background: "#6B0F1A", opacity: 0.08, borderRadius: "50%", filter: "blur(100px)" }} />
          <div style={{ position: "absolute", bottom: "-10%", right: "-10%", width: 700, height: 700, background: "#F0D060", opacity: 0.05, borderRadius: "50%", filter: "blur(100px)" }} />
        </div>

        <div style={{
          background: "rgba(28,10,0,0.55)",
          border: "1px solid rgba(212,175,55,0.14)",
          borderRadius: 24,
          padding: "40px 32px",
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
          backdropFilter: "blur(24px)",
          position: "relative",
          zIndex: 10,
          boxShadow: "0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(212,175,55,0.05) inset",
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
          <h1 style={{
            fontFamily: "var(--font-playfair, serif)", fontSize: 24, fontWeight: 700, margin: "0 0 8px",
            background: "linear-gradient(135deg,#F0D060,#D4AF37)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            Secure Video Portal
          </h1>
          <p style={{ color: "rgba(245,236,215,0.6)", fontSize: 14, marginBottom: 32, lineHeight: 1.5 }}>
            {order.details.groomName} & {order.details.brideName}'s Wedding
          </p>

          {!otpSent ? (
            <>
              <p style={{ color: "rgba(245,236,215,0.4)", fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
                To access your high-resolution video and share links, we need to verify your email.
              </p>
              {errorMsg && <p style={{ color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>{errorMsg}</p>}
              <button
                onClick={handleSendOTP}
                disabled={sendingOtp}
                style={{
                  background: "linear-gradient(135deg, #F0D060 0%, #D4AF37 50%, #A0832A 100%)",
                  color: "#0A0500", fontWeight: 700, border: "none", borderRadius: 14,
                  cursor: sendingOtp ? "not-allowed" : "pointer", fontSize: 15, padding: "14px 20px",
                  width: "100%", transition: "all 0.2s", opacity: sendingOtp ? 0.6 : 1
                }}
              >
                {sendingOtp ? "Sending..." : "Send Code to Email"}
              </button>
            </>
          ) : (
            <form onSubmit={handleVerifyOTP}>
              <p style={{ color: "rgba(245,236,215,0.4)", fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
                We've sent a 6-digit code to your registered email address.
              </p>
              {errorMsg && <p style={{ color: "#fca5a5", fontSize: 13, marginBottom: 16 }}>{errorMsg}</p>}
              <input
                type="text"
                placeholder="------"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                style={{
                  background: "rgba(10,5,0,0.5)", border: "1px solid rgba(212,175,55,0.3)",
                  borderRadius: 12, color: "#F5ECD7", fontSize: 24, padding: "14px",
                  width: "100%", textAlign: "center", marginBottom: 24, letterSpacing: "0.2em",
                  fontFamily: "monospace"
                }}
              />
              <button
                type="submit"
                disabled={verifyingOtp || otpCode.length !== 6}
                style={{
                  background: "linear-gradient(135deg, #F0D060 0%, #D4AF37 50%, #A0832A 100%)",
                  color: "#0A0500", fontWeight: 700, border: "none", borderRadius: 14,
                  cursor: verifyingOtp || otpCode.length !== 6 ? "not-allowed" : "pointer", 
                  fontSize: 15, padding: "14px 20px", width: "100%", transition: "all 0.2s", 
                  opacity: verifyingOtp || otpCode.length !== 6 ? 0.6 : 1
                }}
              >
                {verifyingOtp ? "Verifying..." : "Unlock Portal"}
              </button>
            </form>
          )}
        </div>
      </main>
    );
  }

  // ─── AUTHORIZED STATE (CLIENT PORTAL) ──────────────────────────────────────
  return (
    <main style={{ minHeight: "100vh", background: "#0A0500", color: "#F5ECD7", padding: "40px 20px" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>🎉</div>
          <h1 style={{
            fontFamily: "var(--font-playfair, serif)", fontSize: 36, fontWeight: 700, margin: "0 0 12px",
            background: "linear-gradient(135deg,#F0D060,#D4AF37)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent"
          }}>
            Your Wedding Invite
          </h1>
          <p style={{ color: "rgba(245,236,215,0.6)", fontSize: 16, margin: 0 }}>
            {order.details.groomName} & {order.details.brideName}
          </p>
        </div>

        {/* Video Card */}
        <div style={{
          background: "rgba(28,10,0,0.55)",
          border: "1px solid rgba(212,175,55,0.14)",
          borderRadius: 24,
          padding: 32,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 24
        }}>
          {isReady && order.videoUrl ? (
            <>
              <div style={{ width: "100%", maxWidth: 320, borderRadius: 20, overflow: "hidden", border: "1px solid rgba(212,175,55,0.2)", boxShadow: "0 20px 40px rgba(0,0,0,0.5)" }}>
                <video
                  src={order.videoUrl}
                  controls
                  loop
                  playsInline
                  poster={order.thumbnailUrl}
                  style={{ width: "100%", display: "block" }}
                />
              </div>
              <div style={{ textAlign: "center", width: "100%", maxWidth: 320 }}>
                <a
                  href={order.videoUrl}
                  download={`${order.details.groomName}-${order.details.brideName}-invite.mp4`}
                  style={{
                    background: "linear-gradient(135deg, #F0D060 0%, #D4AF37 50%, #A0832A 100%)",
                    color: "#0A0500", fontWeight: 700, border: "none", borderRadius: 14,
                    fontSize: 15, padding: "16px 20px", display: "block", textDecoration: "none",
                    boxShadow: "0 8px 20px rgba(212,175,55,0.2)"
                  }}
                >
                  ⬇️ Download HD Video
                </a>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <div style={{ fontSize: 32, marginBottom: 16, animation: "spin 2s linear infinite", display: "inline-block" }}>⚙️</div>
              <h2 style={{ fontSize: 20, color: "#F0D060", margin: "0 0 8px" }}>Rendering in progress...</h2>
              <p style={{ color: "rgba(245,236,215,0.5)", fontSize: 14 }}>
                Your cinematic video is currently being generated. This usually takes 2-5 minutes.<br />
                You will receive an email once it is ready.
              </p>
            </div>
          )}

          {/* Details & Actions */}
          <div style={{ width: "100%", borderTop: "1px solid rgba(212,175,55,0.1)", paddingTop: 24, marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            <div>
              <h3 style={{ fontSize: 12, color: "rgba(245,236,215,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Event Details</h3>
              <p style={{ fontSize: 14, color: "#F5ECD7", margin: "0 0 4px" }}>{order.details.weddingDate}</p>
              <p style={{ fontSize: 14, color: "#F5ECD7", margin: 0 }}>{order.details.venue}</p>
            </div>
            <div style={{ textAlign: "right" }}>
              <h3 style={{ fontSize: 12, color: "rgba(245,236,215,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 8px" }}>Support</h3>
              <button 
                onClick={openRevisionModal}
                disabled={order.details.revisionCount && order.details.revisionCount >= 1}
                style={{
                  background: "transparent", 
                  color: (order.details.revisionCount && order.details.revisionCount >= 1) ? "rgba(245,236,215,0.3)" : "#fca5a5", 
                  border: (order.details.revisionCount && order.details.revisionCount >= 1) ? "1px solid rgba(245,236,215,0.1)" : "1px solid rgba(239,68,68,0.3)",
                  padding: "6px 12px", borderRadius: 8, fontSize: 12, 
                  cursor: (order.details.revisionCount && order.details.revisionCount >= 1) ? "not-allowed" : "pointer",
                  display: "inline-block",
                  opacity: (order.details.revisionCount && order.details.revisionCount >= 1) ? 0.6 : 1
              }}>
                {(order.details.revisionCount && order.details.revisionCount >= 1) ? "🚫 Revision limit reached" : "📝 Request a Revision"}
              </button>
            </div>
          </div>
        </div>

        {/* REVISION MODAL */}
        {showRevisionModal && (
          <div style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(10,5,0,0.85)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999, padding: 20
          }}>
            <div style={{
              background: "rgba(28,10,0,0.9)", border: "1px solid rgba(212,175,55,0.2)",
              borderRadius: 24, padding: "32px", maxWidth: 400, width: "100%",
              boxShadow: "0 24px 48px rgba(0,0,0,0.8)"
            }}>
              <h2 style={{ fontSize: 24, margin: "0 0 8px", color: "#F0D060", fontFamily: "var(--font-playfair, serif)" }}>
                Request Revision
              </h2>
              <p style={{ color: "rgba(245,236,215,0.5)", fontSize: 13, marginBottom: 24, lineHeight: 1.5 }}>
                You have <strong>1 free revision</strong> to fix any typos in names, dates, or venues. Submitting this will immediately recreate your video.
              </p>

              <form onSubmit={submitRevision} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(245,236,215,0.4)", textTransform: "uppercase", marginBottom: 6 }}>Groom's Name</label>
                  <input type="text" value={revisionForm.groomName} onChange={(e) => setRevisionForm({ ...revisionForm, groomName: e.target.value })} required
                    style={{ width: "100%", background: "rgba(10,5,0,0.5)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, padding: "10px 12px", color: "#F5ECD7" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(245,236,215,0.4)", textTransform: "uppercase", marginBottom: 6 }}>Bride's Name</label>
                  <input type="text" value={revisionForm.brideName} onChange={(e) => setRevisionForm({ ...revisionForm, brideName: e.target.value })} required
                    style={{ width: "100%", background: "rgba(10,5,0,0.5)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, padding: "10px 12px", color: "#F5ECD7" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(245,236,215,0.4)", textTransform: "uppercase", marginBottom: 6 }}>Wedding Date</label>
                  <input type="text" value={revisionForm.weddingDate} onChange={(e) => setRevisionForm({ ...revisionForm, weddingDate: e.target.value })} required
                    style={{ width: "100%", background: "rgba(10,5,0,0.5)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, padding: "10px 12px", color: "#F5ECD7" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, color: "rgba(245,236,215,0.4)", textTransform: "uppercase", marginBottom: 6 }}>Venue (Optional)</label>
                  <input type="text" value={revisionForm.venue} onChange={(e) => setRevisionForm({ ...revisionForm, venue: e.target.value })}
                    style={{ width: "100%", background: "rgba(10,5,0,0.5)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 8, padding: "10px 12px", color: "#F5ECD7" }} />
                </div>

                {revisionError && <p style={{ color: "#fca5a5", fontSize: 13, margin: 0 }}>{revisionError}</p>}

                <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                  <button type="button" onClick={() => setShowRevisionModal(false)} disabled={submittingRevision}
                    style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1px solid rgba(245,236,215,0.2)", background: "transparent", color: "#F5ECD7", cursor: "pointer" }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={submittingRevision}
                    style={{ flex: 1, padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#F0D060,#D4AF37)", color: "#0A0500", fontWeight: 700, cursor: submittingRevision ? "not-allowed" : "pointer", opacity: submittingRevision ? 0.7 : 1 }}>
                    {submittingRevision ? "Submitting..." : "Submit Revision"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}
