"use client";

import { useState, useTransition } from "react";
import { Button, Card, CardTitle, Pill, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { SHARE_DURATIONS, formatUntil, type ShareRow, type ShareState } from "@/lib/tracker/share";
import { formatDay } from "@/lib/tracker/stats";
import { Chip } from "../components/Chips";
import { Sheet } from "../components/Sheet";
import { createShare, revokeShare } from "./actions";

export type ShareItem = ShareRow & { state: ShareState; url: string; display: string; qrSvg: string | null };

/*
 * One code per clinician, each with its own expiry. Creating one asks for
 * consent on the spot; the new code is shown large with its QR and link.
 */
export function ShareManager({ shares }: { shares: ShareItem[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(7);
  const [consent, setConsent] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);

  const active = shares.filter((s) => s.state === "active");
  const past = shares.filter((s) => s.state !== "active");
  const created = createdId ? shares.find((s) => s.id === createdId) ?? null : null;

  const copyLink = async (s: ShareItem) => {
    try {
      await navigator.clipboard.writeText(s.url);
      setCopiedId(s.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      setError("Could not copy. Select the link and copy it by hand.");
    }
  };

  const create = () => {
    setError(null);
    if (!consent) { setError(copy.share.consentRequired); return; }
    startTransition(async () => {
      const r = await createShare({ label, days, consent });
      if ("error" in r && r.error) { setError(r.error); return; }
      if ("id" in r && r.id) { setCreatedId(r.id); setCreating(false); setLabel(""); setConsent(false); }
    });
  };

  const revoke = (id: string) => {
    setError(null);
    startTransition(async () => {
      const r = await revokeShare(id);
      if (r.error) setError(r.error);
      setConfirmRevoke(null);
      if (createdId === id) setCreatedId(null);
    });
  };

  return (
    <div className="space-y-6">
      {created && (
        <Card className="border border-maroon/30" data-testid="share-created">
          <CardTitle>{copy.share.created}</CardTitle>
          <p className="text-sm text-slate-600 mb-4">{copy.share.createdBody}</p>
          <ShareCodeBlock share={created} copied={copiedId === created.id} onCopy={() => copyLink(created)} />
        </Card>
      )}

      <Card data-testid="share-list">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <CardTitle>{copy.share.activeList}</CardTitle>
          <Button variant="secondary" onClick={() => { setCreating(true); setError(null); }}>{copy.share.create}</Button>
        </div>
        {active.length === 0 ? (
          <p className="text-sm text-slate-600">{copy.share.empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {active.map((s) => (
              <li key={s.id} className="py-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-midnight">{s.label || "Share code"} <span className="font-mono font-normal text-slate-600">{s.display}</span></p>
                    <p className="text-xs text-slate-600 mt-0.5">{copy.share.validUntil(formatUntil(s.expires_at))} · {copy.share.opened(s.view_count, s.last_viewed_at ? formatDay(s.last_viewed_at.slice(0, 10)) : "")}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="min-h-[44px] px-2 text-sm font-semibold text-maroon" onClick={() => setCreatedId(s.id)}>Show</button>
                    <button type="button" className="min-h-[44px] px-2 text-sm font-semibold text-maroon" onClick={() => copyLink(s)}>{copiedId === s.id ? copy.share.copied : copy.share.copyLink}</button>
                    <a href={`/portal/passport/passport?share=${s.id}`} className="min-h-[44px] inline-flex items-center px-2 text-sm font-semibold text-maroon">{copy.share.printable}</a>
                    {confirmRevoke === s.id ? (
                      <span className="inline-flex items-center gap-2">
                        <span className="text-xs text-slate-600">{copy.share.revokeConfirm}</span>
                        <Button variant="danger" disabled={pending} onClick={() => revoke(s.id)}>{copy.share.revoke}</Button>
                        <button type="button" className="min-h-[44px] px-2 text-sm font-semibold text-maroon" onClick={() => setConfirmRevoke(null)}>{copy.episode.cancel}</button>
                      </span>
                    ) : (
                      <button type="button" className="min-h-[44px] px-2 text-sm font-semibold text-maroon" onClick={() => setConfirmRevoke(s.id)}>{copy.share.revoke}</button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
        {error && !creating && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </Card>

      {past.length > 0 && (
        <Card>
          <CardTitle>{copy.share.pastList}</CardTitle>
          <ul className="divide-y divide-slate-100">
            {past.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <p className="text-sm text-slate-700">{s.label || "Share code"} <span className="font-mono text-slate-500">{s.display}</span> · {copy.share.opened(s.view_count, s.last_viewed_at ? formatDay(s.last_viewed_at.slice(0, 10)) : "")}</p>
                <Pill tone="slate">{s.state === "revoked" ? copy.share.revoked : copy.share.expired}</Pill>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Sheet open={creating} title={copy.share.create} onClose={() => setCreating(false)} doneLabel={copy.episode.cancel} modal testId="sheet-share">
        <div className="space-y-5">
          <div>
            <label htmlFor="share-label" className="block text-sm font-semibold text-slate-700 mb-2">{copy.share.labelQuestion}</label>
            <input id="share-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} className={inputClass} placeholder={copy.share.labelPlaceholder} />
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">{copy.share.durationQuestion}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={copy.share.durationQuestion}>
              {SHARE_DURATIONS.map((d) => <Chip key={d.days} selected={days === d.days} onClick={() => setDays(d.days)}>{d.label}</Chip>)}
            </div>
          </div>
          <label className="flex items-start gap-3 rounded-2xl bg-pink-25 p-4">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1 h-5 w-5 rounded" />
            <span className="text-sm text-midnight">{copy.share.consentLabel}</span>
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-3">
            <Button disabled={pending} onClick={create}>{copy.share.create}</Button>
            <button type="button" className="min-h-[44px] px-2 text-sm font-semibold text-maroon" onClick={() => setCreating(false)}>{copy.episode.cancel}</button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

function ShareCodeBlock({ share, copied, onCopy }: { share: ShareItem; copied: boolean; onCopy: () => void }) {
  return (
    <div className="grid gap-5 sm:grid-cols-[180px_minmax(0,1fr)] items-start">
      {share.qrSvg && <div className="w-[180px] rounded-2xl border border-slate-200 bg-white p-2" aria-label="QR code for the link" dangerouslySetInnerHTML={{ __html: share.qrSvg }} />}
      <div className="space-y-3 min-w-0">
        <p className="font-mono text-2xl sm:text-3xl font-semibold tracking-wider text-midnight break-all" data-testid="share-code">{share.display}</p>
        <p className="text-sm text-slate-700 break-all"><a href={share.url} className="font-semibold text-maroon">{share.url}</a></p>
        <p className="text-xs text-slate-600">{share.label ? `${share.label} · ` : ""}{copy.share.validUntil(formatUntil(share.expires_at))}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onCopy}>{copied ? copy.share.copied : copy.share.copyLink}</Button>
          <a href={`/portal/passport/passport?share=${share.id}`} className="inline-flex min-h-[44px] items-center justify-center rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[.14em] bg-white text-midnight border border-midnight/15 hover:bg-pink-25">{copy.share.printable}</a>
        </div>
      </div>
    </div>
  );
}
