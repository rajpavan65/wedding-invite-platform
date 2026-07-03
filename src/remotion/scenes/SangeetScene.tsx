import React from "react";
import {
  AbsoluteFill, useCurrentFrame, useVideoConfig,
  interpolate, spring, Easing,
} from "remotion";
import { AnimatedText } from "../components/AnimatedText";
import { GoldParticles } from "../components/GoldParticles";
import { MusicNotes } from "../components/MusicNotes";
import { BackgroundLayer } from "../components/BackgroundLayer";
import { AvatarPair } from "../components/AvatarSlot";
import { StyleConfig } from "../../lib/types";
import { playfairFamily, poppinsFamily } from "../utils/fonts";

interface SangeetSceneProps {
  groomName: string;
  brideName: string;
  style: StyleConfig;
  backgroundVideoUrl?: string;
  brideAvatarUrl?: string;
  groomAvatarUrl?: string;
  /** @deprecated */
  photo?: string;
}

export const SangeetScene: React.FC<SangeetSceneProps> = ({
  groomName, brideName, style,
  backgroundVideoUrl, brideAvatarUrl, groomAvatarUrl,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Stage spotlight pulse — multi-frequency for life
  const spot1 = 0.35 + Math.sin(frame * 0.13) * 0.15;
  const spot2 = 0.25 + Math.sin(frame * 0.21 + 1.0) * 0.12;

  // Fairy light twinkle
  const twinkle = (i: number) => 0.4 + Math.sin(frame * 0.15 + i * 1.3) * 0.35;

  // Badge slide in
  const badgeOp = interpolate(frame, [5, 28], [0, 1], {
    extrapolateRight: "clamp", easing: Easing.out(Easing.cubic),
  });

  // Line
  const lineW = interpolate(frame, [38, 68], [0, 200], {
    extrapolateRight: "clamp", extrapolateLeft: "clamp",
  });

  // Note icon spring
  const noteSpring = spring({ frame: Math.max(0, frame - 22), fps, config: { damping: 10, stiffness: 90, mass: 0.5 } });

  // Side bar opacity
  const barOp = interpolate(frame, [0, 22], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#06001A", overflow: "hidden" }}>
      {/* ── LAYER 1: Background (template video or deep purple gradient) ── */}
      <BackgroundLayer
        backgroundVideoUrl={backgroundVideoUrl}
        gradientFrom="#06001A"
        gradientTo="#12003A"
        gradientAngle={160}
        animated
      />

      {/* ── LAYER 2: Client avatar (dancing pose for sangeet) ── */}
      <AvatarPair
        brideAvatarUrl={brideAvatarUrl}
        groomAvatarUrl={groomAvatarUrl}
        brideSlot={{ x: 120, y: 880, width: 360, height: 500 }}
        groomSlot={{ x: 600, y: 880, width: 360, height: 500 }}
        enterFrame={35}
      />

      {/* ── LAYER 2: Deep purple-blue night tint ── */}
      <AbsoluteFill
        style={{
          background: `linear-gradient(
            to bottom,
            rgba(50,0,100,0.35) 0%,
            rgba(10,0,30,0.12) 30%,
            rgba(0,0,10,0.55) 60%,
            rgba(0,0,0,0.94) 100%
          )`,
        }}
      />

      {/* ── LAYER 3: Stage spotlight from top ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 55% 45% at 50% -5%, rgba(180,100,255,${spot1 * 0.45}), transparent 65%)`,
        }}
      />

      {/* ── LAYER 4: Secondary pink-purple side spots ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 30% 50% at 5% 30%, rgba(220,80,255,${spot2 * 0.3}), transparent 60%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 30% 50% at 95% 30%, rgba(100,120,255,${spot2 * 0.25}), transparent 60%)`,
        }}
      />

      {/* ── LAYER 5: Gold warm glow from bottom ── */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 80% 28% at 50% 102%, rgba(212,175,55,0.22), transparent 65%)`,
        }}
      />

      {/* ── LAYER 6: Floating music notes ── */}
      <MusicNotes count={16} color="#C89EFF" />

      {/* ── LAYER 7: Gold particles drifting up ── */}
      <GoldParticles count={25} color={style.accentColor} direction="up" />

      {/* ── LAYER 8: Fairy light string (top) ── */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-start", alignItems: "center",
          paddingTop: 55,
          opacity: barOp,
        }}
      >
        <div style={{ display: "flex", gap: 28, alignItems: "center" }}>
          {Array.from({ length: 14 }, (_, i) => (
            <div
              key={i}
              style={{
                width: 8, height: 8, borderRadius: "50%",
                backgroundColor: i % 3 === 0 ? "#C89EFF" : i % 3 === 1 ? "#FFD700" : "#FF80CC",
                opacity: twinkle(i),
                boxShadow: `0 0 10px ${i % 3 === 0 ? "#C89EFF" : i % 3 === 1 ? "#FFD700" : "#FF80CC"}`,
              }}
            />
          ))}
        </div>
      </AbsoluteFill>

      {/* ── LAYER 9: Decorative vertical stage bars ── */}
      <AbsoluteFill style={{ opacity: barOp, justifyContent: "center", alignItems: "flex-start", paddingLeft: 44, paddingTop: 320 }}>
        <div style={{ width: 2.5, height: 140, background: "linear-gradient(to bottom, transparent, rgba(180,100,255,0.65), transparent)", borderRadius: 3 }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ opacity: barOp, justifyContent: "center", alignItems: "flex-end", paddingRight: 44, paddingTop: 320 }}>
        <div style={{ width: 2.5, height: 140, background: "linear-gradient(to bottom, transparent, rgba(212,175,55,0.65), transparent)", borderRadius: 3 }} />
      </AbsoluteFill>

      {/* ── LAYER 10: Top event badge ── */}
      <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: 96, opacity: badgeOp }}>
        <div style={{
          backgroundColor: "rgba(140,60,220,0.22)",
          border: "1.5px solid rgba(180,100,255,0.5)",
          borderRadius: 50,
          paddingTop: 10, paddingBottom: 10,
          paddingLeft: 30, paddingRight: 30,
          fontFamily: poppinsFamily,
          fontSize: 20, fontWeight: 700,
          color: "#C89EFF",
          letterSpacing: 5,
          textTransform: "uppercase" as const,
        }}>
          🎶 Sangeet Night
        </div>
      </AbsoluteFill>

      {/* ── LAYER 11: Text content ── */}
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 220 }}>
        <div style={{ fontSize: 64, transform: `scale(${noteSpring})`, marginBottom: 10 }}>🎵</div>

        <div style={{ width: lineW, height: 1.5, background: `linear-gradient(90deg, transparent, ${style.accentColor}90, transparent)`, marginBottom: 22, borderRadius: 2 }} />

        <AnimatedText
          text={`${groomName} & ${brideName}`}
          fontSize={60}
          fontFamily={playfairFamily}
          color={style.accentColor}
          animation="spring"
          delay={26}
          textShadow={`0 0 60px ${style.accentColor}55, 0 4px 40px rgba(0,0,0,0.95)`}
        />

        <div style={{ marginTop: 16 }}>
          <AnimatedText
            text="Dance. Celebrate. Love."
            fontSize={24}
            fontFamily={poppinsFamily}
            fontWeight={400}
            color="rgba(255,255,255,0.75)"
            animation="fade"
            delay={54}
            letterSpacing={5}
          />
        </div>

        <div style={{ marginTop: 8 }}>
          <AnimatedText
            text="An evening of music & magic ✨"
            fontSize={18}
            fontFamily={poppinsFamily}
            fontWeight={300}
            color="rgba(200,158,255,0.55)"
            animation="fade"
            delay={78}
            letterSpacing={2}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
