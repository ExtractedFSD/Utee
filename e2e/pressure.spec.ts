import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  admin,
  BASE_URL,
  card,
  createUser,
  emailFor,
  expectKitStatus,
  insertKit,
  kitByCode,
  kitEvents,
  loginAs,
  postShopify,
  postTracking,
  shopifyOrderPayload,
  trackingNumber,
} from "./helpers";

/**
 * Pressure tests: the ways the integrations and the humans misbehave.
 * Bad signatures, replays, wrong topics, duplicate tracking numbers, and
 * several people racing to claim the same kit.
 */

test.describe("Shopify webhook", () => {
  test("rejects a bad signature", async ({ request }) => {
    const res = await postShopify(
      request,
      "orders/create",
      shopifyOrderPayload({ id: 1, email: emailFor("sig") }),
      { secret: "wrong-secret" }
    );
    expect(res.status()).toBe(401);
    const { data } = await admin().from("profiles").select("id").eq("email", emailFor("sig"));
    expect(data ?? []).toHaveLength(0);
  });

  test("acknowledges but ignores topics it doesn't handle", async ({ request }) => {
    const id = Number(String(Date.now()).slice(-9));
    for (const topic of ["customers/redact", "shop/redact", "refunds/create"]) {
      const res = await postShopify(request, topic, { id, email: emailFor("redact"), shop_id: 1 });
      expect(res.status()).toBe(200);
      expect((await res.json()).skipped).toMatch(/unhandled topic/);
    }
    const { data: orders } = await admin().from("orders").select("id").eq("shopify_order_id", String(id));
    expect(orders ?? []).toHaveLength(0);
    const { data: profiles } = await admin().from("profiles").select("id").eq("email", emailFor("redact"));
    expect(profiles ?? []).toHaveLength(0);
  });

  test("is idempotent on retries and applies updates", async ({ request }) => {
    const id = Number(String(Date.now()).slice(-9));
    const email = emailFor("retry");
    const payload = shopifyOrderPayload({ id, email });
    for (let i = 0; i < 3; i++) {
      expect((await postShopify(request, "orders/create", payload)).status()).toBe(200);
    }
    const { data: orders } = await admin().from("orders").select("id, financial_status").eq("shopify_order_id", String(id));
    expect(orders).toHaveLength(1);
    const { data: items } = await admin().from("order_items").select("id").eq("order_id", orders![0].id);
    expect(items).toHaveLength(1);
    const { data: profiles } = await admin().from("profiles").select("id").eq("email", email);
    expect(profiles).toHaveLength(1);

    const updated = await postShopify(request, "orders/updated", { ...payload, financial_status: "refunded" });
    expect(updated.status()).toBe(200);
    const { data: after } = await admin().from("orders").select("financial_status").eq("shopify_order_id", String(id)).single();
    expect(after?.financial_status).toBe("refunded");
  });

  test("orders without a test kit are recorded but not flagged", async ({ request }) => {
    const id = Number(String(Date.now()).slice(-9));
    const res = await postShopify(request, "orders/create", shopifyOrderPayload({ id, email: emailFor("supp"), testKit: false }));
    expect(res.status()).toBe(200);
    const { data } = await admin().from("orders").select("contains_test_kit").eq("shopify_order_id", String(id)).single();
    expect(data?.contains_test_kit).toBe(false);
  });
});

test.describe("Tracking webhook", () => {
  const event = { trackingNumber: "E2E-NOPE-000", status: "in_transit", description: "Scan" };

  test("requires the shared secret", async ({ request }) => {
    expect((await postTracking(request, event, { secret: null })).status()).toBe(401);
    expect((await postTracking(request, event, { secret: "wrong" })).status()).toBe(401);
    expect((await postTracking(request, event, { secret: "" })).status()).toBe(401);
  });

  test("validates the payload", async ({ request }) => {
    expect((await postTracking(request, "not json")).status()).toBe(400);
    expect((await postTracking(request, { ...event, status: "teleported" })).status()).toBe(400);
    expect((await postTracking(request, { ...event, occurredAt: "yesterday" })).status()).toBe(400);
    // Both Z and offset forms of ISO-8601 are accepted.
    for (const occurredAt of ["2026-09-09T09:12:00Z", "2026-09-09T09:12:00+01:00", "2026-09-09T09:12:00.123-05:00"]) {
      const res = await postTracking(request, { ...event, occurredAt });
      expect(res.status(), occurredAt).toBe(200);
    }
  });

  test("acknowledges unknown parcels without touching anything", async ({ request }) => {
    const res = await postTracking(request, event);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ matched: false });
  });

  test("ignores scans that don't advance the kit but keeps them on the timeline", async ({ request }) => {
    const kit = await insertKit();
    const trk = trackingNumber("INT");
    await admin().from("shipments").insert({ kit_id: kit.id, direction: "return", tracking_number: trk });
    const res = await postTracking(request, { trackingNumber: trk, status: "exception", description: "Delay at sorting centre" });
    expect(await res.json()).toEqual({ matched: true });
    expect((await kitByCode(kit.code))?.status).toBe("printed");
    const events = await kitEvents(kit.id);
    expect(events.map((e) => e.label)).toContain("Delay at sorting centre");
  });
});

test.describe("Dispatch validation", () => {
  test("refuses reused or identical tracking numbers", async ({ browser, request }) => {
    const adminUser = await createUser("admin", "dispatch-admin");
    const orderId = Number(String(Date.now()).slice(-9));
    expect((await postShopify(request, "orders/create", shopifyOrderPayload({ id: orderId, email: emailFor("dispatch-cust") }))).status()).toBe(200);
    const existing = await insertKit();
    const usedTrk = trackingNumber("USED");
    await admin().from("shipments").insert({ kit_id: existing.id, direction: "return", tracking_number: usedTrk });
    const fresh = await insertKit();

    const ctx = await browser.newContext();
    await loginAs(ctx, adminUser.email);
    const page = await ctx.newPage();
    await page.goto("/admin/kits");
    const dispatch = card(page, "1 · Dispatch a kit");
    await dispatch.getByLabel("Kit code").fill(fresh.code);
    await dispatch.locator("select").selectOption(`#E2E${orderId}`);

    const same = trackingNumber("SAME");
    await dispatch.getByLabel("Outbound tracking no.").fill(same);
    await dispatch.getByLabel("Return tracking no.").fill(same);
    await dispatch.getByRole("button", { name: "Dispatch kit" }).click();
    await expect(dispatch.getByText(/must be different/)).toBeVisible();

    await dispatch.getByLabel("Outbound tracking no.").fill(trackingNumber("OK"));
    await dispatch.getByLabel("Return tracking no.").fill(usedTrk);
    await dispatch.getByRole("button", { name: "Dispatch kit" }).click();
    await expect(dispatch.getByText(new RegExp(`${usedTrk} is already used on ${existing.code}`))).toBeVisible();

    expect((await kitByCode(fresh.code))?.status).toBe("printed");
    const { data: shipments } = await admin().from("shipments").select("id").eq("kit_id", fresh.id);
    expect(shipments ?? []).toHaveLength(0);
    await ctx.close();
  });
});

test.describe("Concurrency", () => {
  test("only one of several simultaneous scanners can claim a retail kit", async ({ browser }) => {
    const kit = await insertKit();
    await admin().from("shipments").insert({ kit_id: kit.id, direction: "return", tracking_number: trackingNumber("RACE") });
    const racers = await Promise.all([1, 2, 3].map((i) => createUser("customer", `racer${i}`)));

    // One API context per racer, carrying that racer's session cookies.
    const contexts = await Promise.all(
      racers.map(async (racer) => {
        const browserCtx = await browser.newContext();
        await loginAs(browserCtx, racer.email);
        const state = await browserCtx.storageState();
        await browserCtx.close();
        return { racer, api: await playwrightRequest.newContext({ baseURL: BASE_URL, storageState: state }) };
      })
    );

    // 4 concurrent scans each, all racing for the same kit.
    const results = await Promise.all(
      contexts.flatMap(({ racer, api }) =>
        [1, 2, 3, 4].map(async () => {
          const res = await api.get(`/k/${kit.code}`, { maxRedirects: 0 });
          return { racer: racer.id, location: res.headers()["location"] ?? "" };
        })
      )
    );
    await Promise.all(contexts.map((c) => c.api.dispose()));

    // Exactly one racer wins; every one of the winner's scans (including the
    // ones that lost the race to their own first scan) lands on the symptom
    // form, and every other racer's scan is refused.
    const winners = new Set(results.filter((r) => r.location.includes("/triage/")).map((r) => r.racer));
    expect(winners.size, JSON.stringify(results)).toBe(1);
    const winner = [...winners][0];
    for (const r of results) {
      if (r.racer === winner) expect(r.location, JSON.stringify(r)).toContain(`/triage/${kit.code}`);
      else expect(r.location, JSON.stringify(r)).toContain("kit=not-yours");
    }

    const final = await kitByCode(kit.code);
    expect(final?.customer_id).toBe([...winners][0]);
    expect(final?.status).toBe("delivered");
    const events = await kitEvents(kit.id);
    expect(events.filter((e) => e.label === "Kit linked to your account")).toHaveLength(1);
  });

  test("replayed carrier events don't corrupt the shipment", async ({ request }) => {
    const kit = await insertKit();
    const trk = trackingNumber("REPLAY");
    await admin().from("shipments").insert({ kit_id: kit.id, direction: "return", tracking_number: trk });
    const event = { trackingNumber: trk, status: "in_transit", description: "Accepted", occurredAt: "2026-09-09T10:00:00+01:00" };
    const responses = await Promise.all(Array.from({ length: 8 }, () => postTracking(request, event)));
    for (const res of responses) expect(res.status()).toBe(200);
    const { data: shipment } = await admin().from("shipments").select("status, last_event, events").eq("tracking_number", trk).single();
    expect(shipment?.status).toBe("in_transit");
    expect(shipment?.last_event).toBe("Accepted");
    expect(Array.isArray(shipment?.events)).toBe(true);
    expect((shipment?.events as unknown[]).length).toBeGreaterThanOrEqual(1);
  });
});

test.describe("QR landing", () => {
  test("unknown and malformed codes are handled for a signed-in customer", async ({ browser }) => {
    const user = await createUser("customer", "qr-unknown");
    const ctx = await browser.newContext();
    await loginAs(ctx, user.email);
    const page = await ctx.newPage();
    const voided = await insertKit("voided");
    const unprinted = await insertKit("generated");
    for (const bad of ["UT-000000", "nope", "UT-ZZZZ-ZZZZ", "..%2F..%2Fadmin", unprinted.code]) {
      await page.goto(`/k/${bad}`);
      await expect(page, bad).toHaveURL("/portal?kit=not-found");
    }
    await expect(page.getByText("couldn't find that kit code")).toBeVisible();
    await page.goto(`/k/${voided.code}`);
    await expect(page).toHaveURL("/portal?kit=voided");
    await expect(page.getByText("has been cancelled")).toBeVisible();

    // No phone: type the code at /start. Typos are caught before leaving the page.
    const real = await insertKit();
    await page.goto("/start");
    const wrongCheck = real.code.slice(0, 7) + (real.code[7] === "0" ? "1" : "0");
    await page.getByLabel("Kit code").fill(wrongCheck);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page.getByText("doesn't look like a Utee kit code")).toBeVisible();
    await expect(page).toHaveURL("/start");
    await page.getByLabel("Kit code").fill(` ut-${real.code.slice(0, 4).toLowerCase()}-${real.code.slice(4).toLowerCase()} `);
    await expect(page.getByText(`We read that as UT-${real.code.slice(0, 4)}-${real.code.slice(4)}.`)).toBeVisible();
    await page.getByRole("button", { name: "Continue" }).click();
    // A printed, unassigned kit is claimed by whoever enters it: straight to the questionnaire.
    await expect(page).toHaveURL(`/triage/${real.code}`);
    await ctx.close();
  });
});

test.describe("Lab sheet", () => {
  test("an invalid run holds the kit for troubleshooting until a valid re-run", async ({ browser }) => {
    const lab = await createUser("lab", "sheet-lab");
    const kit = await insertKit("received_by_lab");
    const ctx = await browser.newContext();
    await loginAs(ctx, lab.email);
    const page = await ctx.newPage();

    // Error ticked and positive control missing: invalid, Utee notified, kit held.
    await page.goto(`/lab/specimen/${kit.code}`);
    await page.locator('input[name="organism"][value="e_coli"]').check();
    await page.locator('input[name="control_error"]').check();
    await page.locator('input[name="confirmCode"]').fill(kit.code);
    await page.getByRole("button", { name: "Record results" }).click();
    await expect(page.getByTestId("lab-query")).toBeVisible();
    await expect(page.getByTestId("lab-query")).toContainText("Positive control not confirmed");
    await expect(page.getByTestId("lab-query")).toContainText("Error reported by the device");
    expect((await kitByCode(kit.code))?.status).toBe("lab_query");
    await expect(page.getByTestId("lab-sheet")).toHaveCount(0);
    const { data: held } = await admin().from("lab_results").select("valid, outcome").eq("kit_id", kit.id).single();
    expect(held).toEqual({ valid: false, outcome: "inconclusive" });
    const { data: adminMail } = await admin().from("email_log").select("kind").eq("kit_id", kit.id).eq("kind", "adminLabQuery");
    expect(adminMail?.length).toBe(1);

    // Escalating keeps it held and tells Utee why.
    await page.getByLabel("Escalate to Utee").fill("Device error twice; sample volume low");
    await page.getByRole("button", { name: "Escalate to Utee" }).click();
    await expect(page.getByRole("button", { name: "Escalated" })).toBeVisible();
    expect((await kitEvents(kit.id)).map((e) => e.label)).toContain("Escalated to Utee by the lab");

    // Re-run: back to awaiting results, then a valid sheet goes to the clinic.
    await page.getByRole("button", { name: "Re-run the test" }).click();
    await expectKitStatus(kit.code, "received_by_lab");
    await expect(page.getByTestId("lab-sheet")).toContainText("run 2");
    await page.locator('input[name="organism"][value="klebsiella_pneumoniae"]').check();
    await page.locator('input[name="control_positive"]').check();
    await page.locator('input[name="confirmCode"]').fill(kit.code);
    await page.getByRole("button", { name: "Record results" }).click();
    await expectKitStatus(kit.code, "lab_complete");
    const { data: final } = await admin().from("lab_results").select("valid, outcome, organism, previous_attempts").eq("kit_id", kit.id).single();
    expect(final?.valid).toBe(true);
    expect(final?.outcome).toBe("positive");
    expect(final?.organism).toBe("Klebsiella pneumoniae");
    expect((final?.previous_attempts as unknown[]).length).toBe(1);
    await ctx.close();
  });
});

test.describe("Fulfilment role", () => {
  test("sees the packing tools and nothing else", async ({ browser, request }) => {
    const packer = await createUser("fulfilment", "packer");
    const orderId = Number(String(Date.now()).slice(-9));
    expect((await postShopify(request, "orders/create", shopifyOrderPayload({ id: orderId, email: emailFor("packer-cust") }))).status()).toBe(200);
    const kit = await insertKit();
    const ctx = await browser.newContext();
    await loginAs(ctx, packer.email);
    const page = await ctx.newPage();

    await page.goto("/admin");
    await expect(page).toHaveURL("/fulfilment");
    await page.goto("/admin/kits");
    await expect(page).toHaveURL("/fulfilment");
    await page.goto("/lab");
    await expect(page).toHaveURL("/fulfilment");
    await expect(page.getByRole("heading", { name: "Kit fulfilment" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Patients" })).toHaveCount(0);

    // Scanning a kit lands on the packing page with the code filled in.
    await page.goto(`/k/${kit.code}`);
    await expect(page).toHaveURL(`/fulfilment?code=${kit.code}`);
    const dispatch = card(page, "1 · Dispatch a kit");
    await expect(dispatch.getByLabel("Kit code")).toHaveValue(`UT-${kit.code.slice(0, 4)}-${kit.code.slice(4)}`);
    await dispatch.getByLabel("Find order").fill(`E2E${orderId}`);
    await dispatch.locator("select").selectOption(`#E2E${orderId}`);
    await dispatch.getByLabel("Outbound tracking no.").fill(trackingNumber("FOUT"));
    await dispatch.getByLabel("Return tracking no.").fill(trackingNumber("FRET"));
    await dispatch.getByRole("button", { name: "Dispatch kit" }).click();
    await expect(dispatch.getByText(/dispatched\./)).toBeVisible();
    await expectKitStatus(kit.code, "shipped");
    const events = await kitEvents(kit.id);
    expect(events.find((e) => e.label.startsWith("Kit assigned"))?.actor_role).toBe("fulfilment");
    await ctx.close();
  });
});
