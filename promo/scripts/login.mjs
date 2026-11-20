// Signs the demo account in once and saves the browser state for the
// recording scripts. Requests a code on the live sign-in page, then waits for
// the 8-digit code to be dropped into promo/.auth/otp.txt (typed in by hand
// from the email), enters it, and writes promo/.auth/demo.json.
//
//   node promo/scripts/login.mjs
//   echo 12345678 > promo/.auth/otp.txt      (in another shell, when the email arrives)
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PROMO_BASE_URL ?? "https://portal.myutee.co.uk";
const EMAIL = process.env.PROMO_EMAIL ?? "dan+demo@extracted.co.uk";
const AUTH_DIR = path.resolve("promo/.auth");
const OTP_FILE = path.join(AUTH_DIR, "otp.txt");
const STATE = path.join(AUTH_DIR, "demo.json");
const WAIT_MINUTES = Number(process.env.PROMO_OTP_WAIT_MINUTES ?? 55);

fs.mkdirSync(AUTH_DIR, { recursive: true });
if (fs.existsSync(OTP_FILE)) fs.unlinkSync(OTP_FILE);

// The pre-installed Chromium, not Playwright's headless shell (which is not downloaded here).
const EXECUTABLE = process.env.PROMO_CHROME ?? "/opt/pw-browsers/chromium";
const browser = await chromium.launch({ executablePath: EXECUTABLE });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto(`${BASE}/login`);
await page.fill("#login-email", EMAIL);
await page.press("#login-email", "Enter");
await page.waitForSelector("#login-code", { timeout: 30_000 });
console.log(`[login] code requested for ${EMAIL} at ${new Date().toISOString()}; waiting for ${OTP_FILE}`);

const deadline = Date.now() + WAIT_MINUTES * 60_000;
let code = null;
while (Date.now() < deadline) {
  if (fs.existsSync(OTP_FILE)) {
    code = fs.readFileSync(OTP_FILE, "utf8").replace(/\D/g, "");
    if (code.length === 8) break;
  }
  await new Promise((r) => setTimeout(r, 2000));
}
if (!code) {
  console.error("[login] no code arrived in time");
  await browser.close();
  process.exit(1);
}
await page.focus("#login-code");
await page.keyboard.type(code, { delay: 40 });
await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30_000 });
await page.context().storageState({ path: STATE });
fs.unlinkSync(OTP_FILE);
console.log(`[login] signed in, landed on ${page.url()}, state saved to ${STATE}`);
await browser.close();
