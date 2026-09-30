"use client";

import { useEffect, useState, useTransition } from "react";
import { Card, Button, inputClass } from "@/components/ui";
import { AntibioticPicker } from "@/app/(customer)/portal/tracker/components/AntibioticPicker";
import { antibioticName } from "@/lib/tracker/search";
import {
  ANTIBIOTICS_QUESTION,
  CHANGE_MAX,
  CHANGE_MIN,
  CHANGE_QUESTION,
  HISTORY,
  HISTORY_INTRO,
  INTRO,
  RESEARCH,
  SAFETY_QUESTIONS,
  SYMPTOM_QUESTIONS,
  WORKED_OPTIONS,
  changeLabel,
  type PastAntibiotic,
  type PreviousUti,
  type SafetyKey,
  type SymptomKey,
  type Worked,
  type YesNo,
} from "@/lib/triage/questions";
import { submitTriage, type TriageInput } from "./actions";

const STEPS = ["Safety check", "Your UTIs", "Your symptoms", "Anything else"] as const;

const radioClass = "h-4 w-4 border-slate-300 text-brand-600 focus:ring-brand-500";
const checkClass = "mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500";

function RadioRow<T extends string>({
  name,
  value,
  options,
  onChange,
}: {
  name: string;
  value: T | undefined;
  options: readonly { key: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2" role="radiogroup">
      {options.map((o) => (
        <label key={o.key} className="flex items-center gap-1.5 text-sm text-slate-700">
          <input
            type="radio"
            name={name}
            value={o.key}
            checked={value === o.key}
            onChange={() => onChange(o.key)}
            className={radioClass}
          />
          {o.label}
        </label>
      ))}
    </div>
  );
}

const YES_NO = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
] as const;

const PREVIOUS = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
  { key: "unsure", label: "Not sure" },
] as const;

const PREGNANT = [
  { key: "yes", label: "Yes" },
  { key: "no", label: "No" },
  { key: "not_applicable", label: "Not applicable" },
] as const;

/** A single row of numbered boxes, one per point on the scale. */
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

type Chosen = { id: string; name: string; worked?: Worked };

export function TriageForm({ code }: { code: string }) {
  const [step, setStep] = useState(0);
  const [urgent, setUrgent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempted, setAttempted] = useState(false);
  const [pending, startTransition] = useTransition();

  const [safety, setSafety] = useState<Partial<Record<SafetyKey, YesNo>>>({});
  const [continuous, setContinuous] = useState<YesNo | undefined>();
  const [previousUti, setPreviousUti] = useState<PreviousUti | undefined>();
  const [episodes6m, setEpisodes6m] = useState("");
  const [episodes12m, setEpisodes12m] = useState("");
  const [antibiotics, setAntibiotics] = useState<Chosen[]>([]);
  const [selected, setSelected] = useState<Set<SymptomKey>>(new Set());
  const [noneOfThese, setNoneOfThese] = useState(false);
  const [change24h, setChange24h] = useState<number | undefined>();
  const [duration, setDuration] = useState("");
  const [pregnant, setPregnant] = useState<"yes" | "no" | "not_applicable" | undefined>();
  const [notes, setNotes] = useState("");
  const [consent, setConsent] = useState(false);
  const [research, setResearch] = useState(false);

  useEffect(() => {
    if (step > 0 || urgent) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step, urgent]);

  const countOk = (v: string) => /^\d{1,3}$/.test(v.trim());
  const hadUti = previousUti === "yes";
  const safetyComplete = SAFETY_QUESTIONS.every((q) => safety[q.key] !== undefined);
  const safetyFlagged = SAFETY_QUESTIONS.some((q) => safety[q.key] === "yes");
  const antibioticsComplete = antibiotics.every((a) => a.worked !== undefined);
  const historyComplete =
    continuous !== undefined &&
    previousUti !== undefined &&
    (!hadUti || (countOk(episodes6m) && countOk(episodes12m) && antibioticsComplete));
  const symptomsAnswered = selected.size > 0 || noneOfThese;
  const symptomsComplete = symptomsAnswered && change24h !== undefined && duration !== "" && pregnant !== undefined;

  function fail(message: string) {
    setAttempted(true);
    setError(message);
  }

  function next() {
    setError(null);
    if (step === 0) {
      if (!safetyComplete) return fail("Please answer every question.");
      if (safetyFlagged) return setUrgent(true);
    }
    if (step === 1 && !historyComplete) return fail("Please answer every question.");
    if (step === 2 && !symptomsComplete) return fail("Please answer every question.");
    setAttempted(false);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function back() {
    setError(null);
    setAttempted(false);
    setStep((s) => Math.max(s - 1, 0));
  }

  const missing = (answered: boolean) =>
    attempted && !answered ? <span className="ml-2 text-xs font-semibold text-rose-600">Not answered</span> : null;

  function toggleSymptom(key: SymptomKey) {
    setNoneOfThese(false);
    setSelected((prev) => {
      const nextSet = new Set(prev);
      if (nextSet.has(key)) nextSet.delete(key);
      else nextSet.add(key);
      return nextSet;
    });
  }

  function addAntibiotic(id: string | null, other?: string) {
    if (!id) return;
    setAntibiotics((list) => [...list, { id, name: id === "other" ? other ?? "" : antibioticName(id) }]);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) return fail("Please tick the consent box.");
    const input: TriageInput = {
      safety: safety as Record<SafetyKey, YesNo>,
      history: {
        continuous: continuous!,
        previousUti: previousUti!,
        episodes6m: hadUti ? Number(episodes6m) : null,
        episodes12m: hadUti ? Number(episodes12m) : null,
      },
      antibiotics: hadUti ? (antibiotics as PastAntibiotic[]) : [],
      selected: [...selected],
      change24h: change24h!,
      duration,
      pregnant: pregnant!,
      notes,
      consent: true,
      research,
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
                <RadioRow name={q.key} value={safety[q.key]} options={YES_NO} onChange={(v) => setSafety((s) => ({ ...s, [q.key]: v }))} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {step === 1 && (
        <Card className="space-y-5">
          <StepHeader step={1} title="Your UTIs" intro={INTRO} />
          <p className="text-sm font-medium text-slate-700">{HISTORY_INTRO}</p>
          <div>
            <p className="text-sm text-slate-700 mb-2">
              {HISTORY.continuous}
              {missing(continuous !== undefined)}
            </p>
            <RadioRow name="continuous" value={continuous} options={YES_NO} onChange={setContinuous} />
          </div>
          {continuous !== undefined && (
            <div>
              <p className="text-sm text-slate-700 mb-2">
                Have you had a UTI before?
                {missing(previousUti !== undefined)}
              </p>
              <RadioRow name="previousUti" value={previousUti} options={PREVIOUS} onChange={setPreviousUti} />
            </div>
          )}
          {hadUti && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="block text-sm text-slate-700 mb-1.5">
                    {HISTORY.episodes6m}
                    {missing(countOk(episodes6m))}
                  </span>
                  <input
                    type="number"
                    name="episodes6m"
                    inputMode="numeric"
                    min={0}
                    max={999}
                    value={episodes6m}
                    onChange={(e) => setEpisodes6m(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="block text-sm text-slate-700 mb-1.5">
                    {HISTORY.episodes12m}
                    {missing(countOk(episodes12m))}
                  </span>
                  <input
                    type="number"
                    name="episodes12m"
                    inputMode="numeric"
                    min={0}
                    max={999}
                    value={episodes12m}
                    onChange={(e) => setEpisodes12m(e.target.value)}
                    className={inputClass}
                  />
                </label>
              </div>
              <div className="space-y-3" data-testid="past-antibiotics">
                <p className="text-sm text-slate-700">{ANTIBIOTICS_QUESTION}</p>
                {antibiotics.length > 0 && (
                  <ul className="space-y-2">
                    {antibiotics.map((a, i) => (
                      <li key={`${a.id}-${i}`} className="rounded-2xl border border-slate-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {a.id === "other" ? (
                            <input
                              value={a.name}
                              onChange={(e) => setAntibiotics((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                              placeholder="Name of the antibiotic"
                              aria-label="Name of the antibiotic"
                              className={`${inputClass} max-w-xs`}
                            />
                          ) : (
                            <span className="text-sm font-semibold text-midnight">{a.name}</span>
                          )}
                          <button
                            type="button"
                            onClick={() => setAntibiotics((l) => l.filter((_, j) => j !== i))}
                            className="text-sm font-semibold text-maroon"
                            aria-label={`Remove ${a.name || "antibiotic"}`}
                          >
                            Remove
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Did it work?
                          {missing(a.worked !== undefined)}
                        </p>
                        <div className="mt-1.5">
                          <RadioRow
                            name={`worked-${i}`}
                            value={a.worked}
                            options={WORKED_OPTIONS}
                            onChange={(v) => setAntibiotics((l) => l.map((x, j) => (j === i ? { ...x, worked: v } : x)))}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <AntibioticPicker value={null} exclude={antibiotics.map((a) => a.id).filter((id) => id !== "other")} onChange={addAntibiotic} />
                <p className="text-xs text-slate-500">Leave this empty if you have not had antibiotics for a UTI.</p>
              </div>
            </>
          )}
        </Card>
      )}

      {step === 2 && (
        <>
          <Card className="space-y-5">
            <StepHeader step={2} title="Your symptoms" intro="Tick everything you have right now." />
            <div className="space-y-2.5">
              {SYMPTOM_QUESTIONS.map((q) => (
                <label key={q.key} className="flex items-start gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="symptom"
                    value={q.key}
                    checked={selected.has(q.key)}
                    onChange={() => toggleSymptom(q.key)}
                    className={checkClass}
                  />
                  {q.label}
                </label>
              ))}
              <label className="flex items-start gap-3 border-t border-slate-100 pt-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="symptom"
                  value="none"
                  checked={noneOfThese}
                  onChange={(e) => {
                    setNoneOfThese(e.target.checked);
                    if (e.target.checked) setSelected(new Set());
                  }}
                  className={checkClass}
                />
                None of these
                {missing(symptomsAnswered)}
              </label>
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

          <Card className="space-y-5">
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-slate-700 mb-1">
                How long have you had these symptoms?
                {missing(duration !== "")}
              </label>
              <select
                id="duration"
                name="duration"
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
              <span className="block text-sm font-medium text-slate-700 mb-2">
                Are you currently pregnant?
                {missing(pregnant !== undefined)}
              </span>
              <RadioRow name="pregnant" value={pregnant} options={PREGNANT} onChange={setPregnant} />
            </div>
          </Card>
        </>
      )}

      {step === 3 && (
        <>
          <Card className="space-y-5">
            <StepHeader step={3} title="Anything else" />
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                Anything else we should know? (optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                rows={4}
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
                className={checkClass}
              />
              <span>
                I consent to my urine sample being tested by Utee&apos;s partner laboratory, and to my symptoms and results
                being reviewed by Utee&apos;s clinical team to produce my report.
              </span>
            </label>
          </Card>

          <Card className="bg-pink-25/60">
            <p className="text-sm font-semibold text-midnight">{RESEARCH.title}</p>
            <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{RESEARCH.text}</p>
            <label className="mt-3 flex items-start gap-3 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                name="research"
                checked={research}
                onChange={(e) => setResearch(e.target.checked)}
                className={checkClass}
              />
              <span>{RESEARCH.label}</span>
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
