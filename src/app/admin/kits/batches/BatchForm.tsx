"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Card, CardTitle, Button, Field, inputClass } from "@/components/ui";
import { createKitBatch } from "../../actions";

export function BatchForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [quantity, setQuantity] = useState(500);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <CardTitle>New batch</CardTitle>
      <p className="text-sm text-slate-500 mb-4">
        Codes are random, 7 characters plus a check character, unique across every batch ever made. They are not
        usable until the batch is marked as sent to the printer.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Quantity">
          <input
            type="number"
            min={1}
            max={5000}
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className={`${inputClass} w-28`}
          />
        </Field>
        <div className="min-w-[16rem] flex-1">
          <Field label="Note (optional)">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Kingfisher run 1"
              className={inputClass}
            />
          </Field>
        </div>
        <Button
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await createKitBatch({ quantity, note });
              if (result.error) setError(result.error);
              else router.push(`/admin/kits/batches/${result.batchId}`);
            });
          }}
        >
          {pending ? "Generating…" : "Generate codes"}
        </Button>
      </div>
      {error && <p className="text-sm text-rose-600 mt-3">{error}</p>}
    </Card>
  );
}
