"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { SYMPTOMS } from "@/lib/tracker/options";
import { isoToday } from "@/lib/tracker/stats";
import { Chip, ChipGroup, DateChips } from "../components/Chips";
import { createEpisode } from "../actions";

/** First screen: date + symptoms + Save. Everything else is added afterwards. */
export function LogForm({ symptomOrder, lastSymptoms }: { symptomOrder: string[]; lastSymptoms: string[] }) {
  const router = useRouter();
  const [startedOn, setStartedOn] = useState(isoToday());
  // A UTI that started before today may already be over. Then it is logged as
  // one summary (start, end, what was noticed) rather than a daily check-in.
  const [over, setOver] = useState(false);
  const [endedOn, setEndedOn] = useState(isoToday());
  const startedToday = startedOn >= isoToday();
  const isPast = over && !startedToday;
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [otherText, setOtherText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const options = symptomOrder.map((k) => SYMPTOMS.find((s) => s.key === k)!).filter(Boolean);

  return (
    <div className="space-y-6">
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
          <p className="font-display text-2xl font-light text-midnight">{isPast ? copy.log.symptomsPast : copy.log.symptoms}</p>
          {lastSymptoms.length > 0 && (
            <Button type="button" variant="secondary" onClick={() => setSelected(new Set(lastSymptoms))}>
              {copy.log.sameAsLast}
            </Button>
          )}
        </div>
        <ChipGroup
          options={options}
          selected={selected}
          onToggle={(key, on) => setSelected((prev) => { const n = new Set(prev); if (on) n.add(key); else n.delete(key); return n; })}
          otherText={otherText}
          onOtherText={setOtherText}
        />
      </Card>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end">
        <Button
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const r = await createEpisode({ startedOn, endedOn: isPast ? endedOn : null, symptoms: [...selected], otherText });
              if (r.error) setError(r.error);
              else router.push(`/portal/tracker/episodes/${r.id}?new=1`);
            });
          }}
        >
          {pending ? "Saving..." : copy.log.save}
        </Button>
      </div>
    </div>
  );
}
