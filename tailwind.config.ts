import type { Config } from "tailwindcss";

/**
 * Utee design system tokens (design-system/tokens/*.css) expressed for
 * Tailwind. The stock palettes the portal was first built with are remapped
 * onto brand tints so every existing utility lands on-brand:
 *   slate   → midnight-tinted neutrals
 *   brand   → pink → maroon
 *   emerald → mint, amber → sun, sky → sky, violet → lavender, rose → peach/maroon
 */
const midnight = "#1d003a";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        midnight,
        pink: { DEFAULT: "#fe98cb", 50: "#ffcce5", 25: "#ffe5f2" },
        maroon: { DEFAULT: "#91193b", 50: "#c88c9d", 25: "#e3c5ce" },
        mint: { DEFAULT: "#c3ffd0", 50: "#e1ffe8" },
        peach: { DEFAULT: "#ef9a98", 50: "#f7cdcb" },
        sky: {
          DEFAULT: "#b3e7fb",
          50: "#d9f3fd",
          100: "#b3e7fb",
          200: "#8fd8f3",
          700: "#175d7a",
          800: "#0f4a63",
        },
        sun: { DEFAULT: "#f9dcbf", 50: "#fcede0" },
        lavender: { DEFAULT: "#ba91d8", 50: "#ddc8ec" },

        brand: {
          50: "#ffe5f2",
          100: "#ffcce5",
          200: "#fe98cb",
          300: "#ea82b1",
          400: "#c0507a",
          500: "#a63354",
          600: "#91193b",
          700: "#7a1432",
          800: "#5e0f27",
          900: "#3a0a1c",
        },
        slate: {
          50: "#faf7fc",
          100: "#f3eef7",
          200: "#e6dfee",
          300: "#cfc4dd",
          400: "#9a8db0",
          500: "#6f6188",
          600: "#4d3f69",
          700: "#382a52",
          800: "#291646",
          900: midnight,
        },
        emerald: {
          50: "#e1ffe8",
          100: "#c3ffd0",
          200: "#9ff0b3",
          700: "#1f6b3a",
          800: "#17512c",
        },
        amber: {
          50: "#fcede0",
          100: "#f9dcbf",
          200: "#f2c9a0",
          700: "#7a4a17",
          800: "#5e3a10",
        },
        violet: {
          50: "#efe6f7",
          100: "#ddc8ec",
          200: "#ba91d8",
          800: "#4b2a70",
        },
        rose: {
          50: "#fbeceb",
          100: "#f7cdcb",
          200: "#f2b3b1",
          600: "#91193b",
          700: "#7a1432",
          800: "#5e0f27",
        },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "ui-sans-serif", "system-ui", "sans-serif"],
        display: ["var(--font-cooper)", "Georgia", "serif"],
      },
      fontSize: {
        eyebrow: ["13px", { lineHeight: "1", letterSpacing: ".14em", fontWeight: "600" }],
      },
      borderRadius: {
        card: "24px",
        device: "32px",
      },
      boxShadow: {
        card: "0 10px 30px rgba(29,0,58,.14)",
        sticker: "inset 0 2px 6px rgba(255,255,255,.5), 0 8px 20px rgba(145,25,59,.35)",
      },
      backgroundImage: {
        "gradient-brand": "linear-gradient(135deg,#f490c0 0%,#962043 100%)",
        "gradient-brand-soft": "linear-gradient(180deg,#fe98cb 0%,#c0507a 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
