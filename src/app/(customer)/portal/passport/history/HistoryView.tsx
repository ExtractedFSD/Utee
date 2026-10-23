"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button, Card, EmptyState, LinkButton, Pill } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { FEELING_SHADE, episodeOn, feelingLabel, type CalendarCell, type DiaryEntry } from "@/lib/tracker/diary";
import type { TimelineEvent } from "@/lib/tracker/passport";
import { formatDay, formatDayShort } from "@/lib/tracker/stats";
import { DaySheet } from "../components/DaySheet";
import { SourcePill } from "../components/SourcePill";

/*
 * One History, three views: UTIs (a card each), Everything (every dated
 * event), Day by day (the diary). The chosen view is kept in the address
 * and remembered for next time.
 */
export type View = "utis" | "everything" | "days";
const VIEWS: View[] = ["utis", "everything", "days"];
const STORAGE_KEY = "utee.history.view";

export type UtiCard = {
  id: string;
  startedOn: string;
  endedOn: string | null;
  days: number;
  symptoms: string[];
  triggers: string[];
  treatments: string[];
  tests: { text: string; source: "patient" | "utee" }[];
  feelings: (number | null)[];
};

export type Month<T> = { key: string; label: string; items: T[] };

const TONE: Record<string, string> = { uti: "red", treatment: "amber", test: "sky", culture: "red", investigation: "lavender", prevention_started: "green", prevention_stopped: "slate", note: "brand" };

export function HistoryView({ initialView, today, utis, events, calendar, entries, episodes, symptomOrder }: {
  initialView: View | null;
  today: string;
  utis: UtiCard[];
  events: Month<TimelineEvent>[];
  calendar: { lead: number; cells: CalendarCell[] };
  entries: DiaryEntry[];
  episodes: { id: string; started_on: string; ended_on: string | null }[];
  symptomOrder: string[];
}) {
  const [view, setView] = useState<View>(initialView ?? "utis");
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  // No view in the address: use the one chosen last time.
  useEffect(() => {
    if (initialView) return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as View | null;
      if (stored && VIEWS.includes(stored)) setView(stored);
    } catch {}
  }, [initialView]);
  const choose = (v: View) => {
    setView(v);
    try { window.localStorage.setItem(STORAGE_KEY, v); } catch {}
    window.history.replaceState(null, "", `/portal/passport/history?view=${v}`);
  };

  const sheetOpen = adding || editing !== null;
  const date = editing ?? today;

  return (
    <div className="space-y-5">
      <div className="flex rounded-full bg-pink-50 p-1" role="tablist" aria-label={copy.history.viewsLabel}>
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={view === v}
            onClick={() => choose(v)}
            className={`flex-1 min-h-[44px] rounded-full text-sm font-semibold transition-colors ${view === v ? "bg-white text-midnight shadow-card" : "text-[#5a4a6e]"}`}
          >
            {copy.history.views[v]}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {view !== "days" && <LinkButton href="/portal/passport/log">{copy.dashboard.logNew}</LinkButton>}
        <Button variant={view === "days" ? "primary" : "secondary"} onClick={() => { setEditing(null); setAdding(true); }}>{copy.diary.add}</Button>
      </div>

      {view === "utis" && (
        utis.length === 0 ? <Card><EmptyState title={copy.history.empty} /></Card> : (
          <div className="space-y-4" data-testid="uti-cards">
            {utis.map((u) => <UtiCardView key={u.id} u={u} />)}
            <p className="text-center text-[13px] text-[#5a4a6e]">{copy.history.cardHint}</p>
          </div>
        )
      )}

      {view === "everything" && (
        events.length === 0 ? <Card><EmptyState title={copy.timeline.empty} /></Card> : (
          events.map((m) => (
            <section key={m.key} data-testid="timeline-month">
              <h2 className="font-display text-2xl font-light text-midnight mb-3">{m.label}</h2>
              <Card>
                <ol className="divide-y divide-[rgba(29,0,58,.08)]">
                  {m.items.map((e, i) => {
                    const inner = (
                      <>
                        <span className="w-20 shrink-0 text-xs text-[#8a7a9c] pt-1">{formatDay(e.on).replace(/ \d{4}$/, "")}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <Pill tone={TONE[e.kind] ?? "slate"}>{copy.timeline.kinds[e.kind] ?? e.kind}</Pill>
                            <span className="text-sm font-semibold text-midnight">{e.title}</span>
                          </span>
                          {e.detail && <span className="block text-xs text-[#5a4a6e] mt-0.5">{e.detail}</span>}
                        </span>
                      </>
                    );
                    return (
                      <li key={`${e.kind}-${e.on}-${i}`}>
                        {e.href ? <Link href={e.href} className="flex gap-3 py-3 -mx-2 px-2 rounded-xl hover:bg-pink-25">{inner}</Link> : <div className="flex gap-3 py-3">{inner}</div>}
                      </li>
                    );
                  })}
                </ol>
              </Card>
            </section>
          ))
        )
      )}

      {view === "days" && (
        <>
          <Card data-testid="feeling-strip">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
              <h2 className="font-display text-2xl font-light text-midnight">{copy.history.last30}</h2>
              <p className="text-sm text-[#5a4a6e]">{copy.history.last30Hint}</p>
            </div>
            <Calendar cal={calendar} onPick={(on) => { setAdding(false); setEditing(on); }} />
            <p className="mt-3 text-[13px] text-[#5a4a6e]">{copy.history.last30Caption}</p>
          </Card>
          {entries.length === 0 ? <Card><EmptyState title={copy.history.noDiary} /></Card> : groupByMonth(entries, (e) => e.on).map((m) => (
            <section key={m.key} data-testid="diary-month">
              <h2 className="font-display text-2xl font-light text-midnight mb-3">{m.label}</h2>
              <Card>
                <ol className="divide-y divide-[rgba(29,0,58,.08)]">
                  {m.items.map((e) => (
                    <li key={e.on}>
                      <button type="button" onClick={() => { setAdding(false); setEditing(e.on); }} className="flex w-full gap-3 py-3 text-left -mx-2 px-2 rounded-xl hover:bg-pink-25" aria-label={`${formatDayShort(e.on)}, ${copy.diary.editDay}`}>
                        <span className="w-16 shrink-0">
                          <span className="block text-sm font-semibold text-midnight">{formatDayShort(e.on).split(",")[0]}</span>
                          <span className="block text-xs text-[#8a7a9c]">{formatDay(e.on).replace(/ \d{4}$/, "")}</span>
                        </span>
                        <span className="min-w-0 flex-1 space-y-1">
                          {e.utiDay && <span className="inline-flex items-center rounded-full bg-peach-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[.08em] text-maroon">{copy.diary.utiDay(e.utiDay)}</span>}
                          {(e.feeling || e.symptoms.length > 0 || e.started.length > 0) && (
                            <span className="block text-sm text-midnight">
                              {[e.feeling && copy.history.feeling(feelingLabel(e.feeling)), e.symptoms.map((s) => `${s.label}${s.severity ? ` ${s.severity}` : ""}`).join(", "), e.started.length && copy.diary.started(e.started.join(", ")).toLowerCase(), e.tests.join(", ")].filter(Boolean).join(" · ")}
                            </span>
                          )}
                          {e.note && <span className="block text-sm text-[#5a4a6e]">{e.note}</span>}
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </Card>
            </section>
          ))}
        </>
      )}

      {sheetOpen && (
        <DaySheet
          key={date}
          date={date}
          pickDate={adding}
          today={today}
          entry={entries.find((e) => e.on === date) ?? null}
          episode={episodeOn(episodes.map((e) => ({ ...e, notes: null })), date, today)}
          symptomOrder={symptomOrder}
          onDate={(iso) => setEditing(iso)}
          onClose={() => { setAdding(false); setEditing(null); }}
        />
      )}
    </div>
  );
}

function UtiCardView({ u }: { u: UtiCard }) {
  const open = !u.endedOn;
  const symptoms = u.symptoms.slice(0, 2).join(", ") + (u.symptoms.length > 2 ? ` ${copy.history.more(u.symptoms.length - 2)}` : "");
  const Row = ({ k, children }: { k: string; children: React.ReactNode }) => (
    <div className="grid grid-cols-[84px_minmax(0,1fr)] gap-2 text-[13px]">
      <dt className="text-[#5a4a6e]">{k}</dt>
      <dd className="text-midnight">{children}</dd>
    </div>
  );
  return (
    <Link href={`/portal/passport/episodes/${u.id}`} className="block" data-testid="uti-card">
      <Card className={`transition-shadow hover:shadow-lg ${open ? "border-[1.5px] border-maroon" : ""}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <p className="font-display text-[22px] font-light text-midnight">{formatDay(u.startedOn)}</p>
          {open ? (
            <span className="inline-flex items-center rounded-full bg-maroon px-3 py-1 text-[11px] font-semibold uppercase tracking-[.08em] text-white">{copy.history.openDay(u.days)}</span>
          ) : (
            <span className="text-sm text-[#5a4a6e]">{copy.history.days(u.days)}</span>
          )}
        </div>
        <dl className="space-y-1.5">
          {u.symptoms.length > 0 && <Row k={copy.history.rows.symptoms}>{symptoms}</Row>}
          {u.triggers.length > 0 && <Row k={copy.history.rows.triggers}>{u.triggers.join(" · ")}</Row>}
          {u.treatments.length > 0 && <Row k={copy.history.rows.treatment}>{u.treatments.join("; ")}</Row>}
          {u.tests.length > 0 && (
            <Row k={copy.history.rows.tests}>
              {u.tests.map((t, i) => <span key={i} className="inline-flex flex-wrap items-center gap-2 mr-2">{t.text} <SourcePill source={t.source} /></span>)}
            </Row>
          )}
          {u.feelings.some((f) => f !== null) && (
            <Row k={copy.history.rows.feeling}>
              <span className="flex flex-wrap gap-1" aria-label={u.feelings.map((f, i) => `day ${i + 1}: ${f ? feelingLabel(f) : "no entry"}`).join(", ")}>
                {u.feelings.map((f, i) => <span key={i} className="h-3.5 w-3.5 rounded-[4px]" style={{ background: f ? FEELING_SHADE[f] : "#ffe5f2" }} />)}
              </span>
            </Row>
          )}
        </dl>
      </Card>
    </Link>
  );
}

function Calendar({ cal, onPick }: { cal: { lead: number; cells: CalendarCell[] }; onPick: (on: string) => void }) {
  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-1 text-center text-[11px] text-[#8a7a9c]">
        {copy.history.weekdays.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {Array.from({ length: cal.lead }).map((_, i) => <span key={`lead-${i}`} aria-hidden />)}
        {cal.cells.map((c) => {
          const bg = c.feeling ? FEELING_SHADE[c.feeling] : c.inUti ? "#ffe5f2" : "#fff5fa";
          return (
            <button
              key={c.on}
              type="button"
              onClick={() => onPick(c.on)}
              title={`${formatDayShort(c.on)}${c.feeling ? `: ${feelingLabel(c.feeling)}` : ""}`}
              aria-label={`${formatDayShort(c.on)}${c.feeling ? `, ${feelingLabel(c.feeling)}` : ", no entry"}${c.today ? ", today" : ""}`}
              className="flex h-[30px] items-center justify-center rounded-lg text-xs font-semibold"
              style={{ background: bg, border: c.today ? "2px solid #1d003a" : c.feeling || c.inUti ? "1px solid transparent" : "1px dashed #ffcce5", color: c.feeling && c.feeling <= 3 ? "#fff" : "#1d003a" }}
            >
              {c.today ? c.dayOfMonth : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function groupByMonth<T>(items: T[], on: (t: T) => string): Month<T>[] {
  const out: Month<T>[] = [];
  for (const it of items) {
    const key = on(it).slice(0, 7);
    let m = out[out.length - 1];
    if (!m || m.key !== key) {
      m = { key, label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), items: [] };
      out.push(m);
    }
    m.items.push(it);
  }
  return out;
}
