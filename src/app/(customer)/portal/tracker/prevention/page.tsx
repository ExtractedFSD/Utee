import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { loadPreventions, requireTracker } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { PreventionManager } from "./PreventionManager";

export default async function PreventionPage() {
  const { supabase, user } = await requireTracker();
  const rows = await loadPreventions(supabase, user.id);
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Tracker"
        title={copy.prevention.title}
        subtitle={copy.prevention.intro}
        action={<div className="flex flex-wrap gap-4"><Link href="/portal/tracker/setup?mode=prevention" className="text-sm font-semibold text-maroon">{copy.prevention.updateByChat}</Link><Link href="/portal/tracker" className="text-sm font-semibold text-maroon">Back to tracker</Link></div>}
      />
      <PreventionManager rows={rows} />
    </div>
  );
}
