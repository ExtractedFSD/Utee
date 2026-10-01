import type { TrackingEvent } from "@/lib/tracking";

/**
 * TrackShip (trackship.com) tracks parcels for us. At dispatch each Royal
 * Mail tracking number is registered with TrackShip; TrackShip then POSTs
 * status changes to /api/webhooks/trackship, which maps them onto the
 * portal's carrier-agnostic tracking events.
 *
 * Configuration: TRACKSHIP_API_KEY and TRACKSHIP_APP_NAME, plus
 * TRACKING_PROVIDER=trackship. In the TrackShip dashboard set the webhook
 * URL to {APP_URL}/api/webhooks/trackship?secret={TRACKING_WEBHOOK_SECRET}.
 */
const API_BASE = "https://api.trackship.com/v1";
export const TRACKSHIP_PROVIDER_ROYAL_MAIL = "royal-mail";

export function trackshipEnabled(): boolean {
  return process.env.TRACKING_PROVIDER === "trackship" && !!process.env.TRACKSHIP_API_KEY;
}

function headers() {
  return {
    "Content-Type": "application/json",
    "trackship-api-key": process.env.TRACKSHIP_API_KEY ?? "",
    "app-name": process.env.TRACKSHIP_APP_NAME ?? "Utee Portal",
  };
}

export type RegisterResult = { ok: true; raw: unknown } | { ok: false; error: string; raw?: unknown };

/** Asks TrackShip to start tracking one parcel. Never throws. */
export async function registerShipment(input: {
  trackingNumber: string;
  orderRef: string;
  provider?: string;
}): Promise<RegisterResult> {
  try {
    const res = await fetch(`${API_BASE}/shipment/create`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        tracking_number: input.trackingNumber,
        tracking_provider: input.provider ?? TRACKSHIP_PROVIDER_ROYAL_MAIL,
        order_id: input.orderRef,
        order_number: input.orderRef,
      }),
    });
    const text = await res.text();
    let raw: unknown = text;
    try {
      raw = JSON.parse(text);
    } catch {
      // Not JSON: keep the text for the log.
    }
    const status = (raw as { status?: string } | null)?.status;
    if (!res.ok || (status && status !== "success")) {
      const message = (raw as { message?: string } | null)?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: message, raw };
    }
    return { ok: true, raw };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * TrackShip's status vocabulary mapped onto ours. Statuses that carry no
 * movement (label created, pending) are acknowledged but not recorded.
 */
const STATUS_MAP: Record<string, TrackingEvent["status"] | null> = {
  delivered: "delivered",
  out_for_delivery: "out_for_delivery",
  in_transit: "in_transit",
  available_for_pickup: "in_transit",
  delivery_attempt: "in_transit",
  exception: "exception",
  failure: "exception",
  return_to_sender: "exception",
  on_hold: "exception",
  pre_transit: null,
  pending: null,
  pending_trackship: null,
  unknown: null,
  label_created: null,
};

type RawEvent = { message?: string; description?: string; date?: string; datetime?: string; time?: string; location?: string };

function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") return v as T;
  }
  return undefined;
}

function toIso(value: string | undefined): string {
  if (!value) return new Date().toISOString();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

/**
 * Turns one TrackShip webhook body into a tracking event, or null when the
 * body carries no tracking number or a status we don't record. Field names
 * are read leniently (TrackShip has used a few spellings) and the status is
 * lower-cased.
 */
export function trackingEventFromWebhook(body: unknown): { event: TrackingEvent | null; status: string | null; trackingNumber: string | null } {
  if (!body || typeof body !== "object") return { event: null, status: null, trackingNumber: null };
  const b = body as Record<string, unknown>;
  const trackingNumber = pick<string>(b, "tracking_number", "trackingNumber");
  if (!trackingNumber) return { event: null, status: null, trackingNumber: null };
  const rawStatus = String(pick<string>(b, "tracking_event_status", "shipment_status", "status") ?? "").toLowerCase().trim();
  const mapped = rawStatus in STATUS_MAP ? STATUS_MAP[rawStatus] : rawStatus ? "in_transit" : null;
  if (!mapped) return { event: null, status: rawStatus || null, trackingNumber };

  const events = (pick<RawEvent[]>(b, "tracking_events", "tracking_destination_events", "events") ?? []).filter(
    (e) => e && typeof e === "object"
  );
  const last = events[events.length - 1] ?? events[0];
  const description =
    last?.message ?? last?.description ?? pick<string>(b, "last_event", "status_description") ?? rawStatus.replace(/_/g, " ");
  const occurredAt = toIso(last?.datetime ?? last?.date ?? last?.time ?? pick<string>(b, "last_event_time", "updated_at"));
  return {
    event: { trackingNumber, status: mapped, description, occurredAt, location: last?.location },
    status: rawStatus,
    trackingNumber,
  };
}
