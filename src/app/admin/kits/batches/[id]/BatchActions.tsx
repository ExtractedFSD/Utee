"use client";

import { useState, useTransition } from "react";
import { Button, LinkButton, inputClass } from "@/components/ui";
import { markBatchPrinted, voidKit } from "../../../actions";

export function BatchActions({ batchId, quantity, sent }: { batchId: number; quantity: number; sent: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <LinkButton href={`/admin/kits/batches/${batchId}/csv`} variant="secondary">
        Download CSV ({quantity} codes)
      </LinkButton>
      {!sent && (
        <Button
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Mark this batch as sent to the printer? Its codes become usable stock.")) return;
            setError(null);
            startTransition(async () => {
              const result = await markBatchPrinted(batchId);
              if (result.error) setError(result.error);
            });
          }}
        >
          {pending ? "Marking…" : "Mark as sent to printer"}
        </Button>
      )}
      {error && <p className="w-full text-sm text-rose-600">{error}</p>}
    </div>
  );
}

export function VoidKitButton({ kitId, code }: { kitId: string; code: string }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs font-semibold text-rose-600 hover:underline">
        Void
      </button>
    );
  }
  return (
    <div className="inline-flex flex-wrap items-center justify-end gap-2">
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={`Why void ${code}?`}
        aria-label={`Reason for voiding ${code}`}
        className={`${inputClass} w-56 py-1.5 text-xs`}
        autoFocus
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await voidKit(kitId, reason);
            if (result.error) setError(result.error);
            else setOpen(false);
          });
        }}
        className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-50"
      >
        {pending ? "Voiding…" : "Confirm void"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-slate-500 hover:underline">
        Cancel
      </button>
      {error && <p className="w-full text-xs text-rose-600">{error}</p>}
    </div>
  );
}
