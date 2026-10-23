"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { SEVERITY_POINTS } from "@/lib/tracker/diary";
import { SYMPTOMS } from "@/lib/tracker/options";
import { redFlagFor } from "@/lib/tracker/redflags";
import { isoToday } from "@/lib/tracker/stats";
import { Chip, DateChips } from "../components/Chips";
import { RedFlagBanner } from "../components/RedFlagBanner";
import { createEpisode } from "../actions";

/*
 * First screen: when it started, what is noticed (with a 1 to 10 row for
 * each ticked symptom), then one sticky Save that lands on Today. The
 * safety banner appears the moment a red-flag symptom is ticked.
 */
export function LogForm({ symptomOrder, lastSymptoms, pregnantOrTrying }: { symptomOrder: string[]; lastSymptoms: string[]; pregnantOrTrying: string }) {
  const router = useRouter();
  const [startedOn, setStartedOn] = useState(isoToday());
  // A UTI that started before today may already be over. Then it is logged as
  // one summary (start, end, what was noticed) rather than a daily check-in.
  const [over, setOver] = useState(false);
  const [endedOn, setEndedOn] = useState(isoToday());
  const startedToday = startedOn >= isoToday();
  const isPast = over && !startedToday;
  const [selected, setSelected] = useState<string[]>([]);
  const [severity, setSeverity] = useState<Record<string, number | null>>({});
  const [otherText, setOtherText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const options = symptomOrder.map((k) => SYMPTOMS.find((s) => s.key === k)!).filter(Boolean);
  const flag = redFlagFor(selected, pregnantOrTrying);
  const toggle = (key: string) => setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  return (
    <div className="space-y-5 pb-28">
      <Card>
        <div data-testid="start-date">
          <DateChips label={copy.log.when} value={startedOn} onChange={setStartedOn} />
        </div>
        {!startedToday && (
          <div className="mt-5" data-testid="still-going">
            <p className="text-sm font-semibold text-slate-700 mb-2">{copy.log.stillGoing}</p>
            <div className="flex flex-wrap gap-2">
              <Chip selected={!over} onClick={() => setOver(false)}>{copy.log.ongoing}</Chip>
              <Chip selected={over} onClick={() => setOver(true)}>{copy.log.over}</Chip>
            </div>
          </div>
        )}
        {isPast && (
          <div className="mt-5" data-testid="end-date">
            <DateChips label={copy.log.whenEnded} value={endedOn} onChange={setEndedOn} />
          </div>
        )}
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="text-base font-semibold text-midnight">{isPast ? copy.log.symptomsPast : copy.log.symptoms}</p>
          {lastSymptoms.length > 0 && (
            <button type="button" onClick={() => setSelected(lastSymptoms)} className="text-sm font-semibold text-maroon">{copy.log.sameAsLast}</button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <Chip key={o.key} selected={selected.includes(o.key)} onClick={() => toggle(o.key)}>{o.short ?? o.label}</Chip>
          ))}
        </div>
        {selected.includes("other") && (
          <input value={otherText} onChange={(e) => setOtherText(e.target.value)} placeholder="Describe it" className="mt-3 w-full max-w-md rounded-full border border-slate-200 px-4 py-2.5 text-sm" aria-label="Other, describe it" />
        )}
        {selected.length > 0 && (
          <ul className="mt-5 divide-y divide-slate-100 border-t border-slate-100" data-testid="log-ratings">
            {options.filter((o) => selected.includes(o.key)).map((o) => {
              const v = severity[o.key] ?? null;
              return (
                <li key={o.key} className="py-3">
                  <div className="flex items-baseline justify-between gap-3 mb-2">
                    <p className="text-sm text-midnight">{o.key === "other" ? otherText || o.short : o.short ?? o.label}</p>
                    <p className={`text-sm ${v ? "font-semibold text-midnight" : "text-[#8a7a9c]"}`}>{v ?? copy.log.tapToRate}</p>
                  </div>
                  <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label={`${o.label}, how bad`}>
                    {SEVERITY_POINTS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        role="radio"
                        aria-checked={v === n}
                        aria-label={String(n)}
                        onClick={() => setSeverity((s) => ({ ...s, [o.key]: v === n ? null : n }))}
                        className={`h-7 rounded-md border transition-colors ${v !== null && n <= v ? (n === v ? "border-maroon bg-maroon" : "border-pink-50 bg-pink-50") : "border-slate-200 bg-white"}`}
                      />
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <RedFlagBanner flag={flag} />
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 px-4 py-3 backdrop-blur" style={{ borderTop: "1px solid rgba(29,0,58,.08)", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto max-w-2xl">
          <Button
            className="w-full"
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const r = await createEpisode({ startedOn, endedOn: isPast ? endedOn : null, symptoms: selected, otherText, severity });
                if (r.error) setError(r.error);
                else router.push("/portal/passport");
              });
            }}
          >
            {pending ? "Saving..." : copy.log.saveAndGo}
          </Button>
        </div>
      </div>
    </div>
  );
}
