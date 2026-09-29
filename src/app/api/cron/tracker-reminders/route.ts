import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { copy } from "@/lib/tracker/copy";

export const runtime = "nodejs";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

/**
 * Daily job (vercel.json → crons). Sends opt-in reminders through Resend.
 * The only tracker data read is: who opted in, whether they have an open
 * episode, and when they were last reminded. Emails carry no health details.
 * Protected by CRON_SECRET, which Vercel sends as a bearer token.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  if (!secret || auth.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(expected))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: optedIn } = await admin
    .from("tracker_profiles")
    .select("user_id, reminder_daily, reminder_monthly, last_reminder_sent_at, profiles:user_id(email)")
    .or("reminder_daily.eq.true,reminder_monthly.eq.true");

  const now = Date.now();
  let sent = 0;
  for (const p of optedIn ?? []) {
    const email = (p.profiles as unknown as { email: string } | null)?.email;
    if (!email) continue;
    const { count: consented } = await admin
      .from("tracker_consents").select("id", { count: "exact", head: true })
      .eq("user_id", p.user_id).eq("kind", "tracker").is("withdrawn_at", null);
    if (!consented) continue;
    const { count: openEpisodes } = await admin
      .from("tracker_episodes").select("id", { count: "exact", head: true })
      .eq("user_id", p.user_id).is("ended_on", null);
    const last = p.last_reminder_sent_at ? Date.parse(p.last_reminder_sent_at) : 0;
    const hoursSince = (now - last) / 3_600_000;

    let kind: "daily" | "monthly" | null = null;
    if (openEpisodes && p.reminder_daily && hoursSince >= 20) kind = "daily";
    else if (!openEpisodes && p.reminder_monthly && hoursSince >= 24 * 28) kind = "monthly";
    if (!kind) continue;

    const subject = kind === "daily" ? copy.reminders.dailySubject : copy.reminders.monthlySubject;
    const body = kind === "daily" ? copy.reminders.dailyBody : copy.reminders.monthlyBody;
    await sendEmail({
      to: email,
      subject,
      html: `<p style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#1d003a">${body}</p><p><a href="${APP_URL}/portal/tracker" style="font-family:Helvetica,Arial,sans-serif;font-weight:600;color:#91193b">${copy.reminders.button}</a></p>`,
    });
    await admin.from("tracker_profiles").update({ last_reminder_sent_at: new Date().toISOString() }).eq("user_id", p.user_id);
    await admin.from("tracker_audit_log").insert({ user_id: p.user_id, action: "reminder_sent", detail: { kind }, actor: "system" });
    sent += 1;
  }
  return NextResponse.json({ ok: true, sent });
}
