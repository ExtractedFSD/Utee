// Waits until the live Today page renders for the demo account (after a deploy).
import { chromium } from "playwright";
const browser = await chromium.launch({ executablePath: process.env.PROMO_CHROME ?? "/opt/pw-browsers/chromium" });
const ctx = await browser.newContext({ storageState: "promo/.auth/demo.json", viewport: { width: 390, height: 844 } });
const page = await ctx.newPage();
const deadline = Date.now() + 8 * 60_000;
let ok = false;
while (Date.now() < deadline) {
  await page.goto("https://portal.myutee.co.uk/portal/passport", { waitUntil: "load" }).catch(() => undefined);
  const text = await page.textContent("body").catch(() => "");
  if (text && !/Application error/.test(text) && /Today|UTI/.test(text)) { ok = true; break; }
  await new Promise((r) => setTimeout(r, 20_000));
}
console.log(ok ? "[wait] Today renders" : "[wait] gave up");
await browser.close();
process.exit(ok ? 0 : 1);
