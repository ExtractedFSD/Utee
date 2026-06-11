import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { homeForRole, type Role } from "@/lib/status";

export type SessionUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role as Role,
  };
}

/**
 * Guard for layouts/pages/actions. Redirects to login when signed out and to
 * the user's own area when they lack the required role. Admins can enter the
 * lab/clinic areas; super_admin can enter everything.
 */
export async function requireRole(allowed: Role[]): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const effectiveAllowed = new Set<Role>(allowed);
  effectiveAllowed.add("super_admin");
  if (allowed.includes("lab") || allowed.includes("clinic")) {
    effectiveAllowed.add("admin");
  }

  if (!effectiveAllowed.has(user.role)) redirect(homeForRole(user.role));
  return user;
}
