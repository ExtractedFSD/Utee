import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expect, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { loadEnv, requireEnv } from "./env";

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
 * The browser's other calls to Supabase (just the code verification — every
 * other data access in the app is server-side) are relayed through Node.
 * That keeps the suite working in CI sandboxes where only the test runner,
 * not the browser, has outbound network access.
 */
export async function loginViaUi(page: Page, email: string, next: string) {
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
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "Email me a code" }).click();
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
    .select("id, code, status, customer_id, order_id")
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

/** Newest unassigned kit — what "Create batch" of 1 just produced. */
export async function newestCreatedKitCode(): Promise<string> {
  const { data } = await admin()
    .from("kits")
    .select("code")
    .eq("status", "created")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (!data) throw new Error("no unassigned kit found");
  registerKit(data.code);
  return data.code;
}

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
/** Inserts a printed-but-unassigned kit directly (for tests that don't cover the batch UI). */
export async function insertKit(): Promise<{ id: string; code: string }> {
  for (let attempt = 0; attempt < 5; attempt++) {
    let code = "UT-";
    for (let i = 0; i < 6; i++) code += CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)];
    const { data, error } = await admin().from("kits").insert({ code }).select("id, code").single();
    if (!error && data) {
      registerKit(data.code);
      return data;
    }
    if (error?.code !== "23505") throw new Error(error?.message);
  }
  throw new Error("could not insert a unique kit code");
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
