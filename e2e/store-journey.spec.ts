import { test, expect } from "@playwright/test";
import {
  admin,
  anonClient,
  card,
  createUser,
  emailFor,
  expectKitStatus,
  kitByCode,
  kitEvents,
  listStorage,
  loginAs,
  loginViaUi,
  newestCreatedKitCode,
  postShopify,
  postTracking,
  registerUser,
  samplePdf,
  sessionFor,
  shopifyOrderPayload,
  trackingNumber,
} from "./helpers";

/**
 * The store journey: Shopify order → account → dispatch → QR scan → symptoms
 * → carrier scans → lab → clinic → report download, checked at every step
 * from each role's point of view, plus the isolation rules between roles.
 */
test("store kit: order to report", async ({ browser, request }) => {
  const orderId = Number(String(Date.now()).slice(-9));
  const customerEmail = emailFor("store-customer");
  const customerName = "Store Patient";
  const superAdmin = await createUser("super_admin", "store-admin");
  const lab = await createUser("lab", "store-lab");
  const clinic = await createUser("clinic", "store-clinic");
  const outbound = trackingNumber("OUT");
  const returnTrk = trackingNumber("RET");
  let code = "";
  let kitId = "";

  await test.step("Shopify order creates the account and order", async () => {
    const res = await postShopify(
      request,
      "orders/create",
      shopifyOrderPayload({ id: orderId, email: customerEmail, firstName: "Store", lastName: "Patient" })
    );
    expect(res.status(), await res.text()).toBe(200);
    const { data: profile } = await admin()
      .from("profiles")
      .select("id, role, full_name")
      .eq("email", customerEmail)
      .single();
    expect(profile?.role).toBe("customer");
    expect(profile?.full_name).toBe(customerName);
    registerUser(profile!.id);
    const { data: order } = await admin()
      .from("orders")
      .select("order_number, contains_test_kit, customer_id")
      .eq("shopify_order_id", String(orderId))
      .single();
    expect(order?.contains_test_kit).toBe(true);
    expect(order?.customer_id).toBe(profile!.id);
  });

  const adminCtx = await browser.newContext();
  await loginAs(adminCtx, superAdmin.email);
  const adminPage = await adminCtx.newPage();

  await test.step("Admin prints a label", async () => {
    await adminPage.goto("/admin/kits");
    const batch = card(adminPage, "1 · Create kit labels");
    await batch.getByLabel("Quantity").fill("1");
    await batch.getByRole("button", { name: "Create batch" }).click();
    await expect(batch.getByText(/Created 1 kits/)).toBeVisible();
    code = await newestCreatedKitCode();
    await adminPage.goto("/admin/kits/print");
    // The label carries the QR (an SVG) and the human-readable code; the QR
    // encodes NEXT_PUBLIC_APP_URL/k/<code>, which the scan step below follows.
    const label = adminPage.locator("div").filter({ hasText: code }).filter({ has: adminPage.locator("svg") }).last();
    await expect(label).toBeVisible();
  });

  await test.step("Admin dispatches the kit against the order", async () => {
    await adminPage.goto("/admin/kits");
    const dispatch = card(adminPage, "2 · Dispatch a kit");
    await dispatch.getByLabel("Kit code").fill(code);
    await dispatch.getByLabel("Order").selectOption(`#E2E${orderId}`);
    await dispatch.getByLabel("Outbound tracking no.").fill(outbound);
    await dispatch.getByLabel("Return tracking no.").fill(returnTrk);
    await dispatch.getByRole("button", { name: "Dispatch kit" }).click();
    await expect(dispatch.getByText(`Kit ${code} dispatched.`)).toBeVisible();
    const kit = await expectKitStatus(code, "shipped");
    kitId = kit.id;
    const { data: shipments } = await admin().from("shipments").select("direction").eq("kit_id", kitId);
    expect(shipments?.map((s) => s.direction).sort()).toEqual(["outbound", "return"]);
  });

  await test.step("Royal Mail delivers the outbound parcel", async () => {
    const res = await postTracking(request, {
      trackingNumber: outbound,
      status: "delivered",
      description: "Delivered to your address",
      occurredAt: new Date().toISOString(),
    });
    expect(await res.json()).toEqual({ matched: true });
    await expectKitStatus(code, "delivered");
  });

  const customerCtx = await browser.newContext();
  const customerPage = await customerCtx.newPage();

  await test.step("Scanning the QR while signed out goes to login and back", async () => {
    await customerPage.goto(`/k/${code}`);
    await expect(customerPage).toHaveURL(new RegExp(`/login\\?next=(%2F|/)k(%2F|/)${code}`));
    await loginViaUi(customerPage, customerEmail, `/k/${code}`);
    await expect(customerPage).toHaveURL(`/triage/${code}`);
  });

  await test.step("Customer submits symptoms and consent", async () => {
    await customerPage.getByLabel("Pain or burning when urinating").check();
    await customerPage.getByLabel("Needing to urinate more often than usual").check();
    await customerPage.locator('select[name="duration"]').selectOption("1–3 days");
    await customerPage.locator('input[name="previousUti"][value="no"]').check();
    await customerPage.locator('input[name="pregnant"][value="not_applicable"]').check();
    await customerPage.locator('textarea[name="notes"]').fill("E2E test submission");
    await customerPage.locator('input[name="consent"]').check();
    await customerPage.getByRole("button", { name: "Submit & take my sample" }).click();
    await expect(customerPage).toHaveURL(new RegExp(`/portal/tests/${kitId}`));
    await expect(customerPage.getByText("Symptoms submitted").first()).toBeVisible();
    await expectKitStatus(code, "activated");
    // Scanning again after activation lands on the timeline, not the form.
    await customerPage.goto(`/k/${code}`);
    await expect(customerPage).toHaveURL(`/portal/tests/${kitId}`);
  });

  await test.step("Return parcel accepted (offset timestamp, as Royal Mail sends it)", async () => {
    const res = await postTracking(request, {
      trackingNumber: returnTrk,
      status: "in_transit",
      description: "Return parcel accepted at Post Office",
      occurredAt: "2026-09-09T09:12:00+01:00",
      location: "Post Office",
    });
    expect(await res.json()).toEqual({ matched: true });
    await expectKitStatus(code, "in_transit_to_lab");
    await customerPage.reload();
    await expect(customerPage.getByText("Sample on its way to the lab").first()).toBeVisible();
  });

  const labCtx = await browser.newContext();
  await loginAs(labCtx, lab.email);
  const labPage = await labCtx.newPage();

  await test.step("Lab scans the pot, sees only the specimen, records results", async () => {
    await labPage.goto(`/k/${code}`);
    await expect(labPage).toHaveURL(`/lab/specimen/${code}`);
    const html = await labPage.content();
    expect(html).not.toContain(customerName);
    expect(html).not.toContain(customerEmail);
    expect(html).not.toContain("E2E test submission");
    await labPage.getByRole("button", { name: "Confirm specimen received" }).click();
    await expectKitStatus(code, "received_by_lab");
    await labPage.locator('select[name="outcome"]').selectOption("positive");
    await labPage.locator('input[name="organism"]').fill("Escherichia coli");
    await labPage.locator('input[name="colonyCount"]').fill(">10^5 CFU/mL");
    await labPage.locator('textarea[name="sensitivities"]').fill("Sensitive: nitrofurantoin");
    await labPage.locator('input[name="report"]').setInputFiles({
      name: "lab.pdf",
      mimeType: "application/pdf",
      buffer: samplePdf("Lab report"),
    });
    await labPage.locator('input[name="confirmCode"]').fill(code);
    await labPage.getByRole("button", { name: "Submit results to clinic" }).click();
    await expectKitStatus(code, "lab_complete");
    expect((await listStorage("lab-reports", code)).length).toBe(1);
  });

  await test.step("Customer sees progress but never raw results", async () => {
    await customerPage.reload();
    await expect(customerPage.getByText("Lab analysis complete").first()).toBeVisible();
    expect(await customerPage.content()).not.toContain("Escherichia");
    const session = await sessionFor(customerEmail);
    const asCustomer = anonClient();
    await asCustomer.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    const { data: leaked } = await asCustomer.from("lab_results").select("*").eq("kit_id", kitId);
    expect(leaked ?? []).toHaveLength(0);
  });

  const clinicCtx = await browser.newContext();
  await loginAs(clinicCtx, clinic.email);
  const clinicPage = await clinicCtx.newPage();

  await test.step("Clinic reviews symptoms + results and publishes the report", async () => {
    await clinicPage.goto(`/k/${code}`);
    await expect(clinicPage).toHaveURL(`/clinic/case/${kitId}`);
    await expect(clinicPage.getByText(customerName).first()).toBeVisible();
    await expect(clinicPage.getByText("Escherichia coli").first()).toBeVisible();
    await clinicPage.getByRole("button", { name: "Mark case as received" }).click();
    await expectKitStatus(code, "clinic_received");
    await clinicPage.locator('textarea[name="summary"]').fill("Uncomplicated UTI. See report.");
    await clinicPage.locator('input[name="report"]').setInputFiles({
      name: "final.pdf",
      mimeType: "application/pdf",
      buffer: samplePdf("Final report"),
    });
    await clinicPage.getByRole("button", { name: "Publish report to patient" }).click();
    await expectKitStatus(code, "report_ready");
  });

  await test.step("Customer downloads the PDF", async () => {
    await customerPage.reload();
    await expect(customerPage.getByText("Your report is ready").first()).toBeVisible();
    const res = await customerPage.request.get(`/portal/tests/${kitId}/report`);
    expect(res.status()).toBe(200);
    expect((await res.body()).subarray(0, 5).toString()).toBe("%PDF-");
  });

  await test.step("Other roles and other customers are kept out", async () => {
    const other = await createUser("customer", "store-other");
    const otherCtx = await browser.newContext();
    await loginAs(otherCtx, other.email);
    const otherPage = await otherCtx.newPage();
    await otherPage.goto(`/k/${code}`);
    await expect(otherPage).toHaveURL("/portal?kit=not-yours");
    await expect(otherPage.getByText("isn't linked to your account")).toBeVisible();
    const denied = await otherPage.request.get(`/portal/tests/${kitId}/report`);
    expect(denied.status()).toBe(404);
    await otherCtx.close();

    await labPage.goto("/clinic");
    await expect(labPage).toHaveURL("/lab");
    await labPage.goto(`/admin/kits/${kitId}`);
    await expect(labPage).toHaveURL("/lab");
    await clinicPage.goto("/admin");
    await expect(clinicPage).toHaveURL("/clinic");
    const anon = await browser.newContext();
    const anonPage = await anon.newPage();
    await anonPage.goto(`/lab/specimen/${code}`);
    await expect(anonPage).toHaveURL(/\/login/);
    await anon.close();
  });

  await test.step("Super admin rolls back the report and the PDF is removed", async () => {
    await adminPage.goto(`/admin/kits/${kitId}`);
    await adminPage.getByPlaceholder(/Reason \(required/).fill("E2E: testing rollback");
    await adminPage.getByRole("button", { name: "Roll back stage" }).click();
    await expectKitStatus(code, "clinic_received");
    expect(await listStorage("clinic-reports", code)).toHaveLength(0);
    const { data: report } = await admin().from("clinic_reports").select("report_path, status").eq("kit_id", kitId).single();
    expect(report?.report_path).toBeNull();
    const events = await kitEvents(kitId);
    expect(events.some((e) => e.label.startsWith("Rolled back") && !e.visible_to_customer)).toBe(true);
    const kit = await kitByCode(code);
    expect(kit?.status).toBe("clinic_received");
  });

  await Promise.all([adminCtx.close(), customerCtx.close(), labCtx.close(), clinicCtx.close()]);
});
