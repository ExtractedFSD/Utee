"use client";

import { useMemo, useState, useTransition } from "react";
import { Card, CardTitle, Button, Field, inputClass } from "@/components/ui";
import { formatDate } from "@/lib/status";
import { formatKitCode, normalizeKitCode } from "@/lib/kit-code";
import { dispatchKit, prepareRetailKit } from "@/app/admin/actions";

type PendingOrder = { id: string; order_number: string; email: string; placed_at: string };

const CODE_PLACEHOLDER = "UT-XXXX-XXXX";

/** What a success message should call the kit, whatever was typed. */
function shown(raw: string) {
  const code = normalizeKitCode(raw);
  return code ? formatKitCode(code) : raw.trim().toUpperCase();
}

export function KitTools({ pendingOrders, initialCode }: { pendingOrders: PendingOrder[]; initialCode?: string }) {
  const [pending, startTransition] = useTransition();

  const [kitCode, setKitCode] = useState(initialCode ?? "");
  const [orderQuery, setOrderQuery] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [outboundTracking, setOutboundTracking] = useState("");
  const [returnTracking, setReturnTracking] = useState("");
  const [dispatchMessage, setDispatchMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const [retailKitCode, setRetailKitCode] = useState("");
  const [retailReturnTracking, setRetailReturnTracking] = useState("");
  const [retailMessage, setRetailMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const matchingOrders = useMemo(() => {
    const q = orderQuery.trim().toLowerCase();
    if (!q) return pendingOrders;
    return pendingOrders.filter(
      (o) => o.order_number.toLowerCase().includes(q) || o.email.toLowerCase().includes(q)
    );
  }, [orderQuery, pendingOrders]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardTitle>1 · Dispatch a kit</CardTitle>
        <p className="text-sm text-slate-500 mb-4">
          When packing an order: scan or enter the kit code, pick the order, and enter both Royal
          Mail tracking numbers. The patient is emailed their instructions automatically.
        </p>
        <div className="space-y-3">
          <Field label="Kit code">
            <input
              value={kitCode}
              onChange={(e) => setKitCode(e.target.value)}
              placeholder={CODE_PLACEHOLDER}
              autoComplete="off"
              className={`${inputClass} font-mono`}
            />
          </Field>
          <Field label="Find order" hint="Type part of the order number or the customer's email.">
            <input
              value={orderQuery}
              onChange={(e) => setOrderQuery(e.target.value)}
              placeholder="Search orders without a kit"
              autoComplete="off"
              className={inputClass}
            />
          </Field>
          <Field label="Order">
            <select
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              className={inputClass}
            >
              <option value="">Select order…</option>
              {matchingOrders.map((order) => (
                <option key={order.id} value={order.order_number}>
                  {order.order_number} · {order.email} ({formatDate(order.placed_at)})
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
                  setDispatchMessage({ ok: true, text: `Kit ${shown(kitCode)} dispatched.` });
                  setKitCode("");
                  setOrderNumber("");
                  setOrderQuery("");
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

      <Card>
        <CardTitle>2 · Prepare a retail kit</CardTitle>
        <p className="text-sm text-slate-500 mb-4">
          For kits sold through retailers or other marketplaces: scan or enter the kit code and the
          tracking number on the pre-paid return label you pack with it. The buyer registers the
          kit by scanning its QR, and their sample&apos;s return to the lab is then tracked as usual.
        </p>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kit code">
              <input
                value={retailKitCode}
                onChange={(e) => setRetailKitCode(e.target.value)}
                placeholder={CODE_PLACEHOLDER}
                autoComplete="off"
                className={`${inputClass} font-mono`}
              />
            </Field>
            <Field label="Return tracking no.">
              <input
                value={retailReturnTracking}
                onChange={(e) => setRetailReturnTracking(e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Button
            disabled={pending}
            onClick={() => {
              setRetailMessage(null);
              startTransition(async () => {
                const result = await prepareRetailKit({
                  kitCode: retailKitCode,
                  returnTracking: retailReturnTracking,
                });
                if (result.error) setRetailMessage({ ok: false, text: result.error });
                else {
                  setRetailMessage({ ok: true, text: `Kit ${shown(retailKitCode)} prepared for retail.` });
                  setRetailKitCode("");
                  setRetailReturnTracking("");
                }
              });
            }}
          >
            {pending ? "Saving…" : "Attach return label"}
          </Button>
          {retailMessage && (
            <p className={`text-sm ${retailMessage.ok ? "text-emerald-700" : "text-rose-600"}`}>
              {retailMessage.text}
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
