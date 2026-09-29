"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { isoToday } from "@/lib/tracker/stats";
import { updateEpisode } from "./actions";

/** One-tap "I feel better" from the dashboard: closes today. */
export function QuickCheckin({ episodeId }: { episodeId: string; feelingToday: number | null }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="white"
        disabled={pending}
        onClick={() => startTransition(async () => {
          const r = await updateEpisode(episodeId, { endedOn: isoToday() });
          if (r.error) setError(r.error);
        })}
      >
        {copy.dashboard.feelBetter}
      </Button>
      {error && <p className="text-xs text-white mt-1">{error}</p>}
    </div>
  );
}
