import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyTrackingEvent } from "@/lib/tracking";
import { trackingEventFromWebhook } from "@/lib/trackship";

function secretMatches(expected: string, provided: string | null): boolean {
  if (!provided) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * TrackShip status webhook. TrackShip doesn't sign its calls, so the shared
 * secret travels in the URL (?secret=) or the X-Tracking-Secret header.
 * Unmatched parcels and statuses we don't record are acknowledged with 200
 * so TrackShip doesn't keep retrying them; database failures return 500 so
 * it does.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TRACKING_WEBHOOK_SECRET;
  const provided = req.nextUrl.searchParams.get("secret") ?? req.headers.get("x-tracking-secret");
  if (!secret || !secretMatches(secret, provided)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  const { event, status, trackingNumber } = trackingEventFromWebhook(body);
  if (!trackingNumber) {
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
