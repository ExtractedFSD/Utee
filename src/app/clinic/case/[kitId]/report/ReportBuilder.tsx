"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, CardTitle, Field, Pill, inputClass } from "@/components/ui";
import { formatDateTime } from "@/lib/status";
import type { ReportContent } from "@/lib/report/content";
import type { StoredSignature } from "@/lib/report/build";
import type { SavedSignature } from "@/app/clinic/signature/actions";
import { SignatureForm } from "@/app/clinic/signature/SignatureForm";
import { publishReport, saveReportDraft, signReport, unsignReport } from "./actions";

type Props = {
  kitId: string;
  kitCode: string;
  patientName: string | null;
  detected: string[];
  initial: ReportContent;
  suggested: ReportContent;
  signatures: StoredSignature[];
  me: { id: string; fullName: string | null; superAdmin: boolean };
  mySignature: SavedSignature | null;
};

export function ReportBuilder({ kitId, kitCode, patientName, detected, initial, suggested, signatures, me, mySignature }: Props) {
  const router = useRouter();
  const [content, setContent] = useState<ReportContent>(initial);
  const [dirty, setDirty] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isSuggested =
    content.headline.trim() === suggested.headline && content.resultText.trim() === suggested.resultText && content.contamination === suggested.contamination;
  const signedByMe = signatures.some((s) => s.user_id === me.id);

  function update<K extends keyof ReportContent>(key: K, value: ReportContent[K]) {
    setContent((c) => ({ ...c, [key]: value }));
    setDirty(true);
  }

  function run(label: string, action: () => Promise<{ ok: true } | { error: string }>, after?: () => void) {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      if ("error" in result) {
        setError(result.error);
        return;
      }
      setDirty(false);
      setPreviewKey((k) => k + 1);
      setNotice(label);
      router.refresh();
      after?.();
    });
  }

  const previewSrc = `/clinic/case/${kitId}/report/preview?v=${previewKey}`;

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>Results wording</CardTitle>
            <Pill tone={isSuggested ? "green" : "amber"}>{isSuggested ? "Suggested wording" : "Edited by clinician"}</Pill>
          </div>
          <p className="text-sm text-slate-600">
            Lab sheet for {kitCode}: {detected.length === 0 ? "no uropathogens detected." : `detected ${detected.join(", ")}.`} The wording below was
            generated from it. Edit anything the patient should read differently, or reset to the suggestion.
          </p>

          <Field label="Headline">
            <input value={content.headline} onChange={(e) => update("headline", e.target.value)} className={inputClass} maxLength={120} data-testid="report-headline" />
          </Field>
          <Field label="What the result means" hint="Shown under the result tiles. Leave a blank line between paragraphs.">
            <textarea value={content.resultText} onChange={(e) => update("resultText", e.target.value)} rows={10} className={inputClass} data-testid="report-text" />
          </Field>
          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm">
            <input
              type="checkbox"
              checked={content.contamination}
              onChange={(e) => update("contamination", e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-maroon"
              data-testid="report-contamination"
            />
            <span>
              <span className="font-semibold text-midnight">Treat as a contaminated sample.</span>{" "}
              <span className="text-slate-600">
                The result tiles still show what was detected, but the individual pathogen profiles and antibiotic suggestions are left out of the report.
              </span>
            </span>
          </label>
          <Field label="A note from the reviewing clinician (optional)" hint="Printed on the results page, addressed to the patient.">
            <textarea value={content.clinicianNote} onChange={(e) => update("clinicianNote", e.target.value)} rows={3} className={inputClass} data-testid="report-note" />
          </Field>

          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="secondary" disabled={pending} onClick={() => run("Draft saved.", () => saveReportDraft(kitId, content))}>
              {pending ? "Working…" : dirty ? "Save and refresh preview" : "Refresh preview"}
            </Button>
            {!isSuggested && (
              <button
                type="button"
                className="text-sm font-semibold text-slate-500 hover:text-midnight"
                onClick={() => {
                  setContent({ ...suggested, clinicianNote: content.clinicianNote });
                  setDirty(true);
                }}
              >
                Reset to suggested wording
              </button>
            )}
          </div>
        </Card>

        <Card className="space-y-4">
          <CardTitle>Signatures</CardTitle>
          {signatures.length === 0 ? (
            <p className="text-sm text-slate-500">Nobody has signed this report yet. At least one signature is needed to publish.</p>
          ) : (
            <ul className="divide-y divide-slate-100" data-testid="report-signatures">
              {signatures.map((sig) => (
                <li key={sig.user_id} className="flex items-center justify-between gap-4 py-2 text-sm">
                  <div>
                    <p className="font-semibold text-midnight">{sig.name}</p>
                    <p className="text-xs text-slate-500">
                      {[sig.title, sig.organisation && `on behalf of ${sig.organisation}`].filter(Boolean).join(" · ")}
                      {" · "}signed {formatDateTime(sig.signed_at)}
                    </p>
                  </div>
                  {(sig.user_id === me.id || me.superAdmin) && (
                    <button
                      type="button"
                      className="text-xs font-semibold text-slate-500 hover:text-maroon"
                      disabled={pending}
                      onClick={() => run("Signature removed.", () => unsignReport(kitId, sig.user_id))}
                    >
                      Remove
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          {mySignature ? (
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" disabled={pending} onClick={() => run(signedByMe ? "Signature updated." : "Report signed.", () => signReport(kitId, content))}>
                {signedByMe ? `Re-sign as ${mySignature.displayName}` : `Sign as ${mySignature.displayName}`}
              </Button>
              <a href="/clinic/signature" className="text-sm font-semibold text-slate-500 hover:text-midnight">
                Change my signature
              </a>
            </div>
          ) : (
            <div className="rounded-2xl border border-sun bg-sun-50 p-4">
              <p className="mb-3 text-sm text-amber-800">You have not saved a signature yet. Draw it once here and it will be applied to every report you sign.</p>
              <SignatureForm initial={{ displayName: me.fullName ?? "", title: "", organisation: "" }} />
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <CardTitle>Publish to the patient</CardTitle>
          <p className="text-sm text-slate-600">
            Publishing generates the final PDF with the signatures above, makes it available in {patientName ?? "the patient"}&apos;s portal and emails them that
            it is ready. The wording on screen is saved as part of publishing.
          </p>
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-maroon" data-testid="report-confirm" />
            <span className="text-slate-700">I have reviewed the lab result, the patient&apos;s symptoms and the wording above.</span>
          </label>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {notice && <p className="text-sm text-emerald-700">{notice}</p>}
          <Button type="button" disabled={pending || !confirmed || signatures.length === 0} onClick={() => run("Report published.", () => publishReport(kitId, content), () => router.push(`/clinic/case/${kitId}`))}>
            {pending ? "Publishing…" : "Publish report to patient"}
          </Button>
          {signatures.length === 0 && <p className="text-xs text-slate-500">Sign the report to enable publishing.</p>}
        </Card>
      </div>

      <div className="xl:sticky xl:top-24 xl:self-start">
        <Card className="overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
            <CardTitle>Preview</CardTitle>
            <a href={previewSrc} target="_blank" rel="noreferrer" className="text-xs font-semibold text-slate-500 hover:text-midnight">
              Open in a new tab
            </a>
          </div>
          {dirty && <p className="bg-sun-50 px-5 py-2 text-xs text-amber-800">The preview shows the last saved wording. Save to update it.</p>}
          <iframe key={previewKey} src={previewSrc} title="Report preview" className="h-[78vh] w-full bg-slate-100" data-testid="report-preview" />
        </Card>
      </div>
    </div>
  );
}
