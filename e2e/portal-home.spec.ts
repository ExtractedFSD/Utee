import { test, expect } from "@playwright/test";
import { admin, createUser, insertKit, loginAs, registerUser } from "./helpers";

test("urologist appointment stays locked until a Utee test is on the account", async ({ browser }) => {
  const user = await createUser("customer", "home-lock");
  registerUser(user.id);
  const ctx = await browser.newContext();
  await loginAs(ctx, user.email);
  const page = await ctx.newPage();
  await page.goto("/portal");
  await expect(page.getByTestId("urologist-locked")).toContainText("Unlocked once you have a Utee test on your account");
  await expect(page.getByRole("link", { name: "Order a Utee test" })).toBeVisible();
  await expect(page.getByTestId("urologist")).not.toContainText("Coming soon");
  await expect(page.getByTestId("community")).toContainText("Join the Utee Community");
  await expect(page.getByTestId("community")).toContainText("Coming soon");

  const kit = await insertKit();
  await admin().from("kits").update({ customer_id: user.id, status: "shipped" }).eq("id", kit.id);
  await page.reload();
  await expect(page.getByTestId("urologist-locked")).toHaveCount(0);
  await expect(page.getByTestId("urologist")).toContainText("Coming soon");
  await ctx.close();
});

test("the buyer can pass an unused kit on, and the next person to scan it claims it", async ({ browser }) => {
  const buyer = await createUser("customer", "gift-buyer");
  const recipient = await createUser("customer", "gift-recipient");
  registerUser(buyer.id);
  registerUser(recipient.id);
  const kit = await insertKit();
  await admin().from("kits").update({ customer_id: buyer.id, status: "delivered" }).eq("id", kit.id);

  const buyerCtx = await browser.newContext();
  await loginAs(buyerCtx, buyer.email);
  const page = await buyerCtx.newPage();
  await page.goto(`/portal/tests/${kit.id}`);
  const card = page.getByTestId("pass-on");
  await card.getByRole("button", { name: "Pass this kit on" }).click();
  await card.getByRole("checkbox").check();
  await card.getByRole("button", { name: "Pass it on" }).click();
  await expect(page).toHaveURL(/\/portal\?kit=released/);
  await expect(page.getByText("Kit passed on.")).toBeVisible();
  await expect(page.getByTestId("home-kits")).not.toContainText(kit.code.slice(0, 4));

  // Scanning as the buyer no longer opens it.
  await page.goto(`/k/${kit.code}`);
  await expect(page).toHaveURL(/kit=not-yours/);
  await buyerCtx.close();

  // The recipient scans it and it becomes theirs.
  const recipientCtx = await browser.newContext();
  await loginAs(recipientCtx, recipient.email);
  const rpage = await recipientCtx.newPage();
  await rpage.goto(`/k/${kit.code}`);
  await expect(rpage).toHaveURL(`/triage/${kit.code}`);
  const { data: after } = await admin().from("kits").select("customer_id, status").eq("id", kit.id).single();
  expect(after?.customer_id).toBe(recipient.id);
  expect(after?.status).toBe("delivered");
  await recipientCtx.close();
});
