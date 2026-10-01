/**
 * Kit codes: 7 random characters plus 1 check character, all from the
 * Crockford Base32 alphabet (digits and letters without I, L, O and U, so
 * nothing looks like anything else on a label). Stored upper-case with no
 * dashes, e.g. 7K4M92QX; shown as UT-7K4M-92QX; the QR carries just the code.
 *
 * The check character is Crockford's: the 7-character body read as a base-32
 * number, modulo 37, indexed into the alphabet plus five extra symbols.
 * Codes whose check lands on an extra symbol are never issued, so a printed
 * code only ever uses the 32 clean characters.
 */
export const KIT_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const CHECK_ALPHABET = KIT_CODE_ALPHABET + "*~$=U";
export const KIT_CODE_BODY_LENGTH = 7;
export const KIT_CODE_LENGTH = KIT_CODE_BODY_LENGTH + 1;

/** Crockford decoding: I and L read as 1, O as 0. U is not a kit character. */
function decodeChar(c: string): number {
  if (c === "I" || c === "L") return 1;
  if (c === "O") return 0;
  return KIT_CODE_ALPHABET.indexOf(c);
}

function checkIndex(body: string): number {
  let v = 0;
  for (const c of body) v = (v * 32 + KIT_CODE_ALPHABET.indexOf(c)) % 37;
  return v;
}

/** The check character for a 7-character body, or null when it would be a symbol. */
export function kitCheckChar(body: string): string | null {
  const i = checkIndex(body);
  return i < KIT_CODE_ALPHABET.length ? CHECK_ALPHABET[i] : null;
}

/** A fresh, random, check-digited code. Uniqueness is the database's job. */
export function generateKitCode(): string {
  // Web Crypto, so this runs in Node and the browser alike. 32 divides 256,
  // so masking a byte to 5 bits is uniform over the alphabet.
  const bytes = new Uint8Array(KIT_CODE_BODY_LENGTH);
  for (;;) {
    globalThis.crypto.getRandomValues(bytes);
    let body = "";
    for (const b of bytes) body += KIT_CODE_ALPHABET[b & 31];
    const check = kitCheckChar(body);
    if (check) return body + check;
  }
}

/**
 * Canonical form of whatever was typed or scanned: case, the UT prefix,
 * dashes and spaces are ignored and lookalike letters are read the Crockford
 * way. Returns null unless the result is 8 valid characters whose check
 * character is right, so a typo never reaches the database.
 */
export function normalizeKitCode(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim().toUpperCase().replace(/[\s-]+/g, "");
  if (s.startsWith("UT")) s = s.slice(2);
  if (s.length !== KIT_CODE_LENGTH) return null;
  let canonical = "";
  for (const c of s) {
    const v = decodeChar(c);
    if (v < 0) return null;
    canonical += KIT_CODE_ALPHABET[v];
  }
  const body = canonical.slice(0, KIT_CODE_BODY_LENGTH);
  return kitCheckChar(body) === canonical[KIT_CODE_BODY_LENGTH] ? canonical : null;
}

/** UT-7K4M-92QX, for labels, screens and emails. */
export function formatKitCode(code: string): string {
  return `UT-${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Extracts the kit code from a QR landing path such as "/k/7K4M92QX". */
export function kitCodeFromPath(path: string | null | undefined): string | null {
  if (!path) return null;
  const match = /^\/k\/([^/?#]+)/.exec(path);
  if (!match) return null;
  try {
    return normalizeKitCode(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

/** The URL printed into the QR code. */
export function kitQrUrl(appUrl: string, code: string): string {
  return `${appUrl.replace(/\/+$/, "")}/k/${code}`;
}
