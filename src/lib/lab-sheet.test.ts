import { describe, expect, it } from "vitest";
import { SAMPLE_FAULTS, UROPATHOGENS, judgeSheet, organismNames } from "./lab-sheet";

describe("Lodestar UTI Test sheet", () => {
  it("lists the six uropathogens from the sheet", () => {
    expect(UROPATHOGENS.map((u) => u.formal)).toEqual([
      "Escherichia coli",
      "Enterococcus",
      "Staphylococcus saprophyticus",
      "Proteus mirabilis",
      "Pseudomonas aeruginosa",
      "Klebsiella pneumoniae",
    ]);
  });

  it("is valid only when both controls passed and no error was reported", () => {
    const passed = { positive: true, negative: true, error: false };
    expect(judgeSheet({ organisms: ["e_coli", "enterococcus"], controls: passed })).toEqual({ valid: true, outcome: "positive" });
    expect(judgeSheet({ organisms: [], controls: passed })).toEqual({ valid: true, outcome: "negative" });
  });

  it("is invalid when either control failed or an error was reported", () => {
    expect(judgeSheet({ organisms: ["e_coli"], controls: { positive: false, negative: true, error: false } })).toMatchObject({
      valid: false,
      reasons: ["Positive control did not pass"],
    });
    expect(judgeSheet({ organisms: [], controls: { positive: true, negative: false, error: false } })).toMatchObject({
      valid: false,
      reasons: ["Negative control did not pass"],
    });
    const bad = judgeSheet({ organisms: [], controls: { positive: false, negative: false, error: true } });
    if (!bad.valid) expect(bad.reasons).toHaveLength(3);
  });

  it("names organisms for the clinic and offers the sample faults", () => {
    expect(organismNames(["e_coli", "klebsiella_pneumoniae"])).toEqual(["Escherichia coli", "Klebsiella pneumoniae"]);
    expect(SAMPLE_FAULTS.map((f) => f.key)).toEqual(["leaked_tube", "no_sample", "damaged_tube", "damaged_packaging", "other"]);
  });
});
