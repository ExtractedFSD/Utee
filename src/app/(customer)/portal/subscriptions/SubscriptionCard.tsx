"use client";

import { useState, useTransition } from "react";
import { Card, Button, Pill, inputClass } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/status";
import { skipDelivery, delayDelivery, cancelSub } from "./actions";

export type SubscriptionRow = {
  id: string;
  product_title: string;
  variant_title: string | null;
  price: number | null;
  currency: string;
  status: string;
  order_interval_unit: string | null;
  order_interval_frequency: number | null;
  next_charge_scheduled_at: string | null;
};

export function SubscriptionCard({ subscription }: { subscription: SubscriptionRow }) {
  const [pending, startTransition] = useTransition();
  const [panel, setPanel] = useState<"none" | "delay" | "cancel">("none");
  const [delayDate, setDelayDate] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const active = subscription.status === "active";

  function run(action: () => Promise<{ ok?: boolean; error?: string }>, okText: string) {
    setMessage(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setMessage({ tone: "error", text: result.error });
      else {
        setMessage({ tone: "ok", text: okText });
        setPanel("none");
      }
    });
  }

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-slate-900">
              {subscription.product_title}
            </h3>
            <Pill tone={active ? "green" : "slate"}>{subscription.status}</Pill>
          </div>
          {subscription.variant_title && (
            <p className="text-sm text-slate-500">{subscription.variant_title}</p>
          )}
          <p className="text-sm text-slate-600 mt-1">
            {subscription.price != null &&
              `${formatMoney(subscription.price, subscription.currency)} every `}
            {subscription.order_interval_frequency} {subscription.order_interval_unit}
            {(subscription.order_interval_frequency ?? 1) > 1 ? "s" : ""}
          </p>
          {active && (
            <p className="text-sm text-slate-500 mt-1">
              Next delivery:{" "}
              <span className="font-medium text-slate-700">
                {formatDate(subscription.next_charge_scheduled_at)}
              </span>
            </p>
          )}
        </div>

        {active && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() =>
                run(() => skipDelivery(subscription.id), "Your next delivery has been skipped.")
              }
            >
              Skip next delivery
            </Button>
            <Button
              variant="secondary"
              disabled={pending}
              onClick={() => setPanel(panel === "delay" ? "none" : "delay")}
            >
              Change date
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => setPanel(panel === "cancel" ? "none" : "cancel")}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>

      {panel === "delay" && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="block text-sm font-medium text-slate-700 mb-1">
              New delivery date
            </span>
            <input
              type="date"
              value={delayDate}
              min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
              onChange={(e) => setDelayDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <Button
            disabled={pending || !delayDate}
            onClick={() =>
              run(() => delayDelivery(subscription.id, delayDate), "Delivery date updated.")
            }
          >
            {pending ? "Updating…" : "Confirm new date"}
          </Button>
        </div>
      )}

      {panel === "cancel" && (
        <div className="mt-4 rounded-xl bg-rose-50 p-4 space-y-3">
          <p className="text-sm text-slate-700">
            We&apos;re sorry to see you go. Mind telling us why? (optional)
          </p>
          <input
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancelling"
            className={inputClass}
          />
          <Button
            variant="danger"
            disabled={pending}
            onClick={() =>
              run(() => cancelSub(subscription.id, cancelReason), "Subscription cancelled.")
            }
          >
            {pending ? "Cancelling…" : "Confirm cancellation"}
          </Button>
        </div>
      )}

      {message && (
        <p
          className={`mt-3 text-sm ${message.tone === "ok" ? "text-emerald-700" : "text-rose-600"}`}
        >
          {message.text}
        </p>
      )}
    </Card>
  );
}
