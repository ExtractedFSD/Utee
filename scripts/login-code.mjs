#!/usr/bin/env node
/**
 * Dev helper: print a one-time login code for an account, bypassing email.
 * Useful when SMTP isn't set up yet or you hit Supabase's email rate limit.
 *
 *   node scripts/login-code.mjs <email>
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (e.g. `set -a; source .env.local; set +a` first).
 * Enter the printed code on the /login page as usual.
 */
import { createClient } from "@supabase/supabase-js";

const [email] = process.argv.slice(2);
if (!email) {
  console.error("Usage: node scripts/login-code.mjs <email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const supabase = createClient(url, key);
const { data, error } = await supabase.auth.admin.generateLink({
  type: "magiclink",
  email: email.toLowerCase(),
});
if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}

console.log(`Login code for ${email}: ${data.properties.email_otp}`);
console.log("Enter it on the /login page (valid for ~1 hour, single use).");
