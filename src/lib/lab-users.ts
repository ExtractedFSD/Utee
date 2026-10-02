import type { SupabaseClient } from "@supabase/supabase-js";
import type { LabResultRow } from "@/components/RunHistory";

/** Email for every lab user who recorded a run on this result, keyed by id. */
export async function labUserNames(admin: SupabaseClient, result: LabResultRow): Promise<Record<string, string>> {
  const ids = new Set<string>();
  if (result.lab_user_id) ids.add(result.lab_user_id);
  for (const a of (Array.isArray(result.previous_attempts) ? result.previous_attempts : []) as { lab_user_id?: string | null }[]) {
    if (a?.lab_user_id) ids.add(a.lab_user_id);
  }
  if (!ids.size) return {};
  const { data } = await admin.from("profiles").select("id, email, full_name").in("id", [...ids]);
  return Object.fromEntries((data ?? []).map((p) => [p.id, p.full_name || p.email]));
}
