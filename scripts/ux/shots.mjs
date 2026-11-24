// UX review screenshot harness. Captures every customer-facing screen of the
// portal as the demo account at phone (390) and desktop (1440) widths, full
// page, into docs/ux/screenshots/<label>/<width>/<name>.jpg.
//
//   node scripts/ux/shots.mjs round-0                 all screens, both widths
//   node scripts/ux/shots.mjs round-1 today history   just those screens
//   UX_BASE_URL=https://utee-xyz.vercel.app node ...  a preview deployment
//
// Signed-in state comes from promo/.auth/demo.json (see promo/scripts/login.mjs).
// Public screens (login, start, shared passport) run in a fresh context.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.UX_BASE_URL ?? "https://portal.myutee.co.uk";
const STATE = "promo/.auth/demo.json";
const KIT_ID = "a0000000-0000-4000-8000-00000000ab17";
const [label = "round-0", ...only] = process.argv.slice(2);
const OUT = path.resolve("docs/ux/screenshots", label);

export const WIDTHS = { phone: { width: 390, height: 844, mobile: true }, desktop: { width: 1440, height: 900, mobile: false } };

/** name → { path, public?, before?(page) } */
export const SCREENS = {
  // Public
  "login": { path: "/login", public: true },
  "login-code": { path: "/login", public: true, before: async (p) => { await p.fill("#login-email", "dan+demo@extracted.co.uk"); /* do not submit: that sends a code */ } },
  "start": { path: "/start", public: true },
  "start-error": { path: "/start", public: true, before: async (p) => { await p.fill("#kit-code", "UT-XXXX"); await p.keyboard.press("Enter"); await p.waitForTimeout(400); } },
  "shared-passport": { path: "/passport", public: true },
  // Portal
  "portal-home": { path: "/portal" },
  "orders": { path: "/portal/orders" },
  "subscriptions": { path: "/portal/subscriptions" },
  "tests": { path: "/portal/tests" },
  "kit": { path: `/portal/tests/${KIT_ID}` },
  // Passport
  "today": { path: "/portal/passport" },
  "log": { path: "/portal/passport/log" },
  "diary": { path: "/portal/passport/diary" },
  "history-utis": { path: "/portal/passport/history" },
  "history-everything": { path: "/portal/passport/history?view=everything" },
  "history-days": { path: "/portal/passport/history?view=days" },
  "record-about": { path: "/portal/passport/record?tab=about" },
  "record-about-step1": { path: "/portal/passport/record?tab=about&step=1" },
  "record-results": { path: "/portal/passport/record?tab=results" },
  "record-investigations": { path: "/portal/passport/record?tab=investigations" },
  "record-taking": { path: "/portal/passport/record?tab=taking" },
  "cultures": { path: "/portal/passport/cultures" },
  "investigations": { path: "/portal/passport/investigations" },
  "prevention": { path: "/portal/passport/prevention" },
  "about-me": { path: "/portal/passport/about-me" },
  "share": { path: "/portal/passport/share" },
  "settings": { path: "/portal/passport/settings" },
  "setup": { path: "/portal/passport/setup" },
  "setup-utis": { path: "/portal/passport/setup?mode=utis" },
  "consent": { path: "/portal/passport/consent" },
  "timeline": { path: "/portal/passport/timeline" },
  "una-sheet": { path: "/portal/passport", before: async (p) => { const una = p.getByRole("link", { name: /una/i }).or(p.getByRole("button", { name: /una/i })); if (await una.count()) { await una.first().click(); await p.waitForTimeout(1200); } } },
};

export async function shoot({ base = BASE, out = OUT, names = Object.keys(SCREENS), widths = WIDTHS } = {}) {
  const browser = await chromium.launch({ executablePath: process.env.PROMO_CHROME ?? "/opt/pw-browsers/chromium" });
  const results = [];
  for (const [wName, w] of Object.entries(widths)) {
    const dir = path.join(out, wName);
    fs.mkdirSync(dir, { recursive: true });
    for (const name of names) {
      const s = SCREENS[name];
      if (!s) { console.log(`unknown screen ${name}`); continue; }
      const ctx = await browser.newContext({
        ...(s.public ? {} : { storageState: STATE }),
        viewport: { width: w.width, height: w.height },
        deviceScaleFactor: 1,
        isMobile: w.mobile,
        hasTouch: w.mobile,
        colorScheme: "light",
      });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      try {
        await page.goto(`${base}${s.path}`, { waitUntil: "load", timeout: 45_000 });
        await page.waitForTimeout(900);
        if (s.before) await s.before(page);
        await page.waitForTimeout(300);
        const file = path.join(dir, `${name}.jpg`);
        await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 80 });
        const title = (await page.title()) || "";
        const url = page.url().replace(base, "");
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        results.push({ width: wName, name, url, title, overflow, errors });
        console.log(`${wName} ${name}: ${url}${overflow ? " [sideways scroll]" : ""}${errors.length ? ` [js errors: ${errors.length}]` : ""}`);
      } catch (e) {
        results.push({ width: wName, name, error: e.message.split("\n")[0] });
        console.log(`${wName} ${name}: FAILED ${e.message.split("\n")[0]}`);
      }
      await ctx.close();
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(out, "index.json"), JSON.stringify(results, null, 2));
  return results;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  await shoot({ names: only.length ? only : Object.keys(SCREENS) });
}
