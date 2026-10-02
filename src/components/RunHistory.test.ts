import { describe, expect, it } from "vitest";
import { runsFrom } from "./RunHistory";

describe("run history", () => {
  it("numbers real runs, marks amendments as superseded and names who recorded each", () => {
    const runs = runsFrom(
      {
        outcome: "positive",
        organisms: ["e_coli"],
        controls: { positive: true, negative: true, error: false },
        valid: true,
        comments: null,
        uploaded_at: "2026-10-02T14:00:00Z",
        lab_user_id: "u2",
        previous_attempts: [
          { outcome: "inconclusive", organisms: ["e_coli"], controls: { positive: true, negative: false, error: false }, valid: false, comments: "faint band", uploaded_at: "2026-10-02T12:00:00Z", lab_user_id: "u1" },
          { outcome: "positive", organisms: ["e_coli", "klebsiella_pneumoniae"], controls: { positive: true, negative: true, error: false }, valid: true, comments: null, uploaded_at: "2026-10-02T13:00:00Z", lab_user_id: "u2", amended: true },
        ],
      },
      { u1: "Tech One", u2: "tech2@lab.test" }
    );
    expect(runs.map((r) => [r.n, r.verdict, r.by])).toEqual([
      [1, "invalid", "Tech One"],
      [2, "amended", "tech2@lab.test"],
      [2, "valid", "tech2@lab.test"],
    ]);
    expect(runs[0].reasons).toEqual(["Negative control did not pass"]);
    expect(runs[0].comments).toBe("faint band");
    expect(runs[1].organisms).toEqual(["Escherichia coli", "Klebsiella pneumoniae"]);
    expect(runs[2].current).toBe(true);
  });
});
