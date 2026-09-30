import {
  HISTORY,
  SAFETY_LABELS,
  SYMPTOM_LABELS,
  SYMPTOM_QUESTIONS,
  changeLabel,
  isVersioned,
  type StoredTriage,
} from "@/lib/triage/questions";

const Tick = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-1 shrink-0 text-maroon">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

const VALUE_LABELS: Record<string, string> = {
  yes: "Yes",
  no: "No",
  unsure: "Not sure",
  not_applicable: "Not applicable",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 font-medium text-slate-600">{label}:</dt>
      <dd>{value}</dd>
    </div>
  );
}

/**
 * Renders a saved questionnaire. `audience` decides how much detail: the
 * clinic sees every score and the safety answers; the patient sees their
 * own answers in the same order they gave them.
 */
export function TriageSummary({ answers, audience }: { answers: StoredTriage; audience: "patient" | "clinic" }) {
  if (!isVersioned(answers)) {
    return (
      <div className="space-y-3 text-sm text-slate-700">
        <ul className="space-y-1">
          {(answers.selected ?? []).map((key) => (
            <li key={key} className="flex gap-2">
              <Tick />
              {SYMPTOM_LABELS[key] ?? key}
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-slate-100 pt-3">
          {answers.duration && <Row label="Duration" value={answers.duration} />}
          {audience === "clinic" && <Row label="Previous UTI" value={VALUE_LABELS[answers.previousUti ?? ""] ?? "Not answered"} />}
          {audience === "clinic" && <Row label="Pregnant" value={VALUE_LABELS[answers.pregnant ?? ""] ?? "Not answered"} />}
          {audience === "clinic" && <Row label="Current antibiotics" value={answers.currentAntibiotics || "None reported"} />}
          {answers.notes && <Row label="Notes" value={answers.notes} />}
        </dl>
      </div>
    );
  }

  const flagged = answers.safetyFlags;
  return (
    <div className="space-y-4 text-sm text-slate-700">
      <section>
        <h4 className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400 mb-1.5">Safety check</h4>
        {flagged.length === 0 ? (
          <p>No warning signs reported.</p>
        ) : (
          <div className="rounded-xl border border-maroon/30 bg-rose-50 p-3" data-testid="triage-flags">
            <p className="font-semibold text-maroon">
              Answered yes to {flagged.length} warning {flagged.length === 1 ? "sign" : "signs"}. Urgent care was signposted.
            </p>
            <ul className="mt-1.5 space-y-1">
              {flagged.map((key) => (
                <li key={key} className="flex gap-2">
                  <span className="shrink-0 font-semibold text-maroon">{key.toUpperCase()}</span>
                  <span>{SAFETY_LABELS[key]}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400 mb-1.5">How often</h4>
        <dl className="space-y-1">
          <Row label="Continuous for 3+ months" value={VALUE_LABELS[answers.history.continuous]} />
          {answers.history.continuous === "no" && (
            <>
              <Row label="Episodes, past 6 months" value={answers.history.episodes6m ?? "Not answered"} />
              <Row label="Episodes, past 12 months" value={answers.history.episodes12m ?? "Not answered"} />
            </>
          )}
        </dl>
      </section>

      <section>
        <h4 className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400 mb-1.5">
          Symptoms, scored 0 to 10
        </h4>
        {audience === "clinic" ? (
          <table className="w-full text-sm">
            <tbody>
              {SYMPTOM_QUESTIONS.map((q) => {
                const v = answers.severity[q.key] ?? 0;
                return (
                  <tr key={q.key} className={v === 0 ? "text-slate-400" : ""}>
                    <td className="py-0.5 pr-3">{q.label}</td>
                    <td className="py-0.5 pl-2 text-right align-top">
                      <span className={`inline-block min-w-8 rounded-md px-1.5 text-center font-semibold ${v >= 7 ? "bg-maroon text-white" : v > 0 ? "bg-pink-25 text-midnight" : ""}`}>
                        {v}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : answers.selected.length === 0 ? (
          <p>No symptoms scored above 0.</p>
        ) : (
          <ul className="space-y-1">
            {answers.selected.map((key) => (
              <li key={key} className="flex gap-2">
                <Tick />
                <span>
                  {SYMPTOM_LABELS[key]} <span className="text-slate-400">({answers.severity[key]}/10)</span>
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2">
          <span className="font-medium text-slate-600">Past 24 hours:</span> {changeLabel(answers.change24h)} (
          {answers.change24h > 0 ? `+${answers.change24h}` : answers.change24h})
        </p>
      </section>

      <dl className="space-y-1 border-t border-slate-100 pt-3">
        <Row label="Duration" value={answers.duration} />
        <Row label="Previous UTI" value={VALUE_LABELS[answers.previousUti] ?? answers.previousUti} />
        {audience === "clinic" && <Row label="Pregnant" value={VALUE_LABELS[answers.pregnant] ?? answers.pregnant} />}
        {audience === "clinic" && <Row label="Current antibiotics" value={answers.currentAntibiotics || "None reported"} />}
        {answers.notes && <Row label="Notes" value={answers.notes} />}
      </dl>
    </div>
  );
}

export { HISTORY };
