import type { TrackingEvent } from "@/lib/tracking";

/**
 * TrackShip (trackship.com) tracks parcels for us. At dispatch each Royal
 * Mail tracking number is registered with TrackShip; TrackShip then POSTs
 * status changes to /api/webhooks/trackship, which maps them onto the
 * portal's carrier-agnostic tracking events.
 *
 * Configuration: TRACKSHIP_API_KEY and TRACKSHIP_APP_NAME, plus
 * TRACKING_PROVIDER=trackship. In the TrackShip dashboard, "Connect a
 * Store" > "Tracking API App": the App Name is the app-name header and the
 * Webhook URL is {APP_URL}/api/webhooks/trackship. TrackShip sends the API
 * key back in the trackship-api-key header on every webhook call.
 */
const API_BASE = "https://api.trackship.com/v1";
export const TRACKSHIP_PROVIDER_ROYAL_MAIL = "royal-mail";

export function trackshipEnabled(): boolean {
  return process.env.TRACKING_PROVIDER === "trackship" && !!process.env.TRACKSHIP_API_KEY;
}

function headers() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "trackship-api-key": process.env.TRACKSHIP_API_KEY ?? "",
    "app-name": process.env.TRACKSHIP_APP_NAME ?? "Utee Portal",
  };
}

async function call(path: string, body: Record<string, unknown>): Promise<{ http: number; raw: unknown }> {
  const res = await fetch(`${API_BASE}${path}`, { method: "POST", headers: headers(), body: JSON.stringify(body) });
  const text = await res.text();
  let raw: unknown = text;
  try {
    raw = JSON.parse(text);
  } catch {
    // Not JSON: keep the text for the log.
  }
  return { http: res.status, raw };
}

export type RegisterResult = { ok: true; raw: unknown } | { ok: false; error: string; raw?: unknown };

/**
 * Asks TrackShip to start tracking one parcel. Never throws.
 *
 * Create answers HTTP 200 with status "ok" and a status_msg of
 * pending_trackship when accepted, but also 200 for insufficient_balance
 * and carrier_unsupported, so the message is checked, not just the code.
 * 400s carry plain-English messages (missing field), 401 unauthorized.
 */
export async function registerShipment(input: {
  trackingNumber: string;
  orderRef: string;
  provider?: string;
  destinationCountry?: string;
}): Promise<RegisterResult> {
  try {
    const { http, raw } = await call("/shipment/create/", {
      tracking_number: input.trackingNumber,
      tracking_provider: input.provider ?? TRACKSHIP_PROVIDER_ROYAL_MAIL,
      order_id: input.orderRef,
      destination_country: input.destinationCountry ?? "GB",
    });
    const r = (raw ?? {}) as { status?: string; status_msg?: string; message?: string };
    const msg = r.status_msg ?? r.message ?? `HTTP ${http}`;
    if (http !== 200 || r.status === "error" || msg === "insufficient_balance" || msg === "carrier_unsupported") {
      return { ok: false, error: msg, raw };
    }
    return { ok: true, raw };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Current state of one parcel, in the same shape as the webhook, or null when TrackShip has nothing. */
export async function getShipment(trackingNumber: string, provider = TRACKSHIP_PROVIDER_ROYAL_MAIL): Promise<{ data: unknown | null; error?: string }> {
  try {
    const { http, raw } = await call("/shipment/get/", { tracking_number: trackingNumber, tracking_provider: provider });
    const r = (raw ?? {}) as { status?: string; data?: unknown; message?: string };
    if (http === 200 && r.status === "success" && r.data) return { data: r.data };
    return { data: null, error: r.message ?? `HTTP ${http}` };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : String(err) };
  }
}

/** TrackShip's status vocabulary mapped onto ours; null means nothing to record yet. */
export const TRACKSHIP_STATUSES: Record<string, TrackingEvent["status"] | null> = {
  unknown: null,
  pre_transit: null,
  in_transit: "in_transit",
  out_for_delivery: "out_for_delivery",
  delivered: "delivered",
  available_for_pickup: "in_transit",
  return_to_sender: "exception",
  failure: "exception",
  cancelled: "exception",
};

type RawLocation = { city?: string | null; state?: string | null; country?: string | null; zip?: string | null };
type RawEvent = {
  message?: string | null;
  description?: string | null;
  status?: string | null;
  datetime?: string | null;
  tracking_location?: RawLocation | null;
};

/**
 * TrackShip gives "YYYY-MM-DD HH:MM:SS" with no zone. Royal Mail scans are
 * UK local time, so the value is read as Europe/London and stored as UTC.
 */
export function londonToIso(naive: string | null | undefined): string | null {
  if (!naive) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(naive.trim());
  if (!m) {
    const d = new Date(naive);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const [, y, mo, d, h, mi, s] = m;
  const asUtc = Date.UTC(+y, +mo - 1, +d, +h, +mi, +(s ?? 0));
  // Offset London was on at that moment (0 or 60 minutes), found via Intl.
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", timeZoneName: "longOffset" }).formatToParts(new Date(asUtc));
  const name = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT";
  const off = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  const minutes = off ? (off[1] === "-" ? -1 : 1) * (+off[2] * 60 + +off[3]) : 0;
  return new Date(asUtc - minutes * 60_000).toISOString();
}

export function locationText(loc: RawLocation | null | undefined): string | undefined {
  if (!loc) return undefined;
  const parts = [loc.city, loc.state, loc.country, loc.zip].map((p) => (p ?? "").trim()).filter(Boolean);
  return parts.length ? parts.join(", ") : undefined;
}

/**
 * Turns one TrackShip payload (webhook body, or the data of a get call) into
 * a tracking event, or null when it carries no tracking number or a status
 * we don't record. Events are oldest first, so the latest is the last.
 */
export function trackingEventFromWebhook(body: unknown): { event: TrackingEvent | null; status: string | null; trackingNumber: string | null } {
  if (!body || typeof body !== "object") return { event: null, status: null, trackingNumber: null };
  const b = body as Record<string, unknown>;
  const trackingNumber = typeof b.tracking_number === "string" && b.tracking_number ? b.tracking_number : null;
  if (!trackingNumber) return { event: null, status: null, trackingNumber: null };
  const rawStatus = String(b.tracking_event_status ?? "").toLowerCase().trim();
  const mapped = rawStatus in TRACKSHIP_STATUSES ? TRACKSHIP_STATUSES[rawStatus] : rawStatus ? "in_transit" : null;
  if (!mapped) return { event: null, status: rawStatus || null, trackingNumber };

  const events = (Array.isArray(b.events) ? (b.events as RawEvent[]) : []).filter((e) => e && typeof e === "object");
  const last = events[events.length - 1];
  const description = (last?.message || last?.description || rawStatus.replace(/_/g, " ")).trim();
  const occurredAt = londonToIso(last?.datetime) ?? londonToIso(b.last_event_time as string) ?? new Date().toISOString();
  return {
    event: { trackingNumber, status: mapped, description, occurredAt, location: locationText(last?.tracking_location) },
    status: rawStatus,
    trackingNumber,
  };
}
