/*
 * Sharing the passport with a clinician: a code that opens a read-only copy
 * for a limited time. The code is the whole credential, so it is 12
 * characters from an alphabet with no look-alikes (60 bits), shown in three
 * groups so it can be read out over the phone or typed from a printout.
 */

export const SHARE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const SHARE_CODE_LENGTH = 12;

export const SHARE_DURATIONS: { days: number; label: string }[] = [
  { days: 1, label: "24 hours" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
];

/** A fresh code from random bytes: one alphabet character per 5 bits. */
export function makeShareCode(randomBytes: (n: number) => Uint8Array): string {
  const bytes = randomBytes(SHARE_CODE_LENGTH);
  let out = "";
  for (let i = 0; i < SHARE_CODE_LENGTH; i++) out += SHARE_ALPHABET[bytes[i] % SHARE_ALPHABET.length];
  return out;
}

/** Upper case with separators dropped. Null when it cannot be a code. */
export function normalizeShareCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned.length !== SHARE_CODE_LENGTH) return null;
  for (const ch of cleaned) if (!SHARE_ALPHABET.includes(ch)) return null;
  return cleaned;
}

/** ABCD-EFGH-JKLM */
export function formatShareCode(code: string): string {
  return code.match(/.{1,4}/g)?.join("-") ?? code;
}

export function shareUrl(appUrl: string, code: string): string {
  return `${appUrl.replace(/\/$/, "")}/passport/${formatShareCode(code)}`;
}

export type ShareRow = {
  id: string;
  code: string;
  label: string | null;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_viewed_at: string | null;
  view_count: number;
};

export type ShareState = "active" | "expired" | "revoked";

export function shareState(share: Pick<ShareRow, "expires_at" | "revoked_at">, now = new Date()): ShareState {
  if (share.revoked_at) return "revoked";
  if (new Date(share.expires_at).getTime() <= now.getTime()) return "expired";
  return "active";
}

export function expiresAtFor(days: number, from = new Date()): string {
  const d = SHARE_DURATIONS.some((o) => o.days === days) ? days : 7;
  return new Date(from.getTime() + d * 86_400_000).toISOString();
}

/** "Valid until 3 November 2026, 2:05pm", the same date and time form as the rest of the app. */
export function formatUntil(iso: string): string {
  const d = new Date(iso);
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
  const [h, m] = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/London" }).split(":").map(Number);
  return `${date}, ${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")}${h < 12 ? "am" : "pm"}`;
}

/** "Expires in 23 hours", "in 41 days", "in 12 minutes". Null once passed. */
export function expiresIn(iso: string, now = new Date()): string | null {
  const ms = new Date(iso).getTime() - now.getTime();
  if (ms <= 0) return null;
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `Expires in ${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.round(ms / 3_600_000);
  if (hours < 48) return `Expires in ${hours} hour${hours === 1 ? "" : "s"}`;
  const days = Math.round(ms / 86_400_000);
  return `Expires in ${days} day${days === 1 ? "" : "s"}`;
}
