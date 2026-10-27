"use client";

import { useState, useTransition } from "react";
import { Button, Card, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { SHARE_DURATIONS, expiresIn, type ShareRow, type ShareState } from "@/lib/tracker/share";
import { Chip } from "../components/Chips";
import { Sheet } from "../components/Sheet";
import { createShare, revokeShare } from "./actions";

export type ShareItem = ShareRow & { state: ShareState; url: string; display: string; qrSvg: string | null };

/*
 * Share: the PDF first, then one code card (the newest, or the one chosen
 * with Show), other active codes as compact rows, past codes folded away.
 * Creating a code asks who it is for, for how long, and for consent, on
 * the spot.
 */
export function ShareManager({ shares }: { shares: ShareItem[] }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");
  const [days, setDays] = useState(7);
  const [consent, setConsent] = useState(false);
  const [shownId, setShownId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null);
  const [fullScreen, setFullScreen] = useState<ShareItem | null>(null);

  const active = shares.filter((s) => s.state === "active");
  const past = shares.filter((s) => s.state !== "active");
  const shown = active.find((s) => s.id === shownId) ?? active[0] ?? null;
  const others = active.filter((s) => s.id !== shown?.id);

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
      if ("id" in r && r.id) { setShownId(r.id); setCreating(false); setLabel(""); setConsent(false); }
    });
  };
  const revoke = (id: string) => {
    setError(null);
    startTransition(async () => {
      const r = await revokeShare(id);
      if (r.error) setError(r.error);
      setConfirmRevoke(null);
      setMenuId(null);
      if (shownId === id) setShownId(null);
    });
  };
  const status = (s: ShareItem) => `${expiresIn(s.expires_at) ?? copy.share.expired} · ${s.view_count ? copy.share.openedTimes(s.view_count) : copy.share.notOpened}`;

  return (
    <div className="space-y-5" data-testid="share-list">
      <div className="flex flex-wrap gap-2">
        <a href="/portal/passport/passport" className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-maroon px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[.14em] text-white shadow-card hover:bg-brand-700">{copy.share.downloadPdf}</a>
        <Button variant="secondary" onClick={() => { setCreating(true); setError(null); }}>{copy.share.newCode}</Button>
      </div>

      {shown ? (
        <Card data-testid="share-created">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-base font-semibold text-midnight">{shown.label || "Share code"}</p>
              <p className="text-[13px] text-[#5a4a6e]">{status(shown)}</p>
            </div>
            <div className="relative shrink-0">
              <button type="button" aria-label={copy.share.menu} aria-haspopup="menu" aria-expanded={menuId === shown.id} onClick={() => setMenuId(menuId === shown.id ? null : shown.id)} className="flex h-10 w-10 items-center justify-center rounded-full border border-midnight/15 bg-white text-midnight hover:bg-pink-25">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
              </button>
              {menuId === shown.id && (
                <div role="menu" className="absolute right-0 top-11 z-30 min-w-[200px] rounded-2xl bg-white p-2 shadow-card">
                  <a role="menuitem" href={`/portal/passport/passport?share=${shown.id}`} className="block min-h-[44px] rounded-xl px-3 py-3 text-sm font-semibold text-midnight hover:bg-pink-25">{copy.share.printableShort}</a>
                  <button type="button" role="menuitem" onClick={() => { setMenuId(null); setConfirmRevoke(shown.id); }} className="w-full min-h-[44px] rounded-xl px-3 text-left text-sm font-semibold text-maroon hover:bg-pink-25">{copy.share.revoke}</button>
                </div>
              )}
            </div>
          </div>
          {confirmRevoke === shown.id && (
            <div className="mt-3 rounded-2xl bg-pink-25 p-4">
              <p className="text-sm text-midnight mb-3">{copy.share.revokeConfirm}</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="danger" disabled={pending} onClick={() => revoke(shown.id)}>{copy.share.revoke}</Button>
                <Button variant="secondary" onClick={() => setConfirmRevoke(null)}>{copy.episode.cancel}</Button>
              </div>
            </div>
          )}
          <div className="mt-4 flex flex-col items-center gap-4">
            {shown.qrSvg && <div className="w-[180px] rounded-2xl border border-[rgba(29,0,58,.08)] bg-white p-2" aria-label="QR code for the link" dangerouslySetInnerHTML={{ __html: shown.qrSvg }} />}
            <p className="font-mono text-2xl font-semibold tracking-[.14em] text-midnight whitespace-nowrap" data-testid="share-code">{shown.display}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={() => copyLink(shown)}>{copiedId === shown.id ? copy.share.copied : copy.share.copyLink}</Button>
              <Button variant="secondary" onClick={() => setFullScreen(shown)}>{copy.share.showFullScreen}</Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card><p className="text-center text-[13px] text-[#5a4a6e]">{copy.share.empty}</p></Card>
      )}

      {others.length > 0 && (
        <Card className="!py-2">
          <ul className="divide-y divide-[rgba(29,0,58,.08)]">
            {others.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-3 py-3">
                <button type="button" onClick={() => setShownId(s.id)} className="min-w-0 flex-1 text-left">
                  <span className="block text-sm font-semibold text-midnight">{s.label || "Share code"}</span>
                  <span className="block text-[13px] text-[#5a4a6e]">{status(s)}</span>
                </button>
                <button type="button" onClick={() => setShownId(s.id)} className="min-h-[44px] px-2 text-sm font-semibold text-maroon">{copy.share.show}</button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {past.length > 0 && (
        <details className="rounded-card bg-white px-5 py-3 shadow-card">
          <summary className="cursor-pointer select-none text-sm font-semibold text-maroon min-h-[44px] inline-flex items-center">{copy.share.pastList} ({past.length})</summary>
          <ul className="divide-y divide-[rgba(29,0,58,.08)]">
            {past.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <p className="text-sm text-[#5a4a6e]">{s.label || "Share code"} <span className="font-mono text-[#8a7a9c]">{s.display}</span> · {s.view_count ? copy.share.openedTimes(s.view_count) : copy.share.notOpened}</p>
                <span className="text-[11px] font-semibold uppercase tracking-[.08em] text-[#8a7a9c]">{s.state === "revoked" ? copy.share.revoked : copy.share.expired}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      {error && !creating && <p className="text-sm text-rose-600">{error}</p>}
      <p className="text-center text-[13px] text-[#5a4a6e]">{copy.share.whatTheySeeBody}</p>

      <Sheet open={creating} title={copy.share.newCode} onClose={() => setCreating(false)} doneLabel={copy.episode.cancel} modal testId="sheet-share">
        <div className="space-y-5">
          <div>
            <label htmlFor="share-label" className="block text-sm font-semibold text-midnight mb-2">{copy.share.whoFor}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {copy.share.suggestions.map((s) => <Chip key={s} selected={label === s} onClick={() => setLabel(label === s ? "" : s)}>{s}</Chip>)}
            </div>
            <input id="share-label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={80} className={inputClass} placeholder={copy.share.labelPlaceholder} />
          </div>
          <div>
            <p className="text-sm font-semibold text-midnight mb-2">{copy.share.durationQuestion}</p>
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

      {fullScreen && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-white p-6" role="dialog" aria-modal="true" aria-label={copy.share.showFullScreen} data-testid="share-fullscreen">
          {fullScreen.qrSvg && <div className="w-[min(70vw,320px)] [&>svg]:h-auto [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: fullScreen.qrSvg }} />}
          <p className="font-mono text-3xl font-semibold tracking-[.14em] text-midnight whitespace-nowrap">{fullScreen.display}</p>
          <p className="text-[13px] text-[#5a4a6e]">{copy.share.fullScreenHint}</p>
          <Button variant="secondary" onClick={() => setFullScreen(null)}>{copy.share.close}</Button>
        </div>
      )}
    </div>
  );
}
