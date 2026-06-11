import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["admin"]);
  const nav = [
    { href: "/admin", label: "Patients" },
    { href: "/admin/kits", label: "Kits" },
    { href: "/lab", label: "Lab view" },
    { href: "/clinic", label: "Clinic view" },
  ];
  if (user.role === "super_admin") {
    nav.push({ href: "/admin/dashboard", label: "Dashboard" });
  }
  return (
    <Shell areaLabel="Admin" userEmail={user.email} nav={nav}>
      {children}
    </Shell>
  );
}
