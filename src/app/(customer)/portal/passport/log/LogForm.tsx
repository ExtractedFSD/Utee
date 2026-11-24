"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, LinkButton, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { SYMPTOMS } from "@/lib/tracker/options";
import { redFlagFor } from "@/lib/tracker/redflags";
import { formatDay, isoToday } from "@/lib/tracker/stats";
import { Chip, DateChips } from "../components/Chips";
import { RedFlagBanner } from "../components/RedFlagBanner";
import { SeverityScale } from "../components/SeverityScale";
import { createEpisode } from "../actions";

/*
 * First screen: when it started, what is noticed (with a 1 to 10 row for
 * each ticked symptom), then one sticky Save that lands on Today. The
 * safety banner appears the moment a red-flag symptom is ticked. When a UTI
 * is already open the page says so first, so a second one is never started
 * by accident; saving with nothing ticked asks once.
 */
export function LogForm({ symptomOrder, lastSymptoms, pregnantOrTrying, openUti }: { symptomOrder: string[]; lastSymptoms: string[]; pregnantOrTrying: string; openUti: { id: string; startedOn: string } | null }) {
  const router = useRouter();
  const [startNew, setStartNew] = useState(!openUti);
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
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const options = symptomOrder.map((k) => SYMPTOMS.find((s) => s.key === k)!).filter(Boolean);
  const flag = redFlagFor(selected, pregnantOrTrying);
  const toggle = (key: string) => setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const nothingChosen = selected.length === 0 && !otherText.trim();

  const save = () => {
    setError(null);
    setConfirmEmpty(false);
    startTransition(async () => {
      const r = await createEpisode({ startedOn, endedOn: isPast ? endedOn : null, symptoms: selected, otherText, severity });
      if (r.error) setError(r.error);
      else router.push("/portal/passport?logged=1");
    });
  };

  if (openUti && !startNew) {
    return (
      <Card data-testid="open-uti-guard">
        <p className="font-display text-2xl font-light text-midnight">{copy.log.openTitle(formatDay(openUti.startedOn))}</p>
        <p className="mt-2 text-sm text-slate-700">{copy.log.openBody}</p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <LinkButton href={`/portal/passport/episodes/${openUti.id}`}>{copy.log.openGo}</LinkButton>
          <Button variant="secondary" onClick={() => setStartNew(true)}>{copy.log.openNew}</Button>
        </div>
      </Card>
    );
  }

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
        <p className="text-base font-semibold text-midnight">{isPast ? copy.log.symptomsPast : copy.log.symptoms}</p>
        <p className="text-sm text-slate-600 mt-0.5 mb-4">{copy.log.chooseAll}</p>
        <div className="flex flex-wrap gap-2">
          {lastSymptoms.length > 0 && (
            <Chip selected={lastSymptoms.length > 0 && lastSymptoms.every((k) => selected.includes(k)) && selected.length === lastSymptoms.length} onClick={() => setSelected(lastSymptoms)}>{copy.log.sameAsLast}</Chip>
          )}
          {options.map((o) => (
            <Chip key={o.key} selected={selected.includes(o.key)} onClick={() => toggle(o.key)}>{o.short ?? o.label}</Chip>
          ))}
        </div>
        {selected.includes("other") && (
          <div className="mt-4 max-w-md">
            <label htmlFor="log-other" className="block text-sm font-semibold text-slate-700 mb-1.5">{copy.log.otherLabel}</label>
            <input id="log-other" value={otherText} onChange={(e) => setOtherText(e.target.value)} maxLength={120} className={inputClass} />
          </div>
        )}
        {selected.length > 0 && (
          <ul className="mt-5 space-y-4 border-t border-slate-100 pt-4" data-testid="log-ratings">
            {options.filter((o) => selected.includes(o.key)).map((o) => (
              <li key={o.key}>
                <SeverityScale
                  label={o.key === "other" ? otherText.trim() || o.short || o.label : o.short ?? o.label}
                  value={severity[o.key] ?? null}
                  onChange={(v) => setSeverity((s) => ({ ...s, [o.key]: v }))}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <RedFlagBanner flag={flag} />
      {error && <p className="text-sm text-rose-600" role="alert">{error}</p>}

      {confirmEmpty && (
        <Card className="border border-maroon/30" data-testid="confirm-empty" role="alertdialog" aria-labelledby="confirm-empty-title">
          <p id="confirm-empty-title" className="font-display text-2xl font-light text-midnight">{copy.log.emptyTitle}</p>
          <p className="text-sm text-slate-700 mt-1 mb-4">{copy.log.emptyBody}</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={pending} onClick={save}>{copy.log.emptyYes}</Button>
            <Button variant="secondary" onClick={() => setConfirmEmpty(false)}>{copy.log.emptyNo}</Button>
          </div>
        </Card>
      )}

      <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 px-4 py-3 backdrop-blur" style={{ borderTop: "1px solid rgba(29,0,58,.08)", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          {openUti && <Link href={`/portal/passport/episodes/${openUti.id}`} className="shrink-0 text-sm font-semibold text-maroon">{copy.log.openGo}</Link>}
          <Button
            className="w-full"
            disabled={pending}
            onClick={() => {
              if (nothingChosen) { setConfirmEmpty(true); return; }
              save();
            }}
          >
            {pending ? "Saving..." : copy.log.saveAndGo}
          </Button>
        </div>
      </div>
    </div>
  );
}
