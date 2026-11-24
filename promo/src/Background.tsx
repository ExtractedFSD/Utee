import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { DURATION_FRAMES } from "./beats";

/*
 * The brand gradient with three soft blobs drifting behind the phone. The
 * blobs drift slowly; nothing pulses.
 */
export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / DURATION_FRAMES;
  const blob = (color: string, x: number, y: number, size: number, phase: number) => {
    const dx = Math.sin(t * Math.PI * 2 * 1.5 + phase) * 6;
    const dy = Math.cos(t * Math.PI * 2 * 1.1 + phase) * 5;
    return (
      <div
        key={phase}
        style={{
          position: "absolute",
          left: `calc(${x}% + ${dx}%)`,
          top: `calc(${y}% + ${dy}%)`,
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          borderRadius: "50%",
          background: color,
          filter: "blur(90px)",
          opacity: 0.55,
        }}
      />
    );
  };
  const shade = interpolate(t, [0, 1], [0, 8]);
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${135 + shade}deg, #f490c0 0%, #962043 100%)`, overflow: "hidden" }}>
      {blob("#ffcce5", 20, 20, 900, 0)}
      {blob("#ddc8ec", 85, 70, 1000, 2)}
      {blob("#e1ffe8", 30, 90, 700, 4)}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.08), rgba(29,0,58,0.25) 90%)" }} />
    </AbsoluteFill>
  );
};
