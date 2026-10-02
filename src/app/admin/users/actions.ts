"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
const roleSchema = z.enum(["customer", "lab", "clinic", "fulfilment", "admin", "super_admin"]);

async function requireSuperAdmin() {
  const user = await requireRole(["admin"]);
  if (user.role !== "super_admin") return { user, error: "Only a super admin can manage users" };
  return { user, error: null };
}

/** Creates a confirmed account with a role; they sign in with the usual one-time code. */
export async function createUser(input: { email: string; role: string; fullName: string }) {
  const { error: denied } = await requireSuperAdmin();
  if (denied) return { error: denied };
  const parsed = z
    .object({ email: z.string().trim().toLowerCase().email(), role: roleSchema, fullName: z.string().trim().max(120) })
    .safeParse(input);
  if (!parsed.success) return { error: "Enter a valid email address and choose a role" };

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    email_confirm: true,
    user_metadata: { role: parsed.data.role, full_name: parsed.data.fullName || null },
  });
  if (error) {
    return { error: /already|exists/i.test(error.message) ? "There is already an account for that email" : error.message };
  }
  revalidatePath("/admin/users");
  return { ok: true, id: data.user.id };
}

/** Changes what someone can see. A super admin can't demote themselves or remove the last super admin. */
export async function setUserRole(userId: string, role: string) {
  const { user, error: denied } = await requireSuperAdmin();
  if (denied) return { error: denied };
  const parsed = roleSchema.safeParse(role);
  if (!parsed.success) return { error: "Unknown role" };
  if (userId === user.id) return { error: "You can't change your own role" };

  const admin = createAdminClient();
  const { data: target } = await admin.from("profiles").select("id, role, email").eq("id", userId).maybeSingle();
  if (!target) return { error: "User not found" };
  if (target.role === "super_admin" && parsed.data !== "super_admin") {
    const { count } = await admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "super_admin");
    if ((count ?? 0) <= 1) return { error: "That is the last super admin" };
  }

  const { error } = await admin.from("profiles").update({ role: parsed.data }).eq("id", userId);
  if (error) return { error: error.message };
  // Keep the auth metadata in step so a future profile rebuild gets the same role.
  await admin.auth.admin.updateUserById(userId, { user_metadata: { role: parsed.data } });
  revalidatePath("/admin/users");
  return { ok: true };
}
