"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { emails, sendEmail } from "@/lib/email";

/** Sends a sample lab-query email to ADMIN_NOTIFICATION_EMAIL so the address and Resend setup can be checked. */
export async function sendTestEmail() {
  const user = await requireRole(["admin"]);
  if (user.role !== "super_admin") return { error: "Only a super admin can send a test email" };
  const to = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!to) return { error: "ADMIN_NOTIFICATION_EMAIL is not set on this deployment" };
  const result = await sendEmail({
    to,
    kind: "test",
    ...emails.adminLabQuery(
      "UT-TEST-0001",
      ["Positive control not confirmed, so the test may not have run correctly", "Error reported by the device"],
      `Test email sent by ${user.email}. No real specimen.`
    ),
  });
  revalidatePath("/admin/emails");
  if (!result.ok) return { error: `Resend did not accept the email. Check the Problems filter below for the reason.` };
  return { ok: true, to, id: result.id ?? null };
}
