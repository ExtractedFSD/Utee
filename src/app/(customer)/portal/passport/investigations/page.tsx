import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { loadInvestigations, loadVerifications, requireTracker } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { InvestigationsManager } from "./InvestigationsManager";

export default async function InvestigationsPage() {
  const { supabase, user, profile } = await requireTracker();
  const [rows, verifications] = await Promise.all([loadInvestigations(supabase, user.id), loadVerifications(supabase, user.id)]);
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        eyebrow="UTI Passport"
        title={copy.investigations.title}
        subtitle={copy.investigations.intro}
        action={<Link href="/portal/passport" className="text-sm font-semibold text-maroon">Back to my passport</Link>}
      />
      <InvestigationsManager rows={rows} unaAi={profile.una_ai !== false} verifications={verifications} />
      <Card className="bg-pink-25/60">
        <p className="text-sm text-slate-600">{copy.prevention.groupNote}</p>
      </Card>
    </div>
  );
}
