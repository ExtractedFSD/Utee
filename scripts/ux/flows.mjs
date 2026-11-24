// UX review flow harness: drives the real tasks from the product map as the
// demo account and screenshots every state along the way, at phone (390) and
// desktop (1440) widths, into docs/ux/screenshots/<label>/flows/<width>/.
//
//   node scripts/ux/flows.mjs round-1              all flows, both widths
//   node scripts/ux/flows.mjs round-1 log share    just those flows
//   UX_WIDTHS=phone node scripts/ux/flows.mjs ...  one width
//
// Writes to the demo account only (dan+demo). Each flow cleans up after
// itself where the UI allows; anything left behind is noted in the log.
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.UX_BASE_URL ?? "https://portal.myutee.co.uk";
const STATE = "promo/.auth/demo.json";
const [label = "round-1", ...only] = process.argv.slice(2);
const OUT = path.resolve("docs/ux/screenshots", label, "flows");
const WIDTHS = { phone: { width: 390, height: 844, mobile: true }, desktop: { width: 1440, height: 900, mobile: false } };
const wanted = (process.env.UX_WIDTHS ?? "phone,desktop").split(",");

const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const LONG = "Woke at 3am needing to go, burning most of the day, drank about two litres of water, took paracetamol at lunch and again at 6pm, spoke to the pharmacist who said to call the GP if it is not better by Thursday, feeling a bit shaky and tired but managed work from home. ".repeat(2).trim();

function shooter(page, dir, flow) {
  let n = 0;
  return async (step) => {
    n += 1;
    const file = path.join(dir, `${flow}-${String(n).padStart(2, "0")}-${step}.jpg`);
    try { await page.screenshot({ path: file, fullPage: true, type: "jpeg", quality: 78 }); } catch { /* page gone */ }
    return file;
  };
}

/** Click the first visible element matching one of several role/name options. */
async function clickAny(page, options, { timeout = 4000 } = {}) {
  for (const o of options) {
    const loc = typeof o === "string" ? page.locator(o) : page.getByRole(o.role, { name: o.name, exact: o.exact });
    const first = loc.first();
    if (await first.count() && (await first.isVisible().catch(() => false))) {
      await first.click({ timeout });
      return o;
    }
  }
  throw new Error(`none of ${options.map((o) => (typeof o === "string" ? o : `${o.role}:${o.name}`)).join(" | ")}`);
}

async function openFirstEpisode(page) {
  const card = page.locator('[data-testid="uti-card"]').first();
  const link = card.locator("a").first();
  if (await link.count()) await link.click(); else await card.click();
  await page.waitForURL(/episodes\//, { timeout: 15_000 });
  await wait(800);
}

async function openEpisodeMenu(page) {
  await clickAny(page, [{ role: "button", name: /more|options|menu|actions/i }, 'button:has-text("…")', 'button:has-text("...")', '[aria-haspopup="menu"]']);
  await wait(400);
}

async function deleteOpenEpisode(page, shot) {
  await openEpisodeMenu(page);
  await clickAny(page, [{ role: "menuitem", name: /delete/i }]);
  await wait(500);
  await shot("delete-confirm");
  await clickAny(page, ['[data-testid="confirm-delete"] button:first-of-type', { role: "button", name: /delete/i }]);
  await page.waitForURL((u) => !/episodes\//.test(u.pathname), { timeout: 15_000 }).catch(() => undefined);
  await wait(800);
  await shot("deleted");
}

const flows = {
  // Task 2: log a new infection fast, then end it, change a date, then delete it.
  async log(page, shot) {
    await page.goto(`${BASE}/portal/passport/log`, { waitUntil: "load" });
    await wait(800);
    await shot("empty-form");
    await clickAny(page, [{ role: "button", name: "Yesterday", exact: true }]);
    await wait(300);
    for (const s of [/burning/i, /often/i]) await clickAny(page, [{ role: "button", name: s }]).catch(() => undefined);
    await wait(300);
    await shot("filled");
    await clickAny(page, [{ role: "button", name: /^other/i }]).catch(() => undefined);
    const other = page.getByLabel(/other, describe it/i);
    if (await other.count()) await other.fill("A dull ache low down that comes and goes through the day and is worse when I sit for long");
    await wait(300);
    await shot("other-long");
    await clickAny(page, [{ role: "button", name: /^save/i }]);
    await page.waitForURL(/\/portal\/passport$/, { timeout: 15_000 }).catch(() => undefined);
    await wait(1000);
    await shot("after-save-today");
    await page.goto(`${BASE}/portal/passport/history`, { waitUntil: "load" });
    await wait(800);
    await shot("history-with-new");
    await openFirstEpisode(page);
    await shot("episode");
    await clickAny(page, [{ role: "button", name: /^i feel better/i }]);
    await wait(600);
    await shot("episode-ending");
    await clickAny(page, [{ role: "button", name: /^save$/i }]);
    await wait(1200);
    await shot("episode-ended");
    await openEpisodeMenu(page);
    await shot("episode-menu");
    await clickAny(page, [{ role: "menuitem", name: /change start/i }]).catch(() => undefined);
    await wait(600);
    await shot("change-start-sheet");
    await page.keyboard.press("Escape").catch(() => undefined);
    await clickAny(page, [{ role: "button", name: /cancel|close/i }]).catch(() => undefined);
    await wait(300);
    await deleteOpenEpisode(page, shot);
  },

  // Submitting the log form with nothing filled in: what happens?
  async logEmpty(page, shot) {
    await page.goto(`${BASE}/portal/passport/log`, { waitUntil: "load" });
    await wait(800);
    await clickAny(page, [{ role: "button", name: /^save/i }]);
    await wait(1500);
    await shot("after-empty-submit");
    if (/\/portal\/passport$/.test(page.url())) {
      // It saved an empty UTI. Clean it up.
      await page.goto(`${BASE}/portal/passport/history`, { waitUntil: "load" });
      await wait(600);
      await openFirstEpisode(page);
      await deleteOpenEpisode(page, shot);
    }
  },

  // Task 3: how am I today. Face tap, note with long text.
  async today(page, shot) {
    await page.goto(`${BASE}/portal/passport`, { waitUntil: "load" });
    await wait(900);
    await shot("today");
    const faces = page.locator('[data-testid="diary-half"] button, [data-testid="feeling-strip"] button');
    if (await faces.count()) { await faces.nth(2).click(); await wait(1200); }
    await shot("face-tapped");
    await clickAny(page, [{ role: "button", name: /add a note/i }, { role: "link", name: /add a note/i }]).catch(() => undefined);
    await wait(700);
    await shot("note-sheet");
    const ta = page.locator("textarea").first();
    if (await ta.count()) { await ta.fill(LONG); await wait(300); await shot("note-long"); await clickAny(page, [{ role: "button", name: /^save/i }]).catch(() => undefined); await wait(1200); }
    await shot("note-saved");
    await clickAny(page, [{ role: "link", name: /see my diary/i }]).catch(() => undefined);
    await wait(1000);
    await shot("diary");
  },

  // Task 5: add a culture result, then delete it.
  async result(page, shot) {
    await page.goto(`${BASE}/portal/passport/record?tab=results`, { waitUntil: "load" });
    await wait(800);
    await shot("results");
    await clickAny(page, [{ role: "button", name: /add a result/i }, { role: "link", name: /add a result/i }]);
    await wait(800);
    await shot("add-1");
    // Walk the steps, screenshotting each; pick sensible answers where we can.
    for (let i = 2; i <= 7; i++) {
      await clickAny(page, [{ role: "button", name: /standard culture/i }, { role: "button", name: /bacteria found/i }, { role: "button", name: /^e\. coli/i }, { role: "button", name: /^today$/i }]).catch(() => undefined);
      await wait(300);
      await shot(`add-${i}`);
      const moved = await clickAny(page, [{ role: "button", name: /^(continue|next|save|done|add result|add)$/i }]).catch(() => null);
      await wait(700);
      if (!moved) break;
      if (!(await page.locator('[data-testid^="culture-"]').count())) break;
    }
    await shot("added");
    // Delete the newest culture if an edit/delete affordance exists
    await clickAny(page, [{ role: "button", name: /^edit/i }]).catch(() => undefined);
    await wait(500);
    await clickAny(page, [{ role: "button", name: /^delete/i }]).catch(() => undefined);
    await wait(500);
    await shot("delete-confirm");
    await clickAny(page, ['[data-testid="confirm-delete"] button', { role: "button", name: /yes, delete|delete it|confirm/i }]).catch(() => undefined);
    await wait(900);
    await shot("after-delete");
  },

  // Task 6: add a scan or blood test, then delete it.
  async investigation(page, shot) {
    await page.goto(`${BASE}/portal/passport/record?tab=investigations`, { waitUntil: "load" });
    await wait(800);
    await shot("investigations");
    await clickAny(page, [{ role: "button", name: /add a test or scan/i }, { role: "link", name: /add a test or scan/i }]);
    await wait(800);
    await shot("add-1");
    for (let i = 2; i <= 6; i++) {
      await clickAny(page, [{ role: "button", name: /kidney blood tests/i }, { role: "button", name: /^normal$/i }, { role: "button", name: /^today$/i }]).catch(() => undefined);
      await wait(300);
      await shot(`add-${i}`);
      const moved = await clickAny(page, [{ role: "button", name: /^(continue|next|save|done|add)$/i }]).catch(() => null);
      await wait(700);
      if (!moved) break;
      if (!(await page.locator('[data-testid^="investigation-"]').count())) break;
    }
    await shot("added");
    await clickAny(page, [{ role: "button", name: /^edit/i }]).catch(() => undefined);
    await wait(500);
    await clickAny(page, [{ role: "button", name: /^delete/i }]).catch(() => undefined);
    await wait(500);
    await shot("delete-confirm");
    await clickAny(page, ['[data-testid="confirm-delete"] button', { role: "button", name: /yes, delete|delete it|confirm/i }]).catch(() => undefined);
    await wait(900);
    await shot("after-delete");
  },

  // Task 7: record something I take, mark it stopped.
  async taking(page, shot) {
    await page.goto(`${BASE}/portal/passport/record?tab=taking`, { waitUntil: "load" });
    await wait(800);
    await shot("taking");
    await clickAny(page, [{ role: "button", name: /add something/i }, { role: "link", name: /add something/i }]);
    await wait(800);
    await shot("picker");
    const search = page.locator('[data-testid="prevention-search"] input, input[type="search"]').first();
    if (await search.count()) { await search.fill("vitamin"); await wait(500); await shot("picker-search"); }
    await clickAny(page, [{ role: "button", name: /vitamin c/i }, { role: "checkbox", name: /vitamin c/i }]).catch(() => undefined);
    await wait(400);
    await shot("picked");
    await clickAny(page, [{ role: "button", name: /^(continue|next|save|done|add)$/i }]).catch(() => undefined);
    await wait(800);
    await shot("detail");
    await clickAny(page, [{ role: "button", name: /^(save|done|add)$/i }]).catch(() => undefined);
    await wait(1000);
    await shot("added");
    // Stop it
    const row = page.getByText(/vitamin c/i).first();
    if (await row.count()) {
      await page.getByRole("button", { name: /^edit/i }).last().click().catch(() => undefined);
      await wait(600);
      await shot("edit");
      await clickAny(page, [{ role: "button", name: /stopped|i've stopped|stop/i }]).catch(() => undefined);
      await wait(400);
      await shot("stopped-form");
      await clickAny(page, [{ role: "button", name: /^(save|done)$/i }]).catch(() => undefined);
      await wait(900);
      await shot("stopped");
      await clickAny(page, [{ role: "button", name: /^delete|remove/i }]).catch(() => undefined);
      await wait(400);
      await clickAny(page, ['[data-testid="confirm-delete"] button', { role: "button", name: /yes, delete|delete it|confirm/i }]).catch(() => undefined);
      await wait(800);
      await shot("deleted");
    }
  },

  // Task 9: share with a GP. Error first, then the code, full screen, then remove it.
  async share(page, shot, ctx) {
    await page.goto(`${BASE}/portal/passport/share`, { waitUntil: "load" });
    await wait(800);
    await shot("share");
    await clickAny(page, [{ role: "button", name: /new share code/i }]);
    await wait(700);
    await shot("new-code-sheet");
    await clickAny(page, [{ role: "button", name: /create a share code/i }]);
    await wait(600);
    await shot("create-without-consent");
    await clickAny(page, [{ role: "button", name: /^my gp$/i }]).catch(() => undefined);
    await page.locator("input[type=checkbox]").first().check().catch(() => undefined);
    await clickAny(page, [{ role: "button", name: /create a share code/i }]);
    await wait(1800);
    await shot("created");
    await clickAny(page, [{ role: "button", name: /show full screen/i }]).catch(() => undefined);
    await wait(700);
    await shot("full-screen");
    await page.keyboard.press("Escape").catch(() => undefined);
    await clickAny(page, [{ role: "button", name: /close|done|back/i }]).catch(() => undefined);
    await wait(500);
    // Read the code so a clinician can open it
    const codeText = await page.locator('[data-testid="share-code"]').first().textContent().catch(() => "");
    const code = (codeText ?? "").replace(/[^A-Z0-9]/gi, "");
    // Clinician opens it in a fresh, signed-out context
    const pub = await ctx.browser().newContext({ viewport: page.viewportSize(), isMobile: ctx._options?.isMobile, hasTouch: ctx._options?.hasTouch });
    const cp = await pub.newPage();
    const pshot = shooter(cp, path.dirname((await shot("before-clinician")).toString()), "share-clinician");
    await cp.goto(`${BASE}/passport`, { waitUntil: "load" });
    await cp.fill("input", "AAAA-BBBB-CCCC").catch(() => undefined);
    await cp.keyboard.press("Enter");
    await wait(1500);
    await pshot("wrong-code");
    if (code.length >= 10) {
      await cp.goto(`${BASE}/passport/${code}`, { waitUntil: "load" });
      await wait(1200);
      await pshot("opened");
    }
    await pub.close();
    // Remove the code
    await page.goto(`${BASE}/portal/passport/share`, { waitUntil: "load" });
    await wait(600);
    await clickAny(page, [{ role: "button", name: /more|options|\.\.\.|…/i }]).catch(() => undefined);
    await wait(400);
    await shot("code-menu");
    await clickAny(page, [{ role: "button", name: /remove|revoke|stop sharing/i }, { role: "menuitem", name: /remove|revoke/i }]).catch(() => undefined);
    await wait(500);
    await clickAny(page, [{ role: "button", name: /yes|confirm|remove/i }]).catch(() => undefined);
    await wait(900);
    await shot("removed");
  },

  // Una: open the sheet, say something it will not understand, then something it will.
  async una(page, shot) {
    await page.goto(`${BASE}/portal/passport`, { waitUntil: "load" });
    await wait(800);
    await clickAny(page, [{ role: "button", name: /chat with una/i }, { role: "button", name: /^una$/i }]);
    await wait(900);
    await shot("sheet-open");
    const input = page.locator("#guided-input, textarea").last();
    await input.fill("asdf qwerty zxcv");
    await page.keyboard.press("Enter");
    await wait(6000);
    await shot("not-understood");
    await input.fill("Feeling fine today, no symptoms");
    await page.keyboard.press("Enter");
    await wait(9000);
    await shot("understood");
  },

  // Settings: reminders, data download, delete confirmation (cancelled), consent withdraw and re-consent.
  async settings(page, shot) {
    await page.goto(`${BASE}/portal/passport/settings`, { waitUntil: "load" });
    await wait(800);
    await shot("settings");
    await clickAny(page, [{ role: "button", name: /delete my passport data/i }]).catch(() => undefined);
    await wait(600);
    await shot("delete-confirm");
    await clickAny(page, [{ role: "button", name: /cancel|keep|no/i }]).catch(() => page.keyboard.press("Escape"));
    await wait(400);
    // Withdraw the passport consent, then see the consent screen as a first-timer would
    const toggles = page.getByRole("switch");
    const count = await toggles.count();
    let passportToggle = null;
    for (let i = 0; i < count; i++) {
      const t = toggles.nth(i);
      const name = (await t.getAttribute("aria-label")) ?? (await t.textContent()) ?? "";
      if (/passport entries|storing/i.test(name)) passportToggle = t;
    }
    if (!passportToggle) passportToggle = page.locator('[data-testid="consent-tracker"], label:has-text("Storing") input, label:has-text("Storing") button').first();
    if (await passportToggle.count()) {
      await passportToggle.click().catch(() => undefined);
      await wait(900);
      await shot("consent-withdrawn");
      await page.goto(`${BASE}/portal/passport`, { waitUntil: "load" });
      await wait(900);
      await shot("consent-page");
      await shot("consent-page-top");
      await clickAny(page, [{ role: "button", name: /continue|agree|start|turn on/i }]).catch(() => undefined);
      await wait(600);
      await shot("consent-submit-unticked");
      for (const cb of await page.locator("input[type=checkbox]").all()) await cb.check().catch(() => undefined);
      await clickAny(page, [{ role: "button", name: /continue|agree|start|turn on/i }]).catch(() => undefined);
      await page.waitForLoadState("load");
      await wait(1200);
      await shot("after-reconsent");
    }
  },

  // Slow connection: what does the user see while Today loads?
  async slow(page, shot) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 1500, downloadThroughput: 200 * 1024, uploadThroughput: 100 * 1024 });
    const nav = page.goto(`${BASE}/portal/passport/history`, { waitUntil: "load" }).catch(() => undefined);
    await wait(1200);
    await shot("loading-1s");
    await wait(2500);
    await shot("loading-3s");
    await nav;
    await wait(500);
    await shot("loaded");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  },

  // Sign in: bad email, then a mistyped code's error (needs a sent code, so only the email step here).
  async signin(page, shot) {
    await page.goto(`${BASE}/login`, { waitUntil: "load" });
    await wait(600);
    await shot("email");
    await page.fill("#login-email", "notanemail");
    await page.press("#login-email", "Enter");
    await wait(500);
    await shot("bad-email");
  },
};

const browser = await chromium.launch({ executablePath: process.env.PROMO_CHROME ?? "/opt/pw-browsers/chromium" });
const log = [];
for (const wName of wanted) {
  const w = WIDTHS[wName];
  const dir = path.join(OUT, wName);
  fs.mkdirSync(dir, { recursive: true });
  for (const name of only.length ? only : Object.keys(flows)) {
    const run = flows[name];
    if (!run) { console.log(`unknown flow ${name}`); continue; }
    const ctx = await browser.newContext({ ...(name === "signin" ? {} : { storageState: STATE }), viewport: { width: w.width, height: w.height }, isMobile: w.mobile, hasTouch: w.mobile, colorScheme: "light" });
    ctx._options = { isMobile: w.mobile, hasTouch: w.mobile };
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const shot = shooter(page, dir, name);
    const t0 = Date.now();
    try {
      await run(page, shot, ctx);
      log.push({ width: wName, flow: name, ok: true, seconds: (Date.now() - t0) / 1000, errors });
      console.log(`${wName} ${name}: ok ${(Date.now() - t0) / 1000}s${errors.length ? ` [js errors ${errors.length}]` : ""}`);
    } catch (e) {
      await shot("FAILED").catch(() => undefined);
      log.push({ width: wName, flow: name, ok: false, error: e.message.split("\n")[0], errors });
      console.log(`${wName} ${name}: FAILED ${e.message.split("\n")[0]}`);
    }
    await ctx.close();
  }
}
await browser.close();
fs.writeFileSync(path.join(OUT, "log.json"), JSON.stringify(log, null, 2));
