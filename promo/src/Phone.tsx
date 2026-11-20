import React from "react";
import { OffthreadVideo, staticFile, useCurrentFrame } from "remotion";
import { beatPulse, FPS } from "./beats";
import type { Pose } from "./scenes";

/*
 * A phone in 3D: perspective, a dark rounded body, a lit edge, the screen
 * recording mapped inside with a soft reflection, and a shadow that moves
 * with the tilt. Screen aspect matches the recordings (390 x 844 CSS px).
 */
export const SCREEN_W = 390;
export const SCREEN_H = 844;

export const Phone: React.FC<{
  pose: Pose;
  clip: string | null;
  clipFrom?: number;
  rate?: number;
  width: number;
  kick?: number;
}> = ({ pose, clip, clipFrom = 0, rate = 1, width, kick = 0 }) => {
  const frame = useCurrentFrame();
  const bezel = width * 0.035;
  const w = width;
  const h = (SCREEN_H / SCREEN_W) * width + bezel * 2 - bezel * 2;
  const radius = width * 0.16;
  const pulse = beatPulse(frame, 0.3) * kick;
  const scale = pose.scale * (1 + pulse * 0.025);
  const shadowX = -pose.rotateY * 1.2;
  return (
    <div style={{ perspective: 2200, perspectiveOrigin: "50% 45%", width: w, height: h, transform: `translate(${pose.x}px, ${pose.y}px)` }}>
      <div
        style={{
          width: w,
          height: h,
          transformStyle: "preserve-3d",
          transform: `rotateY(${pose.rotateY}deg) rotateX(${pose.rotateX}deg) scale(${scale})`,
          position: "relative",
        }}
      >
        {/* shadow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            transform: `translate(${shadowX}px, ${width * 0.09}px) translateZ(-60px)`,
            background: "rgba(29,0,58,0.45)",
            filter: `blur(${width * 0.08}px)`,
          }}
        />
        {/* body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: radius,
            background: "linear-gradient(160deg, #3a1a5a 0%, #1d003a 45%, #120024 100%)",
            boxShadow: "inset 0 0 0 2px rgba(255,255,255,0.18), inset 0 0 0 6px rgba(0,0,0,0.35)",
          }}
        />
        {/* side buttons */}
        <div style={{ position: "absolute", left: -width * 0.012, top: h * 0.22, width: width * 0.012, height: h * 0.05, background: "#2a0f45", borderRadius: 4 }} />
        <div style={{ position: "absolute", left: -width * 0.012, top: h * 0.29, width: width * 0.012, height: h * 0.09, background: "#2a0f45", borderRadius: 4 }} />
        <div style={{ position: "absolute", right: -width * 0.012, top: h * 0.26, width: width * 0.012, height: h * 0.12, background: "#2a0f45", borderRadius: 4 }} />
        {/* screen */}
        <div
          style={{
            position: "absolute",
            left: bezel,
            top: bezel,
            right: bezel,
            bottom: bezel,
            borderRadius: radius - bezel,
            overflow: "hidden",
            background: "#ffe5f2",
            transform: "translateZ(1px)",
          }}
        >
          {clip ? (
            <OffthreadVideo
              src={staticFile(`recordings/${clip}.mp4`)}
              startFrom={Math.round(clipFrom * FPS)}
              playbackRate={rate}
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <img src={staticFile("logo-midnight.png")} alt="" style={{ position: "absolute", left: "25%", top: "40%", width: "50%" }} />
          )}
          {/* dynamic island */}
          <div style={{ position: "absolute", left: "50%", top: width * 0.03, width: width * 0.28, height: width * 0.075, marginLeft: -width * 0.14, borderRadius: 999, background: "#0b0014" }} />
          {/* reflection */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: `linear-gradient(${115 + pose.rotateY}deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0) 55%)`,
              pointerEvents: "none",
            }}
          />
        </div>
      </div>
    </div>
  );
};
