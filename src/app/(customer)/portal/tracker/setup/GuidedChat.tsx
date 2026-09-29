"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Card, LinkButton, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { CONTRACEPTION, MENOPAUSE_STAGES, PREGNANT, SOURCES, SYMPTOMS, TEST_KINDS, TEST_RESULTS, TRIGGERS, WORKED, labelFor } from "@/lib/tracker/options";
import { antibioticName } from "@/lib/tracker/search";
import { redFlagFor } from "@/lib/tracker/redflags";
import { formatDay, isoToday } from "@/lib/tracker/stats";
import { emptyUti, type AboutExtract, type PreventionExtract, type UtiExtract, type UtiSave } from "@/lib/tracker/guided/schema";
import { Chip, ChipGroup, DateChips } from "../components/Chips";
import { PreventionPicker } from "../components/PreventionPicker";
import { AntibioticPicker } from "../components/AntibioticPicker";
import { RedFlagBanner } from "../components/RedFlagBanner";
import { addPreventions, extractGuided, saveAboutMeValues, saveGuidedUti } from "../actions";

type Msg = { id: number; role: "assistant" | "user"; text: string };
type Step = "about" | "prevention" | "utis" | "done";
type About = { menopause_stage: string; contraception: string; pregnant_or_trying: string };

let nextId = 1;
const linkBtn = "min-h-[44px] px-2 text-sm font-semibold text-maroon";

/**
 * The conversation is scripted: every assistant line comes from the copy
 * file. Typing fills the same chips a person could tap, and nothing is saved
 * until they press Next or Save.
 */
export function GuidedChat({ mode, aiAvailable, pregnantOrTrying, activePreventions, initialAbout }: {
  mode: "full" | "utis"; aiAvailable: boolean; pregnantOrTrying: string; activePreventions: string[]; initialAbout: About | null;
}) {
  const [messages, setMessages] = useState<Msg[]>(() => {
    const first: Msg[] = mode === "utis"
      ? [{ id: nextId++, role: "assistant", text: copy.guided.introQuick }, { id: nextId++, role: "assistant", text: copy.guided.askUtisQuick }]
      : [{ id: nextId++, role: "assistant", text: copy.guided.intro }, { id: nextId++, role: "assistant", text: copy.guided.askAbout }];
    return first;
  });
  const [step, setStep] = useState<Step>(mode === "utis" ? "utis" : "about");
  const [useAi, setUseAi] = useState(aiAvailable);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [about, setAbout] = useState<About>(initialAbout ?? { menopause_stage: "prefer_not", contraception: "prefer_not", pregnant_or_trying: "no" });
  const [prevention, setPrevention] = useState<PreventionExtract>({ keys: [], other_name: null, antibiotic_id: null });
  const [antibioticOther, setAntibioticOther] = useState("");
  // Each draft carries its own id so a review card keeps its state when an
  // earlier card is saved and the list shifts.
  const [drafts, setDrafts] = useState<{ id: number; uti: UtiExtract }[]>([]);
  const withIds = (utis: UtiExtract[]) => utis.map((uti) => ({ id: nextId++, uti }));
  const [askingAnother, setAskingAnother] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [pregnant, setPregnant] = useState(pregnantOrTrying);
  const endRef = useRef<HTMLDivElement | null>(null);

  const say = (role: Msg["role"], t: string) => setMessages((m) => [...m, { id: nextId++, role, text: t }]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages, drafts, step, askingAnother]);

  const run = (fn: () => Promise<{ error?: string } | unknown>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      const err = (r as { error?: string } | null | undefined)?.error;
      if (err) setError(err);
      else after?.();
    });
  };

  // ------------------------------------------------------------ typing
  const send = () => {
    const t = text.trim();
    if (!t || step === "done") return;
    say("user", t);
    setText("");
    const current = step;
    if (current === "utis" && /^(none|no(ne)? yet|nothing|no|skip|not yet)\b/i.test(t)) { finishUtis(); return; }
    setReading(true);
    startTransition(async () => {
      const r = await extractGuided(current, t);
      setReading(false);
      if ("error" in r) { setError(r.error); return; }
      if (current === "about") {
        const a = r.result as AboutExtract;
        const got = Object.values(a).some(Boolean);
        setAbout((prev) => ({
          menopause_stage: a.menopause_stage ?? prev.menopause_stage,
          contraception: a.contraception ?? prev.contraception,
          pregnant_or_trying: a.pregnant_or_trying ?? prev.pregnant_or_trying,
        }));
        say("assistant", got ? copy.guided.gotIt : copy.guided.gotNothing);
      } else if (current === "prevention") {
        const p = r.result as PreventionExtract;
        setPrevention((prev) => ({ keys: [...new Set([...prev.keys, ...p.keys])], other_name: p.other_name ?? prev.other_name, antibiotic_id: p.antibiotic_id ?? prev.antibiotic_id }));
        say("assistant", p.keys.length ? copy.guided.gotIt : copy.guided.gotNothing);
      } else {
        const utis = (r.result as { utis: UtiExtract[] }).utis.filter((u) => u.started_on || u.symptoms.length || u.treatments.length || u.tests.length);
        if (!utis.length) { say("assistant", copy.guided.gotNothing); setDrafts(withIds([emptyUti()])); return; }
        setDrafts(withIds(utis));
        setAskingAnother(false);
        say("assistant", utis.length > 1 ? copy.guided.gotSeveral(utis.length) : copy.guided.gotIt);
      }
    });
  };

  // ------------------------------------------------------------ steps
  const finishAbout = () => run(() => saveAboutMeValues(about), () => {
    setPregnant(about.pregnant_or_trying);
    say("assistant", copy.guided.savedAbout);
    say("assistant", copy.guided.askPrevention);
    setStep("prevention");
  });

  const finishPrevention = () => {
    const keys = prevention.keys.filter((k) => !activePreventions.includes(k));
    const done = () => { say("assistant", copy.guided.savedPrevention(keys.length)); say("assistant", copy.guided.askUtis); setStep("utis"); };
    if (!keys.length) { done(); return; }
    run(() => addPreventions({ keys, otherName: prevention.other_name ?? undefined, antibioticId: prevention.antibiotic_id ?? undefined, antibioticOther }), done);
  };

  const dropDraft = (id: number) => {
    const rest = drafts.filter((d) => d.id !== id);
    setDrafts(rest);
    if (!rest.length) { setAskingAnother(true); say("assistant", copy.guided.anotherQ); }
  };

  const saveDraft = (id: number, uti: UtiSave) => run(() => saveGuidedUti(uti), () => {
    setSavedCount((n) => n + 1);
    say("assistant", copy.guided.savedUti(formatDay(uti.started_on)));
    dropDraft(id);
  });

  const finishUtis = () => {
    setDrafts([]);
    setAskingAnother(false);
    say("assistant", mode === "utis" ? copy.guided.doneQuick : copy.guided.done);
    setStep("done");
  };

  const busy = pending || reading;

  return (
    <div className="space-y-4" data-testid="guided-chat">
      <div className="space-y-3" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-maroon text-white rounded-br-md" : "bg-white text-midnight shadow-card rounded-bl-md"}`} data-role={m.role}>
              {m.text}
            </div>
          </div>
        ))}
        {reading && (
          <div className="flex justify-start"><div className="rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm text-slate-500 shadow-card">{copy.guided.thinking}</div></div>
        )}
      </div>

      {step !== "done" && !askingAnother && (
        <Card>
          <label className="sr-only" htmlFor="guided-input">{copy.guided.placeholder}</label>
          <div className="flex gap-2">
            <textarea
              id="guided-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={copy.guided.placeholder}
              rows={2}
              className={`${inputClass} flex-1 resize-none`}
              disabled={busy}
            />
            <Button onClick={send} disabled={busy || !text.trim()}>{copy.guided.send}</Button>
          </div>
          {aiAvailable && (
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <button type="button" role="switch" aria-checked={useAi} onClick={() => setUseAi((v) => !v)} className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-maroon">
                <span className={`inline-block h-5 w-9 rounded-full transition-colors ${useAi ? "bg-maroon" : "bg-slate-300"}`}><span className={`block h-4 w-4 translate-y-0.5 rounded-full bg-white transition-transform ${useAi ? "translate-x-4" : "translate-x-0.5"}`} /></span>
                {useAi ? copy.guided.aiOn : copy.guided.aiOff}
              </button>
              <span>{copy.guided.aiNote}</span>
            </div>
          )}
        </Card>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      {step === "about" && (
        <Card data-testid="guided-about">
          <Field label="Menopause"><ChipRadio options={MENOPAUSE_STAGES} value={about.menopause_stage} onChange={(v) => setAbout({ ...about, menopause_stage: v })} /></Field>
          <Field label="Contraception"><ChipRadio options={CONTRACEPTION} value={about.contraception} onChange={(v) => setAbout({ ...about, contraception: v })} /></Field>
          <Field label="Currently pregnant or trying?" hint={copy.aboutMe.pregnantHint}><ChipRadio options={PREGNANT} value={about.pregnant_or_trying} onChange={(v) => setAbout({ ...about, pregnant_or_trying: v })} /></Field>
          <div className="flex justify-end"><Button disabled={busy} onClick={finishAbout}>{copy.guided.next}</Button></div>
        </Card>
      )}

      {step === "prevention" && (
        <Card data-testid="guided-prevention">
          <PreventionPicker
            selected={new Set(prevention.keys)}
            onToggle={(key, on) => setPrevention((p) => ({ ...p, keys: on ? [...new Set([...p.keys, key])] : p.keys.filter((k) => k !== key) }))}
            otherName={prevention.other_name ?? ""}
            onOtherName={(t) => setPrevention((p) => ({ ...p, other_name: t }))}
            antibioticId={prevention.antibiotic_id}
            antibioticOther={antibioticOther}
            onAntibiotic={(id, other) => { setPrevention((p) => ({ ...p, antibiotic_id: id })); if (other !== undefined) setAntibioticOther(other); }}
            exclude={activePreventions}
          />
          <div className="mt-5 flex justify-end"><Button disabled={busy} onClick={finishPrevention}>{copy.guided.next}</Button></div>
        </Card>
      )}

      {step === "utis" && drafts.map((d) => (
        <UtiReview key={d.id} draft={d.uti} pregnantOrTrying={pregnant} busy={busy} onSave={(u) => saveDraft(d.id, u)} onDiscard={() => dropDraft(d.id)} />
      ))}

      {step === "utis" && !drafts.length && !askingAnother && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={linkBtn} disabled={busy} onClick={() => setDrafts(withIds([emptyUti()]))}>{copy.guided.tapInstead}</button>
          <button type="button" className={`${linkBtn} ml-auto`} disabled={busy} onClick={finishUtis}>{mode === "utis" && savedCount === 0 ? copy.guided.skip : savedCount === 0 ? copy.guided.noneYet : copy.guided.allDone}</button>
        </div>
      )}

      {step === "utis" && askingAnother && (
        <div className="flex flex-wrap gap-2" data-testid="guided-another">
          <Button variant="secondary" onClick={() => { setAskingAnother(false); say("assistant", copy.guided.askUtisQuick); }}>{copy.guided.another}</Button>
          <Button onClick={finishUtis}>{copy.guided.allDone}</Button>
        </div>
      )}

      {step === "done" && (
        <div className="flex flex-wrap gap-2" data-testid="guided-done">
          <LinkButton href="/portal/tracker">{copy.guided.goDashboard}</LinkButton>
          {savedCount > 0 && <LinkButton href="/portal/tracker/history" variant="secondary">{copy.guided.goHistory}</LinkButton>}
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-sm font-semibold text-slate-700 mb-1">{label}</p>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function ChipRadio({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup">
      {options.map((o) => <Chip key={o.key} selected={value === o.key} onClick={() => onChange(o.key)}>{o.label}</Chip>)}
    </div>
  );
}

/** One extracted UTI, every field editable, saved as a whole. */
function UtiReview({ draft, pregnantOrTrying, busy, onSave, onDiscard }: { draft: UtiExtract; pregnantOrTrying: string; busy: boolean; onSave: (u: UtiSave) => void; onDiscard: () => void }) {
  const today = isoToday();
  const [startedOn, setStartedOn] = useState(draft.started_on ?? "");
  const [over, setOver] = useState<boolean>(draft.ongoing === true ? false : draft.ended_on ? true : draft.ongoing === false);
  const [endedOn, setEndedOn] = useState(draft.ended_on ?? today);
  const [symptoms, setSymptoms] = useState<Set<string>>(new Set(draft.symptoms));
  const [otherSymptom, setOtherSymptom] = useState(draft.other_symptom ?? "");
  const [triggers, setTriggers] = useState<Set<string>>(new Set(draft.triggers));
  const [treatments, setTreatments] = useState(draft.treatments);
  const [tests, setTests] = useState(draft.tests);
  const [notes, setNotes] = useState(draft.notes ?? "");
  const [addingAb, setAddingAb] = useState(false);
  const [addingTest, setAddingTest] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const flag = redFlagFor([...symptoms], pregnantOrTrying);
  const f = copy.guided.fields;

  const save = () => {
    if (!startedOn) { setLocalError(copy.guided.startNeeded); return; }
    setLocalError(null);
    onSave({
      started_on: startedOn,
      ended_on: over ? (endedOn < startedOn ? startedOn : endedOn) : null,
      symptoms: [...symptoms],
      other_symptom: otherSymptom || null,
      triggers: [...triggers],
      treatments: treatments.filter((t) => t.antibiotic_id).map((t) => ({ ...t, days: t.days && t.days > 0 ? Math.min(t.days, 365) : null })),
      tests,
      notes: notes || null,
    });
  };

  return (
    <Card data-testid="uti-review" className="space-y-5">
      <div data-testid="review-start">
        <DateChips label={f.started} value={startedOn || today} onChange={setStartedOn} />
        {!startedOn && <p className="mt-2 text-xs text-slate-500">{copy.guided.startNeeded}</p>}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">{f.ended}</p>
        <div className="flex flex-wrap gap-2">
          <Chip selected={!over} onClick={() => setOver(false)}>{f.stillGoing}</Chip>
          <Chip selected={over} onClick={() => setOver(true)}>{f.over}</Chip>
        </div>
        {over && <div className="mt-3" data-testid="review-end"><DateChips label={f.endedOn} value={endedOn} onChange={setEndedOn} /></div>}
      </div>
      <div data-testid="review-symptoms">
        <p className="text-sm font-semibold text-slate-700 mb-2">{f.symptoms}</p>
        <ChipGroup options={SYMPTOMS} selected={symptoms} onToggle={(k, on) => setSymptoms((s) => { const n = new Set(s); if (on) n.add(k); else n.delete(k); return n; })} otherText={otherSymptom} onOtherText={setOtherSymptom} />
        {flag.show && <div className="mt-3"><RedFlagBanner flag={flag} /></div>}
      </div>
      <div data-testid="review-triggers">
        <p className="text-sm font-semibold text-slate-700 mb-2">{f.triggers}</p>
        <ChipGroup options={TRIGGERS.filter((t) => t.key !== "other")} selected={triggers} onToggle={(k, on) => setTriggers((s) => { const n = new Set(s); if (on) n.add(k); else n.delete(k); return n; })} />
      </div>
      <div data-testid="review-treatments">
        <p className="text-sm font-semibold text-slate-700 mb-2">{f.treatments}</p>
        <ul className="space-y-3">
          {treatments.map((t, i) => (
            <li key={i} className="rounded-2xl bg-pink-25 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-semibold text-midnight">
                  {t.antibiotic_id ? antibioticName(t.antibiotic_id, t.other_name) : "Antibiotic"}
                  {t.days ? ` · ${t.days} ${f.days}` : ""}
                  {t.source ? ` · ${labelFor(SOURCES, t.source)}` : ""}
                </span>
                <button type="button" className={linkBtn} onClick={() => setTreatments((list) => list.filter((_, j) => j !== i))}>{f.remove}</button>
              </div>
              <p className="mt-2 text-xs text-slate-500 mb-1">{f.worked}</p>
              <div className="flex flex-wrap gap-2">
                {WORKED.map((w) => <Chip key={w.key} selected={t.worked === w.key} onClick={() => setTreatments((list) => list.map((x, j) => (j === i ? { ...x, worked: x.worked === w.key ? null : w.key } : x)))}>{w.label}</Chip>)}
              </div>
            </li>
          ))}
        </ul>
        {addingAb ? (
          <div className="mt-3 rounded-2xl bg-pink-25 p-3">
            <AntibioticPicker value={null} autoFocus onChange={(id, other) => { if (id) { setTreatments((list) => [...list, { antibiotic_id: id, other_name: other ?? null, days: null, course_type: "treatment", source: null, worked: null }]); setAddingAb(false); } }} />
            <button type="button" className={linkBtn} onClick={() => setAddingAb(false)}>{copy.episode.cancel}</button>
          </div>
        ) : (
          <button type="button" className={linkBtn} onClick={() => setAddingAb(true)}>{f.addTreatment}</button>
        )}
      </div>
      <div data-testid="review-tests">
        <p className="text-sm font-semibold text-slate-700 mb-2">{f.tests}</p>
        <ul className="space-y-2">
          {tests.map((t, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-pink-25 p-3">
              <span className="text-sm font-semibold text-midnight">{labelFor(TEST_KINDS, t.kind)}{t.result ? ` · ${labelFor(TEST_RESULTS, t.result)}` : ""}</span>
              <button type="button" className={linkBtn} onClick={() => setTests((list) => list.filter((_, j) => j !== i))}>{f.remove}</button>
            </li>
          ))}
        </ul>
        {addingTest ? (
          <TestAdder onAdd={(kind, result) => { setTests((list) => [...list, { kind, result, tested_on: null }]); setAddingTest(false); }} onCancel={() => setAddingTest(false)} />
        ) : (
          <button type="button" className={linkBtn} onClick={() => setAddingTest(true)}>{f.addTest}</button>
        )}
      </div>
      <div>
        <label className="block text-sm font-semibold text-slate-700 mb-2" htmlFor="review-notes">{f.notes}</label>
        <textarea id="review-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={`${inputClass} w-full`} />
      </div>
      {localError && <p className="text-sm text-rose-600">{localError}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <Button disabled={busy} onClick={save}>{copy.guided.saveUti}</Button>
        <button type="button" className={`${linkBtn} ml-auto`} disabled={busy} onClick={onDiscard}>{copy.guided.discardUti}</button>
      </div>
    </Card>
  );
}

function TestAdder({ onAdd, onCancel }: { onAdd: (kind: string, result: string | null) => void; onCancel: () => void }) {
  const [kind, setKind] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const f = copy.guided.fields;
  return (
    <div className="mt-3 rounded-2xl bg-pink-25 p-3 space-y-3">
      <p className="text-xs text-slate-500">{f.kind}</p>
      <div className="flex flex-wrap gap-2">{TEST_KINDS.map((k) => <Chip key={k.key} selected={kind === k.key} onClick={() => setKind(k.key)}>{k.label}</Chip>)}</div>
      <p className="text-xs text-slate-500">{f.result}</p>
      <div className="flex flex-wrap gap-2">{TEST_RESULTS.map((r) => <Chip key={r.key} selected={result === r.key} onClick={() => setResult(result === r.key ? null : r.key)}>{r.label}</Chip>)}</div>
      <div className="flex gap-3">
        <Button variant="secondary" disabled={!kind} onClick={() => kind && onAdd(kind, result)}>{copy.episode.add}</Button>
        <button type="button" className={linkBtn} onClick={onCancel}>{copy.episode.cancel}</button>
      </div>
    </div>
  );
}
