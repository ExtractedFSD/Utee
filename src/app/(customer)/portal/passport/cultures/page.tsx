import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { requireTracker } from "@/lib/tracker/data";
import { loadUteeCultures, } from "@/lib/tracker/load";
import { loadCultures, loadVerifications } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { CulturesManager } from "./CulturesManager";

export default async function CulturesPage() {
  const { supabase, user, profile } = await requireTracker();
  const [rows, utee, verifications] = await Promise.all([loadCultures(supabase, user.id), loadUteeCultures(user.id), loadVerifications(supabase, user.id)]);
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        eyebrow="UTI Passport"
        title={copy.cultures.title}
        subtitle={copy.cultures.intro}
        action={<Link href="/portal/passport" className="text-sm font-semibold text-maroon">Back to my passport</Link>}
      />
      <CulturesManager rows={rows} utee={utee} unaAi={profile.una_ai !== false} verifications={verifications} />
      <Card className="bg-pink-25/60">
        <p className="text-sm text-slate-600">{copy.prevention.groupNote}</p>
      </Card>
    </div>
  );
}
