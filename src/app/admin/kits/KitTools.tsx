"use client";

import { useState, useTransition } from "react";
import { Card, CardTitle, Button, Field, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/status";
import { createKitBatch, dispatchKit } from "../actions";

type PendingOrder = { id: string; order_number: string; email: string; placed_at: string };

export function KitTools({ pendingOrders }: { pendingOrders: PendingOrder[] }) {
  const [pending, startTransition] = useTransition();
  const [batchCount, setBatchCount] = useState(10);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);

  const [kitCode, setKitCode] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [outboundTracking, setOutboundTracking] = useState("");
  const [returnTracking, setReturnTracking] = useState("");
  const [dispatchMessage, setDispatchMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardTitle>1 · Create kit labels</CardTitle>
        <p className="text-sm text-slate-500 mb-4">
          Generates unique codes for pre-printing QR labels onto kit boxes and urine pots.
        </p>
        <div className="flex items-end gap-3">
          <Field label="Quantity">
            <input
              type="number"
              min={1}
              max={200}
              value={batchCount}
              onChange={(e) => setBatchCount(Number(e.target.value))}
              className={`${inputClass} w-28`}
            />
          </Field>
          <Button
            disabled={pending}
            onClick={() => {
              setBatchMessage(null);
              startTransition(async () => {
                const result = await createKitBatch(batchCount);
                setBatchMessage(
                  result.error
                    ? result.error
                    : `Created ${result.codes?.length} kits — use "Print labels" to print them.`
                );
              });
            }}
          >
            {pending ? "Creating…" : "Create batch"}
          </Button>
        </div>
        {batchMessage && <p className="text-sm text-slate-600 mt-3">{batchMessage}</p>}
      </Card>

      <Card>
        <CardTitle>2 · Dispatch a kit</CardTitle>
        <p className="text-sm text-slate-500 mb-4">
          When packing an order: scan/enter the kit code, pick the order, and enter both Royal
          Mail tracking numbers. The patient is emailed their instructions automatically.
        </p>
        <div className="space-y-3">
          <Field label="Kit code">
            <input
              value={kitCode}
              onChange={(e) => setKitCode(e.target.value)}
              placeholder="UT-XXXXXX"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Order">
            <select
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className={inputClass}
            >
              <option value="">Select order…</option>
              {pendingOrders.map((order) => (
                <option key={order.id} value={order.order_number}>
                  {order.order_number} — {order.email} ({formatDate(order.placed_at)})
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Outbound tracking no.">
              <input
                value={outboundTracking}
                onChange={(e) => setOutboundTracking(e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Return tracking no.">
              <input
                value={returnTracking}
                onChange={(e) => setReturnTracking(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Button
            disabled={pending}
            onClick={() => {
              setDispatchMessage(null);
              startTransition(async () => {
                const result = await dispatchKit({
                  kitCode,
                  orderNumber,
                  outboundTracking,
                  returnTracking,
                });
                if (result.error) setDispatchMessage({ ok: false, text: result.error });
                else {
                  setDispatchMessage({ ok: true, text: `Kit ${kitCode} dispatched.` });
                  setKitCode("");
                  setOrderNumber("");
                  setOutboundTracking("");
                  setReturnTracking("");
                }
              });
            }}
          >
            {pending ? "Dispatching…" : "Dispatch kit"}
          </Button>
          {dispatchMessage && (
            <p className={`text-sm ${dispatchMessage.ok ? "text-emerald-700" : "text-rose-600"}`}>
              {dispatchMessage.text}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
