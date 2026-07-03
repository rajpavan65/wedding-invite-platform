"use client";

import React, { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SCENE_CONFIGS,
  MUSIC_TRACKS,
  SceneType,
  CustomerDetails,
  TEMPLATE_CONFIGS,
  TEMPLATE_IDS,
  type TemplateId,
  type DynamicTemplate,
} from "@/lib/types";
import { useEffect } from "react";
import AudioPicker from "@/components/AudioPicker";

const STEPS = ["Details", "Style", "Photos", "Scenes", "Review"];

export default function CreatePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [details, setDetails] = useState<CustomerDetails>({
    groomName: "",
    brideName: "",
    weddingDate: "",
    venue: "",
    groomCity: "",
    brideCity: "",
    groomProfession: "",
    brideProfession: "",
  });
  const [templateId, setTemplateId] = useState<TemplateId | string>("royal-rajasthani");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [scenes, setScenes] = useState<SceneType[]>(["intro", "haldi", "sangeet", "varmala", "outro"]);
  const [musicTrack, setMusicTrack] = useState("romantic-piano");
  const [customTemplates, setCustomTemplates] = useState<DynamicTemplate[]>([]);
  const [disabledSystemIds, setDisabledSystemIds] = useState<Set<string>>(new Set());

  // Fetch active custom templates for the gallery
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((all: DynamicTemplate[]) =>
        setCustomTemplates(all.filter((t) => t.status === "active"))
      )
      .catch(() => {}); // non-fatal — gallery still shows system templates
    // Hide any admin-disabled built-in templates from the customer gallery.
    fetch("/api/templates/system")
      .then((r) => r.json())
      .then((list: Array<{ id: string; enabled?: boolean }>) =>
        setDisabledSystemIds(new Set(list.filter((t) => t.enabled === false).map((t) => t.id)))
      )
      .catch(() => {}); // non-fatal — all system templates shown on error
  }, []);
  const [phone, setPhone] = useState("");

  const updateDetail = (key: keyof CustomerDetails, value: string) => {
    setDetails((prev) => ({ ...prev, [key]: value }));
  };

  const handlePhotoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      const newPhotos = [...photos, ...files].slice(0, 8);
      setPhotos(newPhotos);

      // Create previews
      const previews = newPhotos.map((f) => URL.createObjectURL(f));
      setPhotoPreviews(previews);
    },
    [photos]
  );

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);
    setPhotoPreviews(newPhotos.map((f) => URL.createObjectURL(f)));
  };

  const toggleScene = (sceneId: SceneType) => {
    setScenes((prev) =>
      prev.includes(sceneId)
        ? prev.filter((s) => s !== sceneId)
        : [...prev, sceneId]
    );
  };

  const canProceed = (): boolean => {
    switch (step) {
      case 0:
        return !!(details.groomName && details.brideName && details.weddingDate);
      case 1:
        return !!templateId;
      case 2:
        return photos.length >= 3;
      case 3:
        return scenes.length >= 3;
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Upload photos
      const formData = new FormData();
      const orderId = `WI-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 7)}`.toUpperCase();
      formData.append("orderId", orderId);
      photos.forEach((p) => formData.append("photos", p));

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadRes.json();

      // 2. Resolve template info — system templates have a TEMPLATE_CONFIGS entry;
      //    custom templates (from Template Manager) do not.
      const sysTpl = TEMPLATE_CONFIGS[templateId as TemplateId];
      const customTpl = customTemplates.find((t) => t.id === templateId);
      const functionType = sysTpl?.functionType ?? customTpl?.ceremony ?? "wedding";
      // Custom templates always render via the universal-template Remotion composition.
      const compositionId = sysTpl ? templateId : "universal-template";

      // 3. Create order
      const orderRes = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: orderId,
          customerPhone: phone,
          details,
          style: templateId,           // legacy compat
          templateId: compositionId,   // always a valid Remotion composition ID
          // Store the original custom template ID so the render route can load it
          customTemplateId: customTpl ? templateId : undefined,
          functionType,
          tier: "premium",
          scenes,
          musicTrack,
          photos: uploadData.urls || [],
        }),
      });
      console.log("orderRes", orderRes);
      const orderData = await orderRes.json();
      console.log("orderData", orderData);

      // 4. Navigate to preview
      router.push(`/preview/${orderData.id}`);
    } catch (err) {
      console.error("Error creating order:", err);
      alert("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0500]">
      {/* Header */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#D4AF37]/15 bg-[#0A0500]/80 backdrop-blur-xl sticky top-0 z-50">
        <Link
          href="/"
          className="font-[var(--font-playfair)] text-lg font-bold text-gradient-gold"
        >
          💍 Digital Invites AI
        </Link>
        <div className="text-sm text-[#F5ECD7]/40">
          Step {step + 1} of {STEPS.length}
        </div>
      </nav>

      {/* Step Indicator */}
      <div className="max-w-3xl mx-auto px-6 pt-8">
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((label, i) => (
            <React.Fragment key={label}>
              <div
                className="flex flex-col items-center cursor-pointer"
                onClick={() => i < step && setStep(i)}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${i < step
                    ? "bg-[#D4AF37] text-[#0A0500]"
                    : i === step
                      ? "bg-[#D4AF37]/20 border-2 border-[#D4AF37] text-[#F0D060]"
                      : "bg-[#1C0A00] border border-[#D4AF37]/20 text-[#F5ECD7]/30"
                    }`}
                >
                  {i < step ? "✓" : i + 1}
                </div>
                <span
                  className={`text-xs mt-1.5 hidden sm:block ${i <= step ? "text-[#F0D060]" : "text-[#F5ECD7]/30"
                    }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 rounded ${i < step ? "bg-[#D4AF37]" : "bg-[#D4AF37]/15"
                    }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="max-w-3xl mx-auto px-6 pb-32">
        {/* STEP 0: Details */}
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-[var(--font-playfair)] text-2xl font-bold mb-2">
                Customer Details
              </h2>
              <p className="text-[#F5ECD7]/50 text-sm">
                Fill in the couple&apos;s details for the video invite
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { key: "groomName" as const, label: "Groom Name *", placeholder: "e.g. Rahul Sharma" },
                { key: "brideName" as const, label: "Bride Name *", placeholder: "e.g. Priya Gupta" },
                { key: "weddingDate" as const, label: "Wedding Date *", placeholder: "e.g. 15 February 2026" },
                { key: "venue" as const, label: "Venue Name", placeholder: "e.g. The Grand Palace, Jaipur" },
                { key: "groomCity" as const, label: "Groom's City", placeholder: "e.g. Delhi" },
                { key: "brideCity" as const, label: "Bride's City", placeholder: "e.g. Mumbai" },
              ].map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-semibold text-[#F5ECD7]/60 uppercase tracking-wider mb-1.5">
                    {field.label}
                  </label>
                  <input
                    type="text"
                    value={details[field.key] || ""}
                    onChange={(e) => updateDetail(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full bg-[#0A0500] border border-[#D4AF37]/20 rounded-xl px-4 py-3 text-sm text-[#F5ECD7] placeholder-[#F5ECD7]/20 focus:outline-none focus:border-[#D4AF37]/80 focus:ring-1 focus:ring-[#D4AF37]/50 hover:border-[#D4AF37]/40 transition-all duration-300"
                  />
                </div>
              ))}
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#F5ECD7]/60 uppercase tracking-wider mb-1.5">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 9876543210"
                className="w-full sm:w-1/2 bg-[#1C0A00]/80 border border-[#D4AF37]/20 rounded-xl px-4 py-3 text-sm text-[#F5ECD7] placeholder:text-[#F5ECD7]/25 focus:border-[#D4AF37] focus:outline-none transition-all"
              />
            </div>
          </div>
        )}

        {/* STEP 1: Template */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-[var(--font-playfair)] text-2xl font-bold mb-2">
                Choose Your Video Template
              </h2>
              <p className="text-[#F5ECD7]/50 text-sm">
                Each template is a unique composition with its own mood, palette, and visual style.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* System templates */}
              {TEMPLATE_IDS.filter((id) => !disabledSystemIds.has(id)).map((id) => {
                const t = TEMPLATE_CONFIGS[id];
                const isSelected = templateId === id;
                const functionLabels: Record<string, string> = {
                  wedding: "Wedding",
                  haldi: "Haldi",
                  mehandi: "Mehandi",
                  sangeet: "Sangeet",
                  reception: "Reception",
                  baraat: "Baraat",
                };
                return (
                  <button
                    key={id}
                    onClick={() => setTemplateId(id)}
                    className={`group relative p-0 rounded-2xl border text-left transition-all duration-200 overflow-hidden ${
                      isSelected
                        ? "border-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.18)] scale-[1.01]"
                        : "border-[#D4AF37]/15 hover:border-[#D4AF37]/35 hover:-translate-y-0.5"
                    }`}
                    style={{ background: isSelected ? `${t.palette.background}dd` : `${t.palette.background}99` }}
                  >
                    <div
                      className="h-2 w-full"
                      style={{ background: `linear-gradient(90deg, ${t.palette.background}, ${t.palette.secondary}, ${t.palette.primary}, ${t.palette.accent}, ${t.palette.secondary})` }}
                    />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{t.emoji}</span>
                          <div>
                            <div className="font-bold text-[15px] text-[#F5ECD7]">{t.name}</div>
                            <div className="text-[11px] mt-0.5" style={{ color: t.palette.primary }}>{t.tagline}</div>
                          </div>
                        </div>
                        <div
                          className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex-shrink-0"
                          style={{ background: `${t.palette.primary}22`, color: t.palette.primary, border: `1px solid ${t.palette.primary}44` }}
                        >
                          {functionLabels[t.functionType] || t.functionType}
                        </div>
                      </div>
                      <p className="text-xs text-[#F5ECD7]/50 leading-relaxed mb-4">{t.description}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          {[t.palette.primary, t.palette.secondary, t.palette.accent].map((c, i) => (
                            <div key={i} title={c} className="w-5 h-5 rounded-full border border-white/10 shadow-sm" style={{ backgroundColor: c }} />
                          ))}
                          <span className="text-[10px] text-[#F5ECD7]/30 ml-1">palette</span>
                        </div>
                        <div className="text-[11px] text-[#F5ECD7]/40">
                          {t.scenes} scenes · {Math.round(t.durationInFrames / 30)}s
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-4 pt-3 border-t flex items-center gap-2 text-xs font-semibold" style={{ borderColor: `${t.palette.primary}33`, color: t.palette.primary }}>
                          <span>✓</span> Selected
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* Active custom templates from Template Manager */}
              {customTemplates.map((ct) => {
                const isSelected = templateId === ct.id;
                return (
                  <button
                    key={ct.id}
                    onClick={() => setTemplateId(ct.id)}
                    className={`group relative p-0 rounded-2xl border text-left transition-all duration-200 overflow-hidden ${
                      isSelected
                        ? "border-[#D4AF37] shadow-[0_0_40px_rgba(212,175,55,0.18)] scale-[1.01]"
                        : "border-[#D4AF37]/15 hover:border-[#D4AF37]/35 hover:-translate-y-0.5"
                    }`}
                    style={{ background: isSelected ? `${ct.palette.background}dd` : `${ct.palette.background}99` }}
                  >
                    {/* Custom badge */}
                    <div style={{ position: "absolute", top: 10, right: 10, zIndex: 2, background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700, color: "#D4AF37", letterSpacing: "0.06em" }}>
                      CUSTOM
                    </div>
                    <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${ct.palette.background}, ${ct.palette.secondary}, ${ct.palette.primary}, ${ct.palette.accent})` }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-3xl">{ct.emoji}</span>
                          <div>
                            <div className="font-bold text-[15px] text-[#F5ECD7]">{ct.name}</div>
                            <div className="text-[11px] mt-0.5" style={{ color: ct.palette.primary }}>{ct.ceremony}</div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-[#F5ECD7]/50 leading-relaxed mb-4">
                        {ct.scenes.length} custom scene{ct.scenes.length !== 1 ? "s" : ""} · {ct.scenes.reduce((s, sc) => s + sc.durationSeconds, 0)}s
                      </p>
                      <div className="flex items-center gap-1.5">
                        {Object.values(ct.palette).slice(0, 3).map((c, i) => (
                          <div key={i} className="w-5 h-5 rounded-full border border-white/10" style={{ backgroundColor: c as string }} />
                        ))}
                      </div>
                      {isSelected && (
                        <div className="mt-4 pt-3 border-t flex items-center gap-2 text-xs font-semibold" style={{ borderColor: `${ct.palette.primary}33`, color: ct.palette.primary }}>
                          <span>✓</span> Selected
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Photos */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-[var(--font-playfair)] text-2xl font-bold mb-2">
                Upload Couple Photos
              </h2>
              <p className="text-[#F5ECD7]/50 text-sm">
                Upload 3-8 beautiful photos. Each photo becomes a scene
                background.
              </p>
            </div>

            {/* Upload zone */}
            <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-[#D4AF37]/25 rounded-2xl cursor-pointer hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/5 transition-all">
              <div className="text-4xl mb-3">📸</div>
              <div className="font-semibold text-sm mb-1">
                Click to upload photos
              </div>
              <div className="text-xs text-[#F5ECD7]/40">
                JPG, PNG — Minimum 3 photos required
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </label>

            {/* Photo previews */}
            {photoPreviews.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {photoPreviews.map((preview, i) => (
                  <div
                    key={i}
                    className="relative aspect-[3/4] rounded-xl overflow-hidden border border-[#D4AF37]/20 group"
                  >
                    <img
                      src={preview}
                      alt={`Photo ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 bg-red-500/80 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                    <div className="absolute bottom-1.5 left-1.5 bg-black/60 text-xs px-2 py-0.5 rounded-full">
                      Scene {i + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="text-sm text-[#F5ECD7]/40">
              {photos.length}/8 photos uploaded
              {photos.length < 3 && (
                <span className="text-[#D4AF37] ml-2">
                  • Need at least 3 more
                </span>
              )}
            </div>
          </div>
        )}

        {/* STEP 3: Scenes & Music */}
        {step === 3 && (
          <div className="space-y-8">
            <div>
              <h2 className="font-[var(--font-playfair)] text-2xl font-bold mb-2">
                Choose Scenes & Music
              </h2>
              <p className="text-[#F5ECD7]/50 text-sm">
                Select at least 3 scenes for your video
              </p>
            </div>

            {/* Scene selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Primary new scenes */}
              {(["intro", "haldi", "sangeet", "varmala", "outro"] as SceneType[]).map((sceneId) => {
                const scene = SCENE_CONFIGS[sceneId];
                return (
                  <button
                    key={scene.id}
                    onClick={() => toggleScene(scene.id)}
                    className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${scenes.includes(scene.id)
                      ? "border-[#D4AF37] bg-[#D4AF37]/10"
                      : "border-[#D4AF37]/15 bg-[#1C0A00]/60 hover:border-[#D4AF37]/30"
                      }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs flex-shrink-0 ${scenes.includes(scene.id)
                        ? "bg-[#D4AF37] border-[#D4AF37] text-[#0A0500]"
                        : "border-[#D4AF37]/25"
                        }`}
                    >
                      {scenes.includes(scene.id) && "✓"}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">
                        {scene.emoji} {scene.name}
                      </div>
                      <div className="text-xs text-[#F5ECD7]/40">
                        {scene.description} •{" "}
                        {Math.round(scene.durationInFrames / 30)}s
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Music selector */}
            <div>
              <h3 className="font-bold text-lg mb-3">🎵 Background Music</h3>
              <AudioPicker
                selectedTrackId={musicTrack}
                onChange={setMusicTrack}
              />
            </div>
          </div>
        )}

        {/* STEP 4: Review */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-[var(--font-playfair)] text-2xl font-bold mb-2">
                Review Your Invite
              </h2>
              <p className="text-[#F5ECD7]/50 text-sm">
                Everything looks good? Let&apos;s create your video!
              </p>
            </div>

            <div className="bg-[#1C0A00]/60 border border-[#D4AF37]/20 rounded-2xl p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-[#F5ECD7]/40 text-xs uppercase tracking-wider">
                    Groom
                  </span>
                  <p className="font-bold text-[#F0D060]">
                    {details.groomName}
                  </p>
                </div>
                <div>
                  <span className="text-[#F5ECD7]/40 text-xs uppercase tracking-wider">
                    Bride
                  </span>
                  <p className="font-bold text-[#F0D060]">
                    {details.brideName}
                  </p>
                </div>
                <div>
                  <span className="text-[#F5ECD7]/40 text-xs uppercase tracking-wider">
                    Date
                  </span>
                  <p className="font-semibold">{details.weddingDate}</p>
                </div>
                <div>
                  <span className="text-[#F5ECD7]/40 text-xs uppercase tracking-wider">
                    Venue
                  </span>
                  <p className="font-semibold">
                    {details.venue || "Not specified"}
                  </p>
                </div>
                <div>
                  <span className="text-[#F5ECD7]/40 text-xs uppercase tracking-wider">
                    Template
                  </span>
                  <p className="font-semibold">
                    {(() => {
                      const sys = TEMPLATE_CONFIGS[templateId as TemplateId];
                      if (sys) return `${sys.emoji} ${sys.name}`;
                      const custom = customTemplates.find((t) => t.id === templateId);
                      return custom ? `${custom.emoji} ${custom.name} (Custom)` : templateId;
                    })()}
                  </p>
                </div>
                <div>
                  <span className="text-[#F5ECD7]/40 text-xs uppercase tracking-wider">
                    Photos
                  </span>
                  <p className="font-semibold">{photos.length} uploaded</p>
                </div>
                <div>
                  <span className="text-[#F5ECD7]/40 text-xs uppercase tracking-wider">
                    Scenes
                  </span>
                  <p className="font-semibold">{scenes.length} selected</p>
                </div>
                <div>
                  <span className="text-[#F5ECD7]/40 text-xs uppercase tracking-wider">
                    Music
                  </span>
                  <p className="font-semibold">
                    {MUSIC_TRACKS.find((t) => t.id === musicTrack)?.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Photo previews */}
            {photoPreviews.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {photoPreviews.map((preview, i) => (
                  <img
                    key={i}
                    src={preview}
                    alt={`Photo ${i + 1}`}
                    className="w-16 h-20 object-cover rounded-lg border border-[#D4AF37]/20 flex-shrink-0"
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#0A0500]/95 backdrop-blur-xl border-t border-[#D4AF37]/15 px-6 py-4 z-50">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => setStep(Math.max(0, step - 1))}
            disabled={step === 0}
            className="px-5 py-2.5 rounded-xl border border-[#D4AF37]/20 text-sm font-semibold text-[#F5ECD7]/60 hover:text-[#F5ECD7] hover:border-[#D4AF37]/40 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
          >
            ← Back
          </button>

          <div className="text-xs text-[#F5ECD7]/30">
            {step + 1} / {STEPS.length}
          </div>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="bg-gradient-to-r from-[#F0D060] to-[#D4AF37] text-[#0A0500] font-bold text-sm px-6 py-2.5 rounded-xl disabled:opacity-30 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-gradient-to-r from-[#F0D060] to-[#D4AF37] text-[#0A0500] font-bold text-sm px-6 py-2.5 rounded-xl disabled:opacity-50 hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span> Creating...
                </>
              ) : (
                "Create My Invite ✨"
              )}
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
