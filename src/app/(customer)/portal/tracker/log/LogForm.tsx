"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { SYMPTOMS } from "@/lib/tracker/options";
import { isoToday } from "@/lib/tracker/stats";
import { ChipGroup, DateChips } from "../components/Chips";
import { createEpisode } from "../actions";

/** First screen: date + symptoms + Save. Everything else is added afterwards. */
export function LogForm({ symptomOrder, lastSymptoms }: { symptomOrder: string[]; lastSymptoms: string[] }) {
  const router = useRouter();
  const [startedOn, setStartedOn] = useState(isoToday());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [otherText, setOtherText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const options = symptomOrder.map((k) => SYMPTOMS.find((s) => s.key === k)!).filter(Boolean);

  return (
    <div className="space-y-6">
      <Card>
        <DateChips label={copy.log.when} value={startedOn} onChange={setStartedOn} />
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <p className="font-display text-2xl font-light text-midnight">{copy.log.symptoms}</p>
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
              const r = await createEpisode({ startedOn, symptoms: [...selected], otherText });
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
