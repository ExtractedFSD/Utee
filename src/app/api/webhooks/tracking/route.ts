import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { applyTrackingEvent } from "@/lib/tracking";

const payloadSchema = z.object({
  trackingNumber: z.string().min(4),
  status: z.enum(["in_transit", "out_for_delivery", "delivered", "exception"]),
  description: z.string().min(1),
  occurredAt: z.string().datetime().optional(),
  location: z.string().optional(),
});

/**
 * Carrier-agnostic tracking ingest. Configure Royal Mail push notifications
 * (or AfterShip/another aggregator, mapped to this shape) to POST here with
 * header X-Tracking-Secret: $TRACKING_WEBHOOK_SECRET.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.TRACKING_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-tracking-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const admin = createAdminClient();
  const result = await applyTrackingEvent(admin, {
    ...parsed.data,
    occurredAt: parsed.data.occurredAt ?? new Date().toISOString(),
  });
  return NextResponse.json(result);
}
