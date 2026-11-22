import React, { useEffect } from "react";
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "./Background";
import { Caption } from "./Caption";
import { Phone } from "./Phone";
import { BAR_FRAMES, barStart } from "./beats";
import { BODY, DISPLAY, loadBrandFonts } from "./fonts";
import { SCENES, type Pose } from "./scenes";

export type Layout = "vertical" | "landscape";

/** Share of the 9:16 frame, from the top, that holds the caption (text centred in it). */
const CAPTION_BAND = 0.27;
/** Where the caption's last line lands; the phone is centred between here and the bottom edge. */
const PHONE_BAND_TOP = 0.22;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPose = (a: Pose, b: Pose, t: number): Pose => ({
  rotateY: lerp(a.rotateY, b.rotateY, t),
  rotateX: lerp(a.rotateX, b.rotateX, t),
  scale: lerp(a.scale, b.scale, t),
  x: lerp(a.x, b.x, t),
  y: lerp(a.y, b.y, t),
});

/*
 * One continuous phone that eases between poses on each bar, with the
 * recording swapping behind a quick cross-fade on the downbeat. Captions
 * live in their own sequences. Layout decides where things sit: vertical
 * stacks caption above the phone, landscape puts the phone on the right.
 */
export const Promo: React.FC<{ layout: Layout }> = ({ layout }) => {
  useEffect(() => loadBrandFonts(), []);
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  // Current and next scene, and how far through the transition we are.
  const idx = Math.max(0, SCENES.findIndex((s, i) => frame < barStart(s.fromBar + s.bars) || i === SCENES.length - 1));
  const scene = SCENES[idx];
  const prev = SCENES[idx - 1];
  const into = frame - barStart(scene.fromBar);
  const ease = spring({ frame: into, fps, config: { damping: 20, stiffness: 90, mass: 1 } });
  const pose = prev ? lerpPose(prev.pose, scene.pose, ease) : scene.pose;
  // A slow drift inside the scene so the phone is never frozen.
  const drift = { ...pose, rotateY: pose.rotateY + Math.sin(frame / 38) * 1.6, rotateX: pose.rotateX + Math.cos(frame / 47) * 0.8 };

  const vertical = layout === "vertical";
  // Vertical: the phone is fixed in the lower band and the caption is
  // centred in the band above it, so both stay put from scene to scene.
  const phoneWidth = vertical ? width * 0.54 : height * 0.42;
  const captionSize = vertical ? width * 0.105 : height * 0.13;
  const phoneLeft = width - width * 0.09 - phoneWidth;
  const swap = prev ? interpolate(into, [0, 8], [0, 1], { extrapolateRight: "clamp" }) : 1;

  // Each recording sits in its own Sequence so the clip starts from its own
  // first frame when the scene begins (the sequence runs a few frames long
  // to cover the cross-fade into the next scene).
  const phoneLayer = (s: typeof scene, opacity: number) => (
    <Sequence key={`phone-${s.key}`} from={barStart(s.fromBar)} durationInFrames={s.bars * BAR_FRAMES + 12} layout="none">
      <div style={{ position: "absolute", left: 0, right: 0, top: vertical ? height * PHONE_BAND_TOP : 0, bottom: 0, opacity, display: "flex", alignItems: "center", justifyContent: vertical ? "center" : "flex-end", paddingRight: vertical ? 0 : width * 0.09 }}>
        <Phone pose={drift} clip={s.clip} clipFrom={s.clipFrom} rate={s.rate} width={phoneWidth} chrome={{ bottom: s.bottom }} />
      </div>
    </Sequence>
  );

  const isEnd = scene.key === "end";
  // Into the end card the last phone fades away over a bar beat rather than cutting.
  const fadeOut = prev && isEnd ? interpolate(into, [0, 20], [1, 0], { extrapolateRight: "clamp" }) : 1 - swap;

  return (
    <AbsoluteFill style={{ background: "#1d003a" }}>
      <Background />
      {prev && fadeOut > 0 && phoneLayer(prev, fadeOut)}
      {!isEnd && phoneLayer(scene, swap)}

      {SCENES.map((s) => (
        <Sequence key={s.key} from={barStart(s.fromBar)} durationInFrames={s.bars * BAR_FRAMES} layout="none">
          <div
            style={{
              position: "absolute",
              left: 0,
              // Landscape: the caption is centred in the space left of the phone.
              right: vertical || s.key === "end" ? 0 : width - phoneLeft,
              top: 0,
              // The end card takes the whole frame, centred; captions take the band above the phone.
              bottom: vertical && s.key !== "end" ? height * (1 - CAPTION_BAND) : 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: `0 ${width * 0.04}px`,
              pointerEvents: "none",
            }}
          >
            {s.key === "end" ? (
              <EndCard vertical={vertical} />
            ) : (
              <Caption headline={s.headline} logo={s.key === "intro"} align="center" size={captionSize} sceneFrames={s.bars * BAR_FRAMES} />
            )}
          </div>
        </Sequence>
      ))}

    </AbsoluteFill>
  );
};

const EndCard: React.FC<{ vertical: boolean }> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  // Starts once the last phone has faded (20 frames), then logo, line, address on successive beats.
  const a = spring({ frame: frame - 20, fps, config: { damping: 16, stiffness: 140 } });
  const b = spring({ frame: frame - 32, fps, config: { damping: 16, stiffness: 140 } });
  const c = spring({ frame: frame - 44, fps, config: { damping: 14, stiffness: 160 } });
  const base = vertical ? width : height;
  return (
    <div style={{ textAlign: "center", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", marginTop: -base * 0.04 }}>
      <Img src={staticFile("logo-white.png")} style={{ width: base * 0.4, opacity: a, transform: `translateY(${(1 - a) * 24}px)` }} />
      <div style={{ fontFamily: DISPLAY, fontWeight: 300, fontSize: base * 0.082, lineHeight: 1.08, marginTop: base * 0.05, opacity: b, transform: `translateY(${(1 - b) * 24}px)` }}>
        Your UTI history,
        <br />
        in your pocket.
      </div>
      <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: base * 0.032, letterSpacing: "0.04em", marginTop: base * 0.06, opacity: c * 0.95, transform: `translateY(${(1 - c) * 16}px)` }}>portal.myutee.co.uk</div>
    </div>
  );
};
