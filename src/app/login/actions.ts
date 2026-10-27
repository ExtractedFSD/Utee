"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeKitCode } from "@/lib/kit-code";

type PrepareResult =
  | { ok: true; created: boolean }
  | { ok: false; reason: "no-account" | "invalid-email" | "name-required" | "dob-required" | "exists" };

/**
 * Runs before the one-time code is requested.
 *   signin: the email must already have an account (created by a Shopify
 *           order, by staff, or by signing up here).
 *   signup: creates a customer account with the given name. Anyone can sign
 *           up: the tracker is open to people who have never bought a test,
 *           and a kit bought in a shop is claimed after signing in.
 * The one-time code emailed by Supabase verifies the address either way.
 */
export async function prepareSignIn(
  rawEmail: string,
  mode: "signin" | "signup",
  fullName?: string,
  dateOfBirth?: string
): Promise<PrepareResult> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(rawEmail);
  if (!parsed.success) return { ok: false, reason: "invalid-email" };
  const email = parsed.data;

  const admin = createAdminClient();
  const { data: existing } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();

  if (mode === "signin") {
    return existing ? { ok: true, created: false } : { ok: false, reason: "no-account" };
  }

  if (existing) return { ok: false, reason: "exists" };
  const name = (fullName ?? "").trim().slice(0, 120);
  if (!name) return { ok: false, reason: "name-required" };
  const dob = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).safeParse(dateOfBirth ?? "");
  const today = new Date().toISOString().slice(0, 10);
  const earliest = `${new Date().getUTCFullYear() - 120}-01-01`;
  if (!dob.success || dob.data >= today || dob.data < earliest) return { ok: false, reason: "dob-required" };

  const { error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role: "customer", full_name: name, date_of_birth: dob.data, signup_source: "portal" },
  });
  // Two tabs / a double submit: the account now exists, which is all we need.
  if (error && !/already|exists/i.test(error.message)) {
    console.error("[login] createUser failed", error);
    return { ok: false, reason: "no-account" };
  }
  return { ok: true, created: !error };
}

export type KitOrigin = "online" | "retail" | "unknown";

/**
 * Where the kit at the end of a sign-in link was sold, so the page can say
 * which email to use before anyone types one. Only the origin leaves the
 * server: never the owner, the order or the kit's progress.
 *   online:  assigned to an order, so the account already exists under the
 *            order's email
 *   retail:  printed stock nobody owns yet, claimed by whoever signs in
 *   unknown: no such kit, cancelled, or not yet printed
 */
export async function kitOrigin(rawCode: string): Promise<KitOrigin> {
  const code = normalizeKitCode(rawCode);
  if (!code) return "unknown";
  const admin = createAdminClient();
  const { data: kit } = await admin.from("kits").select("status, customer_id").eq("code", code).maybeSingle();
  if (!kit || kit.status === "voided" || kit.status === "generated") return "unknown";
  if (kit.customer_id || kit.status !== "printed") return "online";
  return "retail";
}
