import { describe, expect, it } from "vitest";
import { UROPATHOGENS, judgeSheet, organismNames } from "./lab-sheet";

describe("Lodestar sheet", () => {
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

  it("is positive when an organism is ticked and the controls pass", () => {
    expect(judgeSheet({ organisms: ["e_coli"], controls: { positive: true, negative: false, error: false } })).toEqual({
      valid: true,
      outcome: "positive",
    });
    expect(judgeSheet({ organisms: [], controls: { positive: true, negative: false, error: false } })).toEqual({
      valid: true,
      outcome: "negative",
    });
  });

  it("is invalid when the positive control is missing, the negative control reacts, or an error is reported", () => {
    const bad = judgeSheet({ organisms: ["e_coli"], controls: { positive: false, negative: true, error: true } });
    expect(bad.valid).toBe(false);
    expect(bad.outcome).toBe("inconclusive");
    if (!bad.valid) expect(bad.reasons).toHaveLength(3);
    expect(judgeSheet({ organisms: [], controls: { positive: true, negative: false, error: true } }).valid).toBe(false);
  });

  it("names organisms for the clinic", () => {
    expect(organismNames(["e_coli", "klebsiella_pneumoniae"])).toEqual(["Escherichia coli", "Klebsiella pneumoniae"]);
  });
});
