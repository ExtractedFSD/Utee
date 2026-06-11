import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";

export default async function ClinicLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["clinic"]);
  return (
    <Shell
      areaLabel="Clinic"
      userEmail={user.email}
      nav={[{ href: "/clinic", label: "Cases" }]}
    >
      {children}
    </Shell>
  );
}
