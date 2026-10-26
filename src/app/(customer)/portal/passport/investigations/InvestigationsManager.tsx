"use client";

import { useState, useTransition } from "react";
import { Button, Card, CardTitle, Pill, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { INVESTIGATION_KINDS, investigationKind, investigationLine, type InvestigationRow } from "@/lib/tracker/passport";
import type { InvestigationExtract } from "@/lib/tracker/guided/investigation";
import { verificationFor, verifiedLine, type VerificationRow } from "@/lib/tracker/verify";
import { SourcePill } from "../components/SourcePill";
import { formatDay, isoToday } from "@/lib/tracker/stats";
import { Chip } from "../components/Chips";
import { Sheet } from "../components/Sheet";
import { addInvestigation, deleteInvestigation, describeInvestigation, updateInvestigation, type InvestigationInput } from "./actions";

const linkBtn = "min-h-[44px] px-2 text-sm font-semibold text-maroon";

type Draft = {
  kind: string;
  performed_on: string;
  normal: "yes" | "no" | "unknown";
  findings: Set<string>;
  body_part: string;
  values: Record<string, string>;
  notes: string;
};

const emptyDraft = (): Draft => ({ kind: "", performed_on: "", normal: "unknown", findings: new Set(), body_part: "", values: {}, notes: "" });

function draftFrom(row: InvestigationRow): Draft {
  return {
    kind: row.kind,
    performed_on: row.performed_on ?? "",
    normal: row.normal === true ? "yes" : row.normal === false ? "no" : "unknown",
    findings: new Set(row.findings),
    body_part: row.body_part ?? "",
    values: Object.fromEntries(Object.entries(row.values ?? {}).map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)])),
    notes: row.notes ?? "",
  };
}

function draftFromExtract(x: InvestigationExtract, base: Draft): Draft {
  const values: Record<string, string> = { ...base.values };
  if (x.creatinine !== null) values.creatinine = String(x.creatinine);
  if (x.egfr !== null) values.egfr = String(x.egfr);
  if (x.pvr_ml !== null) values.pvr_ml = String(x.pvr_ml);
  return {
    kind: x.kind ?? base.kind,
    performed_on: x.performed_on ?? base.performed_on,
    normal: x.normal === true ? "yes" : x.normal === false ? "no" : base.normal,
    findings: new Set(x.findings.length ? x.findings : [...base.findings]),
    body_part: x.body_part ?? base.body_part,
    values,
    notes: x.notes ?? base.notes,
  };
}

function toInput(d: Draft): InvestigationInput {
  return {
    kind: d.kind as InvestigationInput["kind"],
    performed_on: d.performed_on,
    normal: d.normal,
    findings: [...d.findings],
    body_part: d.body_part,
    values: d.values,
    notes: d.notes,
  };
}

/**
 * The list, newest first, and one sheet for adding or editing. The sheet
 * opens with a "describe it" box so Una can fill the form; the fields below
 * are always there for checking and for anyone who prefers tapping.
 */
export function InvestigationsManager({ rows, unaAi, verifications = [], intro }: { rows: InvestigationRow[]; unaAi: boolean; verifications?: VerificationRow[]; intro?: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<"add" | string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft());
  const [describe, setDescribe] = useState("");
  const [readBy, setReadBy] = useState<"ai" | "local" | null>(null);

  const run = (fn: () => Promise<unknown>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      const err = (r as { error?: string } | null | undefined)?.error;
      if (err) setError(err);
      else after?.();
    });
  };

  const close = () => { setOpen(null); setDraft(emptyDraft()); setDescribe(""); setReadBy(null); setError(null); };
  const startAdd = () => { setDraft(emptyDraft()); setDescribe(""); setReadBy(null); setOpen("add"); };
  const startEdit = (row: InvestigationRow) => { setDraft(draftFrom(row)); setDescribe(""); setReadBy(null); setOpen(row.id); };
  const def = draft.kind ? investigationKind(draft.kind) : null;
  const canSave = !!draft.kind;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-[#5a4a6e]">{intro ?? copy.record.investigationsIntro}</p>
        <Button onClick={startAdd} className="shrink-0">{copy.investigations.add}</Button>
      </div>
      <div className="space-y-3" data-testid="investigations-list">
        {rows.length === 0 && <Card><p className="text-center text-[13px] text-[#5a4a6e]">{copy.investigations.empty}</p></Card>}
        {rows.map((r) => {
          const line = investigationLine(r);
          const verified = verificationFor(verifications, "investigation", r.id);
          return (
            <button key={r.id} type="button" onClick={() => startEdit(r)} className="block w-full text-left">
              <Card className="!p-5 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-base font-semibold text-midnight">{r.performed_on ? formatDay(r.performed_on) : "Date unknown"} · {line.title}</p>
                  <SourcePill source={verified ? "verified" : "patient"} />
                </div>
                <p className="mt-1 text-sm text-midnight">{line.detail || copy.investigations.noDetail}</p>
                {verified && <p className="mt-2 text-[12px] text-[#5a4a6e]" title={copy.share.verifiedHint}>{verifiedLine(verified)}</p>}
              </Card>
            </button>
          );
        })}
        {error && !open && <p className="text-sm text-rose-600">{error}</p>}
      </div>

      <Sheet open={!!open} title={open === "add" ? copy.investigations.add : def?.short ?? copy.investigations.edit} onClose={close} doneLabel={copy.episode.cancel} testId="sheet-investigation" modal>
        <div className="space-y-5">
          {open === "add" && (
            <div className="rounded-2xl bg-pink-25 p-4">
              <label htmlFor="investigation-describe" className="block text-sm font-semibold text-midnight mb-1">{copy.investigations.describe}</label>
              <p className="text-xs text-slate-600 mb-2">{copy.investigations.describeHint}</p>
              <textarea id="investigation-describe" value={describe} onChange={(e) => setDescribe(e.target.value)} rows={2} className={`${inputClass} w-full`} maxLength={1000} />
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  disabled={pending || !describe.trim()}
                  onClick={() => run(async () => {
                    const r = await describeInvestigation(describe);
                    if ("error" in r) return r;
                    setDraft((d) => draftFromExtract(r.result, d));
                    setReadBy(r.source);
                    return r;
                  })}
                >
                  {pending ? "Reading..." : copy.investigations.describeButton}
                </Button>
                {readBy && <span className="text-xs text-slate-600">{copy.investigations.reviewHint}{!unaAi || readBy === "local" ? "" : ""}</span>}
              </div>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">{copy.investigations.kind}</p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={copy.investigations.kind} data-testid="investigation-kind">
              {INVESTIGATION_KINDS.map((k) => (
                <Chip key={k.key} selected={draft.kind === k.key} onClick={() => setDraft((d) => ({ ...d, kind: k.key, findings: d.kind === k.key ? d.findings : new Set() }))}>{k.short}</Chip>
              ))}
            </div>
          </div>

          {def && (
            <>
              <div>
                <label htmlFor="investigation-date" className="block text-sm font-semibold text-slate-700 mb-1">{copy.investigations.date}</label>
                <p className="text-xs text-slate-500 mb-2">{copy.investigations.dateHint}</p>
                <input id="investigation-date" type="date" value={draft.performed_on} max={isoToday()} onChange={(e) => setDraft((d) => ({ ...d, performed_on: e.target.value }))} className={`${inputClass} max-w-xs`} />
              </div>

              {def.bodyPart && (
                <div>
                  <label htmlFor="investigation-body" className="block text-sm font-semibold text-slate-700 mb-2">{copy.investigations.bodyPart}</label>
                  <input id="investigation-body" value={draft.body_part} onChange={(e) => setDraft((d) => ({ ...d, body_part: e.target.value }))} placeholder="For example pelvis, kidneys, spine" className={`${inputClass} max-w-md`} maxLength={80} />
                </div>
              )}

              {def.values.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {def.values.map((v) => (
                    <div key={v.key}>
                      <label htmlFor={`investigation-${v.key}`} className="block text-sm font-semibold text-slate-700 mb-1">{v.label}</label>
                      <div className="flex items-center gap-2">
                        <input id={`investigation-${v.key}`} inputMode="decimal" value={draft.values[v.key] ?? ""} onChange={(e) => setDraft((d) => ({ ...d, values: { ...d.values, [v.key]: e.target.value } }))} className={`${inputClass} max-w-[9rem]`} />
                        <span className="text-sm text-slate-500">{v.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">{copy.investigations.normal}</p>
                <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={copy.investigations.normal} data-testid="investigation-normal">
                  {(["yes", "no", "unknown"] as const).map((v) => (
                    <Chip key={v} selected={draft.normal === v} onClick={() => setDraft((d) => ({ ...d, normal: v }))}>
                      {v === "yes" ? copy.investigations.normalYes : v === "no" ? copy.investigations.normalNo : copy.investigations.normalUnknown}
                    </Chip>
                  ))}
                </div>
              </div>

              {draft.normal === "no" && def.findings.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">{copy.investigations.findings}</p>
                  <div className="flex flex-wrap gap-2" data-testid="investigation-findings">
                    {def.findings.map((f) => (
                      <Chip key={f.key} selected={draft.findings.has(f.key)} onClick={() => setDraft((d) => { const n = new Set(d.findings); if (n.has(f.key)) n.delete(f.key); else n.add(f.key); return { ...d, findings: n }; })}>{f.label}</Chip>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="investigation-notes" className="block text-sm font-semibold text-slate-700 mb-2">{copy.investigations.notes}</label>
                <textarea id="investigation-notes" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} rows={3} className={`${inputClass} w-full`} maxLength={2000} />
              </div>
            </>
          )}

          {error && <p className="text-sm text-rose-600">{error}</p>}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Button
              disabled={pending || !canSave}
              onClick={() => run(() => (open === "add" ? addInvestigation(toInput(draft)) : updateInvestigation(open!, toInput(draft))), close)}
            >
              {copy.investigations.addButton}
            </Button>
            <button type="button" className={linkBtn} onClick={close}>{copy.episode.cancel}</button>
            {open && open !== "add" && (
              <button type="button" className={`${linkBtn} ml-auto`} disabled={pending} onClick={() => run(() => deleteInvestigation(open), close)}>{copy.investigations.remove}</button>
            )}
          </div>
        </div>
      </Sheet>
    </div>
  );
}
