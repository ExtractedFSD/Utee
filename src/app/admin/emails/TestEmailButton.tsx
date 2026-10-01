"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { sendTestEmail } from "./actions";

export function TestEmailButton() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        variant="secondary"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            const result = await sendTestEmail();
            if (result.error) setMessage({ ok: false, text: result.error });
            else setMessage({ ok: true, text: `Sent to ${result.to}${result.id ? ` (Resend id ${result.id})` : ""}. Delivery status updates below once Resend confirms it.` });
          });
        }}
      >
        {pending ? "Sending…" : "Send test email to admin"}
      </Button>
      {message && <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-rose-600"}`}>{message.text}</p>}
    </div>
  );
}
