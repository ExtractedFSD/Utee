import Link from "next/link";
import { Card, CardTitle, LinkButton, PageHeader } from "@/components/ui";
import { requireTracker, ownKits } from "@/lib/tracker/data";
import { loadAllWithUtee } from "@/lib/tracker/load";
import { copy } from "@/lib/tracker/copy";
import { SYMPTOMS } from "@/lib/tracker/options";
import { passportGlance } from "@/lib/tracker/passport";
import { antibioticName } from "@/lib/tracker/search";
import { daysBetween, isoDaysAgo, isoToday, orderByUsage, patterns, summarise } from "@/lib/tracker/stats";
import { MonthStrip } from "./components/MonthStrip";
import { PassportCard } from "./components/PassportCard";
import { PatternsCard } from "./components/PatternsCard";
import { PreventionPills } from "./components/PreventionPills";
import { TodayHero, type HeroState } from "./components/TodayHero";

/*
 * Today. The hero decides what the person is here to do; the cards below it
 * are the same every visit, so the eye learns where things are. On phones
 * the order is hero, At a glance, What I'm taking, Last 12 months, My
 * patterns; on wide screens the cards sit in two columns.
 */
export default async function TodayPage() {
  const { supabase, user, profile } = await requireTracker();
  const [data, kits] = await Promise.all([loadAllWithUtee(supabase, user.id), ownKits(supabase)]);
  const today = isoToday();
  const s = summarise(data.episodes, data.treatments, today);
  const p = patterns(data.episodes, data.symptoms, data.triggers, data.treatments);
  const open = s.openEpisode;
  const brandNew = data.episodes.length === 0;

  let state: HeroState;
  if (brandNew) state = { kind: "new" };
  else if (open) {
    const rows = data.symptoms.filter((x) => x.episode_id === open.id);
    const checkin = data.checkins.find((c) => c.on_date === today);
    state = {
      kind: "open",
      uti: {
        id: open.id,
        startedOn: open.started_on,
        day: s.openDay,
        feelingToday: checkin?.feeling ?? null,
        noteToday: checkin?.note ?? null,
        symptomsToday: rows.filter((x) => x.logged_on === today).map((x) => ({ key: x.symptom, other: x.other_text, severity: x.severity ?? null })),
        yesterdaySymptoms: rows.filter((x) => x.logged_on === isoDaysAgo(1)).map((x) => x.symptom),
        symptomOrder: orderByUsage(SYMPTOMS.map((x) => x.key), data.symptoms.map((x) => ({ key: x.symptom }))),
        unrated: data.treatments.filter((t) => t.episode_id === open.id && !t.worked).map((t) => ({ id: t.id, name: antibioticName(t.antibiotic_id, t.other_name) })),
      },
    };
  } else {
    // A Utee result published in the last week is worth a line on the hero.
    const recent = kits.find((k) => k.reportReady && k.reportAt && daysBetween(k.reportAt.slice(0, 10), today) <= 7);
    state = { kind: "between", daysSince: s.daysSinceLast ?? 0, result: recent ? { kitId: recent.id, code: recent.code } : null };
  }

  const taking = data.preventions.filter((x) => !x.stopped_on);
  const glance = passportGlance({ utis6m: s.episodes6m, utis12m: s.episodes12m }, profile, data.preventions, data.investigations, data.cultures);
  const gated = data.episodes.length >= 2;
  const storeUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "#";
  const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_URL;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="UTI Passport" title={copy.dashboard.welcomeTitle} action={
        <Link href="/portal/passport/settings" className="text-sm font-semibold text-maroon">Settings</Link>
      } />

      <TodayHero state={state} pregnantOrTrying={profile.pregnant_or_trying} />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="contents lg:block lg:space-y-6">
          <div className="order-1 lg:order-none"><PassportCard glance={glance} brandNew={brandNew} /></div>
          {gated && <div className="order-4 lg:order-none"><PatternsCard p={p} /></div>}
        </div>
        <div className="contents lg:block lg:space-y-6">
          <div className="order-2 lg:order-none">
            <Card data-testid="prevention-card">
              {taking.length > 0 ? (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <CardTitle>{copy.dashboard.prevention}</CardTitle>
                    <Link href="/portal/passport/record?tab=taking" className="text-sm font-semibold text-maroon min-h-[44px] inline-flex items-center">{copy.dashboard.preventionManage}</Link>
                  </div>
                  <PreventionPills rows={taking} />
                </>
              ) : (
                <div className="text-center">
                  <CardTitle>{copy.dashboard.prevention}</CardTitle>
                  <p className="mx-auto max-w-sm text-[13px] text-[#5a4a6e] -mt-2 mb-4">{copy.dashboard.takingEmpty}</p>
                  <LinkButton href="/portal/passport/record?tab=taking" variant="secondary">{copy.dashboard.addSomething}</LinkButton>
                </div>
              )}
            </Card>
          </div>
          {gated && (
            <div className="order-3 lg:order-none">
              <Card className="relative" data-testid="last-year-card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <CardTitle>{copy.dashboard.last12}</CardTitle>
                  {/* Stretched link: the whole card opens History. */}
                  <Link href="/portal/passport/history" className="text-sm font-semibold text-maroon min-h-[44px] inline-flex items-center after:absolute after:inset-0 after:rounded-card">{copy.nav.history}</Link>
                </div>
                <MonthStrip months={s.months} />
              </Card>
            </div>
          )}
        </div>
      </div>

      {!gated && <p className="text-center text-[13px] text-[#5a4a6e]">{copy.dashboard.gatedNote}</p>}
      <p className="text-center text-xs text-[#5a4a6e]">
        <a href={storeUrl} target="_blank" rel="noopener" className="font-semibold text-maroon">{copy.dashboard.orderTest}</a> · {copy.dashboard.orderTestLine}
        {communityUrl && <> · <a href={communityUrl} target="_blank" rel="noopener" className="font-semibold text-maroon">{copy.dashboard.community}</a></>}
      </p>
    </div>
  );
}
