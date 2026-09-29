/**
 * Safety signposting only. Given what the user has logged, decide whether to
 * show the "get medical help today" banner. No diagnosis, no scoring: the
 * output is a yes/no plus which reason applies, so the copy can be chosen.
 */
export const RED_FLAG_SYMPTOMS = new Set([
  "back_side_pain",
  "fever_chills",
  "nausea_vomiting",
  "confusion_tired",
  "blood",
]);

export type RedFlag = { show: false } | { show: true; reason: "symptoms" | "pregnancy" };

export function redFlagFor(symptomKeys: Iterable<string>, pregnantOrTrying: string | null | undefined): RedFlag {
  if (pregnantOrTrying === "yes") return { show: true, reason: "pregnancy" };
  for (const key of symptomKeys) {
    if (RED_FLAG_SYMPTOMS.has(key)) return { show: true, reason: "symptoms" };
  }
  return { show: false };
}
