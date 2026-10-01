import { describe, expect, it } from "vitest";
import {
  KIT_CODE_ALPHABET,
  formatKitCode,
  generateKitCode,
  kitCheckChar,
  kitCodeFromPath,
  kitQrUrl,
  normalizeKitCode,
} from "./kit-code";

describe("kit codes", () => {
  it("uses the Crockford alphabet without I, L, O or U", () => {
    expect(KIT_CODE_ALPHABET).toHaveLength(32);
    for (const c of "ILOU") expect(KIT_CODE_ALPHABET).not.toContain(c);
  });

  it("generates 8 clean characters with a valid check character", () => {
    for (let i = 0; i < 500; i++) {
      const code = generateKitCode();
      expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
      expect(kitCheckChar(code.slice(0, 7))).toBe(code[7]);
      expect(normalizeKitCode(code)).toBe(code);
    }
  });

  it("is random, not sequential", () => {
    const codes = new Set(Array.from({ length: 200 }, generateKitCode));
    expect(codes.size).toBe(200);
  });

  it("reads typed codes in any form and corrects lookalikes", () => {
    const code = generateKitCode();
    const display = formatKitCode(code);
    expect(display).toMatch(/^UT-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(normalizeKitCode(display)).toBe(code);
    expect(normalizeKitCode(display.toLowerCase())).toBe(code);
    expect(normalizeKitCode(` ut ${code.slice(0, 4)} ${code.slice(4)} `)).toBe(code);
    // A 1 typed as I or L, a 0 typed as O.
    const swapped = code.replace(/1/g, "I").replace(/0/g, "O");
    expect(normalizeKitCode(swapped)).toBe(code);
  });

  it("rejects a typo in the body or the check character", () => {
    const code = generateKitCode();
    const other = KIT_CODE_ALPHABET[(KIT_CODE_ALPHABET.indexOf(code[3]) + 1) % 32];
    expect(normalizeKitCode(code.slice(0, 3) + other + code.slice(4))).toBeNull();
    const badCheck = KIT_CODE_ALPHABET[(KIT_CODE_ALPHABET.indexOf(code[7]) + 1) % 32];
    expect(normalizeKitCode(code.slice(0, 7) + badCheck)).toBeNull();
    expect(normalizeKitCode("UT-7K3F9Q")).toBeNull();
    expect(normalizeKitCode("")).toBeNull();
    expect(normalizeKitCode("UUUUUUUU")).toBeNull();
  });

  it("pulls the code out of a QR landing path", () => {
    const code = generateKitCode();
    expect(kitCodeFromPath(`/k/${code}`)).toBe(code);
    expect(kitCodeFromPath(`/k/${formatKitCode(code)}?x=1`)).toBe(code);
    expect(kitCodeFromPath("/k/nope")).toBeNull();
    expect(kitCodeFromPath("/portal")).toBeNull();
    expect(kitQrUrl("https://portal.myutee.com/", code)).toBe(`https://portal.myutee.com/k/${code}`);
  });
});
