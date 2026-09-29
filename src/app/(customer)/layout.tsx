import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["customer"]);
  return (
    <Shell
      tone="brand"
      areaLabel="Patient portal"
      userEmail={user.email}
      nav={[
        { href: "/portal", label: "Home" },
        { href: "/portal/tracker", label: "Tracker" },
        { href: "/portal/orders", label: "Orders" },
        { href: "/portal/subscriptions", label: "Subscriptions" },
      ]}
    >
      {children}
    </Shell>
  );
}
