import { test, expect } from "@playwright/test";
import { admin, completeTriage, createUser, insertKit, loginAs, registerUser } from "./helpers";

test("a test done for a dependant is recorded in their name, not the account holder's", async ({ browser }) => {
  const parent = await createUser("customer", "dependant-parent", "Dan Parent");
  registerUser(parent.id);
  const kit = await insertKit();
  await admin().from("kits").update({ customer_id: parent.id, status: "delivered" }).eq("id", kit.id);

  const ctx = await browser.newContext();
  await loginAs(ctx, parent.email);
  const page = await ctx.newPage();
  await page.goto(`/triage/${kit.code}`);

  // Choosing another adult does not let the form continue: the kit should be passed on instead.
  await page.locator('input[name="testFor"][value="other_adult"]').check();
  await expect(page.getByTestId("pass-on-prompt")).toContainText("Pass the kit on to them first");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.locator("form[data-step]")).toHaveAttribute("data-step", "0");

  await completeTriage(page, { dependant: { name: "Amelia Parent", dateOfBirth: "2019-03-12", relationship: "parent" } });
  await expect(page).toHaveURL(new RegExp(`/portal/tests/${kit.id}`));

  const { data: triage } = await admin().from("triage_submissions").select("patient").eq("kit_id", kit.id).single();
  expect(triage?.patient).toMatchObject({ for: "dependant", name: "Amelia Parent", dateOfBirth: "2019-03-12", relationship: "parent", enteredBy: "account_holder" });
  await ctx.close();
});

test("confirming your own details fills a missing date of birth on the account", async ({ browser }) => {
  const user = await createUser("customer", "dob-fill", "Online Buyer");
  registerUser(user.id);
  await admin().from("profiles").update({ date_of_birth: null }).eq("id", user.id);
  const kit = await insertKit();
  await admin().from("kits").update({ customer_id: user.id, status: "delivered" }).eq("id", kit.id);

  const ctx = await browser.newContext();
  await loginAs(ctx, user.email);
  const page = await ctx.newPage();
  await page.goto(`/triage/${kit.code}`);
  await completeTriage(page, { dateOfBirth: "1988-04-12" });

  const { data: profile } = await admin().from("profiles").select("date_of_birth").eq("id", user.id).single();
  expect(profile?.date_of_birth).toBe("1988-04-12");
  await ctx.close();
});
