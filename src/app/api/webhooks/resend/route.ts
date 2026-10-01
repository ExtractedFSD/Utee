import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Resend delivery webhooks (email.delivered, email.bounced, ...), signed the
 * Svix way: HMAC-SHA256 over "{id}.{timestamp}.{body}" with the secret from
 * the Resend dashboard (RESEND_WEBHOOK_SECRET, "whsec_..."). Updates the
 * matching email_log row so the admin can see what happened after sending.
 */
const STATUS_BY_EVENT: Record<string, string> = {
  "email.delivered": "delivered",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.delivery_delayed": "delivery_delayed",
};

function verify(secret: string, req: NextRequest, body: string): boolean {
  const id = req.headers.get("svix-id");
  const timestamp = req.headers.get("svix-timestamp");
  const signatures = req.headers.get("svix-signature");
  if (!id || !timestamp || !signatures) return false;
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60) return false;
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const expected = crypto.createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest("base64");
  const expectedBuf = Buffer.from(expected);
  return signatures.split(" ").some((part) => {
    const [, sig] = part.split(",");
    if (!sig) return false;
    const got = Buffer.from(sig);
    return got.length === expectedBuf.length && crypto.timingSafeEqual(got, expectedBuf);
  });
}

export async function POST(req: NextRequest) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "RESEND_WEBHOOK_SECRET not set" }, { status: 503 });
  const body = await req.text();
  if (!verify(secret, req, body)) return NextResponse.json({ error: "bad signature" }, { status: 401 });

  let payload: { type?: string; data?: { email_id?: string; bounce?: { message?: string } } };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const status = STATUS_BY_EVENT[payload.type ?? ""];
  const providerId = payload.data?.email_id;
  if (!status || !providerId) return NextResponse.json({ ignored: true });

  const admin = createAdminClient();
  const { error } = await admin
    .from("email_log")
    .update({
      status,
      error: status === "bounced" ? payload.data?.bounce?.message ?? "bounced" : null,
      updated_at: new Date().toISOString(),
    })
    .eq("provider_id", providerId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
