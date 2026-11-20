import "server-only";
import { rel } from "@/lib/supabase/rel";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAll, type TrackerData } from "./data";
import { organismsFromLabSheet, type CultureRow } from "./cultures";
import { readStoredPatient } from "@/lib/triage/patient";

/**
 * A Utee test's result joins the passport by itself once the clinic has
 * published the report: no typing. The raw lab row is never exposed to the
 * customer's own session (see lab_results policies), so it is read here with
 * the service role, only for the signed-in person's own kits, and only
 * after the report is complete.
 */
export async function loadUteeCultures(userId: string): Promise<CultureRow[]> {
  const admin = createAdminClient();
  const { data: kits } = await admin
    .from("kits")
    .select("id, code, received_by_lab_at, lab_complete_at, clinic_reports(status, completed_at), lab_results(outcome, organisms, comments), triage_submissions(patient)")
    .eq("customer_id", userId)
    .eq("status", "report_ready");
  const rows: CultureRow[] = [];
  for (const k of kits ?? []) {
    // A test done on behalf of a dependant is theirs, not this passport's.
    const who = readStoredPatient(rel<{ patient?: unknown }>(k.triage_submissions)[0]?.patient);
    if (who?.for === "dependant") continue;
    if (!rel<{ status: string }>(k.clinic_reports).some((r) => r.status === "complete")) continue;
    const lab = rel<{ outcome: string; organisms: string[] | null }>(k.lab_results)[0];
    if (!lab) continue;
    const organisms = organismsFromLabSheet(lab.organisms ?? []);
    rows.push({
      id: `utee:${k.id}`,
      episode_id: null,
      sample_on: ((k.received_by_lab_at ?? k.lab_complete_at) as string | null)?.slice(0, 10) ?? null,
      method: "utee",
      method_other: null,
      outcome: lab.outcome === "positive" && organisms.length ? "pathogens" : lab.outcome === "negative" ? "no_significant_growth" : "unknown",
      organisms,
      sensitivities: {},
      microscopy: {},
      notes: null,
      source: "utee",
      created_at: (k.lab_complete_at as string | null) ?? new Date(0).toISOString(),
    });
  }
  return rows;
}

/** Everything in the passport, with Utee results merged into the cultures, newest first. */
export async function loadAllWithUtee(supabase: SupabaseClient, userId: string): Promise<TrackerData> {
  const [data, utee] = await Promise.all([loadAll(supabase, userId), loadUteeCultures(userId)]);
  const cultures = [...data.cultures, ...utee].sort((a, b) => ((a.sample_on ?? "") < (b.sample_on ?? "") ? 1 : -1));
  return { ...data, cultures };
}
