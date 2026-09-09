"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { findClaimableKit, kitCodeFromPath } from "@/lib/kits";

type PrepareResult =
  | { ok: true; created: boolean }
  | { ok: false; reason: "no-account" | "invalid-email" };

/**
 * Runs before the one-time code is requested. Accounts are normally created
 * by the Shopify webhook, and the login form never lets a stranger sign up.
 * The one exception is a kit bought outside the Utee store: the person
 * holding an unclaimed kit (proven by the code in the QR they scanned) gets
 * an account created here so they can sign in and claim it.
 */
export async function prepareSignIn(rawEmail: string, next: string | null): Promise<PrepareResult> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(rawEmail);
  if (!parsed.success) return { ok: false, reason: "invalid-email" };
  const email = parsed.data;

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing) return { ok: true, created: false };

  const code = kitCodeFromPath(next);
  const kit = code ? await findClaimableKit(admin, code) : null;
  if (!kit) return { ok: false, reason: "no-account" };

  const { error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { role: "customer", full_name: null, signup_source: "kit_claim" },
  });
  // Two tabs / a double submit: the account now exists, which is all we need.
  if (error && !/already|exists/i.test(error.message)) {
    console.error("[login] createUser for kit claim failed", error);
    return { ok: false, reason: "no-account" };
  }
  return { ok: true, created: !error };
}
