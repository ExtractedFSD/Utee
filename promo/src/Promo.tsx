import React, { useEffect } from "react";
import { AbsoluteFill, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Background } from "./Background";
import { Caption } from "./Caption";
import { Phone } from "./Phone";
import { BAR_FRAMES, barStart, beatInBar } from "./beats";
import { BODY, DISPLAY, loadBrandFonts } from "./fonts";
import { SCENES, type Pose } from "./scenes";

export type Layout = "vertical" | "landscape";

/** Share of the 9:16 frame, from the top, that holds the caption. */
const CAPTION_BAND = 0.24;

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
  // Vertical: the caption's last line sits on the bottom of the top band, and
  // the phone is centred in the space between that line and the bottom edge.
  const phoneWidth = vertical ? width * 0.54 : height * 0.42;
  const captionSize = vertical ? width * 0.085 : height * 0.1;
  const swap = prev ? interpolate(into, [0, 8], [0, 1], { extrapolateRight: "clamp" }) : 1;

  // Each recording sits in its own Sequence so the clip starts from its own
  // first frame when the scene begins (the sequence runs a few frames long
  // to cover the cross-fade into the next scene).
  const phoneLayer = (s: typeof scene, opacity: number) => (
    <Sequence key={`phone-${s.key}`} from={barStart(s.fromBar)} durationInFrames={s.bars * BAR_FRAMES + 12} layout="none">
      <div style={{ position: "absolute", left: 0, right: 0, top: vertical ? height * CAPTION_BAND : 0, bottom: 0, opacity, display: "flex", alignItems: "center", justifyContent: vertical ? "center" : "flex-end", paddingRight: vertical ? 0 : width * 0.09 }}>
        <Phone pose={drift} clip={s.clip} clipFrom={s.clipFrom} rate={s.rate} width={phoneWidth} />
      </div>
    </Sequence>
  );

  const isEnd = scene.key === "end";

  return (
    <AbsoluteFill style={{ background: "#1d003a" }}>
      <Background />
      {prev && swap < 1 && phoneLayer(prev, 1 - swap)}
      {phoneLayer(scene, swap)}

      {SCENES.map((s) => (
        <Sequence key={s.key} from={barStart(s.fromBar)} durationInFrames={s.bars * BAR_FRAMES} layout="none">
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              bottom: vertical ? height * (1 - CAPTION_BAND) : 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: vertical ? "flex-end" : "center",
              alignItems: vertical ? "center" : "flex-start",
              padding: vertical ? `0 ${width * 0.08}px 0` : `0 0 0 ${width * 0.08}`,
              pointerEvents: "none",
            }}
          >
            {s.key === "end" ? (
              <EndCard vertical={vertical} />
            ) : (
              <Caption headline={s.headline} subline={s.subline} align={vertical ? "center" : "left"} size={captionSize} sceneFrames={s.bars * BAR_FRAMES} />
            )}
          </div>
        </Sequence>
      ))}

      {!isEnd && <BeatDots />}
    </AbsoluteFill>
  );
};

/** Four small dots that count the bar in the corner: a quiet metronome for the eye. */
const BeatDots: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const on = beatInBar(frame);
  const size = Math.min(width, height) * 0.012;
  return (
    <div style={{ position: "absolute", right: size * 3, bottom: size * 3, display: "flex", gap: size }}>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} style={{ width: size, height: size, borderRadius: size, background: "#fff", opacity: i === on ? 0.9 : 0.3, transform: `scale(${i === on ? 1.25 : 1})` }} />
      ))}
    </div>
  );
};

const EndCard: React.FC<{ vertical: boolean }> = ({ vertical }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const a = spring({ frame, fps, config: { damping: 16, stiffness: 140 } });
  const b = spring({ frame: frame - 12, fps, config: { damping: 16, stiffness: 140 } });
  const c = spring({ frame: frame - 24, fps, config: { damping: 14, stiffness: 160 } });
  const base = vertical ? width : height;
  return (
    <div style={{ textAlign: vertical ? "center" : "left", color: "#fff", marginTop: vertical ? height * 0.02 : 0 }}>
      <Img src={staticFile("logo-white.png")} style={{ width: base * 0.34, opacity: a, transform: `translateY(${(1 - a) * 30}px)` }} />
      <div style={{ fontFamily: DISPLAY, fontWeight: 300, fontSize: base * 0.075, lineHeight: 1.1, marginTop: base * 0.05, opacity: b, transform: `translateY(${(1 - b) * 30}px)` }}>
        Your UTI history,
        <br />
        in your pocket.
      </div>
      <div style={{ fontFamily: BODY, fontWeight: 600, fontSize: base * 0.034, letterSpacing: "0.12em", textTransform: "uppercase", marginTop: base * 0.06, display: "inline-block", background: "#fff", color: "#91193b", padding: `${base * 0.02}px ${base * 0.045}px`, borderRadius: 999, opacity: c, transform: `scale(${0.9 + c * 0.1})` }}>
        Order a Utee test
      </div>
      <div style={{ fontFamily: BODY, fontSize: base * 0.03, marginTop: base * 0.035, opacity: c * 0.9 }}>portal.myutee.co.uk</div>
    </div>
  );
};
