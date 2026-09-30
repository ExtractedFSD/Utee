"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, Button, inputClass } from "@/components/ui";
import {
  CHANGE_MAX,
  CHANGE_MIN,
  CHANGE_QUESTION,
  HISTORY,
  HISTORY_INTRO,
  INTRO,
  SAFETY_QUESTIONS,
  SEVERITY_MAX,
  SEVERITY_MIN,
  SYMPTOM_QUESTIONS,
  changeLabel,
  type SafetyKey,
  type SymptomKey,
  type YesNo,
} from "@/lib/triage/questions";
import { submitTriage, type TriageInput } from "./actions";

const STEPS = ["Safety check", "Your UTIs", "Your symptoms", "About you"] as const;

const radioClass = "h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500";

function YesNoRow({
  name,
  value,
  onChange,
}: {
  name: string;
  value: YesNo | undefined;
  onChange: (v: YesNo) => void;
}) {
  return (
    <div className="flex shrink-0 gap-4" role="radiogroup">
      {(["yes", "no"] as const).map((v) => (
        <label key={v} className="flex items-center gap-1.5 text-sm text-slate-700">
          <input
            type="radio"
            name={name}
            value={v}
            checked={value === v}
            onChange={() => onChange(v)}
            className={radioClass}
          />
          {v === "yes" ? "Yes" : "No"}
        </label>
      ))}
    </div>
  );
}

/** A row of numbered boxes, one per point on the scale. */
function Scale({
  name,
  min,
  max,
  value,
  onChange,
  labelFor,
}: {
  name: string;
  min: number;
  max: number;
  value: number | undefined;
  onChange: (v: number) => void;
  labelFor?: (v: number) => string;
}) {
  const points: number[] = [];
  for (let v = min; v <= max; v++) points.push(v);
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${points.length}, minmax(0, 1fr))` }} role="radiogroup" aria-label={name}>
      {points.map((v) => {
        const on = value === v;
        return (
          <label
            key={v}
            className={`flex h-10 min-w-0 cursor-pointer items-center justify-center rounded-lg border text-xs font-semibold transition-colors sm:text-sm ${
              on ? "border-maroon bg-maroon text-white" : "border-slate-200 bg-white text-slate-600 hover:border-maroon/40"
            }`}
            title={labelFor?.(v)}
          >
            <input
              type="radio"
              name={name}
              value={v}
              checked={on}
              onChange={() => onChange(v)}
              className="sr-only"
              aria-label={labelFor ? `${v}: ${labelFor(v)}` : String(v)}
            />
            {v > 0 && min < 0 ? `+${v}` : v}
          </label>
        );
      })}
    </div>
  );
}

function StepHeader({ step, title, intro }: { step: number; title: string; intro?: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[.14em] text-maroon">
        Step {step + 1} of {STEPS.length}
      </p>
      <h2 className="font-display text-2xl font-light text-midnight mt-1">{title}</h2>
      {intro && <p className="text-sm text-slate-500 mt-2 leading-relaxed">{intro}</p>}
    </div>
  );
}

export function TriageForm({ code }: { code: string }) {
  const [step, setStep] = useState(0);
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [pending, startTransition] = useTransition();

  const [safety, setSafety] = useState<Partial<Record<SafetyKey, YesNo>>>({});
  const [continuous, setContinuous] = useState<YesNo | undefined>();
  const [episodes6m, setEpisodes6m] = useState("");
  const [episodes12m, setEpisodes12m] = useState("");
  const [severity, setSeverity] = useState<Partial<Record<SymptomKey, number>>>({});
  const [change24h, setChange24h] = useState<number | undefined>();
  const [duration, setDuration] = useState("");
  const [previousUti, setPreviousUti] = useState<"yes" | "no" | "unsure" | undefined>();
  const [pregnant, setPregnant] = useState<"yes" | "no" | "not_applicable" | undefined>();
  const [currentAntibiotics, setCurrentAntibiotics] = useState("");
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);

  useEffect(() => {
    if (step > 0 || urgent) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, urgent]);

  const safetyComplete = SAFETY_QUESTIONS.every((q) => safety[q.key] !== undefined);
  const safetyFlagged = SAFETY_QUESTIONS.some((q) => safety[q.key] === "yes");
  const countOk = (v: string) => /^\d{1,3}$/.test(v.trim());
  const historyComplete =
    continuous === "yes" || (continuous === "no" && countOk(episodes6m) && countOk(episodes12m));
  const symptomsComplete = SYMPTOM_QUESTIONS.every((q) => severity[q.key] !== undefined) && change24h !== undefined;
  const aboutComplete = duration !== "" && previousUti !== undefined && pregnant !== undefined && consent;

  function next() {
    setError(null);
    if (step === 0) {
      if (!safetyComplete) return fail("Please answer every question.");
      if (safetyFlagged) return setUrgent(true);
    }
    if (step === 1 && !historyComplete) return fail("Please answer every question.");
    if (step === 2 && !symptomsComplete) return fail("Please score every symptom, and the change over the past 24 hours.");
    setAttempted(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function fail(message: string) {
    setAttempted(true);
    setError(message);
  }

  const missing = (answered: boolean) =>
    attempted && !answered ? <span className="ml-2 text-xs font-semibold text-rose-600">Not answered</span> : null;

  function back() {
    setError(null);
    setAttempted(false);
    setStep((s) => Math.max(s - 1, 0));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!aboutComplete) return fail("Please answer every question and tick the consent box.");
    const input: TriageInput = {
      safety: safety as Record<SafetyKey, YesNo>,
      history: {
        continuous: continuous!,
        episodes6m: continuous === "no" ? Number(episodes6m) : null,
        episodes12m: continuous === "no" ? Number(episodes12m) : null,
      },
      severity: severity as Record<SymptomKey, number>,
      change24h: change24h!,
      duration,
      previousUti: previousUti!,
      pregnant: pregnant!,
      currentAntibiotics,
      notes,
      consent: true,
    };
    startTransition(async () => {
      const result = await submitTriage(code, input);
      if (result?.error) setError(result.error);
    });
  }

  if (urgent) {
    const flagged = SAFETY_QUESTIONS.filter((q) => safety[q.key] === "yes");
    return (
      <section className="space-y-6" data-testid="triage-urgent">
        <Card className="border-2 border-maroon/40">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-maroon">Please get medical help now</p>
          <h2 className="font-display text-2xl font-light text-midnight mt-1">
            Some of your answers can be signs of a more serious infection
          </h2>
          <p className="text-sm text-slate-700 mt-3 leading-relaxed">
            A UTI can spread to the kidneys or the bloodstream, and the answers below are ones doctors treat as warning signs.
            Please do not wait for a test result. Contact urgent care now: call <strong>NHS 111</strong>, or go to your nearest
            urgent treatment centre. If you feel very unwell, are struggling to breathe, or are confused or drowsy, call{" "}
            <strong>999</strong>.
          </p>
          <ul className="mt-4 space-y-1.5 text-sm text-slate-700">
            {flagged.map((q) => (
              <li key={q.key} className="flex gap-2">
                <span className="mt-0.5 shrink-0 font-semibold text-maroon">Yes</span>
                <span>{q.label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <a
              href="tel:111"
              className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-maroon px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[.14em] text-white shadow-card hover:bg-brand-700"
            >
              Call 111
            </a>
            <Button type="button" variant="secondary" onClick={() => setUrgent(false)}>
              Change my answers
            </Button>
          </div>
        </Card>
        <Card>
          <p className="text-sm text-slate-600 leading-relaxed">
            You can still send your sample. Your answers will be passed to the Utee clinical team with the rest of your
            questionnaire, but a test result takes days and these symptoms need attention today.
          </p>
          <div className="mt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setUrgent(false);
                setStep(1);
              }}
            >
              I have read this, continue with my test
            </Button>
          </div>
        </Card>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6" data-step={step}>
      {step === 0 && (
        <Card className="space-y-5">
          <StepHeader
            step={0}
            title="Safety check"
            intro="First, a few quick questions. Some symptoms can mean an infection needs attention today rather than a test."
          />
          <div className="divide-y divide-slate-100">
            {SAFETY_QUESTIONS.map((q, i) => (
              <div key={q.key} className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2 py-3">
                <p className="max-w-md text-sm text-slate-700">
                  <span className="mr-1.5 font-semibold text-slate-400">{i + 1}.</span>
                  {q.label}
                  {missing(safety[q.key] !== undefined)}
                </p>
                <YesNoRow name={q.key} value={safety[q.key]} onChange={(v) => setSafety((s) => ({ ...s, [q.key]: v }))} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="space-y-5">
          <StepHeader step={1} title="Your UTIs" intro={INTRO} />
          <p className="text-sm font-medium text-slate-700">{HISTORY_INTRO}</p>
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
            <p className="max-w-md text-sm text-slate-700">
              {HISTORY.continuous}
              {missing(continuous !== undefined)}
            </p>
            <YesNoRow name="continuous" value={continuous} onChange={setContinuous} />
          </div>
          {continuous === "no" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="block text-sm text-slate-700 mb-1.5">{HISTORY.episodes6m}</span>
                <input
                  type="number"
                  name="episodes6m"
                  inputMode="numeric"
                  min={0}
                  max={999}
                  required
                  value={episodes6m}
                  onChange={(e) => setEpisodes6m(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="block">
                <span className="block text-sm text-slate-700 mb-1.5">{HISTORY.episodes12m}</span>
                <input
                  type="number"
                  name="episodes12m"
                  inputMode="numeric"
                  min={0}
                  max={999}
                  required
                  value={episodes12m}
                  onChange={(e) => setEpisodes12m(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
          )}
          {continuous === "yes" && (
            <p className="text-sm text-slate-500">Thank you. That is all we need for this section.</p>
          )}
        </Card>
      )}

      {step === 2 && (
        <>
          <Card className="space-y-5">
            <StepHeader
              step={2}
              title="Your symptoms"
              intro={`For each symptom, pick a number from ${SEVERITY_MIN} (not at all) to ${SEVERITY_MAX} (as bad as it could be) for how it is right now.`}
            />
            <div className="divide-y divide-slate-100">
              {SYMPTOM_QUESTIONS.map((q, i) => (
                <div key={q.key} className="py-4">
                  <p className="text-sm text-slate-700 mb-2.5">
                    <span className="mr-1.5 font-semibold text-slate-400">{i + 1}.</span>
                    {q.label}
                    {missing(severity[q.key] !== undefined)}
                  </p>
                  <Scale
                    name={q.key}
                    min={SEVERITY_MIN}
                    max={SEVERITY_MAX}
                    value={severity[q.key]}
                    onChange={(v) => setSeverity((s) => ({ ...s, [q.key]: v }))}
                  />
                </div>
              ))}
            </div>
          </Card>
          <Card className="space-y-4">
            <div>
              <h3 className="font-display text-xl font-light text-midnight">
                Any change over the past 24 hours?
                {missing(change24h !== undefined)}
              </h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{CHANGE_QUESTION}</p>
            </div>
            <div className="flex justify-between text-xs text-slate-500">
              <span>Very much worse</span>
              <span>No change</span>
              <span>Very much better</span>
            </div>
            <Scale name="change24h" min={CHANGE_MIN} max={CHANGE_MAX} value={change24h} onChange={setChange24h} labelFor={changeLabel} />
          </Card>
        </>
      )}

      {step === 3 && (
        <>
          <Card className="space-y-5">
            <StepHeader step={3} title="About you" />
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-1">
                How long have you had these symptoms?
              </label>
              <select
                id="duration"
                name="duration"
                required
                className={inputClass}
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
              >
                <option value="" disabled>
                  Select…
                </option>
                <option>Less than 24 hours</option>
                <option>1–3 days</option>
                <option>4–7 days</option>
                <option>More than a week</option>
              </select>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700 mb-2">Have you had a UTI before?</span>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ["yes", "Yes"],
                    ["no", "No"],
                    ["unsure", "Not sure"],
                  ] as const
                ).map(([v, label]) => (
                  <label key={v} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="previousUti"
                      value={v}
                      checked={previousUti === v}
                      onChange={() => setPreviousUti(v)}
                      className={radioClass}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <span className="block text-sm font-medium text-slate-700 mb-2">Are you currently pregnant?</span>
              <div className="flex flex-wrap gap-4">
                {(
                  [
                    ["yes", "Yes"],
                    ["no", "No"],
                    ["not_applicable", "Not applicable"],
                  ] as const
                ).map(([v, label]) => (
                  <label key={v} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="radio"
                      name="pregnant"
                      value={v}
                      checked={pregnant === v}
                      onChange={() => setPregnant(v)}
                      className={radioClass}
                    />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="currentAntibiotics" className="block text-sm font-medium text-slate-700 mb-1">
                Are you currently taking antibiotics? If so, which?
              </label>
              <input
                id="currentAntibiotics"
                name="currentAntibiotics"
                placeholder="e.g. none, or nitrofurantoin since Monday"
                className={inputClass}
                value={currentAntibiotics}
                onChange={(e) => setCurrentAntibiotics(e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                Anything else we should know? (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={3}
                className={inputClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </Card>

          <Card>
            <label className="flex items-start gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                name="consent"
                required
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
              />
              <span>
                I consent to my urine sample being tested by Utee&apos;s partner laboratory, and to my symptoms and results
                being reviewed by Utee&apos;s clinical team to produce my report.
              </span>
            </label>
          </Card>
        </>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {step > 0 && (
            <Button type="button" variant="secondary" onClick={back}>
              Back
            </Button>
          )}
          {step === STEPS.length - 1 && (
            <p className="text-xs text-slate-400">After submitting, take your sample straight away and post it the same day.</p>
          )}
        </div>
        {step < STEPS.length - 1 ? (
          <Button type="button" onClick={next}>
            Continue
          </Button>
        ) : (
          <Button type="submit" disabled={pending}>
            {pending ? "Submitting…" : "Submit & take my sample"}
          </Button>
        )}
      </div>
    </form>
  );
}
