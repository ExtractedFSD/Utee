import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { loadEnv, requireEnv } from "./env";
import { formatKitCode, generateKitCode } from "../src/lib/kit-code";

loadEnv();

export const RUN = Date.now().toString(36);
export const BASE_URL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
export const TEST_EMAIL_DOMAIN = "e2e.invalid";

/** Path of the registry teardown uses to delete everything a run created. */
export const REGISTRY_FILE = path.resolve("e2e/.registry.json");

type Registry = { kits: string[]; users: string[] };

function readRegistry(): Registry {
  try {
    return JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
  } catch {
    return { kits: [], users: [] };
  }
}

function writeRegistry(reg: Registry) {
  fs.mkdirSync(path.dirname(REGISTRY_FILE), { recursive: true });
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(reg, null, 2));
}

export function registerKit(code: string) {
  const reg = readRegistry();
  if (!reg.kits.includes(code)) reg.kits.push(code);
  writeRegistry(reg);
}

export function registerUser(id: string) {
  const reg = readRegistry();
  if (!reg.users.includes(id)) reg.users.push(id);
  writeRegistry(reg);
}

let adminClient: SupabaseClient | null = null;
/** Service-role client: the same access the app's server side has. */
export function admin(): SupabaseClient {
  if (!adminClient) {
    adminClient = createClient(
      requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
      requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return adminClient;
}

export function anonClient(): SupabaseClient {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export type Role = "customer" | "lab" | "clinic" | "admin" | "super_admin";

export function emailFor(label: string) {
  return `e2e-${label}-${RUN}@${TEST_EMAIL_DOMAIN}`;
}

/** Creates a confirmed account the same way the webhook / staff script do. */
export async function createUser(role: Role, label: string, fullName?: string) {
  const email = emailFor(label);
  const { data, error } = await admin().auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role, full_name: fullName ?? `E2E ${label}` },
  });
  if (error || !data.user) throw new Error(`createUser(${label}) failed: ${error?.message}`);
  registerUser(data.user.id);
  return { id: data.user.id, email, fullName: fullName ?? `E2E ${label}` };
}

/** The one-time code the login page would email, obtained without email. */
export async function otpFor(email: string): Promise<string> {
  const { data, error } = await admin().auth.admin.generateLink({ type: "magiclink", email });
  if (error) throw new Error(`generateLink(${email}) failed: ${error.message}`);
  return data.properties.email_otp;
}

export async function sessionFor(email: string) {
  const { data, error } = await anonClient().auth.verifyOtp({
    email,
    token: await otpFor(email),
    type: "email",
  });
  if (error || !data.session) throw new Error(`verifyOtp(${email}) failed: ${error?.message}`);
  return data.session;
}

/**
 * Signs a browser context in without touching the login page: the session is
 * minted server-side and serialised into cookies by @supabase/ssr itself, so
 * the format always matches what the app's middleware expects.
 */
export async function loginAs(context: BrowserContext, email: string) {
  const session = await sessionFor(email);
  const jar: { name: string; value: string }[] = [];
  const ssr = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll: () => jar,
        setAll: (cookies: { name: string; value: string }[]) => {
          for (const c of cookies) jar.push({ name: c.name, value: c.value });
        },
      },
    }
  );
  await ssr.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  const url = new URL(BASE_URL);
  await context.addCookies(
    jar.map((c) => ({
      name: c.name,
      value: c.value,
      domain: url.hostname,
      path: "/",
      httpOnly: false,
      secure: url.protocol === "https:",
      sameSite: "Lax" as const,
    }))
  );
  return session;
}

const SUPABASE_HOST = new URL(requireEnv("NEXT_PUBLIC_SUPABASE_URL")).host;

/**
 * Signs in through the real login page. The only network call that would
 * send an email (Supabase's /auth/v1/otp) is stubbed so nothing is sent to
 * the throwaway address; the server action that gates account creation and
 * the code verification both run for real.
 *
 * The browser's other calls to Supabase (just the code verification, every
 * other data access in the app is server-side) are relayed through Node.
 * That keeps the suite working in CI sandboxes where only the test runner,
 * not the browser, has outbound network access.
 */
export async function loginViaUi(page: Page, email: string, next: string, signup?: { name: string; dateOfBirth?: string }) {
  const relay = async (route: import("@playwright/test").Route) => {
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
  };
  await page.route((url) => url.host === SUPABASE_HOST, relay);
  await page.goto(`/login?next=${encodeURIComponent(next)}`);
  if (signup) {
    await page.getByRole("button", { name: "Create account" }).first().click();
    await page.getByLabel("Your name").fill(signup.name);
    await page.getByLabel("Date of birth").fill(signup.dateOfBirth ?? "1990-05-14");
  }
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: signup ? "Create account" : "Email me a code" }).last().click();
  await expect(page.getByLabel("Enter your sign-in code")).toBeVisible();
  await page.getByLabel("Enter your sign-in code").fill(await otpFor(email));
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 30_000 });
  await page.unroute((url) => url.host === SUPABASE_HOST, relay);
}

/** Scopes locators to one of the admin fulfilment cards by its heading. */
export function card(page: Page, title: string) {
  return page.locator("div").filter({ has: page.getByRole("heading", { name: title, exact: true }) }).last();
}

// ----------------------------------------------------------------- webhooks

export function shopifyOrderPayload(opts: {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  testKit?: boolean;
  financialStatus?: string;
}) {
  return {
    id: opts.id,
    name: `#E2E${opts.id}`,
    email: opts.email,
    created_at: new Date().toISOString(),
    total_price: "29.00",
    currency: "GBP",
    financial_status: opts.financialStatus ?? "paid",
    fulfillment_status: null,
    customer: {
      id: opts.id * 10,
      email: opts.email,
      first_name: opts.firstName ?? "E2E",
      last_name: opts.lastName ?? "Patient",
    },
    line_items: [
      opts.testKit === false
        ? { id: opts.id * 100, title: "Utee Daily Supplement", sku: "UTEE-SUPP", quantity: 1, price: "29.00" }
        : { id: opts.id * 100, title: "Utee UTI Test Kit", sku: "UTEE-TEST-KIT", quantity: 1, price: "29.00" },
    ],
  };
}

export async function postShopify(
  request: APIRequestContext,
  topic: string,
  payload: unknown,
  opts: { secret?: string } = {}
) {
  const body = JSON.stringify(payload);
  const secret = opts.secret ?? requireEnv("SHOPIFY_WEBHOOK_SECRET");
  const hmac = crypto.createHmac("sha256", secret).update(body, "utf8").digest("base64");
  return request.post("/api/webhooks/shopify", {
    headers: {
      "content-type": "application/json",
      "x-shopify-topic": topic,
      "x-shopify-hmac-sha256": hmac,
    },
    data: body,
  });
}

export async function postTracking(
  request: APIRequestContext,
  payload: unknown,
  opts: { secret?: string | null } = {}
) {
  const secret = opts.secret === undefined ? requireEnv("TRACKING_WEBHOOK_SECRET") : opts.secret;
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret) headers["x-tracking-secret"] = secret;
  return request.post("/api/webhooks/tracking", {
    headers,
    data: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

// ---------------------------------------------------------------------- data

export async function kitByCode(code: string) {
  const { data, error } = await admin()
    .from("kits")
    .select("id, code, status, customer_id, order_id, batch_id")
    .eq("code", code)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

/** Polls until the kit reaches the status (UI actions revalidate async). */
export async function expectKitStatus(code: string, status: string, timeoutMs = 20_000) {
  const started = Date.now();
  let last = "";
  while (Date.now() - started < timeoutMs) {
    const kit = await kitByCode(code);
    last = kit?.status ?? "(missing)";
    if (last === status) return kit!;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`kit ${code} is "${last}", expected "${status}" after ${timeoutMs}ms`);
}

/** Newest printed, unassigned kit: what a one-code batch marked as printed just produced. */
export async function newestPrintedKitCode(): Promise<string> {
  const { data } = await admin()
    .from("kits")
    .select("code")
    .eq("status", "printed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!data) throw new Error("no unassigned kit found");
  registerKit(data.code);
  return data.code;
}

/** Inserts a printed-but-unassigned kit directly (for tests that don't cover the batch UI). */
export async function insertKit(status: "printed" | "generated" | "voided" = "printed"): Promise<{ id: string; code: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateKitCode();
    const { data, error } = await admin().from("kits").insert({ code, status }).select("id, code").single();
    if (!error && data) {
      registerKit(data.code);
      return data;
    }
    if (error?.code !== "23505") throw new Error(error?.message);
  }
  throw new Error("could not insert a unique kit code");
}

/**
 * Walks the super admin through a print run of `quantity` codes: generate,
 * check the CSV, mark as sent to the printer. Returns the batch id and the
 * stored codes in print order.
 */
export async function createBatchViaUi(page: Page, quantity: number, note: string) {
  await page.goto("/admin/kits/batches");
  await page.getByLabel("Quantity").fill(String(quantity));
  await page.getByLabel("Note (optional)").fill(note);
  await page.getByRole("button", { name: "Generate codes" }).click();
  await page.waitForURL(/\/admin\/kits\/batches\/\d+$/);
  const batchId = Number(page.url().split("/").pop());
  const { data: kits } = await admin()
    .from("kits")
    .select("code, status, sequence_number")
    .eq("batch_id", batchId)
    .order("sequence_number", { ascending: true });
  for (const k of kits ?? []) registerKit(k.code);
  expect(kits).toHaveLength(quantity);
  expect(kits!.every((k) => k.status === "generated")).toBe(true);
  expect(kits!.map((k) => k.sequence_number)).toEqual(Array.from({ length: quantity }, (_, i) => i + 1));

  const csv = await page.request.get(`/admin/kits/batches/${batchId}/csv`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-disposition"]).toContain(`utee-kit-codes-batch-${batchId}-${quantity}.csv`);
  const lines = (await csv.text()).trim().split(/\r?\n/);
  expect(lines[0]).toBe("sequence,kit_code_display,qr_url");
  expect(lines).toHaveLength(quantity + 1);
  expect(lines[1]).toBe(`1,${formatKitCode(kits![0].code)},${requireEnv("NEXT_PUBLIC_APP_URL")}/k/${kits![0].code}`);

  page.once("dialog", (d) => d.accept());
  await page.getByRole("button", { name: "Mark as sent to printer" }).click();
  await expect(page.getByText(/Marked as sent to the printer/)).toBeVisible();
  return { batchId, codes: kits!.map((k) => k.code) };
}

export async function kitEvents(kitId: string) {
  const { data } = await admin()
    .from("kit_events")
    .select("type, label, detail, visible_to_customer, actor_role")
    .eq("kit_id", kitId)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export async function listStorage(bucket: string, code: string) {
  const { data } = await admin().storage.from(bucket).list(code);
  return data ?? [];
}

/** A small but valid single-page PDF. */
export function samplePdf(text: string): Buffer {
  const content = `BT /F1 24 Tf 72 720 Td (${text.replace(/[()\\]/g, "")}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((obj, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

export function trackingNumber(label: string) {
  return `E2E${label}${RUN}${crypto.randomInt(1000, 9999)}`.toUpperCase();
}

// ------------------------------------------------------------------ triage

/**
 * Walks the four-step questionnaire on /triage/[code]. Safety answers default
 * to "no" (the path that reaches the rest of the form); pass `flag` to answer
 * one of them "yes" and check the urgent-care screen appears, then continue.
 */
export async function completeTriage(
  page: Page,
  opts: {
    flag?: string;
    previousUti?: "yes" | "no" | "unsure";
    antibiotics?: { search: string; worked?: "yes" | "no" | "partly" | "taking" }[];
    /** Picks "I don't know / can't remember" instead of naming antibiotics. */
    antibioticsUnknown?: boolean;
    symptoms?: string[];
    change?: number;
    duration?: string;
    pregnant?: "yes" | "no" | "not_applicable";
    notes?: string;
    research?: boolean;
  } = {}
) {
  const form = page.locator("form[data-step]");
  await expect(form).toHaveAttribute("data-step", "0");
  for (let i = 1; i <= 8; i++) {
    const key = `d${i}`;
    await page.locator(`input[name="${key}"][value="${opts.flag === key ? "yes" : "no"}"]`).check();
  }
  await page.getByRole("button", { name: "Continue" }).click();
  if (opts.flag) {
    await expect(page.getByTestId("triage-urgent")).toBeVisible();
    await expect(page.getByRole("link", { name: "Call 111" })).toHaveAttribute("href", "tel:111");
    await page.getByRole("button", { name: "I have read this, continue with my test" }).click();
  }
  await expect(form).toHaveAttribute("data-step", "1");

  const previousUti = opts.previousUti ?? "no";
  await page.locator(`input[name="previousUti"][value="${previousUti}"]`).check();
  if (previousUti === "yes") {
    await page.locator('input[name="episodes6m"]').fill("2");
    await page.locator('input[name="episodes12m"]').fill("3");
    if (opts.antibioticsUnknown) {
      await page.getByRole("button", { name: "I don't know / can't remember" }).click();
      await expect(page.getByRole("combobox", { name: "Search by name or brand" })).toHaveCount(0);
      await expect(page.getByText("Did it work?")).toHaveCount(0);
    }
    for (const [i, a] of (opts.antibiotics ?? []).entries()) {
      if (i > 0) {
        // The picker folds away after the first one; the list stays.
        await expect(page.getByRole("combobox", { name: "Search by name or brand" })).toHaveCount(0);
        await page.getByRole("button", { name: "+ Add another antibiotic" }).click();
      }
      await page.getByRole("combobox", { name: "Search by name or brand" }).fill(a.search);
      await page.getByRole("option").first().click();
      if (a.worked) await page.locator(`input[name="worked-${i}"][value="${a.worked}"]`).check();
    }
  }
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(form).toHaveAttribute("data-step", "2");

  const symptoms = opts.symptoms ?? [];
  if (symptoms.length === 0) await page.locator('input[name="symptom"][value="none"]').check();
  for (const key of symptoms) await page.locator(`input[name="symptom"][value="${key}"]`).check();
  await page.locator(`input[name="change24h"][value="${opts.change ?? 0}"]`).check({ force: true });
  await page.locator('select[name="duration"]').selectOption(opts.duration ?? "1–3 days");
  await page.locator(`input[name="pregnant"][value="${opts.pregnant ?? "no"}"]`).check();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(form).toHaveAttribute("data-step", "3");

  if (opts.notes) await page.locator('textarea[name="notes"]').fill(opts.notes);
  await page.locator('input[name="consent"]').check();
  if (opts.research) await page.locator('input[name="research"]').check();
  await page.getByRole("button", { name: "Submit & take my sample" }).click();
}
