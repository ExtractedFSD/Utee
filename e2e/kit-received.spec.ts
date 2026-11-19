import { test, expect } from "@playwright/test";
import { admin, createUser, insertKit, kitEvents, loginAs, registerUser } from "./helpers";

/*
 * The symptom form stays closed until the kit is in the patient's hands:
 * either they scan the QR code on the box, or they tap "I have my kit" on the
 * kit page. Until then the kit page asks whether it has arrived instead.
 */
test("the symptom form waits until the patient says the kit has arrived", async ({ browser }) => {
  const user = await createUser("customer", "kit-arrived");
  registerUser(user.id);
  const kit = await insertKit();
  await admin().from("kits").update({ customer_id: user.id, status: "shipped" }).eq("id", kit.id);

  const ctx = await browser.newContext();
  await loginAs(ctx, user.email);
  const page = await ctx.newPage();

  await page.goto(`/portal/tests/${kit.id}`);
  await expect(page.getByTestId("kit-arrived")).toContainText("Has your kit arrived?");
  await expect(page.getByTestId("symptoms-prompt")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Complete symptom form" })).toHaveCount(0);

  // Going to the form directly sends them back to the kit page.
  await page.goto(`/triage/${kit.code}`);
  await expect(page).toHaveURL(new RegExp(`/portal/tests/${kit.id}$`));

  await page.getByTestId("kit-arrived").getByRole("button", { name: /I have my kit/ }).click();
  await expect(page).toHaveURL(`/triage/${kit.code}`);
  const { data: after } = await admin().from("kits").select("received_at").eq("id", kit.id).single();
  expect(after?.received_at).toBeTruthy();
  expect((await kitEvents(kit.id)).map((e) => e.label)).toContain("Kit received");

  // From now on the kit page offers the form.
  await page.goto(`/portal/tests/${kit.id}`);
  await expect(page.getByTestId("kit-arrived")).toHaveCount(0);
  await expect(page.getByTestId("symptoms-prompt")).toContainText("Before you take your sample");
  await ctx.close();
});

test("scanning the QR code counts as the kit arriving", async ({ browser }) => {
  const user = await createUser("customer", "kit-scanned");
  registerUser(user.id);
  const kit = await insertKit();
  await admin().from("kits").update({ customer_id: user.id, status: "delivered" }).eq("id", kit.id);

  const ctx = await browser.newContext();
  await loginAs(ctx, user.email);
  const page = await ctx.newPage();
  await page.goto(`/k/${kit.code}`);
  await expect(page).toHaveURL(`/triage/${kit.code}`);
  const { data: after } = await admin().from("kits").select("received_at").eq("id", kit.id).single();
  expect(after?.received_at).toBeTruthy();
  await ctx.close();
});
