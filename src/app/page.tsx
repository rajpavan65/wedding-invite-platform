"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { PACKAGE_CONFIGS, TEMPLATE_CONFIGS, TEMPLATE_IDS } from "@/lib/types";
import {
  Camera,
  Film,
  Download,
  Sparkles,
  PlayCircle,
  CheckCircle2,
  Star,
  Wand2,
} from "lucide-react";
import { useRef, useState, useEffect } from "react";

export default function HomePage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [disabledSystemIds, setDisabledSystemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Hide any admin-disabled built-in templates from the public gallery.
    fetch("/api/templates/system")
      .then((r) => r.json())
      .then((list: Array<{ id: string; enabled?: boolean }>) =>
        setDisabledSystemIds(new Set(list.filter((t) => t.enabled === false).map((t) => t.id)))
      )
      .catch(() => {}); // non-fatal — show all on error
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <main ref={containerRef} className="min-h-screen relative overflow-hidden bg-[#0A0500]">
      {/* ── BACKGROUND ORBS & PARTICLES ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <motion.div
          style={{ y, opacity }}
          className="absolute inset-0"
        >
          {/* Main glowing orb */}
          <div className="absolute top-[-20%] left-[50%] w-[800px] h-[800px] -translate-x-1/2 bg-[#D4AF37] opacity-[0.07] rounded-full blur-[120px]" />
          <div className="absolute top-[20%] left-[-10%] w-[600px] h-[600px] bg-[#6B0F1A] opacity-[0.08] rounded-full blur-[100px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[700px] h-[700px] bg-[#F0D060] opacity-[0.05] rounded-full blur-[100px]" />
        </motion.div>

        {/* Floating particles */}
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${((i * 137.5) % 100)}%`,
              width: `${2 + ((i * 1.7) % 3)}px`,
              height: `${2 + ((i * 1.7) % 3)}px`,
              backgroundColor: "#D4AF37",
              animation: `float-particle ${8 + ((i * 0.4) % 12)}s linear infinite`,
              animationDelay: `${(i * 1.1) % 12}s`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* ── NAVBAR ── */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-50 flex items-center justify-between px-6 md:px-12 py-5 border-b border-[#D4AF37]/10 glass sticky top-0"
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          <div className="font-[var(--font-playfair)] text-xl md:text-2xl font-bold text-gradient-gold">
            Digital Invites AI
          </div>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/admin"
            className="text-sm font-medium text-[#F5ECD7]/60 hover:text-[#D4AF37] transition-colors hidden md:block"
          >
            Admin Dashboard
          </Link>
          <Link
            href="/create"
            className="bg-gradient-to-r from-[#F0D060] to-[#D4AF37] text-[#0A0500] font-bold text-sm px-6 py-2.5 rounded-full hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] transition-all hover:scale-105"
          >
            Create Invite
          </Link>
        </div>
      </motion.nav>

      {/* ── HERO SECTION ── */}
      <section className="relative z-10 px-6 pt-24 pb-32 md:pt-32 md:pb-40 max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex-1 text-center lg:text-left"
        >
          <div className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#F0D060] text-xs font-bold tracking-widest uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            AI-Powered Cinematic Invites
          </div>

          <h1 className="font-[var(--font-playfair)] text-5xl md:text-7xl lg:text-[5rem] font-bold leading-[1.1] mb-8">
            Your love story, <br />
            <span className="text-gradient-gold">beautifully told.</span>
          </h1>

          <p className="text-lg md:text-xl text-[#F5ECD7]/70 max-w-2xl mx-auto lg:mx-0 mb-10 leading-relaxed font-light">
            Upload your couple photos, choose a cinematic theme, and let our AI generate a stunning, studio-quality 3D video invitation in minutes. Perfect for Instagram Reels & WhatsApp.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center lg:justify-start">
            <Link
              href="/create"
              className="bg-gradient-to-r from-[#F0D060] to-[#D4AF37] text-[#0A0500] font-bold text-lg px-8 py-4 rounded-full hover:shadow-[0_8px_40px_rgba(212,175,55,0.4)] transition-all hover:-translate-y-1 inline-flex items-center justify-center gap-3 group"
            >
              Start Creating Free
              <Wand2 className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            </Link>
            <Link
              href="#examples"
              className="glass border border-[#D4AF37]/30 text-[#F5ECD7] font-semibold text-lg px-8 py-4 rounded-full hover:bg-[#D4AF37]/10 transition-all inline-flex items-center justify-center gap-3 group"
            >
              <PlayCircle className="w-5 h-5 text-[#D4AF37] group-hover:scale-110 transition-transform" />
              Watch Examples
            </Link>
          </div>
          
          <div className="mt-10 flex items-center justify-center lg:justify-start gap-4 text-sm text-[#F5ECD7]/50">
            <div className="flex -space-x-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#0A0500] bg-[#1C0A00] flex items-center justify-center text-[10px]">
                  👰
                </div>
              ))}
            </div>
            <p>Join <span className="text-[#D4AF37] font-semibold">2,000+</span> happy couples</p>
          </div>
        </motion.div>

        {/* Hero Mockup (Floating Phone/Video) */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
          className="flex-1 w-full max-w-sm relative"
        >
          {/* Decorative glow behind mockup */}
          <div className="absolute inset-0 bg-[#D4AF37]/20 blur-[80px] rounded-full" />
          
          <motion.div
            animate={{ y: [0, -15, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="relative z-10 glass-card rounded-[2.5rem] p-4 border-beam-container"
          >
            <div className="aspect-[9/16] bg-[#0A0500] rounded-[1.8rem] overflow-hidden relative shadow-2xl">
              {/* Fake Video Content */}
              <div className="absolute inset-0 bg-gradient-to-t from-[#0A0500] via-transparent to-[#0A0500]/50 z-10" />
              <img
                src="https://images.unsplash.com/photo-1519741497674-611481863552?q=80&w=1080&auto=format&fit=crop"
                alt="Wedding Video Mockup"
                className="w-full h-full object-cover opacity-80"
              />
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full glass flex items-center justify-center mb-6 shadow-lg border border-[#D4AF37]/50">
                  <PlayCircle className="w-8 h-8 text-[#D4AF37]" />
                </div>
                <h3 className="font-[var(--font-playfair)] text-4xl font-bold text-gradient-gold drop-shadow-2xl">
                  Priya & Rohan
                </h3>
                <p className="text-sm tracking-widest uppercase mt-2 text-[#F5ECD7] drop-shadow-md">
                  Save The Date
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="relative z-10 px-6 py-24 border-t border-[#D4AF37]/10 bg-gradient-to-b from-transparent to-[#110800]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-bold mb-6">
              Four Steps to <span className="text-gradient-gold">Magic</span>
            </h2>
            <p className="text-[#F5ECD7]/60 text-lg max-w-2xl mx-auto font-light">
              We've abstracted away all the complex video editing. Just provide your details, and our AI pipeline builds a cinematic masterpiece.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                icon: <Film className="w-8 h-8" />,
                title: "Choose Theme",
                desc: "Select from our curated list of cinematic themes, from Royal Rajasthani to Modern Minimalist.",
              },
              {
                step: "02",
                icon: <CheckCircle2 className="w-8 h-8" />,
                title: "Enter Details",
                desc: "Provide the names, date, and venue. Our typography engine automatically styles them perfectly.",
              },
              {
                step: "03",
                icon: <Camera className="w-8 h-8" />,
                title: "Upload Photos",
                desc: "Upload 4-6 couple photos. Our AI transforms them into stylized 3D avatars for the scenes.",
              },
              {
                step: "04",
                icon: <Download className="w-8 h-8" />,
                title: "Instant HD Video",
                desc: "Within minutes, your 1080p HD video is rendered and automatically sent to your WhatsApp.",
              },
            ].map((item, index) => (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                key={item.step}
                className="glass-card rounded-3xl p-8 relative overflow-hidden group hover:-translate-y-2 transition-premium"
              >
                <div className="absolute top-0 right-0 p-6 text-6xl font-[var(--font-playfair)] font-bold text-[#D4AF37]/5 group-hover:text-[#D4AF37]/10 transition-colors">
                  {item.step}
                </div>
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#6B0F1A]/20 flex items-center justify-center text-[#D4AF37] mb-6 border border-[#D4AF37]/20 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <h3 className="text-xl font-bold mb-3 text-[#F5ECD7]">{item.title}</h3>
                <p className="text-[#F5ECD7]/60 leading-relaxed text-sm font-light">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TEMPLATE GALLERY ── */}
      <section id="examples" className="relative z-10 px-6 py-24 bg-gradient-to-b from-[#110800] to-[#050200]">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#F0D060] text-xs font-bold tracking-widest uppercase">
              <Sparkles className="w-3.5 h-3.5" />
              4 Cinematic Templates
            </div>
            <h2 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-bold mb-6">
              Choose Your <span className="text-gradient-gold">Perfect Story</span>
            </h2>
            <p className="text-[#F5ECD7]/60 text-lg max-w-2xl mx-auto font-light">
              Each template is a fully animated cinematic composition — unique palette, VFX, and ceremony mood. Pick the one that matches your celebration.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {TEMPLATE_IDS.filter((id) => !disabledSystemIds.has(id)).map((id, index) => {
              const t = TEMPLATE_CONFIGS[id];
              // Static still frames we rendered — relative to /public
              const stillFrameMap: Record<string, string> = {
                "royal-rajasthani": "/templates/royal-rajasthani/thumbnail.jpg",
                "haldi-floral": "/templates/haldi-floral/thumbnail.jpg",
                "mehandi-traditional": "/templates/mehandi-traditional/thumbnail.jpg",
                "sangeet-grand": "/templates/sangeet-grand/thumbnail.jpg",
                "reception-luxury": "/templates/reception-luxury/thumbnail.jpg",
                "baraat-royal": "/templates/baraat-royal/thumbnail.jpg",
                "sangeet-neon": "/templates/sangeet-neon/thumbnail.jpg",
                "haldi-modern": "/templates/haldi-modern/thumbnail.jpg",
                "mehandi-pastel": "/templates/mehandi-pastel/thumbnail.jpg",
                "wedding-divine": "/templates/wedding-divine/thumbnail.jpg",
                "reception-garden": "/templates/reception-garden/thumbnail.jpg",
              };
              const thumbnail = stillFrameMap[id];

              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.55, delay: index * 0.1 }}
                  className="group relative rounded-3xl overflow-hidden border transition-all duration-300 hover:-translate-y-2 cursor-pointer"
                  style={{
                    background: `${t.palette.background}ee`,
                    borderColor: `${t.palette.primary}28`,
                    boxShadow: `0 0 0 0 ${t.palette.primary}00`,
                  }}
                  whileHover={{
                    boxShadow: `0 20px 60px ${t.palette.primary}25, 0 0 0 1px ${t.palette.primary}40`,
                  }}
                >
                  {/* Palette gradient top strip */}
                  <div
                    className="h-1 w-full"
                    style={{
                      background: `linear-gradient(90deg, ${t.palette.background}, ${t.palette.secondary}, ${t.palette.primary}, ${t.palette.accent}, ${t.palette.secondary})`,
                    }}
                  />

                  {/* Video still / placeholder */}
                  <div className="relative aspect-[9/16] overflow-hidden">
                    {/* Background gradient fill */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `radial-gradient(ellipse at 50% 30%, ${t.palette.secondary}40 0%, ${t.palette.background} 70%)`,
                      }}
                    />

                    {/* Thumbnail image if it exists */}
                    <img
                      src={thumbnail}
                      alt={`${t.name} template preview`}
                      className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                      onError={(e) => {
                        // Hide if no thumbnail — gradient background shows instead
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />

                    {/* Overlay gradient bottom fade */}
                    <div
                      className="absolute inset-0"
                      style={{
                        background: `linear-gradient(to top, ${t.palette.background}ee 0%, ${t.palette.background}88 30%, transparent 70%)`,
                      }}
                    />

                    {/* Floating name overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-5">
                      <div
                        className="text-xs font-bold uppercase tracking-widest mb-1"
                        style={{ color: t.palette.primary }}
                      >
                        {t.emoji} {t.functionType}
                      </div>
                      <div className="font-[var(--font-playfair)] text-xl font-bold text-white drop-shadow-lg">
                        {t.name}
                      </div>
                      <div className="text-[11px] mt-1" style={{ color: `${t.palette.accent}cc` }}>
                        {t.tagline}
                      </div>
                    </div>

                    {/* Play button on hover */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Link
                        href="/create"
                        className="w-16 h-16 rounded-full flex items-center justify-center backdrop-blur-md border transition-transform group-hover:scale-110 duration-200"
                        style={{
                          background: `${t.palette.primary}33`,
                          borderColor: `${t.palette.primary}66`,
                        }}
                      >
                        <PlayCircle className="w-8 h-8" style={{ color: t.palette.primary }} />
                      </Link>
                    </div>
                  </div>

                  {/* Card footer */}
                  <div className="p-4">
                    {/* Palette swatches */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        {[t.palette.primary, t.palette.secondary, t.palette.accent].map((c, i) => (
                          <div
                            key={i}
                            className="w-4 h-4 rounded-full border border-white/10 shadow-sm"
                            style={{ backgroundColor: c }}
                            title={c}
                          />
                        ))}
                      </div>
                      <span
                        className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                        style={{
                          background: `${t.palette.primary}18`,
                          color: t.palette.primary,
                          border: `1px solid ${t.palette.primary}33`,
                        }}
                      >
                        {t.scenes} scenes
                      </span>
                    </div>
                    <p className="text-[11px] mt-3 leading-relaxed" style={{ color: "rgba(245,236,215,0.45)" }}>
                      {t.description}
                    </p>
                    <Link
                      href="/create"
                      className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all hover:brightness-110"
                      style={{
                        background: `linear-gradient(135deg, ${t.palette.primary}22, ${t.palette.secondary}22)`,
                        border: `1px solid ${t.palette.primary}33`,
                        color: t.palette.primary,
                      }}
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      Use This Template
                    </Link>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF / TESTIMONIALS ── */}
      <section className="relative z-10 px-6 py-24 bg-[#050200]">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col items-center mb-16">
            <div className="flex gap-1 text-[#D4AF37] mb-4">
              {[...Array(5)].map((_, i) => <Star key={i} className="w-5 h-5 fill-current" />)}
            </div>
            <h2 className="font-[var(--font-playfair)] text-4xl font-bold text-center">
              Loved by Brides & Grooms
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                name: "Ananya & Kartik",
                text: "The AI 3D avatars looked exactly like us! The Royal Rajasthani theme was so grand, our families were completely blown away.",
              },
              {
                name: "Sneha & Rahul",
                text: "I couldn't believe we got such a high-end cinematic video in 10 minutes. Usually, editors charge ₹15,000+ for this level of quality.",
              },
              {
                name: "Meera & Varun",
                text: "The WhatsApp auto-delivery was a lifesaver. Sent the link straight to our parents and they forwarded it to all the relatives easily.",
              },
            ].map((review, i) => (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                key={i}
                className="glass p-8 rounded-3xl"
              >
                <div className="text-[#D4AF37] mb-4">"</div>
                <p className="text-[#F5ECD7]/80 italic mb-6 leading-relaxed font-light">
                  {review.text}
                </p>
                <p className="font-semibold text-sm text-[#D4AF37]">— {review.name}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING SECTION ── */}
      <section id="pricing" className="relative z-10 px-6 py-24 max-w-7xl mx-auto">
        <div className="text-center mb-20">
          <h2 className="font-[var(--font-playfair)] text-4xl md:text-5xl font-bold mb-6">
            Simple, Transparent <span className="text-gradient-gold">Pricing</span>
          </h2>
          <p className="text-[#F5ECD7]/60 text-lg">
            Studio-quality invitations at a fraction of the cost.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center max-w-5xl mx-auto">
          {PACKAGE_CONFIGS.map((pkg, idx) => (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              key={pkg.tier}
              className={`relative rounded-[2rem] p-10 transition-premium ${
                pkg.popular
                  ? "glass-card border-beam-container scale-105 md:scale-110 z-20 shadow-[0_20px_60px_rgba(212,175,55,0.15)]"
                  : "glass z-10 hover:-translate-y-2"
              }`}
            >
              {pkg.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#F0D060] to-[#D4AF37] text-[#0A0500] text-xs font-bold px-6 py-1.5 rounded-full shadow-lg">
                  MOST POPULAR
                </div>
              )}

              <h3 className="font-[var(--font-playfair)] text-2xl font-bold mb-2 text-[#F5ECD7]">
                {pkg.name}
              </h3>
              <p className="text-sm text-[#F5ECD7]/50 mb-8 font-light h-10">
                {pkg.description}
              </p>

              <div className="mb-8">
                <span className="font-[var(--font-playfair)] text-5xl font-bold text-gradient-gold">
                  ₹{pkg.price}
                </span>
              </div>

              <ul className="space-y-4 mb-10">
                {pkg.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-[#F5ECD7]/80 font-light">
                    <CheckCircle2 className="w-5 h-5 text-[#D4AF37] flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/create"
                className={`block w-full text-center font-bold py-4 rounded-full transition-all text-sm uppercase tracking-wider ${
                  pkg.popular
                    ? "bg-gradient-to-r from-[#F0D060] to-[#D4AF37] text-[#0A0500] hover:shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:scale-105"
                    : "border border-[#D4AF37]/40 text-[#F0D060] hover:bg-[#D4AF37]/10"
                }`}
              >
                Choose {pkg.name}
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="relative z-10 border-t border-[#D4AF37]/10 px-6 py-12 text-center bg-[#050200]">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#D4AF37]" />
          <div className="font-[var(--font-playfair)] text-2xl font-bold text-gradient-gold">
            Digital Invites AI
          </div>
        </div>
        <p className="text-sm text-[#F5ECD7]/40 font-light mb-8 max-w-sm mx-auto">
          Making every wedding invitation unforgettable, cinematic, and magical. ❤️
        </p>
        <div className="text-xs text-[#F5ECD7]/20 uppercase tracking-widest">
          © 2026 Digital Invites AI. All rights reserved.
        </div>
      </footer>
    </main>
  );
}
