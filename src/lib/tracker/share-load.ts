import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAll, type TrackerData, type TrackerProfile } from "./data";
import { loadUteeCultures } from "./load";
import { normalizeShareCode, shareState, type ShareRow } from "./share";

/*
 * Opening a shared passport. Nobody is signed in, so the read goes through
 * the service role, and only after the code has been found, is unexpired
 * and unrevoked. Every open is counted on the share for the patient to see.
 */
export type SharedPassport = {
  share: ShareRow & { user_id: string };
  patient: { name: string | null; email: string; dateOfBirth: string | null };
  profile: TrackerProfile;
  data: TrackerData;
};

export async function loadSharedPassport(rawCode: string, { countView = false } = {}): Promise<SharedPassport | null> {
  const code = normalizeShareCode(rawCode);
  if (!code) return null;
  const admin = createAdminClient();
  const { data: share } = await admin
    .from("tracker_shares")
    .select("id, user_id, code, label, created_at, expires_at, revoked_at, last_viewed_at, view_count")
    .eq("code", code)
    .maybeSingle();
  if (!share || shareState(share) !== "active") return null;
  const [{ data: account }, profile, data, utee] = await Promise.all([
    admin.from("profiles").select("email, full_name, date_of_birth").eq("id", share.user_id).single(),
    admin.from("tracker_profiles").select("*").eq("user_id", share.user_id).maybeSingle().then((r) => r.data as TrackerProfile | null),
    loadAll(admin, share.user_id),
    loadUteeCultures(share.user_id),
  ]);
  if (!account || !profile) return null;
  if (countView) {
    await admin.from("tracker_shares").update({ last_viewed_at: new Date().toISOString(), view_count: (share.view_count as number) + 1 }).eq("id", share.id);
    await admin.from("tracker_audit_log").insert({ user_id: share.user_id, action: "passport_share_opened", detail: { share_id: share.id }, actor: "system" });
  }
  const cultures = [...data.cultures, ...utee].sort((a, b) => ((a.sample_on ?? "") < (b.sample_on ?? "") ? 1 : -1));
  return {
    share: share as SharedPassport["share"],
    patient: { name: (account.full_name as string | null) ?? null, email: account.email as string, dateOfBirth: (account.date_of_birth as string | null) ?? null },
    profile,
    data: { ...data, cultures },
  };
}
