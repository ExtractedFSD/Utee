import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, emails } from "@/lib/email";
import { logKitEvent } from "@/lib/events";
import { formatKitCode } from "@/lib/kit-code";
import { PRE_TRIAGE_STATUSES } from "@/lib/kits";

/*
 * A kit bought online belongs to the buyer. When someone else scans it,
 * they can ask for it: the buyer gets an email naming them and passes the
 * kit on from that email with one tap, no sign-in needed. The kit then
 * moves straight to the asker's account, so nobody else can grab it in
 * between. Approval links are one-time tokens kept hashed, good for a week.
 */
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export type TransferRequestRow = {
  id: string;
  kit_id: string;
  owner_id: string;
  requester_id: string;
  status: "pending" | "approved" | "declined" | "expired" | "cancelled";
  created_at: string;
  expires_at: string;
};

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

type Person = { id: string; email: string; full_name: string | null };

async function person(admin: SupabaseClient, id: string): Promise<Person | null> {
  const { data } = await admin.from("profiles").select("id, email, full_name").eq("id", id).maybeSingle();
  return (data as Person | null) ?? null;
}

/**
 * The asker is signed in and has just been refused the kit. One pending
 * request per kit and asker; asking again re-sends the email with a fresh
 * link. Returns a reason when the kit cannot be asked for.
 */
export async function requestKitTransfer(admin: SupabaseClient, code: string, requester: Person): Promise<{ ok: true; ownerKnown: boolean } | { error: string }> {
  const { data: kit } = await admin.from("kits").select("id, code, status, customer_id").eq("code", code).maybeSingle();
  if (!kit) return { error: "We couldn't find that kit." };
  if (!kit.customer_id) return { error: "This kit isn't on anyone's account yet. Scan it again and it will register to you." };
  if (kit.customer_id === requester.id) return { error: "This kit is already on your account." };
  if (!(PRE_TRIAGE_STATUSES as readonly string[]).includes(kit.status)) return { error: "This kit has already been used, so it can't be passed on." };
  const { data: triage } = await admin.from("triage_submissions").select("id").eq("kit_id", kit.id).maybeSingle();
  if (triage) return { error: "This kit has already been used, so it can't be passed on." };
  const owner = await person(admin, kit.customer_id);
  if (!owner) return { error: "We couldn't reach the person who ordered this kit. Please contact us." };

  // Replace any earlier pending request from this person so only the newest link works.
  await admin.from("kit_transfer_requests").update({ status: "cancelled", decided_at: new Date().toISOString() }).eq("kit_id", kit.id).eq("requester_id", requester.id).eq("status", "pending");
  const token = randomBytes(24).toString("base64url");
  const { error } = await admin.from("kit_transfer_requests").insert({ kit_id: kit.id, owner_id: owner.id, requester_id: requester.id, token_hash: hash(token) });
  if (error) throw new Error(`kit_transfer_requests insert failed: ${error.message}`);

  await logKitEvent(admin, {
    kitId: kit.id,
    type: "fulfilment",
    label: "Someone asked to use this kit",
    detail: `${requester.full_name ?? requester.email} asked for it. The person who ordered it has been emailed.`,
    actorRole: "customer",
    actorId: requester.id,
    visibleToCustomer: false,
    metadata: { channel: "transfer_request", requester_id: requester.id },
  });
  const shown = formatKitCode(kit.code);
  await sendEmail({
    to: owner.email,
    kitId: kit.id,
    kind: "kitTransferRequested",
    ...emails.kitTransferRequested(shown, requester.full_name ?? "Someone", requester.email, `${APP_URL}/kits/transfer/${token}`, `${APP_URL}/kits/transfer/${token}?decline=1`),
  });
  return { ok: true, ownerKnown: true };
}

/** What the approval page shows before the buyer taps, with no sign-in. */
export async function transferRequestByToken(admin: SupabaseClient, token: string) {
  const { data } = await admin
    .from("kit_transfer_requests")
    .select("id, kit_id, owner_id, requester_id, status, created_at, expires_at, kits:kit_id(code, status, customer_id)")
    .eq("token_hash", hash(token))
    .maybeSingle();
  if (!data) return null;
  const requester = await person(admin, data.requester_id);
  const kit = data.kits as unknown as { code: string; status: string; customer_id: string | null };
  return { request: data as unknown as TransferRequestRow, kit, requester };
}

/**
 * The buyer's answer, from the email link or from their kit page. Approving
 * moves the kit to the asker's account in one guarded update; both sides
 * are emailed. Returns what to tell the person who answered.
 */
export async function decideKitTransfer(
  admin: SupabaseClient,
  request: TransferRequestRow,
  approve: boolean,
  via: "email" | "portal"
): Promise<{ outcome: "approved" | "declined" | "expired" | "already" | "unavailable"; kitCode: string }> {
  const { data: kit } = await admin.from("kits").select("id, code, status, customer_id").eq("id", request.kit_id).single();
  const shown = formatKitCode(kit?.code ?? "");
  if (!kit) return { outcome: "unavailable", kitCode: shown };
  if (request.status !== "pending") return { outcome: request.status === "approved" ? "already" : request.status === "expired" ? "expired" : "unavailable", kitCode: shown };
  if (request.expires_at < new Date().toISOString()) {
    await admin.from("kit_transfer_requests").update({ status: "expired" }).eq("id", request.id);
    return { outcome: "expired", kitCode: shown };
  }
  const [owner, requester] = await Promise.all([person(admin, request.owner_id), person(admin, request.requester_id)]);

  if (!approve) {
    await admin.from("kit_transfer_requests").update({ status: "declined", decided_at: new Date().toISOString(), decided_via: via }).eq("id", request.id);
    if (requester) await sendEmail({ to: requester.email, kitId: kit.id, kind: "kitTransferDeclined", ...emails.kitTransferDeclined(shown) });
    return { outcome: "declined", kitCode: shown };
  }

  if (kit.customer_id !== request.owner_id || !(PRE_TRIAGE_STATUSES as readonly string[]).includes(kit.status)) {
    await admin.from("kit_transfer_requests").update({ status: "cancelled", decided_at: new Date().toISOString(), decided_via: via }).eq("id", request.id);
    return { outcome: "unavailable", kitCode: shown };
  }
  const { data: moved } = await admin
    .from("kits")
    .update({ customer_id: request.requester_id, released_at: new Date().toISOString(), released_by: request.owner_id })
    .eq("id", kit.id)
    .eq("customer_id", request.owner_id)
    .in("status", [...PRE_TRIAGE_STATUSES])
    .select("id");
  if (!moved?.length) return { outcome: "unavailable", kitCode: shown };

  await admin.from("kit_transfer_requests").update({ status: "approved", decided_at: new Date().toISOString(), decided_via: via }).eq("id", request.id);
  // Any other pending asks for this kit are moot now.
  await admin.from("kit_transfer_requests").update({ status: "cancelled", decided_at: new Date().toISOString() }).eq("kit_id", kit.id).eq("status", "pending");

  await logKitEvent(admin, {
    kitId: kit.id,
    type: "fulfilment",
    label: "Kit passed on by the person who ordered it",
    detail: `Passed to ${requester?.full_name ?? requester?.email ?? "the person who asked"}${via === "email" ? " from the email link" : ""}.`,
    actorRole: "customer",
    actorId: request.owner_id,
    visibleToCustomer: false,
    metadata: { channel: "transfer_request", request_id: request.id, via },
  });
  await logKitEvent(admin, {
    kitId: kit.id,
    type: "fulfilment",
    label: "Kit linked to your account",
    detail: "Passed on to you by the person who ordered it.",
    actorRole: "customer",
    actorId: request.requester_id,
    metadata: { channel: "transfer_request" },
  });
  if (requester) await sendEmail({ to: requester.email, kitId: kit.id, kind: "kitTransferApproved", ...emails.kitTransferApproved(shown, kit.code) });
  if (owner) await sendEmail({ to: owner.email, kitId: kit.id, kind: "kitReleased", ...emails.kitReleased(shown, requester?.email ?? null) });
  return { outcome: "approved", kitCode: shown };
}

/** Pending asks on a kit, for the owner's kit page. */
export async function pendingTransferRequests(admin: SupabaseClient, kitId: string): Promise<{ id: string; name: string; email: string; created_at: string }[]> {
  const { data } = await admin
    .from("kit_transfer_requests")
    .select("id, requester_id, created_at, expires_at, profiles:requester_id(full_name, email)")
    .eq("kit_id", kitId)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  return (data ?? []).map((r) => {
    const p = r.profiles as unknown as { full_name: string | null; email: string } | null;
    return { id: r.id, name: p?.full_name ?? p?.email ?? "Someone", email: p?.email ?? "", created_at: r.created_at };
  });
}

export async function transferRequestById(admin: SupabaseClient, id: string): Promise<TransferRequestRow | null> {
  const { data } = await admin.from("kit_transfer_requests").select("id, kit_id, owner_id, requester_id, status, created_at, expires_at").eq("id", id).maybeSingle();
  return (data as TransferRequestRow | null) ?? null;
}
