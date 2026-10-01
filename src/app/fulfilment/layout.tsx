import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";

/** Packing station: the kit tools and nothing else. */
export default async function FulfilmentLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["fulfilment"]);
  return (
    <Shell areaLabel="Fulfilment" userEmail={user.email} nav={[{ href: "/fulfilment", label: "Kits" }]}>
      {children}
    </Shell>
  );
}
