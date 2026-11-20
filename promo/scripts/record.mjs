// Records each scene of the promo on the live portal at phone size, as the
// demo account, and converts the clips to MP4 for Remotion.
//
//   node promo/scripts/record.mjs            all scenes
//   node promo/scripts/record.mjs today una  just those
//
// Needs promo/.auth/demo.json from scripts/login.mjs. Writes
// promo/public/recordings/<scene>.mp4.
import { chromium } from "playwright";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.PROMO_BASE_URL ?? "https://portal.myutee.co.uk";
const EMAIL = process.env.PROMO_EMAIL ?? "dan+demo@extracted.co.uk";
const KIT_ID = "a0000000-0000-4000-8000-00000000ab17";
const OUT = path.resolve("promo/public/recordings");
const RAW = path.resolve("promo/.auth/raw");
// Playwright pads a mobile recording instead of scaling it, so to get a
// sharp clip the page is zoomed: a 639 px viewport (still under Tailwind's
// sm breakpoint, so the phone layout holds) with CSS zoom so it lays out as
// 390 px wide, recorded 1:1.
// Standalone web-app viewport on an iPhone: 390 x 764 points (852 less the status bar and home indicator).
const PHONE = { width: 390, height: 764 };
const ZOOM = 639 / PHONE.width;
const VIEWPORT = { width: 639, height: Math.round(PHONE.height * ZOOM) };
const OFFSETS_FILE = path.resolve("promo/src/offsets.json");
const offsets = fs.existsSync(OFFSETS_FILE) ? JSON.parse(fs.readFileSync(OFFSETS_FILE, "utf8")) : {};
fs.mkdirSync(OUT, { recursive: true });
fs.rmSync(RAW, { recursive: true, force: true });
fs.mkdirSync(RAW, { recursive: true });

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** A visible fingertip ripple where we tap, so the viewer sees the touch. */
async function tap(page, selector) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  if (!box) throw new Error(`no box for ${selector}`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.evaluate(([x, y, zoom]) => {
    x /= zoom; y /= zoom;
    const d = document.createElement("div");
    d.style.cssText = `position:fixed;left:${x - 22}px;top:${y - 22}px;width:44px;height:44px;border-radius:50%;background:rgba(145,25,59,.35);border:2px solid rgba(255,255,255,.9);pointer-events:none;z-index:99999;transform:scale(.6);opacity:1;transition:transform .35s ease-out,opacity .45s ease-out`;
    document.body.appendChild(d);
    requestAnimationFrame(() => { d.style.transform = "scale(1.4)"; d.style.opacity = "0"; });
    setTimeout(() => d.remove(), 600);
  }, [x, y, ZOOM]);
  await wait(180);
  await page.mouse.click(x, y);
}

/** Scroll the window smoothly to y over ms, like a thumb flick that settles. */
async function scrollTo(page, y, ms = 1200) {
  await page.evaluate(([y, ms]) => new Promise((resolve) => {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    if (y <= 1) y = max * y; else y = Math.min(y, max);
    const start = window.scrollY; const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => { const t = Math.min(1, (now - t0) / ms); window.scrollTo(0, start + (y - start) * ease(t)); if (t < 1) requestAnimationFrame(step); else resolve(); };
    requestAnimationFrame(step);
  }), [y, ms]);
}

async function type(page, selector, text, delay = 55) {
  await page.focus(selector);
  await page.keyboard.type(text, { delay });
}

const scenes = {
  // Fresh context, no sign-in: the real sign-in page, email typed, then the
  // code boxes filling. Seven digits only, so it never submits.
  async login(page) {
    await page.goto(`${BASE}/login`, { waitUntil: "load" });
    await wait(1200);
    await tap(page, "#login-email");
    await type(page, "#login-email", EMAIL, 70);
    await wait(500);
    await page.press("#login-email", "Enter");
    await page.waitForSelector("#login-code", { timeout: 30_000 });
    await wait(1200);
    await page.focus("#login-code");
    await page.keyboard.type("1103247", { delay: 160 });
    await wait(1800);
  },
  async home(page) {
    await page.goto(`${BASE}/portal`, { waitUntil: "load" });
    await wait(1800);
    await scrollTo(page, 0.35, 1400);
    await wait(1500);
    await scrollTo(page, 0, 1000);
    await wait(1200);
  },
  async today(page) {
    await page.goto(`${BASE}/portal/passport`, { waitUntil: "load" });
    await wait(1800);
    // Tap a diary face for today, then look at the streak.
    const faces = page.locator('[data-testid="diary-half"] button');
    if (await faces.count()) await tap(page, '[data-testid="diary-half"] button:nth-child(5)');
    await wait(1600);
    await scrollTo(page, 0.35, 1400);
    await wait(1800);
    await scrollTo(page, 0, 1000);
    await wait(800);
  },
  async una(page) {
    await page.goto(`${BASE}/portal/passport/setup?mode=utis`, { waitUntil: "load" });
    await wait(1800);
    await tap(page, "#guided-input");
    await type(page, "#guided-input", "Started last Tuesday, burning and needing to go all the time. GP gave me nitrofurantoin for 3 days and it cleared up.", 34);
    await wait(500);
    await page.keyboard.press("Enter");
    // Una reads it with the model; wait for the "Reading that..." bubble to go, then let the draft settle.
    await page.waitForSelector("text=Reading that", { timeout: 15_000 }).catch(() => undefined);
    await page.waitForSelector("text=Reading that", { state: "detached", timeout: 60_000 }).catch(() => undefined);
    await wait(800);
    await scrollTo(page, 99999, 900);
    await wait(3500);
  },
  // Record tab: supplements and habits, cultures with sensitivities, scans and
  // bloods. One tap per tab, a short look at each.
  async record(page) {
    await page.goto(`${BASE}/portal/passport/record?tab=taking`, { waitUntil: "load" });
    await wait(2200);
    await scrollTo(page, 0.35, 1200);
    await wait(1400);
    await scrollTo(page, 0, 700);
    await tap(page, "a[role=tab]:has-text('Results')");
    await page.waitForURL(/tab=results/);
    await wait(2400);
    await scrollTo(page, 0.4, 1200);
    await wait(1400);
    await scrollTo(page, 0, 700);
    await tap(page, "a[role=tab]:has-text('Investigations')");
    await page.waitForURL(/tab=investigations/);
    await wait(2400);
    await scrollTo(page, 0.4, 1200);
    await wait(1800);
  },
  async history(page) {
    await page.goto(`${BASE}/portal/passport/history`, { waitUntil: "load" });
    await wait(1800);
    await scrollTo(page, 0.3, 1500);
    await wait(1500);
    await page.goto(`${BASE}/portal/passport/history?view=days`, { waitUntil: "load" });
    await wait(2400);
  },
  async share(page) {
    await page.goto(`${BASE}/portal/passport/share`, { waitUntil: "load" });
    await wait(1600);
    await tap(page, "text=New share code");
    await wait(1400);
    await tap(page, "button:has-text('My GP')");
    await wait(900);
    await tap(page, "input[type=checkbox]");
    await wait(900);
    await tap(page, "button:has-text('Create a share code')");
    await wait(5000);
  },
  async kit(page) {
    await page.goto(`${BASE}/portal/tests/${KIT_ID}`, { waitUntil: "load" });
    await wait(1800);
    await scrollTo(page, 0.25, 1400);
    await wait(1500);
    await scrollTo(page, 0.55, 1600);
    await wait(1500);
  },
};

const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(scenes).filter((k) => k !== "login");
const browser = await chromium.launch({ executablePath: process.env.PROMO_CHROME ?? "/opt/pw-browsers/chromium" });
for (const name of wanted) {
  const run = scenes[name];
  if (!run) { console.log(`unknown scene ${name}`); continue; }
  const dir = path.join(RAW, name);
  fs.mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({
    ...(name === "login" ? {} : { storageState: "promo/.auth/demo.json" }),
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
    colorScheme: "light",
    recordVideo: { dir, size: VIEWPORT },
  });
  const t0 = Date.now();
  const page = await ctx.newPage();
  // Zoom to the phone layout; no focus rings in the recording.
  await page.addInitScript((zoom) => {
    const apply = () => {
      const s = document.createElement("style");
      s.textContent = `html{zoom:${zoom}} *:focus{outline:none!important} input,textarea{caret-color:#91193b}`;
      document.head.appendChild(s);
    };
    if (document.head) apply(); else document.addEventListener("DOMContentLoaded", apply);
  }, ZOOM);
  // Brand pink before the first navigation, so the clip never opens on white.
  await page.setContent('<body style="margin:0;background:linear-gradient(180deg,#fe98cb,#c0507a);height:100vh"></body>');
  const origGoto = page.goto.bind(page);
  let ready = null;
  page.goto = async (...args) => { const r = await origGoto(...args); if (ready === null) ready = (Date.now() - t0) / 1000; return r; };
  try {
    await run(page);
    offsets[name] = Math.round(((ready ?? 0) + 0.15) * 100) / 100;
    console.log(`${name}: recorded ${(Date.now() - t0) / 1000}s, first page ready at ${offsets[name]}s`);
  } catch (e) {
    console.log(`${name}: FAILED ${e.message.split("\n")[0]}`);
  }
  const video = page.video();
  await ctx.close();
  const webm = await video.path();
  const mp4 = path.join(OUT, `${name}.mp4`);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-vf", "fps=30,format=yuv420p", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-movflags", "+faststart", mp4]);
  console.log(`${name}: ${mp4}`);
}
fs.writeFileSync(OFFSETS_FILE, JSON.stringify(offsets, null, 2) + "\n");
await browser.close();
