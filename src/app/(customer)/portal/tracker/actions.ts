"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { audit, trackerConsents } from "@/lib/tracker/data";
import { CONSENT_VERSION, copy } from "@/lib/tracker/copy";
import {
  CONTRACEPTION, COURSE_TYPES, MENOPAUSE_STAGES, PREGNANT, SOURCES, SYMPTOMS,
  TEST_KINDS, TEST_RESULTS, TRIGGERS, WORKED,
} from "@/lib/tracker/options";
import { antibioticById } from "@/lib/tracker/search";
import { ageBandFor, isoToday } from "@/lib/tracker/stats";

const keys = (list: { key: string }[]) => list.map((o) => o.key) as [string, ...string[]];
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");
const uuid = z.string().uuid();

async function session() {
  const user = await requireRole(["customer"]);
  const supabase = await createClient();
  return { user, supabase };
}

function revalidate(episodeId?: string) {
  revalidatePath("/portal/tracker");
  revalidatePath("/portal/tracker/history");
  revalidatePath("/portal");
  if (episodeId) revalidatePath(`/portal/tracker/episodes/${episodeId}`);
}

// ------------------------------------------------------------------ consent

export async function giveConsent(formData: FormData) {
  const { user, supabase } = await session();
  if (formData.get("tracker") !== "on") return { error: "Tick the first box to use the tracker." };
  const research = formData.get("research") === "on";
  const rows = [
    { user_id: user.id, kind: "tracker", consent_version: CONSENT_VERSION, consent_text: copy.consent.trackerText },
    ...(research
      ? [{ user_id: user.id, kind: "research", consent_version: CONSENT_VERSION, consent_text: copy.consent.researchText }]
      : []),
  ];
  const { error } = await supabase.from("tracker_consents").insert(rows);
  if (error) return { error: "Could not save your consent. Please try again." };
  await audit(supabase, user.id, "consent_given", { kinds: rows.map((r) => r.kind), version: CONSENT_VERSION });
  revalidate();
  redirect("/portal/tracker/about-me");
}

export async function setConsent(kind: "tracker" | "research", on: boolean) {
  const { user, supabase } = await session();
  const current = await trackerConsents(supabase, user.id);
  if (current[kind] === on) return { ok: true };
  if (on) {
    const text = kind === "tracker" ? copy.consent.trackerText : copy.consent.researchText;
    await supabase.from("tracker_consents").insert({ user_id: user.id, kind, consent_version: CONSENT_VERSION, consent_text: text });
    await audit(supabase, user.id, "consent_given", { kinds: [kind], version: CONSENT_VERSION });
  } else {
    await supabase
      .from("tracker_consents")
      .update({ withdrawn_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("kind", kind)
      .is("withdrawn_at", null);
    await audit(supabase, user.id, "consent_withdrawn", { kinds: [kind] });
  }
  revalidate();
  revalidatePath("/portal/tracker/settings");
  return { ok: true };
}

// ----------------------------------------------------------------- about me

const aboutMeSchema = z.object({
  menopause_stage: z.enum(keys(MENOPAUSE_STAGES)),
  contraception: z.enum(keys(CONTRACEPTION)),
  pregnant_or_trying: z.enum(keys(PREGNANT)),
  preventive_treatment_id: z.string().optional(),
  preventive_treatment_other: z.string().max(120).optional(),
});

export async function saveAboutMe(formData: FormData) {
  const { user, supabase } = await session();
  const parsed = aboutMeSchema.safeParse({
    menopause_stage: String(formData.get("menopause_stage") ?? "prefer_not"),
    contraception: String(formData.get("contraception") ?? "prefer_not"),
    pregnant_or_trying: String(formData.get("pregnant_or_trying") ?? "no"),
    preventive_treatment_id: String(formData.get("preventive_treatment_id") ?? ""),
    preventive_treatment_other: String(formData.get("preventive_treatment_other") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Please check the form" };
  const d = parsed.data;
  const preventive = d.preventive_treatment_id && (antibioticById(d.preventive_treatment_id) || d.preventive_treatment_id === "other")
    ? d.preventive_treatment_id
    : null;
  const { error } = await supabase.from("tracker_profiles").upsert({
    user_id: user.id,
    date_of_birth: user.dateOfBirth,
    age_band: ageBandFor(user.dateOfBirth),
    menopause_stage: d.menopause_stage,
    contraception: d.contraception,
    pregnant_or_trying: d.pregnant_or_trying,
    preventive_treatment_id: preventive,
    preventive_treatment_other: preventive === "other" ? d.preventive_treatment_other || null : null,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Could not save. Please try again." };
  revalidate();
  revalidatePath("/portal/tracker/settings");
  const next = String(formData.get("next") ?? "/portal/tracker");
  redirect(next.startsWith("/") ? next : "/portal/tracker");
}

// ----------------------------------------------------------------- episodes

export async function createEpisode(input: { startedOn: string; symptoms: string[]; otherText?: string }) {
  const { user, supabase } = await session();
  const started = isoDate.safeParse(input.startedOn);
  if (!started.success || started.data > isoToday()) return { error: "Choose a start date that isn't in the future." };
  const chosen = input.symptoms.filter((s) => SYMPTOMS.some((o) => o.key === s));
  const { data: episode, error } = await supabase
    .from("tracker_episodes")
    .insert({ user_id: user.id, started_on: started.data })
    .select("id")
    .single();
  if (error || !episode) return { error: "Could not save. Please try again." };
  if (chosen.length) {
    await supabase.from("tracker_symptoms").insert(
      chosen.map((symptom) => ({
        user_id: user.id,
        episode_id: episode.id,
        symptom,
        other_text: symptom === "other" ? input.otherText?.trim() || null : null,
        logged_on: started.data,
      }))
    );
  }
  revalidate(episode.id);
  return { ok: true, id: episode.id as string };
}

export async function updateEpisode(episodeId: string, patch: { startedOn?: string; endedOn?: string | null; notes?: string }) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(episodeId).success) return { error: "Not found" };
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.startedOn !== undefined) {
    const p = isoDate.safeParse(patch.startedOn);
    if (!p.success) return { error: "Choose a date" };
    update.started_on = p.data;
  }
  if (patch.endedOn !== undefined) {
    if (patch.endedOn === null) update.ended_on = null;
    else {
      const p = isoDate.safeParse(patch.endedOn);
      if (!p.success) return { error: "Choose a date" };
      update.ended_on = p.data;
    }
  }
  if (patch.notes !== undefined) update.notes = patch.notes.slice(0, 4000) || null;
  const { error } = await supabase.from("tracker_episodes").update(update).eq("id", episodeId).eq("user_id", user.id);
  if (error) return { error: error.message.includes("check") ? "The end date can't be before the start date." : "Could not save." };
  revalidate(episodeId);
  return { ok: true };
}

export async function deleteEpisode(episodeId: string) {
  const { user, supabase } = await session();
  await supabase.from("tracker_episodes").delete().eq("id", episodeId).eq("user_id", user.id);
  await audit(supabase, user.id, "episode_deleted", { episodeId });
  revalidate();
  redirect("/portal/tracker/history");
}

// ---------------------------------------------------- symptoms and triggers

async function toggleItem(
  table: "tracker_symptoms" | "tracker_triggers",
  column: "symptom" | "trigger",
  allowed: { key: string }[],
  episodeId: string,
  key: string,
  on: boolean,
  otherText?: string,
  loggedOn?: string
) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(episodeId).success || !allowed.some((o) => o.key === key)) return { error: "Not found" };
  const day = loggedOn && isoDate.safeParse(loggedOn).success ? loggedOn : isoToday();
  if (on) {
    const { data: existing } = await supabase
      .from(table)
      .select("id")
      .eq("episode_id", episodeId)
      .eq(column, key)
      .eq("logged_on", day)
      .maybeSingle();
    if (existing) {
      if (key === "other") await supabase.from(table).update({ other_text: otherText?.trim() || null }).eq("id", existing.id);
    } else {
      const { error } = await supabase.from(table).insert({
        user_id: user.id,
        episode_id: episodeId,
        [column]: key,
        other_text: key === "other" ? otherText?.trim() || null : null,
        logged_on: day,
      });
      if (error) return { error: "Could not save." };
    }
  } else {
    await supabase.from(table).delete().eq("episode_id", episodeId).eq(column, key).eq("user_id", user.id);
  }
  revalidate(episodeId);
  return { ok: true };
}

export async function toggleSymptom(episodeId: string, key: string, on: boolean, otherText?: string, loggedOn?: string) {
  return toggleItem("tracker_symptoms", "symptom", SYMPTOMS, episodeId, key, on, otherText, loggedOn);
}

export async function toggleTrigger(episodeId: string, key: string, on: boolean, otherText?: string, loggedOn?: string) {
  return toggleItem("tracker_triggers", "trigger", TRIGGERS, episodeId, key, on, otherText, loggedOn);
}

// --------------------------------------------------------------- treatments

const treatmentSchema = z.object({
  antibiotic_id: z.string().min(1, "Choose an antibiotic"),
  other_name: z.string().max(120).optional(),
  started_on: isoDate.optional().or(z.literal("")),
  days: z.number().int().positive().max(365).nullable(),
  course_type: z.enum(keys(COURSE_TYPES)).optional().or(z.literal("")),
  source: z.enum(keys(SOURCES)).optional().or(z.literal("")),
});

export async function addTreatment(episodeId: string, input: z.input<typeof treatmentSchema>) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(episodeId).success) return { error: "Not found" };
  const parsed = treatmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Please check the form" };
  const d = parsed.data;
  if (d.antibiotic_id !== "other" && !antibioticById(d.antibiotic_id)) return { error: "Choose an antibiotic from the list" };
  const { error } = await supabase.from("tracker_treatments").insert({
    user_id: user.id,
    episode_id: episodeId,
    antibiotic_id: d.antibiotic_id,
    other_name: d.antibiotic_id === "other" ? d.other_name?.trim() || null : null,
    started_on: d.started_on || null,
    days: d.days,
    course_type: d.course_type || null,
    source: d.source || null,
  });
  if (error) return { error: "Could not save." };
  if (d.source) {
    await supabase.from("tracker_profiles").update({ last_treatment_source: d.source }).eq("user_id", user.id);
  }
  revalidate(episodeId);
  return { ok: true };
}

export async function rateTreatment(treatmentId: string, worked: string) {
  const { user, supabase } = await session();
  if (!WORKED.some((o) => o.key === worked)) return { error: "Choose an answer" };
  const { data } = await supabase
    .from("tracker_treatments")
    .update({ worked })
    .eq("id", treatmentId)
    .eq("user_id", user.id)
    .select("episode_id")
    .maybeSingle();
  revalidate(data?.episode_id);
  return { ok: true };
}

export async function deleteTreatment(treatmentId: string) {
  const { user, supabase } = await session();
  const { data } = await supabase.from("tracker_treatments").delete().eq("id", treatmentId).eq("user_id", user.id).select("episode_id").maybeSingle();
  revalidate(data?.episode_id);
  return { ok: true };
}

// -------------------------------------------------------------------- tests

const testSchema = z.object({
  kind: z.enum(keys(TEST_KINDS)),
  tested_on: isoDate.optional().or(z.literal("")),
  result: z.enum(keys(TEST_RESULTS)).optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
  kit_id: z.string().uuid().optional().or(z.literal("")),
});

export async function addTest(episodeId: string, input: z.input<typeof testSchema>) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(episodeId).success) return { error: "Not found" };
  const parsed = testSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Please check the form" };
  const d = parsed.data;
  let kitId: string | null = null;
  if (d.kind === "utee" && d.kit_id) {
    // RLS: a customer can only select their own kits, so this also proves ownership.
    const { data: kit } = await supabase.from("kits").select("id").eq("id", d.kit_id).maybeSingle();
    if (!kit) return { error: "That test isn't on your account." };
    kitId = kit.id;
  }
  const { error } = await supabase.from("tracker_tests").insert({
    user_id: user.id,
    episode_id: episodeId,
    kind: d.kind,
    tested_on: d.tested_on || null,
    result: kitId ? null : d.result || null,
    notes: d.notes?.trim() || null,
    kit_id: kitId,
  });
  if (error) return { error: "Could not save." };
  revalidate(episodeId);
  return { ok: true };
}

export async function deleteTest(testId: string) {
  const { user, supabase } = await session();
  const { data } = await supabase.from("tracker_tests").delete().eq("id", testId).eq("user_id", user.id).select("episode_id").maybeSingle();
  revalidate(data?.episode_id);
  return { ok: true };
}

// ----------------------------------------------------------------- check-ins

export async function setFeeling(episodeId: string | null, feeling: number, onDate?: string) {
  const { user, supabase } = await session();
  if (!Number.isInteger(feeling) || feeling < 1 || feeling > 5) return { error: "Choose a face" };
  const day = onDate && isoDate.safeParse(onDate).success ? onDate : isoToday();
  const { error } = await supabase
    .from("tracker_checkins")
    .upsert({ user_id: user.id, episode_id: episodeId, on_date: day, feeling }, { onConflict: "user_id,on_date" });
  if (error) return { error: "Could not save." };
  revalidate(episodeId ?? undefined);
  return { ok: true };
}

// ----------------------------------------------------------------- settings

export async function setReminders(daily: boolean, monthly: boolean) {
  const { user, supabase } = await session();
  await supabase.from("tracker_profiles").update({ reminder_daily: daily, reminder_monthly: monthly }).eq("user_id", user.id);
  await audit(supabase, user.id, "reminders_updated", { daily, monthly });
  revalidatePath("/portal/tracker/settings");
  return { ok: true };
}

/** Hard delete of everything the tracker holds for this user. */
export async function deleteAllTrackerData(confirmation: string) {
  const { user, supabase } = await session();
  if (confirmation.trim() !== "DELETE") return { error: "Type DELETE to confirm." };
  // Audit first: the log row survives (it is the record that a delete happened).
  await audit(supabase, user.id, "tracker_data_deleted");
  for (const table of ["tracker_episodes", "tracker_checkins", "tracker_consents", "tracker_profiles"]) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) return { error: "Could not delete everything. Please try again." };
  }
  revalidate();
  revalidatePath("/portal/tracker/settings");
  redirect("/portal?tracker=deleted");
}
