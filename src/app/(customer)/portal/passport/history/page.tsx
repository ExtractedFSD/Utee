import { PageHeader } from "@/components/ui";
import { requireTracker } from "@/lib/tracker/data";
import { loadAllWithUtee } from "@/lib/tracker/load";
import { copy } from "@/lib/tracker/copy";
import { calendar, diaryEntries } from "@/lib/tracker/diary";
import { SYMPTOMS, TEST_KINDS, TEST_RESULTS, TRIGGERS, labelFor } from "@/lib/tracker/options";
import { timeline } from "@/lib/tracker/passport";
import { antibioticDisplayName } from "@/lib/tracker/search";
import { episodeLength, formatDay, isoToday, orderByUsage, toDate } from "@/lib/tracker/stats";
import { HistoryView, type Month, type UtiCard, type View } from "./HistoryView";
import type { TimelineEvent } from "@/lib/tracker/passport";

export const dynamic = "force-dynamic";

export default async function HistoryPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  const { supabase, user } = await requireTracker();
  const data = await loadAllWithUtee(supabase, user.id);
  const today = isoToday();
  const short = (k: string) => SYMPTOMS.find((s) => s.key === k)?.short ?? labelFor(SYMPTOMS, k);

  const utis: UtiCard[] = data.episodes.map((e) => {
    const days = episodeLength(e, today);
    const feelings: (number | null)[] = [];
    for (let i = 0; i < Math.min(days, 14); i++) {
      const on = new Date(toDate(e.started_on).getTime() + i * 86_400_000).toISOString().slice(0, 10);
      feelings.push(data.checkins.find((c) => c.on_date === on)?.feeling ?? null);
    }
    return {
      id: e.id,
      startedOn: e.started_on,
      endedOn: e.ended_on,
      days,
      symptoms: [...new Set(data.symptoms.filter((s) => s.episode_id === e.id).map((s) => s.symptom))].map((k) => (k === "other" ? data.symptoms.find((s) => s.episode_id === e.id && s.symptom === "other")?.other_text?.trim() || "Other" : short(k))),
      triggers: [...new Map(data.triggers.filter((t) => t.episode_id === e.id).map((t) => [t.trigger, t.trigger === "other" ? t.other_text?.trim() || "Other" : labelFor(TRIGGERS, t.trigger)])).values()],
      treatments: data.treatments.filter((t) => t.episode_id === e.id).map((t) => [
        antibioticDisplayName(t.antibiotic_id, t.other_name),
        t.days ? copy.history.days(t.days) : t.started_on ? copy.history.started(formatDay(t.started_on).replace(/ \d{4}$/, "")) : null,
        t.worked === "yes" ? copy.history.worked : t.worked === "partly" ? copy.history.partly : t.worked === "no" ? copy.history.didNotWork : null,
      ].filter(Boolean).join(" · ")),
      tests: data.tests.filter((t) => t.episode_id === e.id).map((t) => ({
        text: t.kit_id ? labelFor(TEST_KINDS, "utee") : [labelFor(TEST_KINDS, t.kind), t.result ? labelFor(TEST_RESULTS, t.result).toLowerCase() : null].filter(Boolean).join(" · "),
        source: (t.kit_id ? "utee" : "patient") as "utee" | "patient",
      })),
      feelings,
    };
  });

  const events = timeline(
    data.episodes,
    data.treatments,
    data.tests.filter((t) => !t.kit_id || !data.cultures.some((c) => c.id === `utee:${t.kit_id}`)),
    data.investigations,
    data.preventions,
    { testKind: (k) => labelFor(TEST_KINDS, k), testResult: (r) => (r ? labelFor(TEST_RESULTS, r) : "") },
    data.cultures,
    data.checkins
  );
  const months: Month<TimelineEvent>[] = [];
  for (const e of events) {
    const key = e.on.slice(0, 7);
    let m = months[months.length - 1];
    if (!m || m.key !== key) {
      m = { key, label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), items: [] };
      months.push(m);
    }
    m.items.push(e);
  }

  const initialView = (["utis", "everything", "days"] as View[]).includes(view as View) ? (view as View) : null;
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader eyebrow="UTI Passport" title={copy.history.title} />
      <HistoryView
        initialView={initialView}
        today={today}
        utis={utis}
        events={months}
        calendar={calendar(data.checkins, data.episodes, 30, today)}
        entries={diaryEntries(data.checkins, data.symptoms.map((s) => ({ ...s })), data.treatments, data.tests, data.episodes, { testKind: (k) => labelFor(TEST_KINDS, k) }, today).map((e) => ({ ...e, symptoms: e.symptoms.map((s) => ({ ...s, label: s.symptom === "other" ? s.label : short(s.symptom) })) }))}
        episodes={data.episodes.map((e) => ({ id: e.id, started_on: e.started_on, ended_on: e.ended_on }))}
        symptomOrder={orderByUsage(SYMPTOMS.map((s) => s.key), data.symptoms.map((s) => ({ key: s.symptom })))}
      />
    </div>
  );
}
