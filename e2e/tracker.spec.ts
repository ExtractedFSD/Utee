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
    await expect(page).toHaveURL(/\/portal\/tracker\/about-me/);
    const { data: consents } = await admin().from("tracker_consents").select("kind, consent_version, consent_text").eq("user_id", (await admin().from("profiles").select("id").eq("email", email).single()).data!.id);
    expect(consents?.map((c) => c.kind)).toEqual(["tracker"]);
    expect(consents?.[0].consent_version).toBeTruthy();
    expect(consents?.[0].consent_text.length).toBeGreaterThan(50);
  });

  await test.step("About me, asked once", async () => {
    await page.getByRole("button", { name: "Save and continue" }).click();
    await expect(page).toHaveURL(/\/portal\/tracker$/);
    await expect(page.getByText("Log your first UTI")).toBeVisible();
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

  await test.step("A red-flag symptom shows the safety banner; removing it hides it", async () => {
    await page.getByRole("button", { name: "Blood in urine" }).click();
    await expect(page.getByTestId("red-flag")).toBeVisible();
    await expect(page.getByTestId("red-flag")).toContainText("111");
    await page.getByRole("button", { name: "Blood in urine" }).click();
    await expect(page.getByTestId("red-flag")).toHaveCount(0);
  });

  await test.step("Add a trigger, a treatment from the picker, and a test", async () => {
    await page.getByRole("button", { name: /Add more: Anything that might/ }).click();
    await page.getByRole("button", { name: "Sex", exact: true }).click();
    await expect(page.getByRole("button", { name: "Sex", exact: true })).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("button", { name: /Add more: Treatment/ }).click();
    await page.getByLabel("Search by name or brand").fill("macrob");
    await page.getByRole("option", { name: "Macrobid (nitrofurantoin)" }).click();
    await page.getByRole("button", { name: "3 days" }).click();
    await page.getByRole("button", { name: "Treatment course" }).click();
    await page.getByRole("button", { name: "GP", exact: true }).click();
    await page.getByRole("button", { name: "Add treatment" }).click();
    await expect(page.getByText("Nitrofurantoin", { exact: true }).first()).toBeVisible();

    await page.getByRole("button", { name: /Add more: Tests/ }).click();
    await page.getByRole("button", { name: "Dipstick at home" }).click();
    await page.getByRole("button", { name: "Positive" }).click();
    await page.getByRole("button", { name: "Add test" }).click();
    await expect(page.getByText(/Dipstick at home/)).toBeVisible();
  });

  await test.step("Feeling scale is one tap", async () => {
    await page.getByRole("radio", { name: "Okay" }).click();
    await expect(page.getByRole("radio", { name: "Okay" })).toHaveAttribute("aria-checked", "true");
  });

  await test.step("Close the episode and rate the antibiotic", async () => {
    await page.getByRole("button", { name: "I feel better now" }).click();
    const panel = page.getByTestId("close-panel");
    await panel.getByRole("button", { name: "Yes", exact: true }).click();
    await panel.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText(/^Ended /).first()).toBeVisible();
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

  await test.step("Delete removes everything and leaves an audit row", async () => {
    const { data: me } = await admin().from("profiles").select("id").eq("email", email).single();
    await page.goto("/portal/tracker/settings");
    await page.getByLabel("Type DELETE to confirm").fill("DELETE");
    await page.getByRole("button", { name: "Delete everything" }).click();
    await expect(page).toHaveURL(/\/portal\?tracker=deleted/);
    for (const table of ["tracker_episodes", "tracker_symptoms", "tracker_treatments", "tracker_tests", "tracker_checkins", "tracker_consents", "tracker_profiles"]) {
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
  await page.getByRole("button", { name: "Yes", exact: true }).nth(0).click(); // pregnant or trying: yes
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page.getByText(`Kit ${kit.code}`)).toBeVisible();

  await page.getByRole("link", { name: "Log your first UTI" }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  // Pregnancy answer alone shows the banner with its own wording.
  await expect(page.getByTestId("red-flag")).toContainText("midwife");
  await page.getByRole("button", { name: /Add more: Tests/ }).click();
  await page.getByRole("button", { name: "Utee test" }).click();
  await page.getByRole("button", { name: `Kit ${kit.code}` }).click();
  await page.getByRole("button", { name: "Add test" }).click();
  await expect(page.getByText("Linked to your Utee test in the portal.")).toBeVisible();
  await expect(page.getByText("Lab analysis complete")).toBeVisible();
  const pdf = await page.request.get("/portal/tracker/summary");
  expect((await pdf.body()).subarray(0, 5).toString()).toBe("%PDF-");
  await ctx.close();
});
