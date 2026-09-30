import { test, expect, type Page } from "@playwright/test";
import { admin, createUser, otpFor, registerUser } from "./helpers";

const SUPABASE_HOST = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).host;

/** Stubs the one call that would send an email; relays the rest through Node. */
async function relaySupabase(page: Page) {
  await page.route((url) => url.host === SUPABASE_HOST, async (route) => {
    const req = route.request();
    if (/\/auth\/v1\/otp/.test(req.url())) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers())) {
      if (!["host", "content-length", "connection"].includes(k.toLowerCase())) headers[k] = v;
    }
    const upstream = await fetch(req.url(), {
      method: req.method(),
      headers,
      body: req.postDataBuffer() ? new Uint8Array(req.postDataBuffer()!) : undefined,
    });
    const body = Buffer.from(await upstream.arrayBuffer());
    const responseHeaders: Record<string, string> = {};
    upstream.headers.forEach((v, k) => {
      if (!["content-encoding", "transfer-encoding", "content-length"].includes(k)) responseHeaders[k] = v;
    });
    return route.fulfill({ status: upstream.status, headers: responseHeaders, body });
  });
}

test("the code step survives a reload and offers a new code", async ({ browser }) => {
  const user = await createUser("customer", "login-reload");
  registerUser(user.id);
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await relaySupabase(page);

  await page.goto("/login?next=%2Fportal");
  await page.getByLabel("Email address").fill(user.email);
  await page.getByRole("button", { name: "Email me a code" }).click();
  await expect(page.getByLabel("Enter your sign-in code")).toBeVisible();

  // Coming back from the mail app on a phone often reloads the tab.
  await page.reload();
  await expect(page.getByLabel("Enter your sign-in code")).toBeVisible();
  await expect(page.getByTestId("code-step")).toContainText(user.email);
  await expect(page.getByRole("button", { name: /Send a new code \(\d+s\)/ })).toBeDisabled();

  // A wrong code says so and leaves the patient on the code step.
  await page.getByLabel("Enter your sign-in code").fill("000000");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(/didn't work|expired/)).toBeVisible();
  await expect(page.getByLabel("Enter your sign-in code")).toBeVisible();

  await page.getByLabel("Enter your sign-in code").fill(await otpFor(user.email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/portal/, { timeout: 30_000 });

  // Signed in: the pending sign-in is forgotten, so /login starts afresh.
  await page.goto("/login");
  await expect(page.getByLabel("Email address")).toBeVisible();
  await ctx.close();
});

test("the emailed link signs in from a browser that never asked for a code", async ({ browser }) => {
  const user = await createUser("customer", "login-link");
  registerUser(user.id);
  const { data, error } = await admin().auth.admin.generateLink({
    type: "magiclink",
    email: user.email,
    options: { redirectTo: "http://localhost:3000/portal/tracker" },
  });
  if (error) throw error;
  const hash = data.properties.hashed_token;

  // A fresh context: no cookies, no PKCE verifier, nothing from the login page.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`/auth/confirm?token_hash=${hash}&type=magiclink&redirect_to=${encodeURIComponent("http://localhost:3000/portal/tracker")}`);
  await page.waitForURL(/\/portal\/tracker/, { timeout: 30_000 });
  await expect(page).not.toHaveURL(/\/login/);

  // Used once: a second visit goes back to login with a message.
  await page.goto(`/auth/confirm?token_hash=${hash}&type=magiclink`);
  await expect(page).toHaveURL(/\/login\?error=link/);
  await expect(page.getByText("That sign-in link has expired or was already used")).toBeVisible();

  // Off-site redirect_to values collapse to the role home, never leave the portal.
  await page.goto(`/auth/confirm?token_hash=nope&type=email&redirect_to=${encodeURIComponent("https://evil.example/x")}`);
  await expect(page).toHaveURL(/\/login\?error=link$/);
  await ctx.close();
});
