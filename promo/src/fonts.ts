import { continueRender, delayRender, staticFile } from "remotion";

/*
 * Brand fonts from the design system, loaded once per render and awaited so
 * no frame is drawn in a fallback face.
 */
const faces = [
  { family: "Cooper", file: "fonts/CooperLight.ttf", weight: "300" },
  { family: "Poppins", file: "fonts/Poppins-Regular.ttf", weight: "400" },
  { family: "Poppins", file: "fonts/Poppins-SemiBold.ttf", weight: "600" },
  { family: "Poppins", file: "fonts/Poppins-Bold.ttf", weight: "700" },
];

let started = false;
export function loadBrandFonts() {
  if (started || typeof document === "undefined") return;
  started = true;
  const handle = delayRender("brand fonts");
  Promise.all(
    faces.map(async (f) => {
      const face = new FontFace(f.family, `url(${staticFile(f.file)})`, { weight: f.weight });
      await face.load();
      (document.fonts as unknown as { add(f: FontFace): void }).add(face);
    })
  )
    .catch(() => undefined)
    .finally(() => continueRender(handle));
}

export const DISPLAY = "Cooper, Georgia, serif";
export const BODY = "Poppins, system-ui, sans-serif";
