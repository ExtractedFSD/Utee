import React from "react";
import { OffthreadVideo, staticFile } from "remotion";
import { FPS } from "./beats";
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
}> = ({ pose, clip, clipFrom = 0, rate = 1, width }) => {
  const bezel = width * 0.035;
  const w = width;
  const h = (SCREEN_H / SCREEN_W) * (width - bezel * 2) + (width - bezel * 2) * (54 / 390) + bezel * 2;
  const radius = width * 0.16;
  // iOS status bar height, 54 of 390 points, added above the web viewport.
  const statusH = (width - bezel * 2) * (54 / 390);
  const scale = pose.scale;
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
        {/* screen: an iOS status bar above the recording, with the bar's
            background made from the recording's own top edge so there is no seam */}
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
            <>
              <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: statusH, overflow: "hidden" }}>
                <OffthreadVideo
                  src={staticFile(`recordings/${clip}.mp4`)}
                  startFrom={Math.round(clipFrom * FPS)}
                  playbackRate={rate}
                  muted
                  style={{ width: "100%", height: statusH * 300, objectFit: "cover", display: "block", transformOrigin: "top", transform: "translateY(0)" }}
                />
              </div>
              <OffthreadVideo
                src={staticFile(`recordings/${clip}.mp4`)}
                startFrom={Math.round(clipFrom * FPS)}
                playbackRate={rate}
                muted
                style={{ position: "absolute", left: 0, top: statusH, width: "100%", height: `calc(100% - ${statusH}px)`, objectFit: "cover", display: "block" }}
              />
            </>
          ) : (
            <img src={staticFile("logo-midnight.png")} alt="" style={{ position: "absolute", left: "25%", top: "40%", width: "50%" }} />
          )}
          <StatusBar width={width - bezel * 2} height={statusH} light={!!clip} />
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

/** Time, island, signal, Wi-Fi and battery, drawn the way iOS lays them out. */
const StatusBar: React.FC<{ width: number; height: number; light: boolean }> = ({ width, height, light }) => {
  const u = width / 390; // one iOS point
  const ink = light ? "#fff" : "#1d003a";
  return (
    <div style={{ position: "absolute", left: 0, top: 0, width, height, pointerEvents: "none" }}>
      <div style={{ position: "absolute", left: 31 * u, top: 15 * u, fontFamily: "Poppins, system-ui, sans-serif", fontWeight: 600, fontSize: 16.5 * u, letterSpacing: -0.2 * u, color: ink, lineHeight: 1 }}>9:41</div>
      {/* island */}
      <div style={{ position: "absolute", left: "50%", top: 11 * u, width: 126 * u, height: 37 * u, marginLeft: -63 * u, borderRadius: 999, background: "#0b0014" }}>
        <div style={{ position: "absolute", right: 14 * u, top: 11 * u, width: 15 * u, height: 15 * u, borderRadius: "50%", background: "radial-gradient(circle at 40% 40%, #2a2a40 0%, #0b0014 60%)", boxShadow: "inset 0 0 0 1px #1a1a2a" }} />
      </div>
      {/* signal */}
      <svg style={{ position: "absolute", right: 72 * u, top: 17 * u }} width={19 * u} height={12 * u} viewBox="0 0 19 12" fill={ink}>
        <rect x="0" y="8" width="3" height="4" rx="0.8" /><rect x="5" y="5.5" width="3" height="6.5" rx="0.8" /><rect x="10" y="3" width="3" height="9" rx="0.8" /><rect x="15" y="0" width="3" height="12" rx="0.8" />
      </svg>
      {/* wifi */}
      <svg style={{ position: "absolute", right: 48 * u, top: 16.5 * u }} width={17 * u} height={12 * u} viewBox="0 0 17 12" fill="none" stroke={ink} strokeWidth="1.9" strokeLinecap="round">
        <path d="M1.2 4.1a11 11 0 0 1 14.6 0" /><path d="M3.9 6.9a7 7 0 0 1 9.2 0" /><path d="M6.6 9.6a3 3 0 0 1 3.8 0" />
      </svg>
      {/* battery */}
      <div style={{ position: "absolute", right: 16 * u, top: 16.5 * u, width: 25 * u, height: 12 * u, borderRadius: 3.5 * u, border: `${1.1 * u}px solid ${ink}`, opacity: 0.95 }}>
        <div style={{ position: "absolute", left: 1.6 * u, top: 1.6 * u, bottom: 1.6 * u, width: 18 * u, borderRadius: 1.6 * u, background: ink }} />
        <div style={{ position: "absolute", right: -3.2 * u, top: 3.2 * u, width: 1.6 * u, height: 4.6 * u, borderRadius: 1 * u, background: ink, opacity: 0.6 }} />
      </div>
    </div>
  );
};
