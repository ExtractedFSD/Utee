import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyTrackingEvent } from "@/lib/tracking";

const payloadSchema = z.object({
  trackingNumber: z.string().min(4),
  status: z.enum(["in_transit", "out_for_delivery", "delivered", "exception"]),
  description: z.string().min(1),
  // Royal Mail / AfterShip send offset-form ISO-8601 (e.g. +01:00 during BST),
  // not only the Z suffix.
  occurredAt: z.string().datetime({ offset: true }).optional(),
  location: z.string().optional(),
});

/** Constant-time comparison that never throws on a malformed header. */
function secretMatches(expected: string, provided: string | null): boolean {
  if (!provided) return false;
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

/**
 * Carrier-agnostic tracking ingest. Configure Royal Mail push notifications
 * (or AfterShip/another aggregator, mapped to this shape) to POST here with
 * header X-Tracking-Secret: $TRACKING_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TRACKING_WEBHOOK_SECRET;
  if (!secret || !secretMatches(secret, req.headers.get("x-tracking-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await applyTrackingEvent(admin, {
    ...parsed.data,
    occurredAt: parsed.data.occurredAt ?? new Date().toISOString(),
  });
  // A database failure must not be acknowledged: 5xx makes the carrier retry
  // instead of silently dropping the scan.
  if (result.error) {
    return NextResponse.json(result, { status: 500 });
  }
  return NextResponse.json(result);
}
