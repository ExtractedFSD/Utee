import { test, expect } from "@playwright/test";
import {
  admin,
  anonClient,
  card,
  completeTriage,
  createUser,
  emailFor,
  expectKitStatus,
  kitByCode,
  kitEvents,
  listStorage,
  loginAs,
  loginViaUi,
  createBatchViaUi,
  postShopify,
  postTracking,
  registerUser,
  samplePdf,
  sessionFor,
  shopifyOrderPayload,
  trackingNumber,
} from "./helpers";
import { formatKitCode } from "../src/lib/kit-code";

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

  await test.step("Super admin generates a batch, downloads the CSV and marks it printed", async () => {
    const batch = await createBatchViaUi(adminPage, 1, "E2E store run");
    code = batch.codes[0];
    const kit = await kitByCode(code);
    expect(kit?.status).toBe("printed");
    expect(kit?.batch_id).toBe(batch.batchId);
  });

  await test.step("Admin dispatches the kit against the order", async () => {
    await adminPage.goto("/admin/kits");
    const dispatch = card(adminPage, "1 · Dispatch a kit");
    // Typed the way it is printed on the label, dashes and all.
    await dispatch.getByLabel("Kit code").fill(formatKitCode(code));
    await dispatch.getByLabel("Find order").fill(`E2E${orderId}`);
    await dispatch.locator("select").selectOption(`#E2E${orderId}`);
    await dispatch.getByLabel("Outbound tracking no.").fill(outbound);
    await dispatch.getByLabel("Return tracking no.").fill(returnTrk);
    await dispatch.getByRole("button", { name: "Dispatch kit" }).click();
    await expect(dispatch.getByText(`Kit ${formatKitCode(code)} dispatched.`)).toBeVisible();
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
    await completeTriage(customerPage, {
      previousUti: "yes",
      antibioticsUnknown: true,
      symptoms: ["burning", "frequency"],
      change: -2,
      duration: "1–3 days",
      pregnant: "not_applicable",
      notes: "E2E test submission",
      research: true,
    });
    await expect(customerPage).toHaveURL(new RegExp(`/portal/tests/${kitId}`));
    const { data: saved } = await admin().from("triage_submissions").select("research_consent, research_consent_text, symptoms").eq("kit_id", kitId).single();
    expect(saved?.research_consent).toBe(true);
    expect(saved?.research_consent_text).toContain("anonymised");
    expect((saved?.symptoms as { antibiotics: unknown[] }).antibiotics).toEqual([
      { id: "dont_know", name: "I don't know / can't remember", worked: "unknown" },
    ]);
    await expect(customerPage.getByText("Symptoms submitted").first()).toBeVisible();
    await expect(customerPage.getByText("Pain or burning sensation when you are urinating.")).toBeVisible();
    await expect(customerPage.getByText("Needing to urinate more frequently than normal.")).toBeVisible();
    await expect(customerPage.getByText("Worse (-2)")).toBeVisible();
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
    await labPage.locator('input[name="organism"][value="e_coli"]').check();
    await labPage.locator('input[name="control_positive"]').check();
    await labPage.locator('textarea[name="comments"]').fill("Clear positive band");
    await labPage.locator('input[name="report"]').setInputFiles({
      name: "lab.pdf",
      mimeType: "application/pdf",
      buffer: samplePdf("Lab report"),
    });
    await labPage.locator('input[name="confirmCode"]').fill(code);
    await labPage.getByRole("button", { name: "Record results" }).click();
    await expectKitStatus(code, "lab_complete");
    expect((await listStorage("lab-reports", code)).length).toBe(1);
    const { data: saved } = await admin().from("lab_results").select("outcome, organism, organisms, valid").eq("kit_id", kitId).single();
    expect(saved).toEqual({ outcome: "positive", organism: "Escherichia coli", organisms: ["e_coli"], valid: true });
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
    await expect(clinicPage.getByText("Positive for: Escherichia coli")).toBeVisible();
    await expect(clinicPage.getByText("No warning signs reported.")).toBeVisible();
    await expect(clinicPage.getByText("Research use agreed")).toBeVisible();
    await expect(clinicPage.getByText("Had a UTI before:")).toBeVisible();
    await expect(clinicPage.getByTestId("triage-antibiotics")).toContainText("I don't know / can't remember");
    await expect(clinicPage.getByText("Pain or burning sensation when you are urinating.")).toBeVisible();
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
    // Every email about this kit was logged; the super admin can see them.
    const { data: logged } = await admin().from("email_log").select("kind, status, to_email").eq("kit_id", kitId);
    expect((logged ?? []).map((l) => l.kind)).toEqual(expect.arrayContaining(["kitShipped", "triageReceived", "receivedByLab", "labComplete", "reportReady"]));
    expect((logged ?? []).every((l) => ["sent", "failed", "skipped", "delivered", "bounced"].includes(l.status))).toBe(true);
    await expect(adminPage.getByTestId("email-log")).toContainText("Your Utee report is ready to download");
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
