import {
  SAFETY_LABELS,
  SYMPTOM_LABELS,
  SYMPTOM_QUESTIONS,
  WORKED_LABELS,
  changeLabel,
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

function Heading({ children }: { children: React.ReactNode }) {
  return <h4 className="text-xs font-semibold uppercase tracking-[.14em] text-slate-400 mb-1.5">{children}</h4>;
}

function SafetySection({ flagged }: { flagged: string[] }) {
  return (
    <section>
      <Heading>Safety check</Heading>
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
  );
}

function Change({ value }: { value: number }) {
  return (
    <p className="mt-2">
      <span className="font-medium text-slate-600">Past 24 hours:</span> {changeLabel(value)} ({value > 0 ? `+${value}` : value})
    </p>
  );
}

/**
 * Renders a saved questionnaire, whichever version saved it. `audience`
 * decides how much detail: the clinic sees every answer; the patient sees
 * their own answers in the order they gave them.
 */
export function TriageSummary({ answers, audience }: { answers: StoredTriage; audience: "patient" | "clinic" }) {
  const clinic = audience === "clinic";

  if (answers.version === undefined) {
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
          {clinic && <Row label="Previous UTI" value={VALUE_LABELS[answers.previousUti ?? ""] ?? "Not answered"} />}
          {clinic && <Row label="Pregnant" value={VALUE_LABELS[answers.pregnant ?? ""] ?? "Not answered"} />}
          {clinic && <Row label="Current antibiotics" value={answers.currentAntibiotics || "None reported"} />}
          {answers.notes && <Row label="Notes" value={answers.notes} />}
        </dl>
      </div>
    );
  }

  if (answers.version === 2) {
    return (
      <div className="space-y-4 text-sm text-slate-700">
        <SafetySection flagged={answers.safetyFlags} />
        <section>
          <Heading>How often</Heading>
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
          <Heading>Symptoms, scored 0 to 10</Heading>
          <ul className="space-y-1">
            {SYMPTOM_QUESTIONS.filter((q) => clinic || (answers.severity[q.key] ?? 0) > 0).map((q) => (
              <li key={q.key} className={`flex gap-2 ${(answers.severity[q.key] ?? 0) === 0 ? "text-slate-400" : ""}`}>
                <span className="min-w-8 shrink-0 font-semibold">{answers.severity[q.key] ?? 0}</span>
                {q.label}
              </li>
            ))}
          </ul>
          <Change value={answers.change24h} />
        </section>
        <dl className="space-y-1 border-t border-slate-100 pt-3">
          <Row label="Duration" value={answers.duration} />
          <Row label="Previous UTI" value={VALUE_LABELS[answers.previousUti] ?? answers.previousUti} />
          {clinic && <Row label="Pregnant" value={VALUE_LABELS[answers.pregnant] ?? answers.pregnant} />}
          {clinic && <Row label="Current antibiotics" value={answers.currentAntibiotics || "None reported"} />}
          {answers.notes && <Row label="Notes" value={answers.notes} />}
        </dl>
      </div>
    );
  }

  const { history } = answers;
  return (
    <div className="space-y-4 text-sm text-slate-700">
      <SafetySection flagged={answers.safetyFlags} />

      <section>
        <Heading>UTI history</Heading>
        <dl className="space-y-1">
          {history.continuous && <Row label="Continuous for 3+ months" value={VALUE_LABELS[history.continuous]} />}
          <Row label="Had a UTI before" value={VALUE_LABELS[history.previousUti] ?? history.previousUti} />
          {history.previousUti === "yes" && (
            <>
              <Row label="Episodes, past 6 months" value={history.episodes6m ?? "Not answered"} />
              <Row label="Episodes, past 12 months" value={history.episodes12m ?? "Not answered"} />
            </>
          )}
        </dl>
        {history.previousUti === "yes" && (
          <div className="mt-2">
            <p className="font-medium text-slate-600">Antibiotics had before:</p>
            {answers.antibiotics.length === 0 ? (
              <p className="text-slate-500">None listed.</p>
            ) : (
              <ul className="mt-1 space-y-1" data-testid="triage-antibiotics">
                {answers.antibiotics.map((a, i) => (
                  <li key={`${a.id}-${i}`} className="flex flex-wrap gap-x-2">
                    <span className="font-semibold text-midnight">{a.name}</span>
                    <span className="text-slate-500">{WORKED_LABELS[a.worked] ?? a.worked}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>

      <section>
        <Heading>Symptoms</Heading>
        {answers.selected.length === 0 ? (
          <p>None of the listed symptoms.</p>
        ) : (
          <ul className="space-y-1">
            {answers.selected.map((key) => (
              <li key={key} className="flex gap-2">
                <Tick />
                {SYMPTOM_LABELS[key] ?? key}
              </li>
            ))}
          </ul>
        )}
        <Change value={answers.change24h} />
      </section>

      <dl className="space-y-1 border-t border-slate-100 pt-3">
        <Row label="Duration" value={answers.duration} />
        {clinic && <Row label="Pregnant" value={VALUE_LABELS[answers.pregnant] ?? answers.pregnant} />}
        {answers.notes && <Row label="Notes" value={answers.notes} />}
      </dl>
    </div>
  );
}
