import { test, expect } from "@playwright/test";
import { admin, anonClient, BASE_URL, createUser, emailFor, insertKit, loginAs, loginViaUi, registerUser, sessionFor } from "./helpers";

const SUPABASE_HOST = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;
const PHONE = { width: 390, height: 844 };

/**
 * The tracker end to end on a phone: sign up with no purchase, consent,
 * about me, log a UTI, red flag, treatment, test, close, history, PDF,
 * export, delete. Plus: no third-party hosts, and no cross-user access.
 */
test("tracker: sign up to GP summary on a phone", async ({ browser }) => {
  const email = emailFor("tracker");
  const ctx = await browser.newContext({ viewport: PHONE });
  const page = await ctx.newPage();
  const hosts = new Set<string>();
  page.on("request", (r) => hosts.add(new URL(r.url()).host));

  await test.step("Anyone can create an account", async () => {
    await loginViaUi(page, email, "/portal/tracker", { name: "Tracker Tester" });
    await expect(page).toHaveURL(/\/portal\/tracker\/consent/);
    const { data: profile } = await admin().from("profiles").select("id, full_name, date_of_birth").eq("email", email).single();
    expect(profile?.full_name).toBe("Tracker Tester");
    expect(profile?.date_of_birth).toBe("1990-05-14");
    registerUser(profile!.id);
  });

  await test.step("Consent is explicit, separate and versioned", async () => {
    await page.getByRole("button", { name: "Start tracking" }).click();
    await expect(page.getByText(/Tick the first box/)).toBeVisible();
    await page.getByLabel(/I agree to Utee storing my tracker entries/).check();
    await page.getByRole("button", { name: "Start tracking" }).click();
    await expect(page).toHaveURL(/\/portal\/tracker\/setup/);
    const { data: consents } = await admin().from("tracker_consents").select("kind, consent_version, consent_text").eq("user_id", (await admin().from("profiles").select("id").eq("email", email).single()).data!.id);
    expect(consents?.map((c) => c.kind)).toEqual(["tracker"]);
    expect(consents?.[0].consent_version).toBeTruthy();
    expect(consents?.[0].consent_text.length).toBeGreaterThan(50);
  });

  await test.step("Guided setup: Una asks, a typed answer fills the overview, nothing saved until Save", async () => {
    const chat = page.getByTestId("guided-chat");
    const chips = page.getByTestId("chat-chips");
    const input = page.getByPlaceholder("Type here...");
    await expect(chat).toHaveAttribute("data-hydrated", "true");
    await expect(chat).toContainText("Are you before, around or after the menopause?");
    await input.fill("I'm post menopause, no contraception, not pregnant");
    await page.getByRole("button", { name: "Send" }).click();
    const overview = page.getByTestId("chat-overview").last();
    await expect(overview).toContainText("Menopause: After menopause");
    await expect(overview).toContainText("Contraception: None");
    await expect(overview).toContainText("Pregnant or trying: No");
    const { data: before } = await admin().from("tracker_profiles").select("user_id").eq("user_id", (await admin().from("profiles").select("id").eq("email", email).single()).data!.id);
    expect(before).toHaveLength(0);
    await chips.getByRole("button", { name: "Save", exact: true }).click();
    await expect(chat).toContainText("Saved. Thank you.");
    await expect(chat).toContainText("Do you take anything to help prevent UTIs?");
    await input.fill("I take D-mannose and vaginal oestrogen and a probiotic");
    await page.getByRole("button", { name: "Send" }).click();
    const prevOverview = page.getByTestId("chat-overview").last();
    await expect(prevOverview).toContainText("Adding:");
    await expect(prevOverview).toContainText("D-mannose");
    await expect(prevOverview).toContainText("Vaginal oestrogen");
    await expect(prevOverview).toContainText("Probiotics");
    await chips.getByRole("button", { name: "Save", exact: true }).click();
    await expect(chat).toContainText("Saved 3 things to what you're taking.");
    await expect(chat).toContainText("Now your UTIs");
    await input.fill("none yet");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(chat).toContainText("All set. Your tracker is ready.");
    await page.getByTestId("guided-done").getByRole("link", { name: "Go to my tracker" }).click();
    await expect(page).toHaveURL(/\/portal\/tracker$/);
    const card = page.getByTestId("prevention-card");
    await expect(card).toContainText("D-mannose");
    await expect(card).toContainText("Vaginal oestrogen");
    await expect(card).toContainText("Probiotics");
  });

  await test.step("What I'm taking: rate, stop, and the history is kept", async () => {
    await page.getByTestId("prevention-card").getByRole("link", { name: "Manage" }).click();
    await expect(page).toHaveURL(/\/portal\/tracker\/prevention$/);
    const current = page.getByTestId("prevention-current");
    await current.getByRole("button", { name: /^D-mannose/ }).click();
    const sheet = page.getByTestId("sheet-prevention");
    await sheet.getByRole("radio", { name: "Yes" }).or(sheet.getByRole("button", { name: "Yes", exact: true })).first().click();
    await sheet.getByRole("button", { name: "Done" }).click();
    await expect(current.getByRole("button", { name: /^D-mannose/ })).toContainText("Is it helping? Yes");
    await current.getByRole("button", { name: /^Probiotics/ }).click();
    await sheet.getByRole("button", { name: "I've stopped this" }).click();
    await expect(page.getByTestId("prevention-past")).toContainText("Probiotics");
    await expect(current).not.toContainText("Probiotics");
    await current.getByRole("button", { name: "Add something" }).click();
    const add = page.getByTestId("sheet-add-prevention");
    await add.getByTestId("prevention-search").fill("mannose");
    await expect(add.getByTestId("prevention-results").getByRole("button", { name: "D-mannose" })).toHaveCount(0);
    await add.getByTestId("prevention-search").fill("phappi");
    await add.getByTestId("prevention-results").getByRole("button", { name: "P Happi spray" }).click();
    await add.getByRole("button", { name: "Add", exact: true }).click();
    await expect(current).toContainText("P Happi spray");
    await page.goto("/portal/tracker");
    await expect(page.getByTestId("prevention-card")).toContainText("D-mannose · helps");
    await expect(page.getByTestId("prevention-card")).not.toContainText("Probiotics");
  });

  let episodeUrl = "";
  await test.step("Log a UTI in a few taps; no red flag for ordinary symptoms", async () => {
    await page.getByRole("link", { name: "Log your first UTI" }).click();
    await page.getByRole("button", { name: "Yesterday" }).click();
    await page.getByRole("button", { name: "Burning or stinging when peeing" }).click();
    await page.getByRole("button", { name: "Needing to pee more often" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/portal\/tracker\/episodes\//);
    episodeUrl = page.url();
    await expect(page.getByTestId("red-flag")).toHaveCount(0);
  });

  await test.step("Layout: primary action visible on load, Day shown once, nothing expanded", async () => {
    const better = page.getByRole("button", { name: "I feel better" });
    await expect(better).toBeVisible();
    const box = await better.boundingBox();
    expect(box && box.y + box.height <= PHONE.height, "I feel better is inside the first screen").toBe(true);
    expect(await page.getByText(/Day \d+/).count()).toBe(1);
    expect(await page.getByRole("dialog").count()).toBe(0);
    await expect(page.getByTestId("today-card")).toBeVisible();
    // Feeling faces carry text labels for screen readers.
    await expect(page.getByRole("radio", { name: "Great" })).toBeVisible();
  });

  await test.step("A red-flag symptom shows the safety banner inside the Today card; removing it hides it", async () => {
    await page.getByRole("button", { name: "Blood in urine" }).click();
    await expect(page.getByTestId("today-card").getByTestId("red-flag")).toBeVisible();
    await expect(page.getByTestId("red-flag")).toContainText("111");
    await expect(page.getByText("Saved")).toBeVisible();
    await page.getByRole("button", { name: "Blood in urine" }).click();
    await expect(page.getByTestId("red-flag")).toHaveCount(0);
  });

  await test.step("About this UTI: add a trigger, a treatment from the picker, and a test", async () => {
    const about = page.getByTestId("about-card");
    await about.getByRole("button", { name: /Possible triggers/ }).click();
    const triggers = page.getByTestId("sheet-triggers");
    await triggers.getByRole("button", { name: "Sex", exact: true }).click();
    await expect(triggers.getByRole("button", { name: "Sex", exact: true })).toHaveAttribute("aria-pressed", "true");
    await triggers.getByRole("button", { name: "Done" }).click();
    await expect(about.getByRole("button", { name: /Possible triggers/ })).toContainText("Sex");

    await about.getByRole("button", { name: /^Treatment/ }).click();
    const treat = page.getByTestId("sheet-treatment");
    await treat.getByRole("button", { name: "Add an antibiotic" }).click();
    await expect(treat.getByLabel("Search by name or brand")).toBeFocused();
    await treat.getByLabel("Search by name or brand").fill("macrob");
    await treat.getByRole("option", { name: "Macrobid (nitrofurantoin)" }).click();
    await treat.getByRole("button", { name: "3 days" }).click();
    await treat.getByRole("button", { name: "GP", exact: true }).click();
    await treat.getByRole("button", { name: "Add", exact: true }).click();
    await expect(treat.getByText(/We'll ask how it went on/)).toBeVisible();
    // The antibiotic's name appears exactly once while the sheet is open.
    expect(await page.getByText("Nitrofurantoin", { exact: true }).count()).toBe(1);
    await treat.getByRole("button", { name: "Done" }).click();
    await expect(about.getByRole("button", { name: /^Treatment/ })).toContainText("Nitrofurantoin · 3 days");
    expect(await page.getByText(/Nitrofurantoin/).count()).toBe(1);

    await about.getByRole("button", { name: /^Tests/ }).click();
    const tests = page.getByTestId("sheet-tests");
    await tests.getByRole("button", { name: "Add a test" }).click();
    await tests.getByRole("button", { name: "Dipstick at home" }).click();
    await tests.getByRole("button", { name: "Positive" }).click();
    await tests.getByRole("button", { name: "Add", exact: true }).click();
    await expect(tests.getByText(/Dipstick at home/)).toBeVisible();
    await tests.getByRole("button", { name: "Done" }).click();
    await expect(about.getByRole("button", { name: /^Tests/ })).toContainText("Dipstick at home · Positive");
  });

  await test.step("Feeling scale is one tap", async () => {
    await page.getByRole("radio", { name: "Good" }).click();
    await expect(page.getByRole("radio", { name: "Good" })).toHaveAttribute("aria-checked", "true");
  });

  await test.step("Dashboard while open: Edit today once logged, Day card and 12 months card are links", async () => {
    await page.goto("/portal/tracker");
    const openCard = page.getByTestId("open-episode-card");
    await expect(openCard.getByRole("link", { name: "Edit today" })).toBeVisible();
    await expect(openCard.getByRole("link", { name: "Log today" })).toHaveCount(0);
    await openCard.getByRole("link", { name: "Open this UTI" }).click();
    await expect(page).toHaveURL(/\/portal\/tracker\/episodes\//);
    await page.goto("/portal/tracker");
    await page.getByTestId("last-year-card").getByRole("link", { name: "See full history" }).click();
    await expect(page).toHaveURL(/\/portal\/tracker\/history$/);
    await page.goBack();
    await openCard.getByRole("link", { name: "Edit today" }).click();
    await expect(page).toHaveURL(/\/portal\/tracker\/episodes\//);
    await expect(page.getByTestId("today-card")).toBeVisible();
  });

  await test.step("I feel better: close the episode and rate the antibiotic", async () => {
    await page.getByRole("button", { name: "I feel better" }).click();
    const panel = page.getByTestId("close-panel");
    await panel.getByRole("button", { name: "Yes", exact: true }).click();
    await panel.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/^Ended /)).toBeVisible();
    await expect(page.getByRole("button", { name: "Reopen" })).toBeVisible();
  });

  await test.step("Dashboard and history reflect it as facts", async () => {
    await page.goto("/portal/tracker");
    await expect(page.getByText(/last UTI ended/)).toBeVisible();
    await expect(page.getByText("UTIs, 12 months")).toBeVisible();
    await page.goto("/portal/tracker/history");
    await expect(page.getByText("Nitrofurantoin").first()).toBeVisible();
    await expect(page.getByText("Sex", { exact: true }).first()).toBeVisible();
    expect(await page.content()).not.toMatch(/recurrent/i);
  });

  await test.step("GP summary PDF and exports", async () => {
    const pdf = await page.request.get("/portal/tracker/summary?notes=1");
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("application/pdf");
    expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");

    const json = await page.request.get("/portal/tracker/export?format=json");
    const body = await json.json();
    expect(body.episodes).toHaveLength(1);
    expect(body.treatments[0].antibiotic_id).toBe("nitrofurantoin");
    expect(body.preventions.map((p: { option_key: string }) => p.option_key).sort()).toEqual(["d_mannose", "p_happi", "probiotics", "vaginal_oestrogen"]);
    expect(body.preventions.find((p: { option_key: string }) => p.option_key === "probiotics").stopped_on).toBeTruthy();
    expect(body.treatments[0].worked).toBe("yes");
    expect(body.account.date_of_birth).toBe("1990-05-14");
    expect(body.profile.age_band).toBe("35_44");

    const csv = await page.request.get("/portal/tracker/export?format=csv");
    const text = await csv.text();
    expect(text).toContain("# episodes");
    expect(text).toContain("nitrofurantoin");
  });

  await test.step("Only the portal and Supabase were contacted", async () => {
    const allowed = new Set([new URL(BASE_URL).host, SUPABASE_HOST]);
    const others = [...hosts].filter((h) => !allowed.has(h));
    expect(others, `unexpected hosts: ${others.join(", ")}`).toEqual([]);
  });

  await test.step("Another user cannot see this episode", async () => {
    const other = await createUser("customer", "tracker-other");
    const octx = await browser.newContext();
    await loginAs(octx, other.email);
    const opage = await octx.newPage();
    const res = await opage.goto(episodeUrl);
    expect([404, 200]).toContain(res!.status());
    expect(await opage.content()).not.toContain("Nitrofurantoin");
    // Direct database read with the other user's session returns nothing.
    const session = await sessionFor(other.email);
    const client = anonClient();
    await client.auth.setSession({ access_token: session.access_token, refresh_token: session.refresh_token });
    const { data: leaked } = await client.from("tracker_episodes").select("id");
    expect(leaked ?? []).toHaveLength(0);
    const { data: leakedTreat } = await client.from("tracker_treatments").select("id");
    expect(leakedTreat ?? []).toHaveLength(0);
    await octx.close();
  });

  await test.step("A past UTI is logged as one summary, not a daily check-in", async () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 86_400_000).toISOString().slice(0, 10);
    const fiveDaysAgo = new Date(Date.now() - 5 * 86_400_000).toISOString().slice(0, 10);
    await page.goto("/portal/tracker/log");
    await expect(page.getByTestId("still-going")).toHaveCount(0);
    await page.getByTestId("start-date").getByRole("button", { name: "Earlier" }).click();
    await page.getByTestId("start-date").getByLabel("When did it start?").fill(tenDaysAgo);
    await expect(page.getByText("What are you noticing?")).toBeVisible();
    await page.getByTestId("still-going").getByRole("button", { name: "It's over" }).click();
    await expect(page.getByText("What did you notice?")).toBeVisible();
    await page.getByTestId("end-date").getByRole("button", { name: "Earlier" }).click();
    await page.getByTestId("end-date").getByLabel("When did it end?").fill(fiveDaysAgo);
    await page.getByRole("button", { name: "Burning or stinging when peeing" }).click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/portal\/tracker\/episodes\//);
    await expect(page.getByText(/^Ended /)).toBeVisible();
    await expect(page.getByTestId("today-card")).toHaveCount(0);
    const about = page.getByTestId("about-card");
    await expect(about.getByRole("button", { name: /^What you noticed/ })).toContainText("Burning or stinging when peeing");
    await about.getByRole("button", { name: /^What you noticed/ }).click();
    await page.getByTestId("sheet-symptoms").getByRole("button", { name: "Needing to pee more often" }).click();
    await page.getByTestId("sheet-symptoms").getByRole("button", { name: "Done" }).click();
    await expect(about.getByRole("button", { name: /^What you noticed/ })).toContainText("Needing to pee more often");
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Delete this UTI" }).click();
    await page.getByRole("button", { name: "Yes, delete it" }).click();
    await expect(page).toHaveURL(/\/portal\/tracker\/history/);
  });

  await test.step("Delete is only reachable via the menu, with confirmation", async () => {
    await page.goto("/portal/tracker/log");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page).toHaveURL(/\/portal\/tracker\/episodes\//);
    expect(await page.getByRole("button", { name: "Delete this UTI" }).count()).toBe(0);
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Delete this UTI" }).click();
    await expect(page.getByTestId("confirm-delete")).toBeVisible();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByTestId("confirm-delete")).toHaveCount(0);
    await page.getByRole("button", { name: "More actions" }).click();
    await page.getByRole("menuitem", { name: "Delete this UTI" }).click();
    await page.getByRole("button", { name: "Yes, delete it" }).click();
    await expect(page).toHaveURL(/\/portal\/tracker\/history/);
    const json = await page.request.get("/portal/tracker/export?format=json");
    expect((await json.json()).episodes).toHaveLength(1);
  });

  await test.step("Delete removes everything and leaves an audit row", async () => {
    const { data: me } = await admin().from("profiles").select("id").eq("email", email).single();
    await page.goto("/portal/tracker/settings");
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page.getByRole("button", { name: "Delete everything" }).click();
    await expect(page).toHaveURL(/\/portal\?tracker=deleted/);
    for (const table of ["tracker_episodes", "tracker_symptoms", "tracker_treatments", "tracker_tests", "tracker_checkins", "tracker_preventions", "tracker_chats", "tracker_consents", "tracker_profiles"]) {
      const { count } = await admin().from(table).select("*", { count: "exact", head: true }).eq("user_id", me!.id);
      expect(count, table).toBe(0);
    }
    const { data: log } = await admin().from("tracker_audit_log").select("action").eq("user_id", me!.id);
    expect(log?.map((l) => l.action)).toContain("tracker_data_deleted");
    expect(log?.map((l) => l.action)).toContain("data_exported");
    await page.goto("/portal/tracker");
    await expect(page).toHaveURL(/\/portal\/tracker\/consent/);
  });

  await ctx.close();
});

test("tracker: a Utee test links without re-entry", async ({ browser }) => {
  const user = await createUser("customer", "tracker-kit");
  const kit = await insertKit();
  await admin().from("kits").update({ customer_id: user.id, status: "lab_complete" }).eq("id", kit.id);
  const ctx = await browser.newContext({ viewport: PHONE });
  await loginAs(ctx, user.email);
  const page = await ctx.newPage();
  await page.goto("/portal/tracker/consent");
  await page.getByLabel(/I agree to Utee storing/).check();
  await page.getByRole("button", { name: "Start tracking" }).click();
  await page.getByRole("link", { name: "Prefer a form?" }).click();
  await expect(page).toHaveURL(/\/portal\/tracker\/about-me/);
  const pregnant = page.getByRole("radiogroup", { name: "pregnant_or_trying" }).getByRole("button", { name: "Yes", exact: true });
  await pregnant.click();
  await expect(pregnant).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText(`Kit ${kit.code}`)).toBeVisible();

  await page.getByRole("link", { name: "Log your first UTI" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  // Pregnancy answer alone shows the banner with its own wording.
  await expect(page.getByTestId("red-flag")).toContainText("midwife");
  await page.getByTestId("about-card").getByRole("button", { name: /^Tests/ }).click();
  const tests = page.getByTestId("sheet-tests");
  await tests.getByRole("button", { name: "Add a test" }).click();
  await tests.getByRole("button", { name: "Utee test" }).click();
  await tests.getByRole("button", { name: `Kit ${kit.code}` }).click();
  await tests.getByRole("button", { name: "Add", exact: true }).click();
  await expect(tests.getByText("Linked to your Utee test in the portal.")).toBeVisible();
  await expect(tests.getByText("Lab analysis complete")).toBeVisible();
  const pdf = await page.request.get("/portal/tracker/summary");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await ctx.close();
});

test("tracker: guided quick add saves two UTIs from one message", async ({ browser }) => {
  const user = await createUser("customer", "tracker-guided");
  const ctx = await browser.newContext({ viewport: PHONE });
  await loginAs(ctx, user.email);
  const page = await ctx.newPage();
  await page.goto("/portal/tracker/consent");
  await page.getByLabel(/I agree to Utee storing/).check();
  await page.getByRole("button", { name: "Start tracking" }).click();
  await expect(page).toHaveURL(/\/portal\/tracker\/setup/);
  const chat = page.getByTestId("guided-chat");
  const chips = page.getByTestId("chat-chips");
  const input = page.getByPlaceholder("Type here...");
  const overview = () => page.getByTestId("chat-overview").last();
  // Option chips sit behind "Let me pick" so the chat stays clean.
  const pick = async (name: string | RegExp, exact = false) => {
    await page.getByTestId("let-me-pick").click();
    await chips.getByRole("button", { name, exact }).click();
  };
  await expect(chat).toHaveAttribute("data-hydrated", "true");

  // About you, one question at a time by tapping.
  await pick("Prefer not to say");
  await expect(chat).toContainText("Do you use contraception?");
  await pick("Prefer not to say");
  await expect(chat).toContainText("pregnant or trying?");
  await pick("Prefer not to say");
  await expect(overview()).toContainText("Menopause: Prefer not to say");
  await chips.getByRole("button", { name: "Save", exact: true }).click();
  await expect(chat).toContainText("Saved. Thank you.");
  await pick("Nothing", true);
  await expect(overview()).toContainText("No changes");
  await chips.getByRole("button", { name: "Save", exact: true }).click();
  await expect(chat).toContainText("Now your UTIs");

  // Two UTIs in one message. Una asks only for what is missing, then shows an overview.
  await input.fill("One started 3 weeks ago and lasted 5 days, burning and needing to go a lot, nitrofurantoin from the GP for 3 days which helped. Another one 10 days ago, urgency and cloudy, still going");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(chat).toContainText("I picked up 2 UTIs");
  await expect(chat).toContainText("Anything that might have set it off?");
  await expect(page.getByTestId("chat-chips")).toHaveCount(0);
  await input.fill("I think it might have been my shower gel");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(chat).toContainText("Did you have a test for it?");
  await pick("No test");
  await expect(overview()).toContainText("Possible triggers: Shower gel");
  await expect(overview()).toContainText("Nitrofurantoin · 3 days · GP · helped: yes");
  await expect(overview()).toContainText("Noticed: Burning or stinging when peeing, Needing to pee more often");
  await chips.getByRole("button", { name: "Save", exact: true }).click();
  await expect(chat).toContainText("Saved the UTI from");
  // Second one: no antibiotic yet, so she asks; a typed answer fills it, then how it went, then tests.
  await expect(chat).toContainText("Anything that might have set it off?");
  await pick("Skip");
  await expect(chat).toContainText("Did you take anything for it");
  await input.fill("trimethoprim for 3 days from the pharmacy");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(chat).toContainText("Did the Trimethoprim help?");
  await pick("Too early to say");
  await expect(chat).toContainText("Did you have a test for it?");
  await pick("Dipstick at GP or pharmacy");
  await expect(overview()).toContainText("Still going");
  await expect(overview()).toContainText("Trimethoprim · 3 days · Pharmacy · helped: too early to say");
  await expect(overview()).toContainText("Tests: Dipstick at GP or pharmacy");
  await chips.getByRole("button", { name: "Save", exact: true }).click();
  await expect(chat).toContainText("Another UTI to add?");
  await chips.getByRole("button", { name: "That's all" }).click();
  await expect(chat).toContainText("All set. Your tracker is ready.");
  await page.getByTestId("guided-done").getByRole("link", { name: "See my history" }).click();
  await expect(page).toHaveURL(/\/portal\/tracker\/history/);
  const json = await page.request.get("/portal/tracker/export?format=json");
  const body = await json.json();
  expect(body.episodes).toHaveLength(2);
  expect(body.episodes.filter((e: { ended_on: string | null }) => e.ended_on === null)).toHaveLength(1);
  expect(body.treatments).toHaveLength(2);
  expect(body.treatments.find((t: { antibiotic_id: string }) => t.antibiotic_id === "nitrofurantoin")).toMatchObject({ days: 3, source: "gp", worked: "yes" });
  expect(body.treatments.find((t: { antibiotic_id: string }) => t.antibiotic_id === "trimethoprim")).toMatchObject({ days: 3, source: "pharmacy", worked: "too_early" });
  expect(body.tests).toHaveLength(1);
  expect(body.tests[0].kind).toBe("dipstick_gp_pharmacy");
  expect(body.symptoms.map((s: { symptom: string }) => s.symptom).sort()).toEqual(["burning", "cloudy", "frequency", "urgency"]);
  expect(body.triggers).toHaveLength(1);
  expect(body.triggers[0]).toMatchObject({ trigger: "other", other_text: "Shower gel" });

  // Updating what they take by chat: add two, then stop one and start another.
  await page.goto("/portal/tracker/prevention");
  await page.getByRole("link", { name: "Update by chat" }).click();
  await expect(chat).toHaveAttribute("data-hydrated", "true");
  await expect(chat).toContainText("has anything stopped?");
  await input.fill("I've started D-mannose and cranberry");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(overview()).toContainText("Adding: D-mannose, Cranberry (juice, tablets or capsules)");
  await chips.getByRole("button", { name: "Save", exact: true }).click();
  await expect(chat).toContainText("Added 2.");
  await expect(chat).toContainText("Any UTIs to add?");
  await chips.getByRole("button", { name: "No, I'm done" }).click();
  await expect(page.getByTestId("guided-done")).toBeVisible();

  await page.goto("/portal/tracker/setup?mode=prevention");
  await expect(chat).toHaveAttribute("data-hydrated", "true");
  await input.fill("I've stopped the cranberry and started probiotics");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(overview()).toContainText("Adding: Probiotics");
  await expect(overview()).toContainText("Stopping: Cranberry (juice, tablets or capsules)");
  await chips.getByRole("button", { name: "Save", exact: true }).click();
  await expect(chat).toContainText("Added 1 and stopped 1.");
  await chips.getByRole("button", { name: "No, I'm done" }).click();
  const after = await (await page.request.get("/portal/tracker/export?format=json")).json();
  expect(after.preventions.find((p: { option_key: string }) => p.option_key === "cranberry").stopped_on).toBeTruthy();
  expect(after.preventions.filter((p: { stopped_on: string | null }) => !p.stopped_on).map((p: { option_key: string }) => p.option_key).sort()).toEqual(["d_mannose", "probiotics"]);

  // Quick UTI mode asks about what they take once the UTIs are done.
  await page.goto("/portal/tracker/setup?mode=utis");
  await expect(chat).toHaveAttribute("data-hydrated", "true");
  await input.fill("none");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(chat).toContainText("Has anything changed in what you take");
  await chips.getByRole("button", { name: "No, I'm done" }).click();
  await expect(page.getByTestId("guided-done")).toBeVisible();

  // Una in the corner: nudges for a rating, then reads a UTI and a stop from one message, all in chat.
  const monthAgo = new Date(Date.now() - 30 * 86_400_000).toISOString();
  await admin().from("tracker_preventions").update({ created_at: monthAgo }).eq("user_id", user.id).eq("option_key", "probiotics");
  await page.goto("/portal/tracker");
  await expect(page.getByTestId("chat-bubble")).toHaveAttribute("data-hydrated", "true");
  await page.getByTestId("chat-bubble").click();
  const panel = page.getByTestId("chat-panel");
  const pchips = panel.getByTestId("chat-chips");
  const poverview = () => panel.getByTestId("chat-overview").last();
  await expect(panel.getByTestId("guided-chat")).toHaveAttribute("data-hydrated", "true");
  const ppick = async (name: string, exact = false) => {
    await panel.getByTestId("let-me-pick").click();
    await pchips.getByRole("button", { name, exact }).click();
  };
  await expect(panel).toContainText("Probiotics on your list for a few weeks. Is it helping?");
  await ppick("Yes", true);
  await expect(panel).toContainText("Thanks, noted.");
  await panel.getByPlaceholder("Type here...").fill("Had another one 2 days ago, burning, still got it. Also I've stopped the D-mannose");
  await panel.getByRole("button", { name: "Send" }).click();
  await expect(panel).toContainText("Anything that might have set it off?");
  await ppick("Skip");
  await expect(panel).toContainText("Did you take anything for it");
  await ppick("No antibiotics");
  await ppick("No test");
  await expect(poverview()).toContainText("Still going");
  await pchips.getByRole("button", { name: "Save", exact: true }).click();
  await expect(panel).toContainText("Saved the UTI from");
  await pchips.getByRole("button", { name: "That's all" }).click();
  await expect(poverview()).toContainText("Stopping: D-mannose");
  await pchips.getByRole("button", { name: "Save", exact: true }).click();
  await expect(panel).toContainText("Stopped 1.");
  await expect(panel).toContainText("Anything else?");
  const final = await (await page.request.get("/portal/tracker/export?format=json")).json();
  expect(final.episodes).toHaveLength(3);
  expect(final.preventions.find((p: { option_key: string }) => p.option_key === "d_mannose").stopped_on).toBeTruthy();
  expect(final.preventions.find((p: { option_key: string }) => p.option_key === "probiotics").helping).toBe("yes");

  // History: the chat was kept and can be reopened and continued.
  await expect.poll(async () => (await admin().from("tracker_chats").select("id").eq("user_id", user.id)).data?.length, { timeout: 10_000 }).toBeGreaterThan(0);
  await panel.getByTestId("chat-history").click();
  const list = panel.getByTestId("chat-history-list");
  await expect(list).toContainText("Had another one 2 days ago");
  await list.getByRole("button", { name: /Had another one 2 days ago/ }).click();
  await expect(panel).toContainText("Picking up where we left off");
  await expect(panel.getByTestId("guided-chat")).toHaveAttribute("data-hydrated", "true");
  await panel.getByPlaceholder("Type here...").fill("started cranberry again");
  await panel.getByRole("button", { name: "Send" }).click();
  await expect(poverview()).toContainText("Adding: Cranberry (juice, tablets or capsules)");
  await pchips.getByRole("button", { name: "Save", exact: true }).click();
  await expect(panel).toContainText("Added 1.");
  await expect.poll(async () => {
    const { data } = await admin().from("tracker_chats").select("messages").eq("user_id", user.id);
    return Math.max(...(data ?? []).map((c) => (c.messages as unknown[]).length));
  }, { timeout: 10_000 }).toBeGreaterThan(12);
  const { data: log } = await admin().from("tracker_audit_log").select("action").eq("user_id", user.id);
  expect(log?.filter((l) => l.action === "guided_uti_saved")).toHaveLength(3);
  await ctx.close();
});
