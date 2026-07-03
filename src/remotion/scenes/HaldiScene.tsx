import React from "react";
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  interpolate, spring, Easing,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { GoldParticles } from "../components/GoldParticles";
import { FallingPetals } from "../components/FallingPetals";
import { BackgroundLayer } from "../components/BackgroundLayer";
import { AvatarPair } from "../components/AvatarSlot";
import { StyleConfig } from "../../lib/types";
import { playfairFamily, poppinsFamily } from "../utils/fonts";

interface HaldiSceneProps {
  groomName: string;
  brideName: string;
  style: StyleConfig;
  backgroundVideoUrl?: string;
  brideAvatarUrl?: string;
  groomAvatarUrl?: string;
  /** @deprecated */
  photo?: string;
}

export const HaldiScene: React.FC<HaldiSceneProps> = ({
  groomName, brideName, style,
  backgroundVideoUrl, brideAvatarUrl, groomAvatarUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Top badge slide in
  const badgeY = interpolate(frame, [5, 30], [-60, 0], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const badgeOp = interpolate(frame, [5, 28], [0, 1], { extrapolateRight: "clamp" });

  // Marigold line grow
  const lineW = interpolate(frame, [32, 62], [0, 180], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  // Diya glow pulse (bottom corners)
  const diyaGlow = 0.45 + Math.sin(frame * 0.14) * 0.22;
  const diyaGlow2 = 0.38 + Math.sin(frame * 0.19 + 1.2) * 0.18;

  // Turmeric yellow radial pulse
  const turmericPulse = 0.18 + Math.sin(frame * 0.1) * 0.06;

  const textSpring = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 12, stiffness: 80 } });

  return (
    <AbsoluteFill style={{ backgroundColor: "#110700", overflow: "hidden" }}>
      {/* ── LAYER 1: Background (template video or festive yellow gradient) ── */}
      <BackgroundLayer
        backgroundVideoUrl={backgroundVideoUrl}
        gradientFrom="#3D1A00"
        gradientTo="#110700"
        gradientAngle={150}
        animated
      />

      {/* ── LAYER 2: Client avatar ── */}
      <AvatarPair
        brideAvatarUrl={brideAvatarUrl}
        groomAvatarUrl={groomAvatarUrl}
        brideSlot={{ x: 100, y: 950, width: 380, height: 480 }}
        groomSlot={{ x: 600, y: 950, width: 380, height: 480 }}
        enterFrame={40}
      />

      {/* ── LAYER 2: Warm yellow-orange haldi tint ── */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(245,166,35,0.18) 0%,
            rgba(0,0,0,0.05) 28%,
            rgba(0,0,0,0.5) 62%,
            rgba(0,0,0,0.92) 100%
          )`,
        }}
      />

      {/* ── LAYER 3: Turmeric radial glow from bottom ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 95% 40% at 50% 102%, rgba(255,215,0,${turmericPulse + 0.07}), rgba(255,140,0,${turmericPulse * 0.5}) 35%, transparent 65%)`,
        }}
      />

      {/* ── LAYER 4: Diya corner glows ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 30% 25% at 5% 95%, rgba(255,120,20,${diyaGlow * 0.6}), transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 30% 25% at 95% 95%, rgba(255,140,10,${diyaGlow2 * 0.55}), transparent 60%)`,
        }}
      />

      {/* ── LAYER 5: Gold marigold particles rising ── */}
      <GoldParticles count={38} color="#FFD700" direction="up" />

      {/* ── LAYER 6: Orange/pink falling petals ── */}
      <FallingPetals
        count={22}
        direction="down"
        colors={["#FF8C42", "#FFB347", "#FFD700", "#FF6B35", "#FFA500"]}
      />

      {/* ── LAYER 7: Decorative marigold border line (top) ── */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start",
          alignItems: "center",
          paddingTop: 0,
          opacity: interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
        }}
      >
        <div style={{ width: "100%", height: 4, background: "linear-gradient(90deg, transparent, #FFD70088, #FFD700, #FFD70088, transparent)" }} />
      </AbsoluteFill>

      {/* ── LAYER 8: Top event badge ── */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start", alignItems: "center",
          paddingTop: 90,
          opacity: badgeOp,
          transform: `translateY(${badgeY}px)`,
        }}
      >
        <div style={{
          backgroundColor: "rgba(255,200,0,0.15)",
          border: "1.5px solid rgba(255,215,0,0.45)",
          borderRadius: 50,
          paddingTop: 10, paddingBottom: 10,
          paddingLeft: 30, paddingRight: 30,
          fontFamily: poppinsFamily,
          fontSize: 20,
          fontWeight: 700,
          color: "#FFD700",
          letterSpacing: 5,
          textTransform: "uppercase" as const,
        }}>
          🌼 Haldi Carnival
        </div>
      </AbsoluteFill>

      {/* ── LAYER 9: Bottom text ── */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 210 }}>
        {/* Marigold drawing line */}
        <div style={{
          width: lineW, height: 2.5,
          background: `linear-gradient(90deg, transparent, #FFD700, transparent)`,
          marginBottom: 28, opacity: 0.75, borderRadius: 2,
        }} />

        <AnimatedText
          text={`${groomName} & ${brideName}`}
          fontSize={60}
          fontFamily={playfairFamily}
          color="#FFE566"
          animation="spring"
          delay={22}
          textShadow="0 4px 50px rgba(0,0,0,0.95), 0 0 40px rgba(255,215,0,0.3)"
        />

        <div style={{ margin: "14px 0" }}>
          <AnimatedText
            text="Rang De Basanti! 🎉"
            fontSize={26}
            fontFamily={poppinsFamily}
            fontWeight={500}
            color="rgba(255,240,180,0.9)"
            animation="rise"
            delay={48}
            letterSpacing={3}
          />
        </div>

        <AnimatedText
          text="The turmeric blessing begins..."
          fontSize={18}
          fontFamily={poppinsFamily}
          fontWeight={300}
          color="rgba(255,255,200,0.5)"
          animation="fade"
          delay={72}
          letterSpacing={1}
        />
      </AbsoluteFill>

      {/* ── LAYER 10: Diya emoji at bottom corners ── */}
      {[{ l: 60, b: 180 }, { r: 60, b: 180 }].map((pos, i) => (
        <AbsoluteFill
          key={i}
          style={{
            justifyContent: "flex-end",
            alignItems: pos.r !== undefined ? "flex-end" : "flex-start",
            paddingBottom: pos.b, paddingLeft: pos.l ?? 0, paddingRight: pos.r ?? 0,
            opacity: interpolate(frame, [20, 45], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          <div style={{ fontSize: 36, filter: `drop-shadow(0 0 8px rgba(255,150,0,${diyaGlow}))` }}>🪔</div>
        </AbsoluteFill>
      ))}
    </AbsoluteFill>
  );
};
