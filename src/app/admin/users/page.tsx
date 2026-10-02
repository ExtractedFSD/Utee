import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardTitle, PageHeader } from "@/components/ui";
import { formatDateTime, type Role } from "@/lib/status";
import { ROLE_HELP, ROLE_LABELS } from "@/lib/roles";
import { CreateUserForm, RoleSelect } from "./UserTools";

const ROLE_ORDER: Role[] = ["super_admin", "admin", "fulfilment", "clinic", "lab", "customer"];

/** Everyone with an account, what they can see, and the tools to change it. Super admin only. */
export default async function UsersPage({ searchParams }: { searchParams: Promise<{ role?: string; q?: string }> }) {
  const me = await requireRole(["admin"]);
  if (me.role !== "super_admin") redirect("/admin");
  const { role: roleFilter, q } = await searchParams;
  const admin = createAdminClient();

  let query = admin.from("profiles").select("id, email, full_name, role, created_at").order("created_at", { ascending: false }).limit(500);
  if (roleFilter && ROLE_ORDER.includes(roleFilter as Role)) query = query.eq("role", roleFilter);
  if (q?.trim()) query = query.or(`email.ilike.%${q.trim()}%,full_name.ilike.%${q.trim()}%`);
  const { data: users } = await query;

  const { data: counts } = await admin.from("profiles").select("role");
  const byRole = new Map<string, number>();
  for (const r of counts ?? []) byRole.set(r.role, (byRole.get(r.role) ?? 0) + 1);

  const link = (label: string, value?: string) => {
    const active = (value ?? "") === (roleFilter ?? "");
    const href = value ? `/admin/users?role=${value}` : "/admin/users";
    return (
      <a key={label} href={href} className={`rounded-full px-3 py-1.5 text-sm ${active ? "bg-midnight text-white" : "bg-white text-midnight border border-midnight/15"}`}>
        {label}
      </a>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Everyone with a portal account and what their role lets them see. Only super admins can see this page." />

      <Card>
        <CardTitle>Add a staff user</CardTitle>
        <CreateUserForm />
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <CardTitle>Accounts ({users?.length ?? 0})</CardTitle>
          <form className="flex gap-2" action="/admin/users">
            {roleFilter && <input type="hidden" name="role" value={roleFilter} />}
            <input name="q" defaultValue={q ?? ""} placeholder="Search email or name" className="rounded-full border border-slate-300 px-3 py-1.5 text-sm" />
          </form>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {link(`All (${counts?.length ?? 0})`)}
          {ROLE_ORDER.map((r) => link(`${ROLE_LABELS[r]} (${byRole.get(r) ?? 0})`, r))}
        </div>
        <table className="w-full text-sm" data-testid="users-table">
          <thead className="text-left text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
            <tr>
              <th className="py-2 pr-3">Email</th>
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Role</th>
              <th className="py-2">Created</th>
            </tr>
          </thead>
          <tbody>
            {(users ?? []).map((u) => (
              <tr key={u.id} className="border-t border-slate-100 align-top">
                <td className="py-2 pr-3 text-slate-800">
                  {u.email}
                  {u.id === me.id && <span className="ml-2 rounded-full bg-pink-25 px-2 py-0.5 text-xs text-maroon">you</span>}
                </td>
                <td className="py-2 pr-3 text-slate-600">{u.full_name ?? ""}</td>
                <td className="py-2 pr-3">
                  <RoleSelect userId={u.id} role={u.role as Role} disabled={u.id === me.id} />
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">{ROLE_HELP[u.role as Role]}</p>
                </td>
                <td className="py-2 text-slate-500 whitespace-nowrap">{formatDateTime(u.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
