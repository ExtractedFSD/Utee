import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { loadCultures, loadInvestigations, loadPreventions, loadVerifications, requireTracker } from "@/lib/tracker/data";
import { loadUteeCultures } from "@/lib/tracker/load";
import { copy } from "@/lib/tracker/copy";
import { AboutMeForm } from "../about-me/AboutMeForm";
import { CulturesManager } from "../cultures/CulturesManager";
import { InvestigationsManager } from "../investigations/InvestigationsManager";
import { PreventionManager } from "../prevention/PreventionManager";

const TABS = ["about", "results", "investigations", "taking"] as const;
type Tab = (typeof TABS)[number];

/**
 * Record: the passport's reference pages behind one row of pill tabs, so
 * About you, Results, Investigations and Taking have a home. The tab is in
 * the URL (?tab=results) so links from At a glance land on the right one.
 */
export default async function RecordPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab: wanted } = await searchParams;
  const tab: Tab = TABS.includes(wanted as Tab) ? (wanted as Tab) : "results";
  const { supabase, user, profile } = await requireTracker();
  const unaAi = profile.una_ai !== false;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader eyebrow="UTI Passport" title={copy.record.title} />
      <div className="-mt-4 -mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="tablist" aria-label={copy.record.title}>
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/portal/passport/record?tab=${t}`}
            role="tab"
            aria-selected={tab === t}
            className={`inline-flex min-h-[44px] shrink-0 items-center rounded-full px-5 text-sm font-semibold transition-colors ${
              tab === t ? "bg-maroon text-white shadow-card" : "bg-white text-midnight border border-midnight/15 hover:bg-pink-25"
            }`}
          >
            {copy.record.tabs[t]}
          </Link>
        ))}
      </div>

      {tab === "about" && (
        <>
          <p className="text-sm text-slate-600">{copy.record.aboutIntro}</p>
          <Card>
            <AboutMeForm profile={profile} active={(await loadPreventions(supabase, user.id)).filter((p) => !p.stopped_on)} next="/portal/passport/record?tab=about" />
          </Card>
        </>
      )}

      {tab === "results" && (
        <>
          <p className="text-sm text-slate-600">{copy.record.resultsIntro}</p>
          {await (async () => {
            const [rows, utee, verifications] = await Promise.all([loadCultures(supabase, user.id), loadUteeCultures(user.id), loadVerifications(supabase, user.id)]);
            return <CulturesManager rows={rows} utee={utee} unaAi={unaAi} verifications={verifications} />;
          })()}
          <p className="text-center text-xs text-slate-500">{copy.record.resultsNote}</p>
        </>
      )}

      {tab === "investigations" && (
        <>
          <p className="text-sm text-slate-600">{copy.record.investigationsIntro}</p>
          {await (async () => {
            const [rows, verifications] = await Promise.all([loadInvestigations(supabase, user.id), loadVerifications(supabase, user.id)]);
            return <InvestigationsManager rows={rows} unaAi={unaAi} verifications={verifications} />;
          })()}
          <p className="text-center text-xs text-slate-500">{copy.record.resultsNote}</p>
        </>
      )}

      {tab === "taking" && (
        <>
          <p className="text-sm text-slate-600">{copy.record.takingIntro}</p>
          <PreventionManager rows={await loadPreventions(supabase, user.id)} />
        </>
      )}
    </div>
  );
}
