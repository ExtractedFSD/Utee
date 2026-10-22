import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireRole, type SessionUser } from "@/lib/auth";
import type { EpisodeRow, SymptomRow, TreatmentRow, TriggerRow } from "./stats";
import type { InvestigationRow, PassportProfileFields } from "./passport";
import type { CultureRow } from "./cultures";

/*
 * All tracker reads and writes go through the user's own Supabase session, so
 * row-level security (supabase/migrations/0003_tracker.sql) is the access
 * control. Nothing here uses the service role.
 */

export type TrackerProfile = {
  user_id: string;
  date_of_birth: string | null;
  age_band: string | null;
  menopause_stage: string | null;
  contraception: string | null;
  pregnant_or_trying: string;
  preventive_treatment_id: string | null;
  preventive_treatment_other: string | null;
  reminder_daily: boolean;
  reminder_monthly: boolean;
  last_treatment_source: string | null;
  una_ai: boolean;
} & PassportProfileFields;

export type Consents = { tracker: boolean; research: boolean };

export async function trackerConsents(supabase: SupabaseClient, userId: string): Promise<Consents> {
  const { data } = await supabase
    .from("tracker_consents")
    .select("kind, withdrawn_at, given_at")
    .eq("user_id", userId)
    .order("given_at", { ascending: false });
  const latest = (kind: string) => data?.find((c) => c.kind === kind);
  return {
    tracker: !!latest("tracker") && !latest("tracker")!.withdrawn_at,
    research: !!latest("research") && !latest("research")!.withdrawn_at,
  };
}

export async function trackerProfile(supabase: SupabaseClient, userId: string) {
  const { data } = await supabase.from("tracker_profiles").select("*").eq("user_id", userId).maybeSingle();
  return (data as TrackerProfile | null) ?? null;
}

export type TrackerContext = {
  supabase: SupabaseClient;
  user: SessionUser;
  consents: Consents;
  profile: TrackerProfile | null;
};

export async function trackerContext(): Promise<TrackerContext> {
  const user = await requireRole(["customer"]);
  const supabase = await createClient();
  const [consents, profile] = await Promise.all([
    trackerConsents(supabase, user.id),
    trackerProfile(supabase, user.id),
  ]);
  return { supabase, user, consents, profile };
}

/** Consent gate, then the once-only profile, then the tracker. */
export async function requireTracker(): Promise<TrackerContext & { profile: TrackerProfile }> {
  const ctx = await trackerContext();
  if (!ctx.consents.tracker) redirect("/portal/passport/consent");
  if (!ctx.profile) redirect("/portal/passport/setup");
  return ctx as TrackerContext & { profile: TrackerProfile };
}

export async function audit(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  detail: Record<string, unknown> = {},
  actor: "user" | "system" = "user"
) {
  await supabase.from("tracker_audit_log").insert({ user_id: userId, action, detail, actor });
}

export type TestRow = {
  id: string;
  episode_id: string;
  kind: string;
  tested_on: string | null;
  result: string | null;
  notes: string | null;
  kit_id: string | null;
};

export type PreventionRow = {
  id: string;
  option_key: string;
  other_name: string | null;
  antibiotic_id: string | null;
  started_on: string | null;
  stopped_on: string | null;
  helping: string | null;
  notes: string | null;
  product: string | null;
  dose: string | null;
  frequency: string | null;
  course_weeks: number | null;
  completed: boolean | null;
  created_at: string;
};

export type ChatMessage = { role: "assistant" | "user"; text?: string; lines?: string[]; flag?: string[]; at: string };
export type ChatRow = { id: string; title: string | null; mode: string; messages: ChatMessage[]; created_at: string; updated_at: string };

export type TrackerData = {
  episodes: EpisodeRow[];
  symptoms: (SymptomRow & { id: string })[];
  triggers: (TriggerRow & { id: string })[];
  treatments: (TreatmentRow & { id: string; created_at: string })[];
  tests: TestRow[];
  checkins: { episode_id: string | null; on_date: string; feeling: number | null; note: string | null }[];
  preventions: PreventionRow[];
  investigations: InvestigationRow[];
  /** Patient-entered cultures. Utee results are merged in by loadAllWithUtee. */
  cultures: CultureRow[];
};

const PREVENTION_COLUMNS = "id, option_key, other_name, antibiotic_id, started_on, stopped_on, helping, notes, product, dose, frequency, course_weeks, completed, created_at";
const INVESTIGATION_COLUMNS = "id, kind, performed_on, normal, findings, body_part, values, notes, source, created_at";
const CULTURE_COLUMNS = "id, episode_id, sample_on, method, method_other, outcome, organisms, sensitivities, microscopy, notes, source, created_at";

export async function loadCultures(supabase: SupabaseClient, userId: string): Promise<CultureRow[]> {
  const { data } = await supabase.from("tracker_cultures").select(CULTURE_COLUMNS).eq("user_id", userId).order("sample_on", { ascending: false, nullsFirst: false });
  return (data ?? []) as CultureRow[];
}

export async function loadInvestigations(supabase: SupabaseClient, userId: string): Promise<InvestigationRow[]> {
  const { data } = await supabase.from("tracker_investigations").select(INVESTIGATION_COLUMNS).eq("user_id", userId).order("performed_on", { ascending: false, nullsFirst: false });
  return (data ?? []) as InvestigationRow[];
}

export async function loadPreventions(supabase: SupabaseClient, userId: string): Promise<PreventionRow[]> {
  const { data } = await supabase.from("tracker_preventions").select(PREVENTION_COLUMNS).eq("user_id", userId).order("created_at", { ascending: true });
  return (data ?? []) as PreventionRow[];
}

export async function loadAll(supabase: SupabaseClient, userId: string): Promise<TrackerData> {
  const [e, s, tr, t, te, c, pr, inv, cu] = await Promise.all([
    supabase.from("tracker_episodes").select("id, started_on, ended_on, notes").eq("user_id", userId).order("started_on", { ascending: false }),
    supabase.from("tracker_symptoms").select("id, episode_id, symptom, other_text, logged_on, severity").eq("user_id", userId),
    supabase.from("tracker_triggers").select("id, episode_id, trigger, other_text, logged_on").eq("user_id", userId),
    supabase.from("tracker_treatments").select("id, episode_id, antibiotic_id, other_name, started_on, days, course_type, source, worked, dose, frequency, route, reaction, created_at").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("tracker_tests").select("id, episode_id, kind, tested_on, result, notes, kit_id").eq("user_id", userId),
    supabase.from("tracker_checkins").select("episode_id, on_date, feeling, note").eq("user_id", userId),
    supabase.from("tracker_preventions").select(PREVENTION_COLUMNS).eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("tracker_investigations").select(INVESTIGATION_COLUMNS).eq("user_id", userId).order("performed_on", { ascending: false, nullsFirst: false }),
    supabase.from("tracker_cultures").select(CULTURE_COLUMNS).eq("user_id", userId).order("sample_on", { ascending: false, nullsFirst: false }),
  ]);
  return {
    episodes: e.data ?? [],
    symptoms: s.data ?? [],
    triggers: tr.data ?? [],
    treatments: t.data ?? [],
    tests: te.data ?? [],
    checkins: c.data ?? [],
    preventions: (pr.data ?? []) as PreventionRow[],
    investigations: (inv.data ?? []) as InvestigationRow[],
    cultures: (cu.data ?? []) as CultureRow[],
  };
}

/** The user's own Utee kits (RLS-scoped), for linking tests to episodes. */
export async function ownKits(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("kits")
    .select("id, code, status, created_at, clinic_reports(status)")
    .not("status", "in", "(generated,printed,voided)")
    .order("created_at", { ascending: false });
  return (data ?? []).map((k) => ({
    id: k.id as string,
    code: k.code as string,
    status: k.status as string,
    created_at: k.created_at as string,
    reportReady: ((k.clinic_reports as unknown as { status: string }[] | null) ?? []).some((r) => r.status === "complete"),
  }));
}
