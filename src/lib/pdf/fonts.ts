import fs from "node:fs";
import path from "node:path";
import { Font } from "@react-pdf/renderer";

/*
 * Brand typefaces for every PDF the portal renders: Cooper Light for
 * headings, Poppins for text, read from the design system's font files.
 * Registered once per process; built-in faces stand in if a file is missing.
 */

const FONT_DIR = path.join(process.cwd(), "design-system", "fonts");

function fontFile(name: string): string | null {
  const p = path.join(FONT_DIR, name);
  return fs.existsSync(p) ? p : null;
}

let registered: { display: string; body: string } | null = null;

export function brandFonts(): { display: string; body: string } {
  if (registered) return registered;
  const cooperLight = fontFile("CooperLight.ttf");
  const poppinsRegular = fontFile("Poppins-Regular.ttf");
  const poppinsSemi = fontFile("Poppins-SemiBold.ttf");
  const poppinsBold = fontFile("Poppins-Bold.ttf");
  if (cooperLight) Font.register({ family: "Cooper", fonts: [{ src: cooperLight, fontWeight: 300 }] });
  if (poppinsRegular) {
    Font.register({
      family: "Poppins",
      fonts: [
        { src: poppinsRegular, fontWeight: 400 },
        ...(poppinsSemi ? [{ src: poppinsSemi, fontWeight: 600 }] : []),
        ...(poppinsBold ? [{ src: poppinsBold, fontWeight: 700 }] : []),
      ],
    });
  }
  Font.registerHyphenationCallback((word) => [word]);
  registered = { display: cooperLight ? "Cooper" : "Times-Roman", body: poppinsRegular ? "Poppins" : "Helvetica" };
  return registered;
}

export const PDF_COLOURS = {
  midnight: "#1d003a",
  maroon: "#91193b",
  pink: "#fe98cb",
  pink50: "#ffcce5",
  pink25: "#ffe5f2",
  mint50: "#e1ffe8",
  sun50: "#fcede0",
  ink: "#382a52",
  muted: "#6f6188",
  faint: "#9a8db0",
  line: "#e6dfee",
  white: "#ffffff",
};

export function readPublicAsset(file: string): Buffer | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), "public", file));
  } catch {
    return null;
  }
}
