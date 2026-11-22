import React from "react";
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { DISPLAY } from "./fonts";

/*
 * Kinetic headlines: the words rise in one after another, blur settling to
 * sharp, and the whole line eases out before the scene ends so the next one
 * lands clean on the downbeat. Headline only; no sublines or chips.
 */
export const Caption: React.FC<{
  headline: string;
  /** Show the Utee logo above the headline (the opening scene). */
  logo?: boolean;
  align: "center" | "left";
  size: number;
  sceneFrames: number;
  color?: string;
}> = ({ headline, logo = false, align, size, sceneFrames, color = "#ffffff" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = interpolate(frame, [sceneFrames - 14, sceneFrames - 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lift = (1 - out) * size * 0.3;

  const logoIn = spring({ frame, fps, config: { damping: 16, stiffness: 140, mass: 0.8 } });
  const lines = headline.split("\n");
  let wordIndex = logo ? 2 : 0; // the words follow the logo
  const word = (w: string) => {
    const i = wordIndex++;
    const s = spring({ frame: frame - i * 4, fps, config: { damping: 16, stiffness: 170, mass: 0.7 } });
    return (
      <span key={`${w}-${i}`} style={{ display: "inline-block", opacity: s, transform: `translateY(${(1 - s) * size * 0.55}px)`, marginRight: size * 0.22, filter: `blur(${(1 - s) * 6}px)` }}>
        {w}
      </span>
    );
  };


  return (
    <div style={{ textAlign: align, color, opacity: out, transform: `translateY(-${lift}px)`, maxWidth: size * 14, display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start" }}>
      {logo && <Img src={staticFile("logo-white.png")} style={{ width: size * 2.6, marginBottom: size * 0.45, opacity: logoIn, transform: `translateY(${(1 - logoIn) * size * 0.3}px)` }} />}
      <div style={{ fontFamily: DISPLAY, fontWeight: 300, fontSize: size, lineHeight: 1.05, letterSpacing: -size * 0.01, textShadow: "0 2px 24px rgba(29,0,58,0.25)" }}>
        {lines.map((l, li) => (
          <div key={li} style={{ marginRight: -size * 0.22 }}>
            {l.split(" ").map(word)}
          </div>
        ))}
      </div>
    </div>
  );
};
