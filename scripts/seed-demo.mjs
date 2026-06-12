#!/usr/bin/env node
/**
 * Seed demo data so the portal can be previewed end-to-end without Shopify:
 * creates a super admin, a lab user, a clinic user, a demo patient, and a
 * paid test-kit order for that patient.
 *
 *   node scripts/seed-demo.mjs <your-admin-email> <patient-email>
 *
 * Use real inboxes you control — login codes are emailed. Requires
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment:
 *   set -a; source .env.local; set +a; node scripts/seed-demo.mjs ...
 */
import { createClient } from "@supabase/supabase-js";

const [adminEmail, patientEmail] = process.argv.slice(2);
if (!adminEmail || !patientEmail) {
  console.error("Usage: node scripts/seed-demo.mjs <your-admin-email> <patient-email>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY first.");
  process.exit(1);
}
const supabase = createClient(url, key);

async function ensureUser(email, role, fullName) {
  const normalized = email.toLowerCase();
  const { data: created, error } = await supabase.auth.admin.createUser({
    email: normalized,
    email_confirm: true,
    user_metadata: { role, full_name: fullName },
  });
  if (!error) {
    console.log(`Created ${role}: ${normalized}`);
    return created.user.id;
  }
  // Already exists — make sure the profile has the requested role.
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", normalized)
    .maybeSingle();
  if (!profile) throw new Error(`Could not create or find user ${normalized}: ${error.message}`);
  await supabase.from("profiles").update({ role, full_name: fullName }).eq("id", profile.id);
  console.log(`User ${normalized} already existed — role set to ${role}`);
  return profile.id;
}

const patientId = await ensureUser(patientEmail, "customer", "Demo Patient");
await ensureUser(adminEmail, "super_admin", "Utee Admin");
// Plus-addressed variants so you can play every role from one inbox.
const [local, domain] = adminEmail.toLowerCase().split("@");
await ensureUser(`${local}+lab@${domain}`, "lab", "Partner Lab");
await ensureUser(`${local}+clinic@${domain}`, "clinic", "Utee Clinic");

const { data: order, error: orderError } = await supabase
  .from("orders")
  .upsert(
    {
      shopify_order_id: "demo-1001",
      order_number: "#1001",
      customer_id: patientId,
      email: patientEmail.toLowerCase(),
      total_price: 49.0,
      currency: "GBP",
      financial_status: "paid",
      contains_test_kit: true,
      placed_at: new Date().toISOString(),
    },
    { onConflict: "shopify_order_id" }
  )
  .select("id")
  .single();
if (orderError) throw new Error(orderError.message);

await supabase.from("order_items").delete().eq("order_id", order.id);
await supabase.from("order_items").insert([
  {
    order_id: order.id,
    title: "Utee UTI Test Kit",
    sku: "UTEE-TEST-KIT",
    quantity: 1,
    price: 39.0,
    is_test_kit: true,
  },
  {
    order_id: order.id,
    title: "Utee Daily Cranberry+ Supplement",
    sku: "UTEE-SUPP-CRAN",
    quantity: 1,
    price: 10.0,
    is_test_kit: false,
  },
]);

console.log(`\nDemo order #1001 created for ${patientEmail}.`);
console.log("Next: sign in as the admin at /login, go to /admin/kits,");
console.log("create a kit batch, dispatch one against order #1001, and follow");
console.log("the README demo walkthrough.");
