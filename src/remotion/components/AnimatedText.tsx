import React from "react";
import {
  useCurrentFrame,
  interpolate,
  spring,
  useVideoConfig,
} from "remotion";
import { playfairFamily, poppinsFamily } from "../utils/fonts";

type AnimationType = "fade" | "rise" | "zoom" | "spring" | "blurFade" | "typewriter";

interface AnimatedTextProps {
  text: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  animation?: AnimationType;
  delay?: number; // frame delay
  textShadow?: string;
  fontWeight?: number;
  letterSpacing?: number;
  lineHeight?: number;
  textAlign?: React.CSSProperties["textAlign"];
  style?: React.CSSProperties;
}

export const AnimatedText: React.FC<AnimatedTextProps> = ({
  text,
  fontSize = 48,
  fontFamily,
  color = "#FFF8EE",
  animation = "rise",
  delay = 0,
  textShadow = "0 4px 30px rgba(0,0,0,0.7)",
  fontWeight = 700,
  letterSpacing = 0,
  lineHeight = 1.3,
  textAlign = "center",
  style = {},
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const adjustedFrame = Math.max(0, frame - delay);

  let opacity = 1;
  let transform = "none";

  switch (animation) {
    case "fade":
      opacity = interpolate(adjustedFrame, [0, 25], [0, 1], {
        extrapolateRight: "clamp",
      });
      break;

    case "rise":
      opacity = interpolate(adjustedFrame, [0, 20], [0, 1], {
        extrapolateRight: "clamp",
      });
      const slideY = interpolate(adjustedFrame, [0, 25], [40, 0], {
        extrapolateRight: "clamp",
      });
      transform = `translateY(${slideY}px)`;
      break;

    case "zoom":
      opacity = interpolate(adjustedFrame, [0, 15], [0, 1], {
        extrapolateRight: "clamp",
      });
      const scale = interpolate(adjustedFrame, [0, 20], [0.5, 1], {
        extrapolateRight: "clamp",
      });
      transform = `scale(${scale})`;
      break;

    case "spring":
      const springVal = spring({
        frame: adjustedFrame,
        fps,
        config: { damping: 12, stiffness: 80, mass: 0.5 },
      });
      opacity = springVal;
      transform = `scale(${interpolate(springVal, [0, 1], [0.7, 1])}) translateY(${interpolate(springVal, [0, 1], [30, 0])}px)`;
      break;

    case "blurFade":
      opacity = interpolate(adjustedFrame, [0, 20], [0, 1], {
        extrapolateRight: "clamp",
      });
      const blurAmount = interpolate(adjustedFrame, [0, 20], [10, 0], {
        extrapolateRight: "clamp",
      });
      style.filter = `blur(${blurAmount}px)`;
      break;

    case "typewriter":
      // In typewriter, we will reveal letters by returning a fragmented render below.
      // But we still set overall opacity just in case.
      opacity = 1;
      break;
  }

  const resolvedFont =
    fontFamily ||
    (fontWeight >= 700 ? playfairFamily : poppinsFamily);

  if (animation === "typewriter") {
    // For typewriter, we render each character individually.
    const chars = text.split("");
    return (
      <div
        style={{
          fontSize,
          fontFamily: resolvedFont,
          color,
          textShadow,
          fontWeight,
          letterSpacing,
          lineHeight,
          textAlign,
          whiteSpace: "pre-line",
          ...style,
        }}
      >
        {chars.map((char, i) => {
          const charOpacity = interpolate(
            adjustedFrame,
            [i * 2, i * 2 + 1],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          return (
            <span key={i} style={{ opacity: charOpacity }}>
              {char}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div
      style={{
        opacity,
        transform,
        fontSize,
        fontFamily: resolvedFont,
        color,
        textShadow,
        fontWeight,
        letterSpacing,
        lineHeight,
        textAlign,
        whiteSpace: "pre-line",
        ...style,
      }}
    >
      {text}
    </div>
  );
};
