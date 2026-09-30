import { describe, expect, it } from "vitest";
import {
  SAFETY_QUESTIONS,
  SYMPTOM_QUESTIONS,
  SYMPTOM_LABELS,
  changeLabel,
  isVersioned,
  safetyFlagsIn,
  selectedFrom,
} from "./questions";

describe("pre-sample questionnaire", () => {
  it("asks the eight safety questions and eleven symptoms in order", () => {
    expect(SAFETY_QUESTIONS.map((q) => q.key)).toEqual(["d1", "d2", "d3", "d4", "d5", "d6", "d7", "d8"]);
    expect(SYMPTOM_QUESTIONS).toHaveLength(11);
    expect(SYMPTOM_QUESTIONS[0].label).toBe("Needing to urinate more frequently than normal.");
    expect(SYMPTOM_QUESTIONS[10].label).toBe("Pain or discomfort radiating down into your legs.");
  });

  it("lists safety flags in question order", () => {
    expect(safetyFlagsIn({ d7: "yes", d1: "yes", d2: "no" })).toEqual(["d1", "d7"]);
    expect(safetyFlagsIn({})).toEqual([]);
  });

  it("counts a symptom as present only when scored above 0", () => {
    expect(selectedFrom({ burning: 7, frequency: 0, cloudy: 1 })).toEqual(["cloudy", "burning"]);
  });

  it("keeps labels for symptom keys from older submissions", () => {
    for (const key of ["blood_in_urine", "fever", "nausea", "back_pain", "lower_abdominal_pain", "cloudy_or_smelly"]) {
      expect(SYMPTOM_LABELS[key]).toBeTruthy();
    }
    expect(isVersioned({ selected: ["fever"] })).toBe(false);
  });

  it("describes the 24 hour change scale in words", () => {
    expect(changeLabel(-5)).toBe("Very much worse");
    expect(changeLabel(-1)).toBe("Worse");
    expect(changeLabel(0)).toBe("No change");
    expect(changeLabel(3)).toBe("Better");
    expect(changeLabel(5)).toBe("Very much better");
  });
});
