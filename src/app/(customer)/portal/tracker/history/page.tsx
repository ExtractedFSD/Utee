import Link from "next/link";
import { Card, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { requireTracker, loadAll } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { SYMPTOMS, TEST_KINDS, TEST_RESULTS, TRIGGERS, labelFor } from "@/lib/tracker/options";
import { antibioticName } from "@/lib/tracker/search";
import { episodeLength, formatDay } from "@/lib/tracker/stats";

export default async function HistoryPage() {
  const { supabase, user } = await requireTracker();
  const data = await loadAll(supabase, user.id);
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader eyebrow="Tracker" title={copy.history.title} action={<div className="flex flex-wrap gap-2"><LinkButton href="/portal/tracker/setup?mode=utis" variant="secondary">{copy.dashboard.quickAdd}</LinkButton><LinkButton href="/portal/tracker/log">{copy.dashboard.logNew}</LinkButton></div>} />
      {data.episodes.length === 0 ? (
        <Card><EmptyState title={copy.history.empty} /></Card>
      ) : (
        <div className="space-y-4">
          {data.episodes.map((e) => {
            const symptoms = [...new Set(data.symptoms.filter((s) => s.episode_id === e.id).map((s) => s.symptom))];
            const triggers = [...new Set(data.triggers.filter((t) => t.episode_id === e.id).map((t) => t.trigger))];
            const treatments = data.treatments.filter((t) => t.episode_id === e.id);
            const tests = data.tests.filter((t) => t.episode_id === e.id);
            return (
              <Link key={e.id} href={`/portal/tracker/episodes/${e.id}`} className="block">
                <Card className="hover:shadow-lg transition-shadow">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                    <p className="font-display text-2xl font-light text-midnight">{formatDay(e.started_on)}</p>
                    <p className="text-sm text-slate-600">{e.ended_on ? copy.history.days(episodeLength(e)) : copy.history.ongoing}</p>
                  </div>
                  <dl className="text-sm text-slate-700 space-y-1">
                    {symptoms.length > 0 && <Row k="Symptoms" v={symptoms.map((s) => labelFor(SYMPTOMS, s)).join(", ")} />}
                    {triggers.length > 0 && <Row k="Triggers" v={triggers.map((t) => labelFor(TRIGGERS, t)).join(", ")} />}
                    {treatments.length > 0 && <Row k="Treatment" v={treatments.map((t) => antibioticName(t.antibiotic_id, t.other_name)).join(", ")} />}
                    {tests.length > 0 && <Row k="Tests" v={tests.map((t) => `${labelFor(TEST_KINDS, t.kind)}${t.kit_id ? "" : t.result ? `: ${labelFor(TEST_RESULTS, t.result)}` : ""}`).join(", ")} />}
                  </dl>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-24 shrink-0 text-slate-500">{k}</dt>
      <dd>{v}</dd>
    </div>
  );
}
