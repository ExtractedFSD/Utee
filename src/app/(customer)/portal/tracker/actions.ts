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
import { ANTIBIOTIC_PREVENTIONS, HELPING, PREVENTION_KEYS, diffPreventions } from "@/lib/tracker/prevention";
import { extract } from "@/lib/tracker/guided/extract";
import { utiSaveSchema, type GuidedStep, type UtiSave } from "@/lib/tracker/guided/schema";
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
  redirect("/portal/tracker/setup");
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
  prevention_keys: z.array(z.string()).max(60),
  prevention_other: z.string().max(120).optional(),
  prevention_antibiotic_id: z.string().max(80).optional(),
  prevention_antibiotic_other: z.string().max(120).optional(),
});

/** Which antibiotic to store against an antibiotic-type prevention, if any. */
function preventionAntibiotic(id?: string, other?: string): { antibiotic_id: string | null; other_name: string | null } {
  if (!id) return { antibiotic_id: null, other_name: null };
  if (id === "other") return { antibiotic_id: "other", other_name: other?.trim() || null };
  return antibioticById(id) ? { antibiotic_id: id, other_name: null } : { antibiotic_id: null, other_name: null };
}

/**
 * Make the active prevention rows match a freshly picked list: new picks are
 * inserted, unpicked ones are stopped today so the history is kept.
 */
async function syncPreventions(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  keys: string[],
  otherName: string | undefined,
  antibioticId: string | undefined,
  antibioticOther: string | undefined
) {
  const { data: active } = await supabase.from("tracker_preventions").select("id, option_key").eq("user_id", userId).is("stopped_on", null);
  const { add, stop } = diffPreventions((active ?? []).map((a) => a.option_key), keys);
  const today = isoToday();
  if (add.length) {
    const rows = add.map((key) => {
      const ab = ANTIBIOTIC_PREVENTIONS.includes(key) ? preventionAntibiotic(antibioticId, antibioticOther) : { antibiotic_id: null, other_name: null };
      return {
        user_id: userId,
        option_key: key,
        other_name: key === "other" ? otherName?.trim() || null : ab.other_name,
        antibiotic_id: ab.antibiotic_id,
      };
    });
    const { error } = await supabase.from("tracker_preventions").insert(rows);
    if (error) return { error: "Could not save what you're taking. Please try again." };
  }
  if (stop.length) {
    const ids = (active ?? []).filter((a) => stop.includes(a.option_key)).map((a) => a.id);
    await supabase.from("tracker_preventions").update({ stopped_on: today, updated_at: new Date().toISOString() }).in("id", ids);
  }
  if (keys.includes("other") && otherName !== undefined) {
    await supabase.from("tracker_preventions").update({ other_name: otherName.trim() || null }).eq("user_id", userId).eq("option_key", "other").is("stopped_on", null);
  }
  return { ok: true };
}

export async function saveAboutMe(formData: FormData) {
  const { user, supabase } = await session();
  const parsed = aboutMeSchema.safeParse({
    menopause_stage: String(formData.get("menopause_stage") ?? "prefer_not"),
    contraception: String(formData.get("contraception") ?? "prefer_not"),
    pregnant_or_trying: String(formData.get("pregnant_or_trying") ?? "no"),
    prevention_keys: String(formData.get("prevention_keys") ?? "").split(",").map((k) => k.trim()).filter((k) => PREVENTION_KEYS.includes(k)),
    prevention_other: String(formData.get("prevention_other") ?? ""),
    prevention_antibiotic_id: String(formData.get("prevention_antibiotic_id") ?? ""),
    prevention_antibiotic_other: String(formData.get("prevention_antibiotic_other") ?? ""),
  });
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Please check the form" };
  const d = parsed.data;
  const { error } = await supabase.from("tracker_profiles").upsert({
    user_id: user.id,
    date_of_birth: user.dateOfBirth,
    age_band: ageBandFor(user.dateOfBirth),
    menopause_stage: d.menopause_stage,
    contraception: d.contraception,
    pregnant_or_trying: d.pregnant_or_trying,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Could not save. Please try again." };
  const synced = await syncPreventions(supabase, user.id, d.prevention_keys, d.prevention_other, d.prevention_antibiotic_id, d.prevention_antibiotic_other);
  if ("error" in synced) return synced;
  revalidate();
  revalidatePath("/portal/tracker/prevention");
  revalidatePath("/portal/tracker/settings");
  const next = String(formData.get("next") ?? "/portal/tracker");
  redirect(next.startsWith("/") ? next : "/portal/tracker");
}

/** About you without the form: used by the guided setup. */
export async function saveAboutMeValues(input: { menopause_stage: string; contraception: string; pregnant_or_trying: string }) {
  const { user, supabase } = await session();
  const parsed = z.object({
    menopause_stage: z.enum(keys(MENOPAUSE_STAGES)),
    contraception: z.enum(keys(CONTRACEPTION)),
    pregnant_or_trying: z.enum(keys(PREGNANT)),
  }).safeParse(input);
  if (!parsed.success) return { error: "Please check the answers" };
  const { error } = await supabase.from("tracker_profiles").upsert({
    user_id: user.id,
    date_of_birth: user.dateOfBirth,
    age_band: ageBandFor(user.dateOfBirth),
    ...parsed.data,
    updated_at: new Date().toISOString(),
  });
  if (error) return { error: "Could not save. Please try again." };
  revalidate();
  revalidatePath("/portal/tracker/settings");
  return { ok: true };
}

// ------------------------------------------------------------ guided setup

/** Read one typed answer into form fields. Nothing is saved here. */
export async function extractGuided(step: GuidedStep, text: string) {
  await session();
  const clean = text.trim().slice(0, 2000);
  if (!clean) return { error: "Type something first." };
  return extract(step, clean, isoToday());
}

/** Save one reviewed UTI from the guided setup in a single go. */
export async function saveGuidedUti(input: UtiSave) {
  const { user, supabase } = await session();
  const parsed = utiSaveSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Please check the UTI" };
  const d = parsed.data;
  const today = isoToday();
  if (d.started_on > today) return { error: "Choose a start date that isn't in the future." };
  if (d.ended_on && (d.ended_on > today || d.ended_on < d.started_on)) return { error: "The end date can't be before the start date." };
  const { data: episode, error } = await supabase
    .from("tracker_episodes")
    .insert({ user_id: user.id, started_on: d.started_on, ended_on: d.ended_on, notes: d.notes?.trim() || null })
    .select("id")
    .single();
  if (error || !episode) return { error: "Could not save. Please try again." };
  const symptoms = d.symptoms.map((symptom) => ({ user_id: user.id, episode_id: episode.id, symptom, other_text: symptom === "other" ? d.other_symptom?.trim() || null : null, logged_on: d.started_on }));
  if (symptoms.length) await supabase.from("tracker_symptoms").insert(symptoms);
  const triggers = d.triggers.map((trigger) => ({ user_id: user.id, episode_id: episode.id, trigger, other_text: trigger === "other" ? d.other_trigger?.trim() || null : null, logged_on: d.started_on }));
  if (triggers.length) await supabase.from("tracker_triggers").insert(triggers);
  const treatments = d.treatments
    .filter((t) => t.antibiotic_id)
    .map((t) => ({
      user_id: user.id,
      episode_id: episode.id,
      antibiotic_id: t.antibiotic_id!,
      other_name: t.antibiotic_id === "other" ? t.other_name?.trim() || null : null,
      started_on: d.started_on,
      days: t.days,
      course_type: t.course_type,
      source: t.source,
      worked: t.worked,
    }));
  const { data: savedTreatments } = treatments.length
    ? await supabase.from("tracker_treatments").insert(treatments).select("id, antibiotic_id, other_name, worked")
    : { data: [] };
  const tests = d.tests.map((t) => ({ user_id: user.id, episode_id: episode.id, kind: t.kind, tested_on: t.tested_on && isoDate.safeParse(t.tested_on).success ? t.tested_on : d.started_on, result: t.result, notes: null, kit_id: null }));
  if (tests.length) await supabase.from("tracker_tests").insert(tests);
  const lastSource = treatments.find((t) => t.source)?.source;
  if (lastSource) await supabase.from("tracker_profiles").update({ last_treatment_source: lastSource }).eq("user_id", user.id);
  await audit(supabase, user.id, "guided_uti_saved", { episode_id: episode.id, treatments: treatments.length, tests: tests.length });
  revalidate(episode.id);
  return {
    ok: true,
    id: episode.id as string,
    ended: !!d.ended_on,
    startedOn: d.started_on,
    treatments: (savedTreatments ?? []).map((t) => ({ id: t.id as string, antibiotic_id: t.antibiotic_id as string, other_name: t.other_name as string | null, worked: t.worked as string | null })),
  };
}

// ----------------------------------------------------------------- episodes

export async function createEpisode(input: { startedOn: string; endedOn?: string | null; symptoms: string[]; otherText?: string }) {
  const { user, supabase } = await session();
  const started = isoDate.safeParse(input.startedOn);
  if (!started.success || started.data > isoToday()) return { error: "Choose a start date that isn't in the future." };
  // A past UTI is logged as one summary: it arrives already closed.
  let endedOn: string | null = null;
  if (input.endedOn) {
    const ended = isoDate.safeParse(input.endedOn);
    if (!ended.success || ended.data > isoToday()) return { error: "Choose an end date that isn't in the future." };
    if (ended.data < started.data) return { error: "The end date can't be before the start date." };
    endedOn = ended.data;
  }
  const chosen = input.symptoms.filter((s) => SYMPTOMS.some((o) => o.key === s));
  const { data: episode, error } = await supabase
    .from("tracker_episodes")
    .insert({ user_id: user.id, started_on: started.data, ended_on: endedOn })
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

/** "Same as yesterday": copy yesterday's symptom set onto today. */
export async function copyYesterdaySymptoms(episodeId: string) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(episodeId).success) return { error: "Not found" };
  const today = isoToday();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const [{ data: prev }, { data: cur }] = await Promise.all([
    supabase.from("tracker_symptoms").select("symptom, other_text").eq("episode_id", episodeId).eq("logged_on", yesterday),
    supabase.from("tracker_symptoms").select("symptom").eq("episode_id", episodeId).eq("logged_on", today),
  ]);
  const have = new Set((cur ?? []).map((c) => c.symptom));
  const rows = (prev ?? [])
    .filter((p) => !have.has(p.symptom))
    .map((p) => ({ user_id: user.id, episode_id: episodeId, symptom: p.symptom, other_text: p.other_text, logged_on: today }));
  if (rows.length) {
    const { error } = await supabase.from("tracker_symptoms").insert(rows);
    if (error) return { error: "Could not save." };
  }
  revalidate(episodeId);
  return { ok: true };
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

export async function updateTreatment(treatmentId: string, input: z.input<typeof treatmentSchema>) {
  const { user, supabase } = await session();
  const parsed = treatmentSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Please check the form" };
  const d = parsed.data;
  if (d.antibiotic_id !== "other" && !antibioticById(d.antibiotic_id)) return { error: "Choose an antibiotic from the list" };
  const { data } = await supabase
    .from("tracker_treatments")
    .update({
      antibiotic_id: d.antibiotic_id,
      other_name: d.antibiotic_id === "other" ? d.other_name?.trim() || null : null,
      started_on: d.started_on || null,
      days: d.days,
      course_type: d.course_type || null,
      source: d.source || null,
    })
    .eq("id", treatmentId)
    .eq("user_id", user.id)
    .select("episode_id")
    .maybeSingle();
  if (!data) return { error: "Could not save." };
  revalidate(data.episode_id);
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

// --------------------------------------------------------------- prevention

function revalidatePrevention() {
  revalidatePath("/portal/tracker");
  revalidatePath("/portal/tracker/prevention");
  revalidatePath("/portal/tracker/about-me");
}

/** Add one or more things to "what I'm taking". Already-active keys are skipped. */
export async function addPreventions(input: { keys: string[]; otherName?: string; antibioticId?: string; antibioticOther?: string; startedOn?: string | null }) {
  const { user, supabase } = await session();
  const keys = input.keys.filter((k) => PREVENTION_KEYS.includes(k));
  if (!keys.length) return { error: "Choose at least one." };
  const started = input.startedOn && isoDate.safeParse(input.startedOn).success && input.startedOn <= isoToday() ? input.startedOn : null;
  const { data: active } = await supabase.from("tracker_preventions").select("option_key").eq("user_id", user.id).is("stopped_on", null);
  const have = new Set((active ?? []).map((a) => a.option_key));
  const rows = keys.filter((k) => !have.has(k) || k === "other").map((key) => {
    const ab = ANTIBIOTIC_PREVENTIONS.includes(key) ? preventionAntibiotic(input.antibioticId, input.antibioticOther) : { antibiotic_id: null, other_name: null };
    return { user_id: user.id, option_key: key, other_name: key === "other" ? input.otherName?.trim() || null : ab.other_name, antibiotic_id: ab.antibiotic_id, started_on: started };
  });
  if (rows.length) {
    const { error } = await supabase.from("tracker_preventions").insert(rows);
    if (error) return { error: "Could not save. Please try again." };
  }
  await audit(supabase, user.id, "prevention_added", { keys: rows.map((r) => r.option_key) });
  revalidatePrevention();
  return { ok: true };
}

/** Stop everything currently active with these keys, keeping the history. */
export async function stopPreventions(keys: string[]) {
  const { user, supabase } = await session();
  const wanted = keys.filter((k) => PREVENTION_KEYS.includes(k));
  if (!wanted.length) return { ok: true, stopped: 0 };
  const { data } = await supabase
    .from("tracker_preventions")
    .update({ stopped_on: isoToday(), updated_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("stopped_on", null)
    .in("option_key", wanted)
    .select("id");
  const n = data?.length ?? 0;
  if (n) await audit(supabase, user.id, "prevention_stopped", { keys: wanted, count: n });
  revalidatePrevention();
  return { ok: true, stopped: n };
}

export async function updatePrevention(id: string, patch: { startedOn?: string | null; stoppedOn?: string | null; helping?: string | null; notes?: string }) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(id).success) return { error: "Not found" };
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  const today = isoToday();
  if (patch.startedOn !== undefined) {
    if (patch.startedOn === null || patch.startedOn === "") update.started_on = null;
    else if (!isoDate.safeParse(patch.startedOn).success || patch.startedOn > today) return { error: "Choose a start date that isn't in the future." };
    else update.started_on = patch.startedOn;
  }
  if (patch.stoppedOn !== undefined) {
    if (patch.stoppedOn === null) update.stopped_on = null;
    else if (!isoDate.safeParse(patch.stoppedOn).success || patch.stoppedOn > today) return { error: "Choose a date that isn't in the future." };
    else update.stopped_on = patch.stoppedOn;
  }
  if (patch.helping !== undefined) {
    if (patch.helping !== null && !HELPING.some((h) => h.key === patch.helping)) return { error: "Choose an answer" };
    update.helping = patch.helping;
  }
  if (patch.notes !== undefined) update.notes = patch.notes.slice(0, 2000) || null;
  const { error } = await supabase.from("tracker_preventions").update(update).eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message.includes("check") ? "The stop date can't be before the start date." : "Could not save." };
  if (patch.stoppedOn) await audit(supabase, user.id, "prevention_stopped", { id });
  revalidatePrevention();
  return { ok: true };
}

/** "Start again": a fresh row from today, so the earlier try stays in the history. */
export async function restartPrevention(id: string) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(id).success) return { error: "Not found" };
  const { data: prev } = await supabase.from("tracker_preventions").select("option_key, other_name, antibiotic_id").eq("id", id).eq("user_id", user.id).maybeSingle();
  if (!prev) return { error: "Not found" };
  const { error } = await supabase.from("tracker_preventions").insert({ user_id: user.id, option_key: prev.option_key, other_name: prev.other_name, antibiotic_id: prev.antibiotic_id, started_on: isoToday() });
  if (error) return { error: "Could not save." };
  await audit(supabase, user.id, "prevention_added", { keys: [prev.option_key], restarted: true });
  revalidatePrevention();
  return { ok: true };
}

export async function deletePrevention(id: string) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(id).success) return { error: "Not found" };
  const { error } = await supabase.from("tracker_preventions").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Could not delete." };
  revalidatePrevention();
  return { ok: true };
}

// -------------------------------------------------------------------- chats

const chatMessageSchema = z.object({
  role: z.enum(["assistant", "user"]),
  text: z.string().max(4000).optional(),
  lines: z.array(z.string().max(500)).max(40).optional(),
  flag: z.array(z.string().max(40)).max(20).optional(),
  at: z.string().max(40),
});

/** Keep a conversation with Una. Creates it on the first call, then replaces the messages. */
export async function saveChat(input: { id: string | null; mode: string; messages: unknown[] }) {
  const { user, supabase } = await session();
  const parsed = z.array(chatMessageSchema).max(400).safeParse(input.messages);
  if (!parsed.success) return { error: "Could not save the chat." };
  const messages = parsed.data;
  const firstUser = messages.find((m) => m.role === "user" && m.text)?.text ?? null;
  const title = firstUser ? firstUser.slice(0, 80) : null;
  const now = new Date().toISOString();
  if (input.id && uuid.safeParse(input.id).success) {
    const { error } = await supabase.from("tracker_chats").update({ messages, title, updated_at: now }).eq("id", input.id).eq("user_id", user.id);
    if (error) return { error: "Could not save the chat." };
    return { ok: true, id: input.id };
  }
  const { data, error } = await supabase
    .from("tracker_chats")
    .insert({ user_id: user.id, mode: input.mode.slice(0, 20), messages, title })
    .select("id")
    .single();
  if (error || !data) return { error: "Could not save the chat." };
  return { ok: true, id: data.id as string };
}

export async function listChats() {
  const { user, supabase } = await session();
  const { data } = await supabase
    .from("tracker_chats")
    .select("id, title, mode, created_at, updated_at, messages")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50);
  return (data ?? []).map((c) => ({ id: c.id as string, title: (c.title as string | null), mode: c.mode as string, updated_at: c.updated_at as string, count: Array.isArray(c.messages) ? c.messages.length : 0 }));
}

export async function getChat(id: string) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(id).success) return null;
  const { data } = await supabase.from("tracker_chats").select("id, title, mode, messages, created_at, updated_at").eq("id", id).eq("user_id", user.id).maybeSingle();
  return data ? { ...data, messages: (data.messages ?? []) as unknown[] } : null;
}

export async function deleteChat(id: string) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(id).success) return { error: "Not found" };
  await supabase.from("tracker_chats").delete().eq("id", id).eq("user_id", user.id);
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
  for (const table of ["tracker_episodes", "tracker_checkins", "tracker_preventions", "tracker_chats", "tracker_consents", "tracker_profiles"]) {
    const { error } = await supabase.from(table).delete().eq("user_id", user.id);
    if (error) return { error: "Could not delete everything. Please try again." };
  }
  revalidate();
  revalidatePath("/portal/tracker/settings");
  redirect("/portal?tracker=deleted");
}
