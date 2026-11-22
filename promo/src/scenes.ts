import offsets from "./offsets.json";

/*
 * The storyboard, in bars. Each scene names the recording it plays on the
 * phone (from public/recordings, made by scripts/record.mjs), where in that
 * clip to start, the caption, and how the phone sits. Captions are two
 * lines: a Cooper headline and a Poppins subline.
 */
export type Pose = { rotateY: number; rotateX: number; scale: number; x: number; y: number };

export type Scene = {
  key: string;
  fromBar: number;
  bars: number;
  clip: string | null;
  /** Seconds into the clip to start from. */
  clipFrom?: number;
  /** Playback speed of the clip; above 1 tightens typing and waiting. */
  rate?: number;
  headline: string;
  subline?: string;
  /** Keyword chips that pop in on successive beats under the caption. */
  chips?: string[];
  /** Colour behind the home indicator: white where the page has the bottom nav, page pink elsewhere. */
  bottom?: string;
  pose: Pose;
  /** Which side the caption sits on in landscape; vertical always stacks. */
  side?: "left" | "right";
};

/** Seconds into a recording at which its first page had loaded (written by scripts/record.mjs). */
const ready = (clip: string, extra = 0) => ((offsets as Record<string, number>)[clip] ?? 1) + extra;

export const SCENES: Scene[] = [
  { key: "intro", fromBar: 0, bars: 2, clip: "home", clipFrom: ready("home", 0.5), bottom: "#ffe5f2", headline: "Your UTI history,\nin your pocket.", subline: "The Utee UTI Passport", pose: { rotateY: -26, rotateX: 6, scale: 0.92, x: 0, y: 0 } },
  { key: "today", fromBar: 2, bars: 3, clip: "today", clipFrom: ready("today", 0.4), rate: 1.3, headline: "How are you today?", subline: "A tap a day keeps your record honest.", chips: ["Log a UTI", "Daily diary", "Streaks"], pose: { rotateY: -10, rotateX: 2, scale: 1.02, x: 0, y: 0 } },
  { key: "una", fromBar: 5, bars: 3, clip: "una", clipFrom: ready("una", 3.0), bottom: "#ffe5f2", rate: 2.1, headline: "Just tell Una.", subline: "Type it in your own words.", chips: ["You type it", "Una reads it", "Record filled"], pose: { rotateY: 8, rotateX: 4, scale: 1.04, x: 0, y: -10 } },
  { key: "record", fromBar: 8, bars: 4, clip: "record", clipFrom: ready("record", 0.6), rate: 2.0, headline: "Everything\nin one place.", subline: "Your whole history, ready for any appointment.", chips: ["UTIs", "Antibiotics", "Supplements", "Cultures", "Scans", "Bloods", "Diary"], pose: { rotateY: -12, rotateX: 3, scale: 1.02, x: 0, y: 0 } },
  { key: "history", fromBar: 12, bars: 3, clip: "history", clipFrom: ready("history", 0.4), rate: 1.3, headline: "See the pattern.", subline: "One timeline, every year.", chips: ["Every UTI", "Every antibiotic", "Every result"], pose: { rotateY: 10, rotateX: 3, scale: 1, x: 0, y: 0 } },
  { key: "share", fromBar: 15, bars: 3, clip: "share", clipFrom: ready("share", 1.0), rate: 1.6, headline: "Show your GP.", subline: "A code opens a read-only copy. Or hand over the PDF.", chips: ["Your GP", "A&E", "Urology clinic"], pose: { rotateY: -8, rotateX: 2, scale: 1, x: 0, y: 0 } },
  { key: "end", fromBar: 18, bars: 2, clip: null, headline: "portal.myutee.co.uk", subline: "Order a Utee test", pose: { rotateY: -30, rotateX: 8, scale: 0.8, x: 0, y: 60 } },
];
