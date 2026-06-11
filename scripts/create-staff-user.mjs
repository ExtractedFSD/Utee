#!/usr/bin/env node
/**
 * Create a staff user (lab / clinic / admin / super_admin) or a test customer.
 *
 *   node scripts/create-staff-user.mjs <email> <role> ["Full Name"]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the
 * environment (e.g. `set -a; source .env.local; set +a` first).
 * Staff sign in at /login with the usual one-time email code.
 */
import { createClient } from "@supabase/supabase-js";

const [email, role, fullName] = process.argv.slice(2);
const valid = ["customer", "lab", "clinic", "admin", "super_admin"];

if (!email || !valid.includes(role)) {
  console.error(`Usage: node scripts/create-staff-user.mjs <email> <${valid.join("|")}> ["Full Name"]`);
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}

const supabase = createClient(url, key);
const { data, error } = await supabase.auth.admin.createUser({
  email: email.toLowerCase(),
  email_confirm: true,
  user_metadata: { role, full_name: fullName ?? null },
});

if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(`Created ${role} user ${data.user.email} (${data.user.id})`);
