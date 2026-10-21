import Link from "next/link";
import { Card, EmptyState, PageHeader, Pill } from "@/components/ui";
import { loadAll, requireTracker } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { TEST_KINDS, TEST_RESULTS, labelFor } from "@/lib/tracker/options";
import { timeline } from "@/lib/tracker/passport";
import { formatDay } from "@/lib/tracker/stats";

const TONE: Record<string, string> = {
  uti: "red",
  treatment: "amber",
  test: "sky",
  investigation: "violet",
  prevention_started: "green",
  prevention_stopped: "slate",
};

export default async function TimelinePage() {
  const { supabase, user } = await requireTracker();
  const data = await loadAll(supabase, user.id);
  const events = timeline(data.episodes, data.treatments, data.tests, data.investigations, data.preventions, {
    testKind: (k) => labelFor(TEST_KINDS, k),
    testResult: (r) => (r ? labelFor(TEST_RESULTS, r) : ""),
  });

  // Group by month so a long history still reads.
  const months: { key: string; label: string; events: typeof events }[] = [];
  for (const e of events) {
    const key = e.on.slice(0, 7);
    let m = months[months.length - 1];
    if (!m || m.key !== key) {
      m = { key, label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), events: [] };
      months.push(m);
    }
    m.events.push(e);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader eyebrow="UTI Passport" title={copy.timeline.title} subtitle={copy.timeline.intro} action={<Link href="/portal/passport" className="text-sm font-semibold text-maroon">Back to my passport</Link>} />
      {events.length === 0 ? (
        <Card><EmptyState title={copy.timeline.empty} /></Card>
      ) : (
        months.map((m) => (
          <section key={m.key} data-testid="timeline-month">
            <h2 className="font-display text-2xl font-light text-midnight mb-3">{m.label}</h2>
            <Card>
              <ol className="divide-y divide-slate-100">
                {m.events.map((e, i) => {
                  const inner = (
                    <>
                      <span className="w-24 shrink-0 text-xs text-slate-500 pt-1">{formatDay(e.on)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <Pill tone={TONE[e.kind] ?? "slate"}>{copy.timeline.kinds[e.kind] ?? e.kind}</Pill>
                          <span className="text-sm font-semibold text-midnight">{e.title}</span>
                        </span>
                        {e.detail && <span className="block text-xs text-slate-600 mt-0.5">{e.detail}</span>}
                      </span>
                    </>
                  );
                  return (
                    <li key={`${e.kind}-${e.on}-${i}`}>
                      {e.href ? (
                        <Link href={e.href} className="flex gap-3 py-3 hover:bg-slate-50 -mx-2 px-2 rounded-xl">{inner}</Link>
                      ) : (
                        <div className="flex gap-3 py-3">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </Card>
          </section>
        ))
      )}
    </div>
  );
}
