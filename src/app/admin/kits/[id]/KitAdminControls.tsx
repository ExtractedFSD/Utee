"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle, Button, inputClass } from "@/components/ui";
import type { KitStatus } from "@/lib/status";
import { closeKit, simulateTracking } from "../../actions";

export function KitAdminControls({
  kitId,
  status,
  mockTracking,
}: {
  kitId: string;
  status: KitStatus;
  mockTracking: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [closeReason, setCloseReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  function run(action: () => Promise<{ ok?: boolean; error?: string }>) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setMessage(result.error);
    });
  }

  return (
    <Card>
      <CardTitle>Admin tools</CardTitle>
      <div className="space-y-4">
        {mockTracking && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Simulate carrier scans (dev)
            </p>
            <div className="flex flex-wrap gap-2">
              {status === "shipped" && (
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(() => simulateTracking(kitId, "outbound", "delivered"))}
                >
                  Outbound delivered
                </Button>
              )}
              {status === "activated" && (
                <Button
                  variant="secondary"
                  disabled={pending}
                  onClick={() => run(() => simulateTracking(kitId, "return", "in_transit"))}
                >
                  Return in transit
                </Button>
              )}
              {!["shipped", "activated"].includes(status) && (
                <p className="text-xs text-slate-400">
                  No simulation available for the current status.
                </p>
              )}
            </div>
          </div>
        )}

        {status !== "closed" && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
              Close case
            </p>
            <input
              value={closeReason}
              onChange={(e) => setCloseReason(e.target.value)}
              placeholder="Reason (e.g. lost in post, refunded)"
              className={inputClass}
            />
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => run(() => closeKit(kitId, closeReason))}
            >
              Close kit
            </Button>
          </div>
        )}

        {message && <p className="text-sm text-rose-600">{message}</p>}
      </div>
    </Card>
  );
}
