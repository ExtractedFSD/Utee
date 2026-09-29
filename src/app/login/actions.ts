"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

type PrepareResult =
  | { ok: true; created: boolean }
  | { ok: false; reason: "no-account" | "invalid-email" | "name-required" | "exists" };

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
  fullName?: string
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

  const { error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role: "customer", full_name: name, signup_source: "portal" },
  });
  // Two tabs / a double submit: the account now exists, which is all we need.
  if (error && !/already|exists/i.test(error.message)) {
    console.error("[login] createUser failed", error);
    return { ok: false, reason: "no-account" };
  }
  return { ok: true, created: !error };
}
