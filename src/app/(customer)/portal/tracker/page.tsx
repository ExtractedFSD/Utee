import Link from "next/link";
import { Card, CardTitle, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { requireTracker, loadAll, ownKits } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { redFlagFor } from "@/lib/tracker/redflags";
import { formatDay, patterns, summarise } from "@/lib/tracker/stats";
import type { KitStatus } from "@/lib/status";
import { RedFlagBanner } from "./components/RedFlagBanner";
import { MonthStrip } from "./components/MonthStrip";
import { QuickCheckin } from "./QuickCheckin";

export default async function TrackerHome() {
  const { supabase, user, profile } = await requireTracker();
  const [data, kits] = await Promise.all([loadAll(supabase, user.id), ownKits(supabase)]);
  const s = summarise(data.episodes, data.treatments);
  const p = patterns(data.episodes, data.symptoms, data.triggers, data.treatments);
  const open = s.openEpisode;
  const openSymptoms = open ? data.symptoms.filter((x) => x.episode_id === open.id).map((x) => x.symptom) : [];
  const flag = open ? redFlagFor(openSymptoms, profile.pregnant_or_trying) : { show: false as const };
  const latestKit = kits[0] ?? null;
  const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_URL;
  const storeUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "#";
  const brandNew = data.episodes.length === 0;
  const today = new Date().toISOString().slice(0, 10);
  const feelingToday = data.checkins.find((c) => c.on_date === today)?.feeling ?? null;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Tracker" title={copy.dashboard.welcomeTitle} action={
        <Link href="/portal/tracker/settings" className="text-sm font-semibold text-maroon">Settings</Link>
      } />

      <RedFlagBanner flag={flag} />

      {brandNew ? (
        <Card className="bg-gradient-brand text-white">
          <p className="text-sm text-white/85 mb-5 leading-relaxed max-w-xl">{copy.dashboard.welcomeBody}</p>
          <div className="flex flex-wrap gap-3">
            <LinkButton href="/portal/tracker/log" variant="white">{copy.dashboard.logFirst}</LinkButton>
            <LinkButton href="/portal/tracker/log" variant="white">{copy.dashboard.logPast}</LinkButton>
          </div>
        </Card>
      ) : open ? (
        <Card className="bg-gradient-brand text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-display text-3xl font-light">{copy.dashboard.openEpisodeDay(s.openDay)}</p>
              <p className="text-sm text-white/85 mt-1">Started {formatDay(open.started_on)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <LinkButton href={`/portal/tracker/episodes/${open.id}`} variant="white">{copy.dashboard.logToday}</LinkButton>
              <QuickCheckin episodeId={open.id} feelingToday={feelingToday} />
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-gradient-brand text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="font-display text-3xl font-light">{copy.dashboard.sinceLast(s.daysSinceLast ?? 0)}</p>
            <LinkButton href="/portal/tracker/log" variant="white">{copy.dashboard.logNew}</LinkButton>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardTitle>{copy.dashboard.lastYear}</CardTitle>
            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              <Stat label="UTIs, 6 months" value={s.episodes6m} />
              <Stat label="UTIs, 12 months" value={s.episodes12m} />
              <Stat label="Treatment courses" value={s.treatmentCourses12m} />
              <Stat label="Preventive courses" value={s.preventiveCourses12m} />
            </dl>
            {s.averageLengthDays !== null && <p className="text-sm text-slate-700 mb-4">Average length: {s.averageLengthDays} days</p>}
            <MonthStrip months={s.months} />
          </Card>

          <Card>
            <CardTitle>{copy.dashboard.patterns}</CardTitle>
            {p.enough && (p.triggers.length || p.antibiotics.length || p.symptoms.length) ? (
              <ul className="space-y-2 text-sm text-slate-700">
                {[...p.triggers, ...p.antibiotics, ...p.symptoms].map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : (
              <p className="text-sm text-slate-600">{copy.dashboard.patternsEmpty}</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardTitle>{copy.dashboard.tests}</CardTitle>
            {latestKit ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-midnight">Kit {latestKit.code}</p>
                <StatusBadge status={latestKit.status as KitStatus} />
                <div className="pt-2">
                  <Link href={`/portal/tests/${latestKit.id}`} className="text-sm font-semibold text-maroon">View in portal</Link>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-600">{copy.dashboard.testsEmpty}</p>
            )}
          </Card>

          <Card>
            <CardTitle>{copy.dashboard.quickActions}</CardTitle>
            <div className="flex flex-col gap-2">
              <LinkButton href="/portal/tracker/log">{copy.dashboard.logNew}</LinkButton>
              <LinkButton href="/portal/tracker/summary" variant="secondary">{copy.dashboard.downloadSummary}</LinkButton>
              <LinkButton href="/portal/tracker/history" variant="secondary">{copy.dashboard.history}</LinkButton>
              <LinkButton href={storeUrl} variant="secondary" external>{copy.dashboard.orderTest}</LinkButton>
              <p className="text-xs text-slate-500">{copy.dashboard.orderTestNote}</p>
            </div>
          </Card>

          {communityUrl && (
            <Card>
              <CardTitle>{copy.dashboard.community}</CardTitle>
              <p className="text-sm text-slate-600 mb-4">{copy.dashboard.communityBody}</p>
              <LinkButton href={communityUrl} variant="secondary" external>Open community</LinkButton>
            </Card>
          )}
        </div>
      </div>
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

