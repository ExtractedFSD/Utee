/*
 * Everything in the film is laid out on a beat grid so a music track can be
 * dropped in later: set BPM and OFFSET_SECONDS to the track and every cut,
 * caption and pulse lands on the beat. Scenes are measured in bars.
 */
export const FPS = 30;
export const BPM = 120;
export const OFFSET_SECONDS = 0;
export const BEATS_PER_BAR = 4;

export const BEAT_FRAMES = (60 / BPM) * FPS; // 15 at 120 BPM
export const BAR_FRAMES = BEAT_FRAMES * BEATS_PER_BAR; // 60

export const TOTAL_BARS = 20; // 40 seconds at 120 BPM
export const DURATION_FRAMES = TOTAL_BARS * BAR_FRAMES;

export const barStart = (bar: number) => Math.round(bar * BAR_FRAMES + OFFSET_SECONDS * FPS);

/** 1 on the beat, decaying to 0 before the next one. For pulses and kicks. */
export function beatPulse(frame: number, decay = 0.35): number {
  const local = ((frame - OFFSET_SECONDS * FPS) % BEAT_FRAMES + BEAT_FRAMES) % BEAT_FRAMES;
  const t = local / BEAT_FRAMES;
  return Math.max(0, 1 - t / decay);
}

/** Which beat of the bar we are on, 0 to 3. */
export function beatInBar(frame: number): number {
  return Math.floor((((frame - OFFSET_SECONDS * FPS) % BAR_FRAMES) + BAR_FRAMES) % BAR_FRAMES / BEAT_FRAMES);
}
