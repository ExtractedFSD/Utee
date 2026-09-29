import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { requireRole, type SessionUser } from "@/lib/auth";
import type { EpisodeRow, SymptomRow, TreatmentRow, TriggerRow } from "./stats";

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
};

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
  if (!ctx.consents.tracker) redirect("/portal/tracker/consent");
  if (!ctx.profile) redirect("/portal/tracker/about-me");
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

export type TrackerData = {
  episodes: EpisodeRow[];
  symptoms: (SymptomRow & { id: string })[];
  triggers: (TriggerRow & { id: string })[];
  treatments: (TreatmentRow & { id: string; created_at: string })[];
  tests: TestRow[];
  checkins: { episode_id: string | null; on_date: string; feeling: number }[];
};

export async function loadAll(supabase: SupabaseClient, userId: string): Promise<TrackerData> {
  const [e, s, tr, t, te, c] = await Promise.all([
    supabase.from("tracker_episodes").select("id, started_on, ended_on, notes").eq("user_id", userId).order("started_on", { ascending: false }),
    supabase.from("tracker_symptoms").select("id, episode_id, symptom, other_text, logged_on").eq("user_id", userId),
    supabase.from("tracker_triggers").select("id, episode_id, trigger, other_text, logged_on").eq("user_id", userId),
    supabase.from("tracker_treatments").select("id, episode_id, antibiotic_id, other_name, started_on, days, course_type, source, worked, created_at").eq("user_id", userId).order("created_at", { ascending: true }),
    supabase.from("tracker_tests").select("id, episode_id, kind, tested_on, result, notes, kit_id").eq("user_id", userId),
    supabase.from("tracker_checkins").select("episode_id, on_date, feeling").eq("user_id", userId),
  ]);
  return {
    episodes: e.data ?? [],
    symptoms: s.data ?? [],
    triggers: tr.data ?? [],
    treatments: t.data ?? [],
    tests: te.data ?? [],
    checkins: c.data ?? [],
  };
}

/** The user's own Utee kits (RLS-scoped), for linking tests to episodes. */
export async function ownKits(supabase: SupabaseClient) {
  const { data } = await supabase
    .from("kits")
    .select("id, code, status, created_at, clinic_reports(status)")
    .neq("status", "created")
    .order("created_at", { ascending: false });
  return (data ?? []).map((k) => ({
    id: k.id as string,
    code: k.code as string,
    status: k.status as string,
    created_at: k.created_at as string,
    reportReady: ((k.clinic_reports as unknown as { status: string }[] | null) ?? []).some((r) => r.status === "complete"),
  }));
}
