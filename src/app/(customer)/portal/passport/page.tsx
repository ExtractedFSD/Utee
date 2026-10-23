import Link from "next/link";
import { Card, CardTitle, LinkButton, PageHeader, buttonBase, buttonVariants } from "@/components/ui";
import { requireTracker, ownKits } from "@/lib/tracker/data";
import { loadAllWithUtee } from "@/lib/tracker/load";
import { copy } from "@/lib/tracker/copy";
import { redFlagFor } from "@/lib/tracker/redflags";
import { formatDay, patterns, summarise } from "@/lib/tracker/stats";
import { RedFlagBanner } from "./components/RedFlagBanner";
import { MonthStrip } from "./components/MonthStrip";
import { QuickCheckin } from "./QuickCheckin";
import { PreventionPills } from "./components/PreventionPills";
import { PatternsCard } from "./components/PatternsCard";
import { PassportCard } from "./components/PassportCard";
import { passportGlance } from "@/lib/tracker/passport";

export default async function TrackerHome() {
  const { supabase, user, profile } = await requireTracker();
  const data = await loadAllWithUtee(supabase, user.id);
  const s = summarise(data.episodes, data.treatments);
  const p = patterns(data.episodes, data.symptoms, data.triggers, data.treatments);
  const open = s.openEpisode;
  const openRows = open ? data.symptoms.filter((x) => x.episode_id === open.id) : [];
  const latestDay = openRows.reduce((m, x) => (x.logged_on > m ? x.logged_on : m), "");
  const openSymptoms = openRows.filter((x) => x.logged_on === latestDay).map((x) => x.symptom);
  const flag = open ? redFlagFor(openSymptoms, profile.pregnant_or_trying) : { show: false as const };
  const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_URL;
  const storeUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "#";
  const brandNew = data.episodes.length === 0;
  const taking = data.preventions.filter((x) => !x.stopped_on);
  const today = new Date().toISOString().slice(0, 10);
  const feelingToday = data.checkins.find((c) => c.on_date === today)?.feeling ?? null;
  // "Edit today" once something has been logged for today on the open UTI; "Log today" on a new day.
  const loggedToday = !!open && (openRows.some((x) => x.logged_on === today) || feelingToday !== null);
  const glance = passportGlance({ utis6m: s.episodes6m, utis12m: s.episodes12m }, profile, data.preventions, data.investigations, data.cultures);
  const passportStarted = !!(profile.local_hospital || profile.first_uti_onset || profile.medical_history.length || data.investigations.length || data.cultures.length);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="UTI Passport" title={copy.dashboard.welcomeTitle} action={
        <Link href="/portal/passport/settings" className="text-sm font-semibold text-maroon">Settings</Link>
      } />

      <RedFlagBanner flag={flag} />

      {brandNew ? (
        <Card className="bg-gradient-brand text-white" data-testid="new-hero">
          <p className="font-display text-3xl font-light mb-2">{copy.dashboard.welcomeHeading}</p>
          <p className="text-sm text-white/85 mb-5 leading-relaxed max-w-xl">{copy.dashboard.welcomeBody}</p>
          <div className="flex flex-wrap items-center gap-4">
            <LinkButton href="/portal/passport/setup?mode=utis" variant="white">{copy.dashboard.setUpWithUna}</LinkButton>
            <Link href="/portal/passport/log" className="text-sm font-semibold text-white underline underline-offset-4">{copy.dashboard.logInstead}</Link>
          </div>
        </Card>
      ) : open ? (
        <Card className="relative bg-gradient-brand text-white" data-testid="open-episode-card">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              {/* The whole card opens this UTI; the buttons sit above the stretched link. */}
              <Link href={`/portal/passport/episodes/${open.id}`} className="font-display text-3xl font-light after:absolute after:inset-0 after:rounded-card" aria-label={copy.dashboard.openEpisodeLink}>
                {copy.dashboard.openEpisodeDay(s.openDay)}
              </Link>
              <p className="text-sm text-white/85 mt-1">Started {formatDay(open.started_on)}</p>
            </div>
            <div className="relative z-10 flex flex-wrap gap-2">
              <LinkButton href={`/portal/passport/episodes/${open.id}`} variant="white">{loggedToday ? copy.dashboard.editToday : copy.dashboard.logToday}</LinkButton>
              <QuickCheckin episodeId={open.id} feelingToday={feelingToday} />
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-gradient-brand text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-display text-3xl font-light">{copy.dashboard.sinceLast(s.daysSinceLast ?? 0)}</p>
            <LinkButton href="/portal/passport/log" variant="white">{copy.dashboard.logNew}</LinkButton>
          </div>
        </Card>
      )}

      <PassportCard glance={glance} started={passportStarted} />

      <Card data-testid="prevention-card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <CardTitle>{copy.dashboard.prevention}</CardTitle>
          {taking.length > 0 && <Link href="/portal/passport/record?tab=taking" className="text-sm font-semibold text-maroon min-h-[44px] inline-flex items-center">{copy.dashboard.preventionManage}</Link>}
        </div>
        {taking.length > 0 ? (
          <PreventionPills rows={taking} />
        ) : (
          <div>
            <p className="text-sm text-slate-600 mb-4 max-w-xl">{copy.dashboard.preventionEmpty}</p>
            <LinkButton href="/portal/passport/record?tab=taking" variant="secondary">{copy.dashboard.preventionAdd}</LinkButton>
          </div>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="relative" data-testid="last-year-card">
          <CardTitle>{copy.dashboard.lastYear}</CardTitle>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            <Stat label="UTIs, 6 months" value={s.episodes6m} />
            <Stat label="UTIs, 12 months" value={s.episodes12m} />
            <Stat label="Treatment courses" value={s.treatmentCourses12m} />
            <Stat label="Preventive courses" value={s.preventiveCourses12m} />
          </dl>
          {s.averageLengthDays !== null && <p className="text-sm text-slate-700 mb-4">Average length: {s.averageLengthDays} days</p>}
          <MonthStrip months={s.months} />
          <div className="mt-5">
            {/* Stretched link: the whole card opens the history page. */}
            <Link href="/portal/passport/history" className={`${buttonBase} ${buttonVariants.secondary} after:absolute after:inset-0 after:rounded-card`}>
              {copy.dashboard.seeHistory}
            </Link>
          </div>
        </Card>

        <PatternsCard p={p} />
      </div>

      <p className="text-center text-xs text-slate-600">
        <a href={storeUrl} target="_blank" rel="noopener" className="font-semibold text-maroon">{copy.dashboard.orderTest}</a> · {copy.dashboard.orderTestLine}
        {communityUrl && <> · <a href={communityUrl} target="_blank" rel="noopener" className="font-semibold text-maroon">{copy.dashboard.community}</a></>}
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-display text-3xl font-light text-midnight">{value}</dd>
    </div>
  );
}

