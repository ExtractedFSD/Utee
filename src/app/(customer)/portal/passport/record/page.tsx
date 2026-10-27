import Link from "next/link";
import { Breadcrumb, Card, PageHeader } from "@/components/ui";
import { loadAll, loadCultures, loadInvestigations, loadPreventions, loadVerifications, requireTracker } from "@/lib/tracker/data";
import { loadUteeCultures } from "@/lib/tracker/load";
import { copy } from "@/lib/tracker/copy";
import { CONTRACEPTION, MENOPAUSE_STAGES, PREGNANT, TEST_KINDS, TEST_RESULTS, labelFor } from "@/lib/tracker/options";
import { FIRST_UTI_ONSET, MEDICAL_HISTORY, firstUtiText, formatNhsNumber } from "@/lib/tracker/passport";
import { preventionShortName } from "@/lib/tracker/prevention";
import { antibioticName } from "@/lib/tracker/search";
import { formatDay } from "@/lib/tracker/stats";
import { AboutMeForm, type Step } from "../about-me/AboutMeForm";
import { CulturesManager, type SimpleTest } from "../cultures/CulturesManager";
import { InvestigationsManager } from "../investigations/InvestigationsManager";
import { PreventionManager } from "../prevention/PreventionManager";

const TABS = ["about", "results", "investigations", "taking"] as const;
type Tab = (typeof TABS)[number];

/**
 * Record: the passport's reference pages behind one row of pill tabs. The
 * tab is in the address (?tab=results) so links from At a glance land on
 * the right one; About you opens its three steps with ?step=N.
 */
export default async function RecordPage({ searchParams }: { searchParams: Promise<{ tab?: string; step?: string }> }) {
  const { tab: wanted, step: wantedStep } = await searchParams;
  const tab: Tab = TABS.includes(wanted as Tab) ? (wanted as Tab) : "results";
  const { supabase, user, profile } = await requireTracker();
  const unaAi = profile.una_ai !== false;
  const step = tab === "about" && [1, 2, 3].includes(Number(wantedStep)) ? (Number(wantedStep) as Step) : null;

  if (step) {
    const active = (await loadPreventions(supabase, user.id)).filter((p) => !p.stopped_on);
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <PageHeader
          eyebrow={copy.record.steps.eyebrow(step)}
          title={copy.record.steps.titles[step - 1]}
          subtitle={copy.record.steps.reasons[step - 1]}
          breadcrumb={<Breadcrumb href="/portal/passport/record?tab=about" label={copy.nav.record} />}
        />
        <AboutMeForm profile={profile} active={active} step={step} stepHref={(n) => `/portal/passport/record?tab=about&step=${n}`} backHref="/portal/passport/record?tab=about" done="/portal/passport/record?tab=about" />
      </div>
    );
  }

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
          <p className="text-sm text-[#5a4a6e]">{copy.record.aboutIntro}</p>
          {await (async () => {
            const active = (await loadPreventions(supabase, user.id)).filter((p) => !p.stopped_on);
            const none = copy.record.steps.none;
            const values: string[][] = [
              [labelFor(MENOPAUSE_STAGES, profile.menopause_stage), labelFor(CONTRACEPTION, profile.contraception), labelFor(PREGNANT, profile.pregnant_or_trying), active.length ? active.map(preventionShortName).join(", ") : none],
              [firstUtiText(profile) ?? none, profile.lifetime_utis !== null ? `${profile.lifetime_utis} UTIs in all` : none, profile.medical_history.length ? profile.medical_history.map((k) => (k === "other" ? profile.medical_history_other?.trim() || "Other" : MEDICAL_HISTORY.find((o) => o.key === k)?.label ?? k)).join(", ") : none, profile.allergies?.length ? profile.allergies.map((a) => antibioticName(a.antibiotic_id, a.other_name)).join(", ") : none],
              [profile.phone ?? none, profile.local_hospital ?? none, [profile.address_line1, profile.city, profile.postcode].filter(Boolean).join(", ") || none, formatNhsNumber(profile.nhs_number) ?? none],
            ];
            return (
              <Card data-testid="about-overview">
                <ol className="divide-y divide-[rgba(29,0,58,.08)]">
                  {copy.record.steps.titles.map((title, i) => (
                    <li key={title}>
                      <Link href={`/portal/passport/record?tab=about&step=${i + 1}`} className="flex min-h-[56px] items-center justify-between gap-4 py-3">
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-midnight">{title}</span>
                          <span className="block text-[13px] text-[#5a4a6e]">{values[i].filter((v) => v !== none).join(" · ") || copy.record.steps.overview[i]}</span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-maroon">{copy.record.steps.edit}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              </Card>
            );
          })()}
        </>
      )}

      {tab === "results" && (
        <>
          {await (async () => {
            const [rows, utee, verifications, data] = await Promise.all([loadCultures(supabase, user.id), loadUteeCultures(user.id), loadVerifications(supabase, user.id), loadAll(supabase, user.id)]);
            const simple: SimpleTest[] = data.tests
              .filter((t) => !t.kit_id || !utee.some((c) => c.id === `utee:${t.kit_id}`))
              .map((t) => {
                const ep = data.episodes.find((e) => e.id === t.episode_id);
                return {
                  id: t.id,
                  on: t.tested_on ?? ep?.started_on ?? null,
                  text: t.kit_id ? labelFor(TEST_KINDS, "utee") : labelFor(TEST_KINDS, t.kind),
                  detail: [t.result ? labelFor(TEST_RESULTS, t.result) : null, ep ? copy.record.loggedWith(formatDay(ep.started_on).replace(/ \d{4}$/, "")) : null, t.notes].filter(Boolean).join(" · "),
                  episodeId: t.episode_id,
                };
              });
            return <CulturesManager rows={rows} utee={utee} unaAi={unaAi} verifications={verifications} intro={copy.record.resultsIntro} simpleTests={simple} />;
          })()}
          <p className="text-center text-xs text-[#8a7a9c]">{copy.record.resultsNote}</p>
        </>
      )}

      {tab === "investigations" && (
        <>
          {await (async () => {
            const [rows, verifications] = await Promise.all([loadInvestigations(supabase, user.id), loadVerifications(supabase, user.id)]);
            return <InvestigationsManager rows={rows} unaAi={unaAi} verifications={verifications} intro={copy.record.investigationsIntro} />;
          })()}
          <p className="text-center text-xs text-[#8a7a9c]">{copy.record.investigationsNote}</p>
        </>
      )}

      {tab === "taking" && (
        <>
          <PreventionManager rows={await loadPreventions(supabase, user.id)} intro={copy.record.takingIntro} />
          <p className="text-center text-xs text-[#8a7a9c]">{copy.record.takingNote}</p>
        </>
      )}
    </div>
  );
}
