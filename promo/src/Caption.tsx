import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { BEAT_FRAMES } from "./beats";
import { BODY, DISPLAY } from "./fonts";

/*
 * Kinetic captions. The headline's words rise in one after another, a short
 * rule draws under them on the next beat, the subline fades up, and then a
 * row of keyword chips pops in, one per beat. Everything eases out together
 * before the scene ends so the next caption lands clean on the downbeat.
 */
export const Caption: React.FC<{
  headline: string;
  subline?: string;
  chips?: string[];
  align: "center" | "left";
  size: number;
  sceneFrames: number;
  color?: string;
}> = ({ headline, subline, chips = [], align, size, sceneFrames, color = "#ffffff" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const out = interpolate(frame, [sceneFrames - 14, sceneFrames - 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lift = (1 - out) * size * 0.3;

  const lines = headline.split("\n");
  let wordIndex = 0;
  const word = (w: string) => {
    const i = wordIndex++;
    const s = spring({ frame: frame - i * 4, fps, config: { damping: 16, stiffness: 170, mass: 0.7 } });
    return (
      <span key={`${w}-${i}`} style={{ display: "inline-block", opacity: s, transform: `translateY(${(1 - s) * size * 0.55}px)`, marginRight: size * 0.22, filter: `blur(${(1 - s) * 6}px)` }}>
        {w}
      </span>
    );
  };

  const ruleAt = BEAT_FRAMES; // beat two
  const rule = interpolate(frame, [ruleAt, ruleAt + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sub = spring({ frame: frame - ruleAt - 4, fps, config: { damping: 18, stiffness: 150, mass: 0.8 } });
  const chipsFrom = BEAT_FRAMES * 2;

  return (
    <div style={{ textAlign: align, color, opacity: out, transform: `translateY(-${lift}px)`, maxWidth: size * 14, display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start" }}>
      <div style={{ fontFamily: DISPLAY, fontWeight: 300, fontSize: size, lineHeight: 1.05, letterSpacing: -size * 0.01, textShadow: "0 2px 24px rgba(29,0,58,0.25)" }}>
        {lines.map((l, li) => (
          <div key={li} style={{ marginRight: -size * 0.22 }}>
            {l.split(" ").map(word)}
          </div>
        ))}
      </div>
      <div style={{ height: Math.max(3, size * 0.045), width: size * 1.3 * rule, background: "rgba(255,255,255,0.85)", borderRadius: 999, marginTop: size * 0.22, alignSelf: align === "center" ? "center" : "flex-start" }} />
      {subline && (
        <div style={{ fontFamily: BODY, fontWeight: 400, fontSize: size * 0.36, lineHeight: 1.35, marginTop: size * 0.22, opacity: sub * 0.92, transform: `translateY(${(1 - sub) * size * 0.3}px)` }}>{subline}</div>
      )}
      {chips.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: size * 0.14, justifyContent: align === "center" ? "center" : "flex-start", marginTop: size * 0.3 }}>
          {chips.map((c, i) => {
            const s = spring({ frame: frame - chipsFrom - i * (BEAT_FRAMES / 2), fps, config: { damping: 12, stiffness: 220, mass: 0.6 } });
            return (
              <span
                key={c}
                style={{
                  display: "inline-block",
                  fontFamily: BODY,
                  fontWeight: 600,
                  fontSize: size * 0.27,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "#91193b",
                  background: "#fff",
                  padding: `${size * 0.12}px ${size * 0.3}px`,
                  borderRadius: 999,
                  opacity: Math.min(1, s * 1.2),
                  transform: `scale(${0.6 + s * 0.4}) translateY(${(1 - s) * size * 0.2}px)`,
                  boxShadow: "0 6px 20px rgba(29,0,58,0.18)",
                }}
              >
                {c}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
};
