import { requireRole } from "@/lib/auth";
import { Shell } from "@/components/Shell";

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole(["lab"]);
  return (
    <Shell
      areaLabel="Lab"
      userEmail={user.email}
      nav={[{ href: "/lab", label: "Specimens" }]}
    >
      {children}
    </Shell>
  );
}
