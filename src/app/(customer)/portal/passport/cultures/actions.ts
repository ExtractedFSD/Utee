"use server";

import { createAdminClient } from "@/lib/supabase/admin";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/tracker/data";
import { CULTURE_METHODS, CULTURE_OUTCOMES, ORGANISM_KEYS, type Sensitivities } from "@/lib/tracker/cultures";
import { antibioticById } from "@/lib/tracker/search";
import { extractCultureImage, extractCultureText } from "@/lib/tracker/guided/culture-extract";
import { isoToday } from "@/lib/tracker/stats";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");
const uuid = z.string().uuid();
const keys = (list: { key: string }[]) => list.map((o) => o.key) as [string, ...string[]];

const cultureSchema = z.object({
  sample_on: isoDate.or(z.literal("")),
  method: z.enum(keys(CULTURE_METHODS)),
  method_other: z.string().max(80).optional(),
  outcome: z.enum(keys(CULTURE_OUTCOMES)),
  organisms: z
    .array(z.object({ key: z.string().max(40), name: z.string().max(120).nullable().optional(), count: z.string().max(40).nullable().optional() }))
    .max(8),
  sensitivities: z.record(z.record(z.enum(["S", "I", "R"]))),
  microscopy: z.object({ red_cells: z.string().max(12).optional(), white_cells: z.string().max(12).optional() }).optional(),
  notes: z.string().max(2000).optional(),
});

export type CultureInput = z.input<typeof cultureSchema>;

async function session() {
  const user = await requireRole(["customer"]);
  const supabase = await createClient();
  return { user, supabase };
}

function revalidate() {
  revalidatePath("/portal/passport");
  revalidatePath("/portal/passport/cultures");
  revalidatePath("/portal/passport/timeline");
}

function num(v: string | undefined): number | null {
  const s = v?.trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n >= 0 && n < 1_000_000 ? n : null;
}

function cleanRow(d: z.infer<typeof cultureSchema>) {
  if (d.sample_on && d.sample_on > isoToday()) return { error: "Choose a date that isn't in the future." as const };
  const organisms = d.organisms
    .filter((o) => ORGANISM_KEYS.includes(o.key) || (o.key === "other" && o.name?.trim()))
    .map((o) => ({ key: o.key, name: o.key === "other" ? o.name!.trim().slice(0, 120) : null, count: o.count?.trim().slice(0, 40) || null }));
  const sensitivities: Sensitivities = {};
  for (const o of organisms) {
    const given = d.sensitivities[o.key] ?? {};
    const clean: Record<string, "S" | "I" | "R"> = {};
    for (const [id, sir] of Object.entries(given)) if (antibioticById(id) && id !== "other" && id !== "dont_know") clean[id] = sir;
    if (Object.keys(clean).length) sensitivities[o.key] = clean;
  }
  const outcome = d.outcome === "pathogens" && organisms.length === 0 ? "unknown" : organisms.length ? "pathogens" : d.outcome;
  const microscopy: Record<string, number> = {};
  const wc = num(d.microscopy?.white_cells);
  const rc = num(d.microscopy?.red_cells);
  if (wc !== null) microscopy.white_cells = wc;
  if (rc !== null) microscopy.red_cells = rc;
  return {
    row: {
      sample_on: d.sample_on || null,
      method: d.method,
      method_other: d.method === "other" ? d.method_other?.trim().slice(0, 80) || null : null,
      outcome,
      organisms,
      sensitivities,
      microscopy,
      notes: d.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    },
  };
}

/** The UTI this sample belongs to, if one covers the date. */
async function episodeFor(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, sampleOn: string | null): Promise<string | null> {
  if (!sampleOn) return null;
  const { data } = await supabase
    .from("tracker_episodes")
    .select("id, started_on, ended_on")
    .eq("user_id", userId)
    .lte("started_on", sampleOn)
    .order("started_on", { ascending: false })
    .limit(3);
  const hit = (data ?? []).find((e) => !e.ended_on || e.ended_on >= sampleOn);
  return hit?.id ?? null;
}

/** A clinician's check is a mark on the entry as it was; any change removes it. */
async function clearVerification(userId: string, id: string) {
  await createAdminClient().from("tracker_verifications").delete().eq("user_id", userId).eq("entity", "culture").eq("entity_id", id);
}

export async function addCulture(input: CultureInput) {
  const { user, supabase } = await session();
  const parsed = cultureSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Please check the form" };
  const cleaned = cleanRow(parsed.data);
  if ("error" in cleaned) return cleaned;
  const episode_id = await episodeFor(supabase, user.id, cleaned.row.sample_on);
  const { error } = await supabase.from("tracker_cultures").insert({ user_id: user.id, episode_id, ...cleaned.row });
  if (error) return { error: "Could not save. Please try again." };
  await audit(supabase, user.id, "culture_added", { method: cleaned.row.method, organisms: cleaned.row.organisms.map((o) => o.key) });
  revalidate();
  return { ok: true };
}

export async function updateCulture(id: string, input: CultureInput) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(id).success) return { error: "Not found" };
  const parsed = cultureSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Please check the form" };
  const cleaned = cleanRow(parsed.data);
  if ("error" in cleaned) return cleaned;
  const episode_id = await episodeFor(supabase, user.id, cleaned.row.sample_on);
  const { error } = await supabase.from("tracker_cultures").update({ episode_id, ...cleaned.row }).eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Could not save. Please try again." };
  await clearVerification(user.id, id);
  revalidate();
  return { ok: true };
}

export async function deleteCulture(id: string) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(id).success) return { error: "Not found" };
  const { error } = await supabase.from("tracker_cultures").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Could not delete." };
  await clearVerification(user.id, id);
  await audit(supabase, user.id, "culture_deleted", { id });
  revalidate();
  return { ok: true };
}

/** Una reads a sentence into the form. Nothing is saved here. */
export async function describeCulture(text: string) {
  const { user, supabase } = await session();
  const clean = text.trim().slice(0, 2000);
  if (!clean) return { error: "Type something first." };
  const { data: profile } = await supabase.from("tracker_profiles").select("una_ai").eq("user_id", user.id).maybeSingle();
  return extractCultureText(clean, isoToday(), profile?.una_ai !== false);
}

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/**
 * Reads a photographed report. The image goes to the reader and nowhere
 * else: it is not stored, logged or kept after this call returns.
 */
export async function readCulturePhoto(dataUrl: string) {
  const { user, supabase } = await session();
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return { error: "That doesn't look like a photo. Try again." };
  const base64 = m[2];
  if (base64.length * 0.75 > MAX_IMAGE_BYTES) return { error: "That photo is too large. Try again a little further away." };
  const { data: profile } = await supabase.from("tracker_profiles").select("una_ai").eq("user_id", user.id).maybeSingle();
  if (profile?.una_ai === false) return { error: "Photo reading uses Una's AI reader, which is switched off in your settings. Type the result instead, or turn it on in Settings." };
  await audit(supabase, user.id, "culture_photo_read", {});
  return extractCultureImage(base64, m[1] as "image/jpeg" | "image/png" | "image/webp" | "image/gif", isoToday());
}
