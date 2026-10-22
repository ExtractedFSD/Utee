"use server";

import { createAdminClient } from "@/lib/supabase/admin";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { audit } from "@/lib/tracker/data";
import { INVESTIGATION_KEYS, investigationKind } from "@/lib/tracker/passport";
import { extractInvestigation } from "@/lib/tracker/guided/investigation-extract";
import { isoToday } from "@/lib/tracker/stats";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date");
const uuid = z.string().uuid();

const investigationSchema = z.object({
  kind: z.enum(INVESTIGATION_KEYS),
  performed_on: isoDate.or(z.literal("")),
  normal: z.enum(["yes", "no", "unknown"]),
  findings: z.array(z.string().max(40)).max(20),
  body_part: z.string().max(80).optional(),
  values: z.record(z.string().max(20)).optional(),
  notes: z.string().max(2000).optional(),
});

export type InvestigationInput = z.input<typeof investigationSchema>;

async function session() {
  const user = await requireRole(["customer"]);
  const supabase = await createClient();
  return { user, supabase };
}

function revalidate() {
  revalidatePath("/portal/passport");
  revalidatePath("/portal/passport/investigations");
  revalidatePath("/portal/passport/timeline");
}

/** Keeps only findings and numbers that belong to this kind of test. */
function cleanRow(d: z.infer<typeof investigationSchema>) {
  const def = investigationKind(d.kind);
  const allowed = new Set(def.findings.map((f) => f.key));
  const values: Record<string, number> = {};
  for (const v of def.values) {
    const raw = d.values?.[v.key]?.trim();
    if (!raw) continue;
    const n = Number(raw.replace(",", "."));
    if (Number.isFinite(n) && n >= 0 && n < 100000) values[v.key] = n;
  }
  if (d.performed_on && d.performed_on > isoToday()) return { error: "Choose a date that isn't in the future." as const };
  return {
    row: {
      kind: d.kind,
      performed_on: d.performed_on || null,
      normal: d.normal === "yes" ? true : d.normal === "no" ? false : null,
      findings: d.normal === "no" ? d.findings.filter((f) => allowed.has(f)) : [],
      body_part: def.bodyPart ? d.body_part?.trim().slice(0, 80) || null : null,
      values,
      notes: d.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    },
  };
}

/** A clinician's check is a mark on the entry as it was; any change removes it. */
async function clearVerification(userId: string, id: string) {
  await createAdminClient().from("tracker_verifications").delete().eq("user_id", userId).eq("entity", "investigation").eq("entity_id", id);
}

export async function addInvestigation(input: InvestigationInput) {
  const { user, supabase } = await session();
  const parsed = investigationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Please check the form" };
  const cleaned = cleanRow(parsed.data);
  if ("error" in cleaned) return cleaned;
  const { error } = await supabase.from("tracker_investigations").insert({ user_id: user.id, ...cleaned.row });
  if (error) return { error: "Could not save. Please try again." };
  await audit(supabase, user.id, "investigation_added", { kind: cleaned.row.kind });
  revalidate();
  return { ok: true };
}

export async function updateInvestigation(id: string, input: InvestigationInput) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(id).success) return { error: "Not found" };
  const parsed = investigationSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Please check the form" };
  const cleaned = cleanRow(parsed.data);
  if ("error" in cleaned) return cleaned;
  const { error } = await supabase.from("tracker_investigations").update(cleaned.row).eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Could not save. Please try again." };
  await clearVerification(user.id, id);
  revalidate();
  return { ok: true };
}

export async function deleteInvestigation(id: string) {
  const { user, supabase } = await session();
  if (!uuid.safeParse(id).success) return { error: "Not found" };
  const { error } = await supabase.from("tracker_investigations").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: "Could not delete." };
  await clearVerification(user.id, id);
  await audit(supabase, user.id, "investigation_deleted", { id });
  revalidate();
  return { ok: true };
}

/** Una reads a sentence into the form. Nothing is saved here. */
export async function describeInvestigation(text: string) {
  const { user, supabase } = await session();
  const clean = text.trim().slice(0, 1000);
  if (!clean) return { error: "Type something first." };
  const { data: profile } = await supabase.from("tracker_profiles").select("una_ai").eq("user_id", user.id).maybeSingle();
  return extractInvestigation(clean, isoToday(), profile?.una_ai !== false);
}
