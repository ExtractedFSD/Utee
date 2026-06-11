import { SupabaseClient } from "@supabase/supabase-js";
import { sendEmail, emails } from "@/lib/email";
import type { KitStatus, Role } from "@/lib/status";

type LogEventOpts = {
  kitId: string;
  type: string;
  label: string;
  detail?: string;
  actorRole?: Role;
  actorId?: string;
  visibleToCustomer?: boolean;
  metadata?: Record<string, unknown>;
  /** When set, also advances kits.status (and its timestamp column). */
  newStatus?: KitStatus;
};

const STATUS_TIMESTAMP: Partial<Record<KitStatus, string>> = {
  assigned: "assigned_at",
  activated: "activated_at",
  received_by_lab: "received_by_lab_at",
  lab_complete: "lab_complete_at",
  report_ready: "report_ready_at",
};

/**
 * Single entry point for moving a kit through its lifecycle: appends an audit
 * event, optionally advances the kit status, and fans out email notifications.
 * `admin` must be a service-role client.
 */
export async function logKitEvent(admin: SupabaseClient, opts: LogEventOpts) {
  const { error: eventError } = await admin.from("kit_events").insert({
    kit_id: opts.kitId,
    type: opts.type,
    label: opts.label,
    detail: opts.detail ?? null,
    actor_role: opts.actorRole ?? null,
    actor_id: opts.actorId ?? null,
    visible_to_customer: opts.visibleToCustomer ?? true,
    metadata: opts.metadata ?? null,
  });
  if (eventError) throw new Error(`kit_events insert failed: ${eventError.message}`);

  if (opts.newStatus) {
    const update: Record<string, unknown> = { status: opts.newStatus };
    const tsColumn = STATUS_TIMESTAMP[opts.newStatus];
    if (tsColumn) update[tsColumn] = new Date().toISOString();
    const { error } = await admin.from("kits").update(update).eq("id", opts.kitId);
    if (error) throw new Error(`kit status update failed: ${error.message}`);
    await notifyForStatus(admin, opts.kitId, opts.newStatus);
  }
}

async function customerEmailForKit(admin: SupabaseClient, kitId: string) {
  const { data } = await admin
    .from("kits")
    .select("code, customer_id, profiles:customer_id(email)")
    .eq("id", kitId)
    .single();
  const profile = data?.profiles as unknown as { email: string } | null;
  return { code: data?.code as string | undefined, email: profile?.email };
}

async function notifyForStatus(admin: SupabaseClient, kitId: string, status: KitStatus) {
  const { code, email } = await customerEmailForKit(admin, kitId);
  if (!code) return;

  const labEmail = process.env.LAB_NOTIFICATION_EMAIL;
  const clinicEmail = process.env.CLINIC_NOTIFICATION_EMAIL;

  switch (status) {
    case "activated":
      if (email) await sendEmail({ to: email, ...emails.triageReceived(code) });
      break;
    case "in_transit_to_lab":
      if (labEmail) await sendEmail({ to: labEmail, ...emails.labNewSpecimen(code) });
      break;
    case "received_by_lab":
      if (email) await sendEmail({ to: email, ...emails.receivedByLab(code) });
      break;
    case "lab_complete":
      if (email) await sendEmail({ to: email, ...emails.labComplete(code) });
      if (clinicEmail) await sendEmail({ to: clinicEmail, ...emails.clinicNewCase(code) });
      break;
    case "report_ready":
      if (email) await sendEmail({ to: email, ...emails.reportReady(code) });
      break;
  }
}

/** Generates a human-friendly unique kit code like UT-7K3F9Q. */
export function generateKitCode() {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // no 0/O/1/I/L
  let out = "";
  for (let i = 0; i < 6; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `UT-${out}`;
}
