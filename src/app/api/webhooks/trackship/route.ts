import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyTrackingEvent } from "@/lib/tracking";
import { trackingEventFromWebhook } from "@/lib/trackship";

function matches(expected: string | undefined, provided: string | null): boolean {
  if (!expected || !provided) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * TrackShip status webhook. TrackShip sends our own API key back in the
 * trackship-api-key header on every call; that, or the shared tracking
 * secret in ?secret= / X-Tracking-Secret, authenticates the request.
 *
 * Anything other than a 200 makes TrackShip retry in two hours, so parcels
 * we don't know and statuses we don't record are acknowledged with 200;
 * only a database failure returns 500.
 */
export async function POST(req: NextRequest) {
  const byKey = matches(process.env.TRACKSHIP_API_KEY, req.headers.get("trackship-api-key"));
  const bySecret = matches(
    process.env.TRACKING_WEBHOOK_SECRET,
    req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-tracking-secret")
  );
  if (!byKey && !bySecret) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { event, status, trackingNumber } = trackingEventFromWebhook(body);
  if (!trackingNumber) {
    // TrackShip's connection test posts without a shipment: answer 200 so it is accepted.
    console.warn("[trackship] webhook without a tracking number", JSON.stringify(body).slice(0, 2000));
    return NextResponse.json({ matched: false, reason: "no tracking number" });
  }
  if (!event) return NextResponse.json({ matched: false, reason: `status ${status ?? "missing"} not recorded` });

  const admin = createAdminClient();
  const result = await applyTrackingEvent(admin, event);
  if (result.error) return NextResponse.json(result, { status: 500 });
  if (!result.matched) console.warn(`[trackship] no shipment for ${trackingNumber}`);
  return NextResponse.json(result);
}
