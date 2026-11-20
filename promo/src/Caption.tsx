import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BODY, DISPLAY } from "./fonts";

/*
 * Headline in Cooper Light, subline in Poppins. Each slides up on its own
 * beat (headline on the one, subline on the two) and eases out before the
 * scene ends, so the next caption lands clean on the next bar.
 */
export const Caption: React.FC<{
  headline: string;
  subline?: string;
  align: "center" | "left";
  size: number;
  sceneFrames: number;
  color?: string;
}> = ({ headline, subline, align, size, sceneFrames, color = "#ffffff" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inA = spring({ frame, fps, config: { damping: 18, stiffness: 160, mass: 0.8 } });
  const inB = spring({ frame: frame - 15, fps, config: { damping: 18, stiffness: 160, mass: 0.8 } });
  const out = interpolate(frame, [sceneFrames - 14, sceneFrames - 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lines = headline.split("\n");
  return (
    <div style={{ textAlign: align, color, opacity: out, maxWidth: size * 14 }}>
      <div
        style={{
          fontFamily: DISPLAY,
          fontWeight: 300,
          fontSize: size,
          lineHeight: 1.05,
          letterSpacing: -size * 0.01,
          opacity: inA,
          transform: `translateY(${(1 - inA) * size * 0.6}px)`,
          textShadow: "0 2px 24px rgba(29,0,58,0.25)",
        }}
      >
        {lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
      {subline && (
        <div
          style={{
            fontFamily: BODY,
            fontWeight: 400,
            fontSize: size * 0.36,
            lineHeight: 1.35,
            marginTop: size * 0.3,
            opacity: inB * 0.92,
            transform: `translateY(${(1 - inB) * size * 0.4}px)`,
          }}
        >
          {subline}
        </div>
      )}
    </div>
  );
};
