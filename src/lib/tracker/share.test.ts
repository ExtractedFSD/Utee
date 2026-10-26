import { describe, expect, it } from "vitest";
import { expiresAtFor, expiresIn, formatShareCode, makeShareCode, normalizeShareCode, shareState, shareUrl, SHARE_ALPHABET } from "./share";

describe("share codes", () => {
  it("makes codes from the safe alphabet only", () => {
    const code = makeShareCode((n) => Uint8Array.from({ length: n }, (_, i) => (i * 37 + 5) % 256));
    expect(code).toHaveLength(12);
    for (const ch of code) expect(SHARE_ALPHABET).toContain(ch);
    expect(code).not.toMatch(/[0O1I]/);
  });
  it("reads a typed or spoken code back, forgiving case, dashes and look-alikes", () => {
    expect(normalizeShareCode("abcd-efgh-jklm")).toBe("ABCDEFGHJKLM");
    expect(normalizeShareCode(" ABCD EFGH JKLM ")).toBe("ABCDEFGHJKLM");
    expect(normalizeShareCode("ABCD-EFGH-JKL")).toBeNull();
    expect(normalizeShareCode("")).toBeNull();
    expect(normalizeShareCode(null)).toBeNull();
    expect(normalizeShareCode("ABCD-EFGH-JKLM-X")).toBeNull();
  });
  it("formats and links", () => {
    expect(formatShareCode("ABCDEFGHJKLM")).toBe("ABCD-EFGH-JKLM");
    expect(shareUrl("https://portal.myutee.co.uk/", "ABCDEFGHJKLM")).toBe("https://portal.myutee.co.uk/passport/ABCD-EFGH-JKLM");
  });
  it("knows when a share is live", () => {
    const now = new Date("2026-11-01T12:00:00Z");
    expect(shareState({ expires_at: "2026-11-08T12:00:00Z", revoked_at: null }, now)).toBe("active");
    expect(shareState({ expires_at: "2026-11-01T11:00:00Z", revoked_at: null }, now)).toBe("expired");
    expect(shareState({ expires_at: "2026-11-08T12:00:00Z", revoked_at: "2026-11-02T00:00:00Z" }, now)).toBe("revoked");
    expect(expiresAtFor(7, now)).toBe("2026-11-08T12:00:00.000Z");
    expect(expiresAtFor(99, now)).toBe("2026-11-08T12:00:00.000Z");
    expect(expiresIn("2026-11-02T11:00:00Z", now)).toBe("Expires in 23 hours");
    expect(expiresIn("2026-12-12T12:00:00Z", now)).toBe("Expires in 41 days");
    expect(expiresIn("2026-11-01T12:12:00Z", now)).toBe("Expires in 12 minutes");
    expect(expiresIn("2026-11-01T11:00:00Z", now)).toBeNull();
  });
});
