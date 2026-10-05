import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { CONTAMINATION_THRESHOLD, detectedKeys, differsFromSuggested, listNames, paragraphsOf, suggestedContent } from "./content";
import { PATHOGEN_PROFILES, PANEL_ORDER } from "./copy";
import { renderReportPdf, type ReportInput } from "./pdf";

describe("suggested report wording", () => {
  it("reads a negative sheet as nothing detected", () => {
    const c = suggestedContent({ outcome: "negative", organisms: [] });
    expect(c.headline).toBe("No UTI-causing bacteria detected");
    expect(c.contamination).toBe(false);
    expect(c.resultText).toContain("negative for Escherichia coli");
  });

  it("names a single bacterium", () => {
    const c = suggestedContent({ outcome: "positive", organisms: ["klebsiella_pneumoniae"] });
    expect(c.headline).toBe("Klebsiella pneumoniae detected");
    expect(c.resultText).toContain("tested positive for Klebsiella pneumoniae");
  });

  it("lists several bacteria in panel order", () => {
    const c = suggestedContent({ outcome: "positive", organisms: ["proteus_mirabilis", "e_coli"] });
    expect(c.headline).toBe("2 types of bacteria detected");
    expect(c.resultText).toContain("Escherichia coli (E. coli) and Proteus mirabilis");
    expect(c.contamination).toBe(false);
  });

  it("treats five or more targets as likely contamination", () => {
    const five = PANEL_ORDER.slice(0, CONTAMINATION_THRESHOLD);
    const c = suggestedContent({ outcome: "positive", organisms: five });
    expect(c.contamination).toBe(true);
    expect(c.headline).toMatch(/careful interpretation/);
    expect(c.resultText).toContain("5 of the six bacteria");
    expect(suggestedContent({ outcome: "positive", organisms: PANEL_ORDER }).contamination).toBe(true);
    expect(suggestedContent({ outcome: "positive", organisms: PANEL_ORDER.slice(0, 4) }).contamination).toBe(false);
  });

  it("knows when the clinician has changed the wording", () => {
    const sheet = { outcome: "positive" as const, organisms: ["e_coli"] };
    const c = suggestedContent(sheet);
    expect(differsFromSuggested(c, sheet)).toBe(false);
    expect(differsFromSuggested({ ...c, resultText: "Edited." }, sheet)).toBe(true);
  });

  it("helpers", () => {
    expect(listNames(["A"])).toBe("A");
    expect(listNames(["A", "B", "C"])).toBe("A, B and C");
    expect(paragraphsOf("one\nline\n\n\ntwo  ")).toEqual(["one line", "two"]);
    expect(detectedKeys(["klebsiella_pneumoniae", "e_coli", "unknown"])).toEqual(["e_coli", "klebsiella_pneumoniae"]);
    expect(Object.keys(PATHOGEN_PROFILES).sort()).toEqual([...PANEL_ORDER].sort());
  });
});

describe("report PDF", () => {
  const base: Omit<ReportInput, "sheet" | "content"> = {
    kitCode: "UT-7K4M-92QX",
    patient: { name: "Test Patient", dateOfBirth: "1988-04-12" },
    dates: { sampleReceived: "2026-10-01T09:00:00Z", labCompleted: "2026-10-01T11:40:00Z", report: "2026-10-05T10:00:00Z" },
    signatures: [],
    draft: true,
    assets: {
      logoWhite: fs.existsSync("public/logo-white.png") ? fs.readFileSync("public/logo-white.png") : null,
      logoMaroon: fs.existsSync("public/logo-maroon.png") ? fs.readFileSync("public/logo-maroon.png") : null,
    },
  };

  it("renders a signed two-pathogen report with the brand fonts", async () => {
    const sheet = { outcome: "positive" as const, organisms: ["e_coli", "enterococcus"] };
    const pdf = await renderReportPdf({
      ...base,
      draft: false,
      sheet,
      content: { ...suggestedContent(sheet), clinicianNote: "Please take this report to your GP within the next few days." },
      signatures: [
        { name: "Professor Bob Yang", title: "Consultant Urologist", organisation: "the UTI Institute", signedAt: "2026-10-05T10:00:00Z", image: null },
      ],
    });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(20_000);
    const out = process.env.REPORT_PDF_OUT;
    if (out) fs.writeFileSync(path.join(out, "report-positive.pdf"), pdf);
  }, 60_000);

  it("renders a draft negative report and a contamination report", async () => {
    const negative = { outcome: "negative" as const, organisms: [] };
    const neg = await renderReportPdf({ ...base, sheet: negative, content: suggestedContent(negative) });
    expect(neg.subarray(0, 5).toString()).toBe("%PDF-");
    const contaminated = { outcome: "positive" as const, organisms: [...PANEL_ORDER] };
    const con = await renderReportPdf({ ...base, sheet: contaminated, content: suggestedContent(contaminated) });
    expect(con.subarray(0, 5).toString()).toBe("%PDF-");
    const out = process.env.REPORT_PDF_OUT;
    if (out) {
      fs.writeFileSync(path.join(out, "report-negative.pdf"), neg);
      fs.writeFileSync(path.join(out, "report-contaminated.pdf"), con);
    }
  }, 60_000);
});
