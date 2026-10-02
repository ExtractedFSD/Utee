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

/**
 * One field for the order: type part of the order number or the customer's
 * email, pick from the matches underneath. Only test-kit orders without a
 * kit are offered, so an empty list means there is nothing to dispatch.
 */
function OrderPicker({
  orders,
  value,
  onChange,
}: {
  orders: PendingOrder[];
  value: string;
  onChange: (orderNumber: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const chosen = orders.find((o) => o.order_number === value);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? orders.filter((o) => o.order_number.toLowerCase().includes(q) || o.email.toLowerCase().includes(q))
      : orders;
    return list.slice(0, 10);
  }, [query, orders]);

  // Not wrapped in <Field>: its <label> would forward clicks on the option
  // buttons to the first button inside it, which after a pick is "Change".
  const labelClass = "block text-sm font-semibold text-slate-700 mb-1.5";
  const hintClass = "block text-xs text-slate-500 mt-1.5";

  if (chosen) {
    return (
      <div>
        <span className={labelClass}>Order</span>
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-maroon/30 bg-pink-25 px-4 py-2.5 text-sm" data-testid="chosen-order">
          <span>
            <span className="font-semibold text-midnight">{chosen.order_number}</span>
            <span className="text-slate-600"> · {chosen.email} ({formatDate(chosen.placed_at)})</span>
          </span>
          <button type="button" onClick={() => { onChange(""); setQuery(""); }} className="text-sm font-semibold text-maroon">
            Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor="order-search" className={labelClass}>
        Order
      </label>
      <div className="relative">
        <input
          id="order-search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => window.setTimeout(() => setOpen(false), 150)}
          placeholder={orders.length ? "Search orders without a kit" : "Nothing to dispatch"}
          disabled={!orders.length}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="order-options"
          aria-autocomplete="list"
          className={inputClass}
        />
        {open && orders.length > 0 && (
          <ul id="order-options" role="listbox" className="absolute z-20 mt-1 max-h-72 w-full overflow-auto rounded-2xl border border-slate-200 bg-white p-1 shadow-card">
            {matches.length ? (
              matches.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => {
                      onChange(o.order_number);
                      setOpen(false);
                    }}
                    className="w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-pink-25"
                  >
                    <span className="font-semibold text-midnight">{o.order_number}</span>
                    <span className="text-slate-600"> · {o.email}</span>
                    <span className="block text-xs text-slate-400">{formatDate(o.placed_at)}</span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-3 py-2 text-sm text-slate-500">No orders match that.</li>
            )}
          </ul>
        )}
      </div>
      <span className={hintClass}>
        {orders.length ? "Type part of the order number or the customer's email, then pick the order." : "No test-kit orders are waiting for a kit."}
      </span>
    </div>
  );
}

export function KitTools({ pendingOrders, initialCode }: { pendingOrders: PendingOrder[]; initialCode?: string }) {
  const [pending, startTransition] = useTransition();

  const [kitCode, setKitCode] = useState(initialCode ?? "");
  const [orderNumber, setOrderNumber] = useState("");
  const [outboundTracking, setOutboundTracking] = useState("");
  const [returnTracking, setReturnTracking] = useState("");
  const [dispatchMessage, setDispatchMessage] = useState<{ ok: boolean; text: string } | null>(
    null
  );

  const [retailKitCode, setRetailKitCode] = useState("");
  const [retailReturnTracking, setRetailReturnTracking] = useState("");
  const [retailMessage, setRetailMessage] = useState<{ ok: boolean; text: string } | null>(null);

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
          <OrderPicker orders={pendingOrders} value={orderNumber} onChange={setOrderNumber} />
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
