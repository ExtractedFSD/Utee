import localFont from "next/font/local";

/**
 * Brand typefaces, served from the design system's own font files.
 * Cooper Light for headings, Poppins for everything else, see
 * design-system/readme.md. Cooper Black (CTAs in the brand guidelines) has
 * not been supplied, so CTAs use Poppins SemiBold in caps instead.
 */
export const cooper = localFont({
  src: [
    { path: "../../design-system/fonts/CooperLight.ttf", weight: "300", style: "normal" },
    { path: "../../design-system/fonts/CooperLightItalic.ttf", weight: "300", style: "italic" },
  ],
  variable: "--font-cooper",
  display: "swap",
  fallback: ["Georgia", "serif"],
});

export const poppins = localFont({
  src: [
    { path: "../../design-system/fonts/Poppins-Regular.ttf", weight: "400", style: "normal" },
    { path: "../../design-system/fonts/Poppins-SemiBold.ttf", weight: "600", style: "normal" },
    { path: "../../design-system/fonts/Poppins-Bold.ttf", weight: "700", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "sans-serif"],
});
