import { requireRole } from "@/lib/auth";
import { Shell, type NavItem } from "@/components/Shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin"]);
  const superAdmin = user.role === "super_admin";
  const nav: NavItem[] = [
    { href: "/admin", label: "Patients" },
    { href: "/admin/kits", label: "Kits" },
    { href: "/lab", label: "Lab view" },
    { href: "/clinic", label: "Clinic view" },
  ];
  if (superAdmin) {
    nav.push({
      label: "Super admin",
      items: [
        { href: "/admin/dashboard", label: "Dashboard" },
        { href: "/admin/kits/batches", label: "Kit batches" },
        { href: "/admin/users", label: "Users" },
        { href: "/admin/emails", label: "Email log" },
      ],
    });
  }
  return (
    <Shell areaLabel={superAdmin ? "Super admin" : "Admin"} userEmail={user.email} nav={nav}>
      {children}
    </Shell>
  );
}
