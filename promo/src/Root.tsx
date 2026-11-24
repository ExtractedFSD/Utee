import React from "react";
import { Composition } from "remotion";
import { DURATION_FRAMES, FPS } from "./beats";
import { Promo } from "./Promo";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="PassportVertical" component={Promo} durationInFrames={DURATION_FRAMES} fps={FPS} width={1080} height={1920} defaultProps={{ layout: "vertical" as const }} />
    <Composition id="PassportLandscape" component={Promo} durationInFrames={DURATION_FRAMES} fps={FPS} width={1920} height={1080} defaultProps={{ layout: "landscape" as const }} />
  </>
);
