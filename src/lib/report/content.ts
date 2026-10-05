import { z } from "zod";
import { PATHOGEN_PROFILES, PANEL_ORDER } from "./copy";

/**
 * The part of the report the clinic can change: the wording on the results
 * page. Everything else in the PDF is fixed copy or comes from the lab sheet.
 * The suggested wording is generated from the sheet; the clinician can
 * accept it, edit it, or replace it (the manual override for results that
 * look like heavy contamination).
 */
export type ReportContent = {
  version: 1;
  /** One line above the result tiles. */
  headline: string;
  /** Paragraphs under the tiles, separated by blank lines. */
  resultText: string;
  /** Optional, shown to the patient as a note from the reviewing clinician. */
  clinicianNote: string;
  /** True once the clinician has changed the suggested wording. */
  overridden: boolean;
  /**
   * Heavy contamination: so many targets positive that the result cannot be
   * read as "these bacteria are causing an infection". The results page says
   * so and the pathogen profiles are left out.
   */
  contamination: boolean;
};

/** Five or six of the six targets positive reads as contamination, not infection. */
export const CONTAMINATION_THRESHOLD = 5;

export const contentSchema = z.object({
  version: z.literal(1),
  headline: z.string().trim().min(1, "Add a headline").max(120),
  resultText: z.string().trim().min(1, "Add the results text").max(6000),
  clinicianNote: z.string().trim().max(2000),
  overridden: z.boolean(),
  contamination: z.boolean(),
});

export type SheetSummary = {
  outcome: "positive" | "negative" | "inconclusive";
  organisms: readonly string[];
};

function names(keys: readonly string[]): string[] {
  return PANEL_ORDER.filter((k) => keys.includes(k)).map((k) => PATHOGEN_PROFILES[k].name);
}

/** "A, B and C" */
export function listNames(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/**
 * Wording generated from the lab sheet. Four shapes: nothing detected, one
 * bacterium, a few bacteria, or so many that the sample was most likely
 * contaminated during collection. The contamination wording is a draft for
 * the UTI Institute to replace; the clinician can edit it on each report.
 */
export function suggestedContent(sheet: SheetSummary): ReportContent {
  const detected = names(sheet.organisms);
  const base = { version: 1 as const, clinicianNote: "", overridden: false };

  if (sheet.outcome === "negative" || detected.length === 0) {
    return {
      ...base,
      contamination: false,
      headline: "No UTI-causing bacteria detected",
      resultText: [
        "The Lodestar Dx test did not detect clinically significant levels of DNA for the six most common uropathogens in your urine. This means the test was negative for Escherichia coli, Enterococcus species, Staphylococcus saprophyticus, Pseudomonas aeruginosa, Klebsiella pneumoniae and Proteus mirabilis.",
        "A negative result does not rule out every cause of urinary symptoms. The panel does not screen for rarer bacteria, and symptoms can have causes other than infection. If your symptoms continue, please speak to a healthcare professional and take this report with you.",
      ].join("\n\n"),
    };
  }

  if (detected.length >= CONTAMINATION_THRESHOLD) {
    return {
      ...base,
      contamination: true,
      headline: "A result that needs careful interpretation",
      resultText: [
        `Your sample tested positive for ${detected.length} of the six bacteria on the panel: ${listNames(detected)}.`,
        "When this many different bacteria are detected together, the most likely explanation is that the sample picked up bacteria from the skin or the surrounding area while it was being collected, rather than that all of them are causing an infection. A result like this cannot be interpreted in the same way as a result showing one or two bacteria.",
        "Because of this, we have not described each bacterium individually in this report. The most useful next step is to discuss this result with a healthcare professional, who may suggest repeating the test with a carefully collected sample.",
      ].join("\n\n"),
    };
  }

  if (detected.length === 1) {
    return {
      ...base,
      contamination: false,
      headline: `${detected[0]} detected`,
      resultText: [
        `Your sample tested positive for ${detected[0]}. The test found this bacterium's DNA at a level high enough to suggest an active infection rather than part of your natural urobiome.`,
        "The pages that follow describe this bacterium, how it behaves in the urinary tract, and the antibiotics that are often most effective against it according to the latest regional antibiogram data. Please share this report with the healthcare professional looking after you.",
      ].join("\n\n"),
    };
  }

  return {
    ...base,
    contamination: false,
    headline: `${detected.length} types of bacteria detected`,
    resultText: [
      `Your sample tested positive for more than one bacterium: ${listNames(detected)}. Each was found at a level high enough to suggest an active infection rather than part of your natural urobiome.`,
      "Finding more than one type of bacteria is not unusual, particularly in recurrent or long-standing infections. The pages that follow describe each bacterium, how it behaves in the urinary tract, and the antibiotics that are often most effective against it according to the latest regional antibiogram data. Please share this report with the healthcare professional looking after you.",
    ].join("\n\n"),
  };
}

/** Paragraphs from the editable text: blank-line separated, trimmed, empties dropped. */
export function paragraphsOf(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);
}

/** Pathogen keys from the sheet, in panel order, that have a profile. */
export function detectedKeys(organisms: readonly string[]): string[] {
  return PANEL_ORDER.filter((k) => organisms.includes(k));
}

/** True when the clinician's text differs from what the sheet would suggest. */
export function differsFromSuggested(content: ReportContent, sheet: SheetSummary): boolean {
  const s = suggestedContent(sheet);
  return content.headline.trim() !== s.headline || content.resultText.trim() !== s.resultText || content.contamination !== s.contamination;
}
