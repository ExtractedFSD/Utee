"use client";

import { useState, useTransition } from "react";
import { Button, Callout } from "@/components/ui";
import { confirmKitReceived } from "./actions";

/*
 * Shown in place of the symptom form prompt until the kit is in the patient's
 * hands. Scanning the QR code records that on its own; this is for people who
 * came to the kit page from the portal instead. One tap, then straight into
 * the symptom form.
 */
export function KitArrived({ kitId }: { kitId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Callout data-testid="kit-arrived" className="flex flex-wrap items-center justify-between gap-4">
      <div className="max-w-xl">
        <p className="font-display text-2xl font-light">Has your kit arrived?</p>
        <p className="text-sm text-white/85 mt-1 leading-relaxed">
          The symptom form opens once the kit is in your hands, so your answers and your sample are from the same day.
          Scan the QR code inside the kit, or tap below when it has arrived and you are ready to take the test.
        </p>
        {error && <p className="mt-2 text-sm font-semibold text-white" role="alert">{error}</p>}
      </div>
      <Button
        type="button"
        variant="white"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const result = await confirmKitReceived(kitId);
            if (result && "error" in result) setError(result.error);
          })
        }
      >
        {pending ? "One moment…" : "I have my kit and I'm ready to take the test"}
      </Button>
    </Callout>
  );
}
