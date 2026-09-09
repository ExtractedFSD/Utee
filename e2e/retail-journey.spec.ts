import { test, expect } from "@playwright/test";
import {
  admin,
  card,
  createUser,
  emailFor,
  expectKitStatus,
  kitByCode,
  kitEvents,
  loginAs,
  loginViaUi,
  newestCreatedKitCode,
  postShopify,
  postTracking,
  shopifyOrderPayload,
  trackingNumber,
} from "./helpers";

/**
 * The retail journey: a kit sold outside the Utee store. No order, no
 * account until the buyer scans. Admin attaches the return label at packing,
 * the buyer self-registers from the QR, claims the kit, and the return leg
 * is tracked like a store kit's.
 */
test("retail kit: scan to lab", async ({ browser, request }) => {
  const adminUser = await createUser("admin", "retail-admin");
  const lab = await createUser("lab", "retail-lab");
  const buyerEmail = emailFor("retail-buyer");
  const returnTrk = trackingNumber("RRET");
  let code = "";
  let kitId = "";

  const adminCtx = await browser.newContext();
  await loginAs(adminCtx, adminUser.email);
  const adminPage = await adminCtx.newPage();

  await test.step("Admin prints a label and attaches the return label", async () => {
    await adminPage.goto("/admin/kits");
    const batch = card(adminPage, "1 · Create kit labels");
    await batch.getByLabel("Quantity").fill("1");
    await batch.getByRole("button", { name: "Create batch" }).click();
    await expect(batch.getByText(/Created 1 kits/)).toBeVisible();
    code = await newestCreatedKitCode();

    const retail = card(adminPage, "3 · Prepare a retail kit");
    await retail.getByLabel("Kit code").fill(code.toLowerCase());
    await retail.getByLabel("Return tracking no.").fill(returnTrk);
    await retail.getByRole("button", { name: "Attach return label" }).click();
    await expect(retail.getByText(`Kit ${code} prepared for retail.`)).toBeVisible();

    const kit = await kitByCode(code);
    kitId = kit!.id;
    expect(kit?.status).toBe("created");
    expect(kit?.customer_id).toBeNull();
    const stockLink = adminPage.getByRole("link", { name: new RegExp(code) });
    await expect(stockLink).toContainText("retail");
  });

  await test.step("A retail kit can't be dispatched against a store order", async () => {
    const orderId = Number(String(Date.now()).slice(-9));
    const res = await postShopify(
      request,
      "orders/create",
      shopifyOrderPayload({ id: orderId, email: emailFor("retail-store-customer") })
    );
    expect(res.status()).toBe(200);
    await adminPage.goto("/admin/kits");
    const dispatch = card(adminPage, "2 · Dispatch a kit");
    await dispatch.getByLabel("Kit code").fill(code);
    await dispatch.getByLabel("Order").selectOption(`#E2E${orderId}`);
    await dispatch.getByLabel("Outbound tracking no.").fill(trackingNumber("X"));
    await dispatch.getByLabel("Return tracking no.").fill(trackingNumber("Y"));
    await dispatch.getByRole("button", { name: "Dispatch kit" }).click();
    await expect(dispatch.getByText(/prepared for retail/)).toBeVisible();
    expect((await kitByCode(code))?.status).toBe("created");
  });

  const buyerCtx = await browser.newContext();
  const buyerPage = await buyerCtx.newPage();

  await test.step("Unknown email without a kit is refused", async () => {
    await buyerPage.goto("/login");
    await buyerPage.getByLabel("Email address").fill(emailFor("nobody"));
    await buyerPage.getByRole("button", { name: "Email me a code" }).click();
    await expect(buyerPage.getByText(/couldn't find an account/)).toBeVisible();
    const { data } = await admin().from("profiles").select("id").eq("email", emailFor("nobody"));
    expect(data ?? []).toHaveLength(0);
  });

  await test.step("Buyer scans, gets an account, and the kit is claimed", async () => {
    await buyerPage.goto(`/k/${code}`);
    await expect(buyerPage).toHaveURL(/\/login\?next=/);
    await expect(buyerPage.getByText(/Bought your kit elsewhere/)).toBeVisible();
    await loginViaUi(buyerPage, buyerEmail, `/k/${code}`);
    await expect(buyerPage).toHaveURL(`/triage/${code}`);

    const { data: profile } = await admin().from("profiles").select("id, role").eq("email", buyerEmail).single();
    expect(profile?.role).toBe("customer");
    const kit = await kitByCode(code);
    expect(kit?.customer_id).toBe(profile!.id);
    expect(kit?.status).toBe("delivered");
    expect(kit?.order_id).toBeNull();
    const events = await kitEvents(kitId);
    expect(events.map((e) => e.label)).toContain("Kit linked to your account");
  });

  await test.step("Timeline shows the return label from the start", async () => {
    await buyerPage.goto(`/portal/tests/${kitId}`);
    await expect(buyerPage.getByText("Kit linked to your account")).toBeVisible();
    await expect(buyerPage.getByText("Return to lab")).toBeVisible();
    await expect(buyerPage.getByText(returnTrk)).toBeVisible();
    expect(await buyerPage.content()).not.toContain("Delivery to you");
  });

  await test.step("Buyer submits symptoms", async () => {
    await buyerPage.goto(`/k/${code}`);
    await expect(buyerPage).toHaveURL(`/triage/${code}`);
    await buyerPage.getByLabel("Blood in urine").check();
    await buyerPage.locator('select[name="duration"]').selectOption("Less than 24 hours");
    await buyerPage.locator('input[name="previousUti"][value="yes"]').check();
    await buyerPage.locator('input[name="pregnant"][value="no"]').check();
    await buyerPage.locator('input[name="consent"]').check();
    await buyerPage.getByRole("button", { name: "Submit & take my sample" }).click();
    await expect(buyerPage).toHaveURL(new RegExp(`/portal/tests/${kitId}`));
    await expectKitStatus(code, "activated");
  });

  await test.step("Return label scan moves the sample towards the lab", async () => {
    const res = await postTracking(request, {
      trackingNumber: returnTrk,
      status: "in_transit",
      description: "Return parcel accepted at Post Office",
      occurredAt: "2026-09-09T17:45:00+01:00",
    });
    expect(await res.json()).toEqual({ matched: true });
    await expectKitStatus(code, "in_transit_to_lab");
    await buyerPage.reload();
    await expect(buyerPage.getByText("Sample on its way to the lab").first()).toBeVisible();
  });

  await test.step("Lab receives the specimen", async () => {
    const labCtx = await browser.newContext();
    await loginAs(labCtx, lab.email);
    const labPage = await labCtx.newPage();
    await labPage.goto("/lab");
    await expect(labPage.getByRole("link", { name: new RegExp(code) })).toBeVisible();
    await labPage.goto(`/k/${code}`);
    await expect(labPage).toHaveURL(`/lab/specimen/${code}`);
    expect(await labPage.content()).not.toContain(buyerEmail);
    await labPage.getByRole("button", { name: "Confirm specimen received" }).click();
    await expectKitStatus(code, "received_by_lab");
    await labCtx.close();
  });

  await test.step("A second scan by someone else is refused", async () => {
    const stranger = await createUser("customer", "retail-stranger");
    const ctx = await browser.newContext();
    await loginAs(ctx, stranger.email);
    const page = await ctx.newPage();
    await page.goto(`/k/${code}`);
    await expect(page).toHaveURL("/portal?kit=not-yours");
    await ctx.close();
  });

  await Promise.all([adminCtx.close(), buyerCtx.close()]);
});
