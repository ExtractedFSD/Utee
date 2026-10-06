import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import { formatKitCode } from "@/lib/kit-code";
import { contentSchema, suggestedContent, type ReportContent, type SheetSummary } from "./content";
import { renderReportPdf, type ReportInput, type ReportSignature } from "./pdf";

/** One signature applied to a report, as stored in clinic_reports.signatures. */
export type StoredSignature = {
  user_id: string;
  name: string;
  title: string | null;
  organisation: string | null;
  image_path: string;
  signed_at: string;
};

export type ReportRow = {
  status: "received" | "in_review" | "complete";
  content: ReportContent | null;
  signatures: StoredSignature[];
  report_path: string | null;
  completed_at: string | null;
  generated_at: string | null;
  clinic_user_id: string | null;
};

export type ReportCase = {
  kit: { id: string; code: string; status: string; received_by_lab_at: string | null; lab_complete_at: string | null };
  patient: { name: string | null; dateOfBirth: string | null };
  sheet: SheetSummary | null;
  report: ReportRow | null;
};

export const SIGNATURES_BUCKET = "signatures";
export const REPORTS_BUCKET = "clinic-reports";

function asContent(value: unknown): ReportContent | null {
  const parsed = contentSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export async function loadReportCase(admin: SupabaseClient, kitId: string): Promise<ReportCase | null> {
  const { data: kit } = await admin
    .from("kits")
    .select("id, code, status, received_by_lab_at, lab_complete_at, profiles:customer_id(full_name, date_of_birth)")
    .eq("id", kitId)
    .maybeSingle();
  if (!kit) return null;

  const [{ data: lab }, { data: report }] = await Promise.all([
    admin.from("lab_results").select("outcome, organisms").eq("kit_id", kitId).maybeSingle(),
    admin
      .from("clinic_reports")
      .select("status, content, signatures, report_path, completed_at, generated_at, clinic_user_id")
      .eq("kit_id", kitId)
      .maybeSingle(),
  ]);

  const profile = kit.profiles as unknown as { full_name: string | null; date_of_birth: string | null } | null;
  return {
    kit: {
      id: kit.id,
      code: kit.code,
      status: kit.status,
      received_by_lab_at: kit.received_by_lab_at,
      lab_complete_at: kit.lab_complete_at,
    },
    patient: { name: profile?.full_name ?? null, dateOfBirth: profile?.date_of_birth ?? null },
    sheet: lab ? { outcome: lab.outcome as SheetSummary["outcome"], organisms: (lab.organisms as string[]) ?? [] } : null,
    report: report
      ? {
          status: report.status as ReportRow["status"],
          content: asContent(report.content),
          signatures: Array.isArray(report.signatures) ? (report.signatures as StoredSignature[]) : [],
          report_path: report.report_path,
          completed_at: report.completed_at,
          generated_at: report.generated_at,
          clinic_user_id: report.clinic_user_id,
        }
      : null,
  };
}

/** The wording in play: what the clinic saved, or what the sheet suggests. */
export function effectiveContent(c: ReportCase): ReportContent {
  if (c.report?.content) return c.report.content;
  return suggestedContent(c.sheet ?? { outcome: "inconclusive", organisms: [] });
}

function readAsset(file: string): Buffer | null {
  const p = path.join(process.cwd(), "public", file);
  try {
    return fs.readFileSync(p);
  } catch {
    return null;
  }
}

async function downloadImage(admin: SupabaseClient, bucket: string, imagePath: string): Promise<Buffer | null> {
  const { data, error } = await admin.storage.from(bucket).download(imagePath);
  if (error || !data) return null;
  return Buffer.from(await data.arrayBuffer());
}

export async function signatureImages(admin: SupabaseClient, signatures: StoredSignature[]): Promise<ReportSignature[]> {
  return Promise.all(
    signatures.map(async (sig) => ({
      name: sig.name,
      title: sig.title,
      organisation: sig.organisation,
      signedAt: sig.signed_at,
      image: await downloadImage(admin, SIGNATURES_BUCKET, sig.image_path),
    }))
  );
}

/**
 * Everything the PDF needs for this case. `content` overrides what is saved
 * (so an unsaved edit can be previewed or published in one step).
 */
export async function buildReportInput(
  admin: SupabaseClient,
  c: ReportCase,
  opts: { content?: ReportContent; draft: boolean; reportDate?: string }
): Promise<ReportInput> {
  const sheet: SheetSummary = c.sheet ?? { outcome: "inconclusive", organisms: [] };
  return {
    kitCode: formatKitCode(c.kit.code),
    patient: c.patient,
    dates: {
      sampleReceived: c.kit.received_by_lab_at,
      labCompleted: c.kit.lab_complete_at,
      report: opts.reportDate ?? c.report?.completed_at ?? new Date().toISOString(),
    },
    sheet,
    content: opts.content ?? effectiveContent(c),
    signatures: await signatureImages(admin, c.report?.signatures ?? []),
    draft: opts.draft,
    assets: { logoWhite: readAsset("logo-white.png"), logoMaroon: readAsset("logo-maroon.png") },
  };
}

export async function renderCaseReport(admin: SupabaseClient, c: ReportCase, opts: { content?: ReportContent; draft: boolean; reportDate?: string }) {
  const input = await buildReportInput(admin, c, opts);
  return renderReportPdf(input);
}

/** File name the patient sees when they download. */
export function reportFileName(code: string): string {
  return `utee-test-results-${formatKitCode(code)}.pdf`;
}
