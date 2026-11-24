// Quick look at the demo account at phone size, to check the data reads well
// before recording. Writes promo/recordings/shots/<name>.png.
import { chromium } from "playwright";
import fs from "node:fs";

const BASE = process.env.PROMO_BASE_URL ?? "https://portal.myutee.co.uk";
const OUT = "promo/recordings/shots";
fs.mkdirSync(OUT, { recursive: true });

const pages = {
  home: "/portal",
  today: "/portal/passport",
  diary: "/portal/passport/history?view=days",
  history: "/portal/passport/history",
  timeline: "/portal/passport/timeline",
  record: "/portal/passport/record",
  taking: "/portal/passport/record?tab=taking",
  results: "/portal/passport/record?tab=results",
  share: "/portal/passport/share",
  setup: "/portal/passport/setup?mode=utis",
  tests: "/portal/tests",
  kit: "/portal/tests/a0000000-0000-4000-8000-00000000ab17",
};

const browser = await chromium.launch({ executablePath: process.env.PROMO_CHROME ?? "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ storageState: "promo/.auth/demo.json", viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
for (const [name, path] of Object.entries(pages)) {
  try {
    await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 45_000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
    console.log(`${name}: ${page.url()} ${await page.title()}`);
  } catch (e) {
    console.log(`${name}: FAILED ${e.message.split("\n")[0]}`);
  }
}
await browser.close();
