import fs from "node:fs";
import { admin, REGISTRY_FILE, TEST_EMAIL_DOMAIN } from "./helpers";

/**
 * Deletes everything the suite created: kits it printed (and, by cascade,
 * their shipments, events, triage, lab and clinic rows), report PDFs, orders
 * placed by test webhooks, and every @e2e.invalid auth user (profiles cascade).
 * Nothing outside the test email domain / registered kit codes is touched.
 */
export default async function globalTeardown() {
  if (process.env.E2E_KEEP) {
    console.log(`[e2e] E2E_KEEP set — leaving test data in place (${REGISTRY_FILE})`);
    return;
  }
  const db = admin();
  let registry: { kits: string[]; users: string[] } = { kits: [], users: [] };
  try {
    registry = JSON.parse(fs.readFileSync(REGISTRY_FILE, "utf8"));
  } catch {
    // nothing registered
  }

  // Kits owned by test users that weren't registered explicitly (e.g. claimed).
  const { data: testProfiles } = await db
    .from("profiles")
    .select("id")
    .like("email", `%@${TEST_EMAIL_DOMAIN}`);
  const testUserIds = new Set<string>([...(testProfiles ?? []).map((p) => p.id), ...registry.users]);
  if (testUserIds.size) {
    const { data: ownedKits } = await db
      .from("kits")
      .select("code")
      .in("customer_id", [...testUserIds]);
    for (const k of ownedKits ?? []) if (!registry.kits.includes(k.code)) registry.kits.push(k.code);
  }

  for (const code of registry.kits) {
    for (const bucket of ["lab-reports", "clinic-reports"]) {
      const { data: files } = await db.storage.from(bucket).list(code);
      if (files?.length) {
        await db.storage.from(bucket).remove(files.map((f) => `${code}/${f.name}`));
      }
    }
  }
  if (registry.kits.length) {
    const { error } = await db.from("kits").delete().in("code", registry.kits);
    if (error) console.error("[e2e] kit cleanup failed", error.message);
  }

  const { error: orderError } = await db.from("orders").delete().like("email", `%@${TEST_EMAIL_DOMAIN}`);
  if (orderError) console.error("[e2e] order cleanup failed", orderError.message);

  for (const id of testUserIds) {
    const { error } = await db.auth.admin.deleteUser(id);
    if (error && !/not found/i.test(error.message)) {
      console.error(`[e2e] deleteUser ${id} failed`, error.message);
    }
  }

  fs.rmSync(REGISTRY_FILE, { force: true });
  console.log(
    `[e2e] cleaned up ${registry.kits.length} kits and ${testUserIds.size} test users`
  );
}
