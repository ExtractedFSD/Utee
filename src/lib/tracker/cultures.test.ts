import { describe, expect, it } from "vitest";
import { cultureLine, cultureSummary, organismsFromLabSheet, sensitivityText, type CultureRow } from "./cultures";
import { parseCulture } from "./guided/culture";
import { antibioticHistory } from "./passport";

const row = (over: Partial<CultureRow>): CultureRow => ({
  id: "c1",
  episode_id: null,
  sample_on: "2026-07-20",
  method: "standard_culture",
  method_other: null,
  outcome: "pathogens",
  organisms: [{ key: "e_coli", name: null, count: ">10^8 cfu/L" }],
  sensitivities: { e_coli: { nitrofurantoin: "S", trimethoprim: "R", cefalexin: "S" } },
  microscopy: { white_cells: 150 },
  notes: null,
  source: "patient",
  created_at: "2026-07-20T00:00:00Z",
  ...over,
});

describe("culture lines", () => {
  it("reads the way a clinician writes it", () => {
    expect(sensitivityText(row({}), "e_coli")).toBe("sensitive to Nitrofurantoin, Cefalexin; resistant to Trimethoprim");
    const line = cultureLine(row({}));
    expect(line.title).toBe("E. coli");
    expect(line.detail).toBe("Standard culture (NHS lab) · E. coli: sensitive to Nitrofurantoin, Cefalexin; resistant to Trimethoprim · white cells 150");
    expect(cultureLine(row({ outcome: "no_growth", organisms: [], sensitivities: {}, microscopy: {} })).title).toBe("No growth");
    expect(cultureLine(row({ organisms: [{ key: "enterococcus", name: null, count: null }, { key: "e_coli", name: null, count: null }] })).title).toBe("Enterococcus + E. coli");
  });
});

describe("rule-based culture reader", () => {
  it("reads organisms and S/R phrases from a sentence", () => {
    const r = parseCulture("E. coli on 14 March 2026, sensitive to nitrofurantoin and cefalexin, resistant to trimethoprim", "2026-10-21");
    expect(r.sample_on).toBe("2026-03-14");
    expect(r.outcome).toBe("pathogens");
    expect(r.method).toBe("standard_culture");
    expect(r.organisms.map((o) => o.key)).toEqual(["e_coli"]);
    expect(r.organisms[0].sensitivities).toEqual([
      { antibiotic_id: "nitrofurantoin", result: "S" },
      { antibiotic_id: "cefalexin", result: "S" },
      { antibiotic_id: "trimethoprim", result: "R" },
    ]);
  });
  it("reads no growth, counts and microscopy", () => {
    expect(parseCulture("MSU in May, no growth", "2026-10-21")).toMatchObject({ outcome: "no_growth", organisms: [] });
    const r = parseCulture("Klebsiella pneumoniae >10^8 cfu/L, white cells 200, red cells 10", "2026-10-21");
    expect(r.organisms[0]).toMatchObject({ key: "klebsiella_pneumoniae", count: ">10^8cfu/L" });
    expect(r.white_cells).toBe(200);
    expect(r.red_cells).toBe(10);
  });
});

describe("culture summary and the lab's view", () => {
  const rows = [
    row({ id: "a", sample_on: "2026-01-10" }),
    row({ id: "b", sample_on: "2026-05-02", sensitivities: { e_coli: { nitrofurantoin: "S", trimethoprim: "S" } } }),
    row({ id: "c", sample_on: "2026-07-20", organisms: [{ key: "enterococcus", name: null, count: null }], sensitivities: { enterococcus: { amoxicillin: "S", trimethoprim: "R" } } }),
    row({ id: "d", sample_on: "2026-08-01", outcome: "no_growth", organisms: [], sensitivities: {}, microscopy: {} }),
  ];
  it("finds the predominant organism and the resistance picture", () => {
    const s = cultureSummary(rows);
    expect(s.cultures).toBe(4);
    expect(s.positive).toBe(3);
    expect(s.organisms[0]).toMatchObject({ key: "e_coli", times: 2, lastOn: "2026-05-02" });
    const trim = s.resistance.find((r) => r.antibiotic_id === "trimethoprim")!;
    expect(trim).toMatchObject({ S: 1, I: 0, R: 2, lastResult: "R", lastOn: "2026-07-20" });
  });
  it("joins the lab's view onto the antibiotic history, including antibiotics never taken", () => {
    const history = antibioticHistory(
      [{ episode_id: "e1", antibiotic_id: "trimethoprim", other_name: null, started_on: "2026-01-12", days: 3, course_type: null, source: null, worked: "no" }],
      [],
      rows
    );
    const trim = history.find((h) => h.antibiotic_id === "trimethoprim")!;
    expect(trim.courses).toBe(1);
    expect(trim.lab).toMatchObject({ S: 1, R: 2, lastResult: "R" });
    const nitro = history.find((h) => h.antibiotic_id === "nitrofurantoin")!;
    expect(nitro.courses).toBe(0);
    expect(nitro.lab).toMatchObject({ S: 2, R: 0 });
  });
  it("maps a Lodestar sheet straight onto passport organisms", () => {
    expect(organismsFromLabSheet(["e_coli", "klebsiella_pneumoniae", "unknown"]).map((o) => o.key)).toEqual(["e_coli", "klebsiella_pneumoniae"]);
  });
});
