import { test, expect, request as playwrightRequest } from "@playwright/test";
import {
  admin,
  BASE_URL,
  card,
  createUser,
  emailFor,
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
    expect((await kitByCode(kit.code))?.status).toBe("created");
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
    const dispatch = card(page, "2 · Dispatch a kit");
    await dispatch.getByLabel("Kit code").fill(fresh.code);
    await dispatch.getByLabel("Order").selectOption(`#E2E${orderId}`);

    const same = trackingNumber("SAME");
    await dispatch.getByLabel("Outbound tracking no.").fill(same);
    await dispatch.getByLabel("Return tracking no.").fill(same);
    await dispatch.getByRole("button", { name: "Dispatch kit" }).click();
    await expect(dispatch.getByText(/must be different/)).toBeVisible();

    await dispatch.getByLabel("Outbound tracking no.").fill(trackingNumber("OK"));
    await dispatch.getByLabel("Return tracking no.").fill(usedTrk);
    await dispatch.getByRole("button", { name: "Dispatch kit" }).click();
    await expect(dispatch.getByText(new RegExp(`${usedTrk} is already used on ${existing.code}`))).toBeVisible();

    expect((await kitByCode(fresh.code))?.status).toBe("created");
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
    for (const bad of ["UT-000000", "nope", "UT-ZZZZZZ%20", "..%2F..%2Fadmin"]) {
      await page.goto(`/k/${bad}`);
      await expect(page, bad).toHaveURL("/portal?kit=not-found");
    }
    await expect(page.getByText("couldn't find that kit code")).toBeVisible();
    await ctx.close();
  });
});
