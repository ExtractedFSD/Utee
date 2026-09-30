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
  await expect(page.getByRole("link", { name: "Coming soon" })).toHaveCount(0);

  const kit = await insertKit();
  await admin().from("kits").update({ customer_id: user.id, status: "shipped" }).eq("id", kit.id);
  await page.reload();
  await expect(page.getByTestId("urologist-locked")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Coming soon" })).toBeVisible();
  await ctx.close();
});
