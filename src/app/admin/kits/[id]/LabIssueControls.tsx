"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { sendBackToLab } from "../../actions";

export function LabIssueControls({ kitId }: { kitId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await sendBackToLab(kitId);
            if (result?.error) setError(result.error);
          });
        }}
      >
        {pending ? "Working…" : "Ask the lab to test again"}
      </Button>
      {error && <p className="text-sm text-rose-600 mt-2">{error}</p>}
    </div>
  );
}
