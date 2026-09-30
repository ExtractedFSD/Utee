"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Card, LinkButton, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { CONTRACEPTION, MENOPAUSE_STAGES, PREGNANT, SOURCES, SYMPTOMS, TEST_KINDS, TEST_RESULTS, TRIGGERS, WORKED, labelFor } from "@/lib/tracker/options";
import { antibioticName } from "@/lib/tracker/search";
import { diffPreventions } from "@/lib/tracker/prevention";
import { redFlagFor } from "@/lib/tracker/redflags";
import { formatDay, isoToday } from "@/lib/tracker/stats";
import { parseDatePhrase, workedIn } from "@/lib/tracker/guided/local";
import { HELPING } from "@/lib/tracker/prevention";
import { emptyUti, type AboutExtract, type FreeExtract, type PreventionExtract, type TestExtract, type TreatmentExtract, type UtiExtract, type UtiSave } from "@/lib/tracker/guided/schema";
import { Chip, ChipGroup, DateChips } from "../components/Chips";
import { PreventionPicker } from "../components/PreventionPicker";
import { AntibioticPicker } from "../components/AntibioticPicker";
import { RedFlagBanner } from "../components/RedFlagBanner";
import { addPreventions, extractGuided, saveAboutMeValues, saveGuidedUti, stopPreventions, updatePrevention } from "../actions";

type Msg = { id: number; role: "assistant" | "user"; text: string };
type Step = "about" | "prevention" | "utis" | "free" | "done";
type Mode = "full" | "utis" | "prevention" | "free";
export type Nudges = { unrated: { id: string; name: string } | null; antibioticPrevention: string | null };
type About = { menopause_stage: string; contraception: string; pregnant_or_trying: string };
type Draft = { id: number; uti: UtiExtract; asked: FollowUp[] };
type FollowUp = "wasTaking" | "ended" | "treatment" | "worked" | "tests";
type Prompt = { kind: "another" } | { kind: "changedTaking" } | { kind: "moreUtis" } | { kind: "rate"; id: string; name: string } | null;

let nextId = 1;
const linkBtn = "min-h-[44px] px-2 text-sm font-semibold text-maroon";

/**
 * The conversation is scripted: every assistant line comes from the copy
 * file. Typing fills the same chips a person could tap, and nothing is saved
 * until they press Next or Save. After reading a UTI it asks, in turn, only
 * for what is still missing: has it ended, any antibiotic, did it help, any
 * test.
 */
export function GuidedChat({ mode, aiAvailable, pregnantOrTrying, activePreventions, initialAbout, nudges, compact = false }: {
  mode: Mode; aiAvailable: boolean; pregnantOrTrying: string; activePreventions: string[]; initialAbout: About | null; nudges?: Nudges; compact?: boolean;
}) {
  const [messages, setMessages] = useState<Msg[]>(() =>
    mode === "utis" ? [{ id: nextId++, role: "assistant", text: copy.guided.introQuick }, { id: nextId++, role: "assistant", text: copy.guided.askUtisQuick }]
    : mode === "prevention" ? [{ id: nextId++, role: "assistant", text: copy.guided.askPreventionUpdate }]
    : mode === "free" ? [{ id: nextId++, role: "assistant", text: copy.guided.introFree }, ...(nudges?.unrated ? [{ id: nextId++, role: "assistant" as const, text: copy.guided.nudgeHelping(nudges.unrated.name) }] : [])]
    : [{ id: nextId++, role: "assistant", text: copy.guided.intro }, { id: nextId++, role: "assistant", text: copy.guided.askAbout }]
  );
  const [step, setStep] = useState<Step>(mode === "full" ? "about" : mode);
  const [useAi, setUseAi] = useState(aiAvailable);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [about, setAbout] = useState<About>(initialAbout ?? { menopause_stage: "prefer_not", contraception: "prefer_not", pregnant_or_trying: "no" });
  const [active, setActive] = useState<string[]>(activePreventions);
  const [prevention, setPrevention] = useState<PreventionExtract>({ keys: activePreventions, stopped_keys: [], other_name: null, antibiotic_id: null });
  const [antibioticOther, setAntibioticOther] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [prompt, setPrompt] = useState<Prompt>(mode === "free" && nudges?.unrated ? { kind: "rate", ...nudges.unrated } : null);
  const [pendingTaking, setPendingTaking] = useState<PreventionExtract | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [visited, setVisited] = useState<Set<Step>>(new Set([mode === "full" ? "about" : mode]));
  const [pregnant, setPregnant] = useState(pregnantOrTrying);
  const endRef = useRef<HTMLDivElement | null>(null);
  // Lets tests (and anything else) tell when taps will be handled.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const say = (t: string, role: Msg["role"] = "assistant") => setMessages((m) => [...m, { id: nextId++, role, text: t }]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages, drafts, step, prompt, followUp]);

  const run = (fn: () => Promise<unknown>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      const err = (r as { error?: string } | null | undefined)?.error;
      if (err) setError(err);
      else after?.();
    });
  };

  // ------------------------------------------------------- follow-ups
  const current = drafts[0] ?? null;
  const nextFollowUp = (d: Draft): FollowUp | null => {
    const u = d.uti;
    if (nudges?.antibioticPrevention && !d.asked.includes("wasTaking")) return "wasTaking";
    if (u.ongoing === null && !u.ended_on && !d.asked.includes("ended")) return "ended";
    if (!u.treatments.length && !d.asked.includes("treatment")) return "treatment";
    if (u.treatments.some((t) => !t.worked) && !d.asked.includes("worked")) return "worked";
    if (!u.tests.length && !d.asked.includes("tests")) return "tests";
    return null;
  };
  const askNext = (d: Draft | null) => {
    const q = d ? nextFollowUp(d) : null;
    setFollowUp(q);
    if (!q || !d) return;
    if (q === "worked") {
      const t = d.uti.treatments.find((x) => !x.worked)!;
      say(copy.guided.followUp.worked(t.antibiotic_id ? antibioticName(t.antibiotic_id, t.other_name) : "antibiotic"));
    } else if (q === "wasTaking") say(copy.guided.followUp.wasTaking(nudges!.antibioticPrevention!));
    else say(copy.guided.followUp[q]);
  };
  const wasTakingNote = (answer: string) => {
    const line = copy.guided.followUp.wasTakingNote(nudges?.antibioticPrevention ?? "", answer);
    return { notes: [current?.uti.notes, line].filter(Boolean).join("\n") };
  };
  const updateDraft = (id: number, patch: Partial<UtiExtract>, asked?: FollowUp) =>
    setDrafts((list) => list.map((d) => (d.id === id ? { id, uti: { ...d.uti, ...patch }, asked: asked && !d.asked.includes(asked) ? [...d.asked, asked] : d.asked } : d)));
  const answerFollowUp = (patch: Partial<UtiExtract>) => {
    if (!current || !followUp) return;
    const d: Draft = { ...current, uti: { ...current.uti, ...patch }, asked: [...current.asked, followUp] };
    updateDraft(current.id, patch, followUp);
    askNext(d);
  };
  /** Apply a typed answer to the open follow-up, using what was read from it. */
  const applyTyped = (q: FollowUp, t: string, read: UtiExtract) => {
    const lower = t.toLowerCase();
    const no = /^\s*(no|nope|nothing|none|didn'?t|not really|no,? )/.test(lower);
    if (q === "wasTaking") return wasTakingNote(no ? "No" : /^\s*(yes|yeah|yep|i was|still)/.test(lower) ? "Yes" : copy.guided.followUp.notSure);
    if (q === "ended") {
      if (read.ongoing || /still|ongoing|not yet|hasn'?t/.test(lower)) return { ongoing: true, ended_on: null };
      const date = read.ended_on ?? parseDatePhrase(lower);
      return { ongoing: false, ended_on: date ?? current?.uti.ended_on ?? null };
    }
    if (q === "treatment") return no && !read.treatments.length ? {} : { treatments: [...(current?.uti.treatments ?? []), ...read.treatments] };
    if (q === "worked") {
      const w = read.treatments.find((x) => x.worked)?.worked ?? workedIn(lower) ?? (no ? "no" : null);
      return w ? { treatments: (current?.uti.treatments ?? []).map((x) => (x.worked ? x : { ...x, worked: w })) } : {};
    }
    return no && !read.tests.length ? {} : { tests: [...(current?.uti.tests ?? []), ...read.tests] };
  };

  // ------------------------------------------------------------ typing
  const send = () => {
    const t = text.trim();
    if (!t || step === "done" || prompt) return;
    say(t, "user");
    setText("");
    const q = followUp;
    if (utiStep && !q && /^(none|no(ne)? yet|nothing|no|skip|not yet)\b/i.test(t)) { finishUtis(); return; }
    setReading(true);
    startTransition(async () => {
      const r = await extractGuided(step, t);
      setReading(false);
      if ("error" in r) { setError(r.error); return; }
      if (step === "about") {
        const a = r.result as AboutExtract;
        setAbout((prev) => ({
          menopause_stage: a.menopause_stage ?? prev.menopause_stage,
          contraception: a.contraception ?? prev.contraception,
          pregnant_or_trying: a.pregnant_or_trying ?? prev.pregnant_or_trying,
        }));
        say(Object.values(a).some(Boolean) ? copy.guided.gotIt : copy.guided.gotNothing);
      } else if (step === "prevention") {
        const p = r.result as PreventionExtract;
        setPrevention((prev) => ({
          keys: [...new Set([...prev.keys, ...p.keys])].filter((k) => !p.stopped_keys.includes(k)),
          stopped_keys: [...new Set([...prev.stopped_keys, ...p.stopped_keys])],
          other_name: p.other_name ?? prev.other_name,
          antibiotic_id: p.antibiotic_id ?? prev.antibiotic_id,
        }));
        say(p.keys.length || p.stopped_keys.length ? copy.guided.gotIt : copy.guided.gotNothing);
      } else if (q && current) {
        const read = (r.result as { utis: UtiExtract[] }).utis[0] ?? emptyUti();
        say(copy.guided.addedToCard);
        answerFollowUp(applyTyped(q, t, read));
      } else if (step === "free") {
        const f = r.result as FreeExtract;
        const utis = f.utis.filter((u) => u.started_on || u.symptoms.length || u.treatments.length || u.tests.length);
        const changes = f.taking.keys.length || f.taking.stopped_keys.length ? f.taking : null;
        if (!utis.length && !changes) { say(copy.guided.gotNothing); return; }
        if (changes) {
          setPrevention((prev) => ({
            keys: [...new Set([...active, ...changes.keys])].filter((k) => !changes.stopped_keys.includes(k)),
            stopped_keys: changes.stopped_keys,
            other_name: changes.other_name ?? prev.other_name,
            antibiotic_id: changes.antibiotic_id ?? prev.antibiotic_id,
          }));
        }
        if (utis.length) {
          const list: Draft[] = utis.map((uti) => ({ id: nextId++, uti, asked: [] }));
          setDrafts(list);
          setPendingTaking(changes);
          say(utis.length > 1 ? copy.guided.gotSeveral(utis.length) : copy.guided.gotIt);
          askNext(list[0]);
        } else {
          say(copy.guided.gotIt);
          goTo("prevention");
        }
      } else {
        const utis = (r.result as { utis: UtiExtract[] }).utis.filter((u) => u.started_on || u.symptoms.length || u.treatments.length || u.tests.length);
        const list: Draft[] = (utis.length ? utis : [emptyUti()]).map((uti) => ({ id: nextId++, uti, asked: [] }));
        setDrafts(list);
        say(!utis.length ? copy.guided.gotNothing : utis.length > 1 ? copy.guided.gotSeveral(utis.length) : copy.guided.gotIt);
        if (utis.length) askNext(list[0]);
      }
    });
  };

  // ------------------------------------------------------------ steps
  const goTo = (next: Step) => {
    setVisited((v) => new Set(v).add(next));
    setStep(next);
    setPrompt(null);
    if (next === "prevention" && mode !== "free") say(visited.has("about") || mode === "full" ? copy.guided.askPrevention : copy.guided.askPreventionUpdate);
    if (next === "utis") say(mode === "full" && !visited.has("utis") ? copy.guided.askUtis : copy.guided.askUtisQuick);
  };

  const finishAbout = () => run(() => saveAboutMeValues(about), () => {
    setPregnant(about.pregnant_or_trying);
    say(copy.guided.savedAbout);
    goTo("prevention");
  });

  const finishPrevention = () => {
    const { add, stop } = diffPreventions(active, prevention.keys);
    const done = () => {
      say(mode === "full" ? copy.guided.savedPrevention(add.length) : copy.guided.savedPreventionUpdate(add.length, stop.length));
      setActive(prevention.keys);
      if (mode === "full") goTo("utis");
      else if (mode === "free" || visited.has("utis")) finish();
      else { setPrompt({ kind: "moreUtis" }); say(copy.guided.askMoreUtis); }
    };
    if (!add.length && !stop.length) { done(); return; }
    run(async () => {
      if (add.length) {
        const r = await addPreventions({ keys: add, otherName: prevention.other_name ?? undefined, antibioticId: prevention.antibiotic_id ?? undefined, antibioticOther });
        if ((r as { error?: string }).error) return r;
      }
      return stop.length ? stopPreventions(stop) : { ok: true };
    }, done);
  };

  const dropDraft = (id: number) => {
    const rest = drafts.filter((d) => d.id !== id);
    setDrafts(rest);
    if (rest.length) askNext(rest[0]);
    else { setFollowUp(null); setPrompt({ kind: "another" }); say(copy.guided.anotherQ); }
  };
  const saveDraft = (id: number, uti: UtiSave) => run(() => saveGuidedUti(uti), () => {
    setSavedCount((n) => n + 1);
    say(copy.guided.savedUti(formatDay(uti.started_on)));
    dropDraft(id);
  });

  const finishUtis = () => {
    setDrafts([]); setFollowUp(null); setPrompt(null);
    if (mode === "free") { if (pendingTaking) { setPendingTaking(null); goTo("prevention"); } else finish(); }
    else if (mode === "full" || visited.has("prevention")) finish();
    else { setPrompt({ kind: "changedTaking" }); say(copy.guided.askChangedTaking); }
  };
  const finish = () => {
    setPrompt(null);
    if (mode === "free") { say(copy.guided.anythingElse); setStep("free"); return; }
    say(mode === "full" ? copy.guided.done : copy.guided.doneQuick);
    setStep("done");
  };
  const rate = (id: string, helping: string) => run(() => updatePrevention(id, { helping }), () => { say(copy.guided.nudgeThanks); say(copy.guided.askFree); setPrompt(null); });

  const busy = pending || reading;
  const utiStep = step === "utis" || step === "free";
  const showInput = step !== "done" && !prompt;

  return (
    <div className="space-y-4" data-testid="guided-chat" data-hydrated={hydrated ? "true" : "false"}>
      <div className="space-y-3" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-maroon text-white rounded-br-md" : "bg-white text-midnight shadow-card rounded-bl-md"}`} data-role={m.role}>{m.text}</div>
          </div>
        ))}
        {reading && <div className="flex justify-start"><div className="rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm text-slate-500 shadow-card">{copy.guided.thinking}</div></div>}
      </div>

      {showInput && (
        <Card>
          {followUp && current && (
            <div className="mb-3 flex flex-wrap gap-2" data-testid="follow-up-chips">
              {followUp === "wasTaking" && <>
                <Chip onClick={() => answerFollowUp(wasTakingNote("Yes"))}>{copy.guided.yes}</Chip>
                <Chip onClick={() => answerFollowUp(wasTakingNote("No"))}>No</Chip>
                <Chip onClick={() => answerFollowUp(wasTakingNote(copy.guided.followUp.notSure))}>{copy.guided.followUp.notSure}</Chip>
              </>}
              {followUp === "ended" && <>
                <Chip onClick={() => answerFollowUp({ ongoing: true, ended_on: null })}>{copy.guided.fields.stillGoing}</Chip>
                <Chip onClick={() => answerFollowUp({ ongoing: false })}>{copy.guided.fields.over}</Chip>
              </>}
              {followUp === "treatment" && <Chip onClick={() => answerFollowUp({})}>{copy.guided.followUp.noAntibiotics}</Chip>}
              {followUp === "worked" && WORKED.map((w) => (
                <Chip key={w.key} onClick={() => answerFollowUp({ treatments: current.uti.treatments.map((x) => (x.worked ? x : { ...x, worked: w.key })) })}>{w.label}</Chip>
              ))}
              {followUp === "tests" && <>
                <Chip onClick={() => answerFollowUp({})}>{copy.guided.followUp.noTest}</Chip>
                {TEST_KINDS.map((k) => <Chip key={k.key} onClick={() => answerFollowUp({ tests: [...current.uti.tests, { kind: k.key, result: null, tested_on: null }] })}>{k.label}</Chip>)}
              </>}
            </div>
          )}
          <label className="sr-only" htmlFor="guided-input">{copy.guided.placeholder}</label>
          <div className="flex gap-2">
            <textarea id="guided-input" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder={copy.guided.placeholder} rows={2} className={`${inputClass} flex-1 resize-none`} disabled={busy} />
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
          />
          <div className="mt-5 flex justify-end"><Button disabled={busy} onClick={finishPrevention}>{copy.guided.next}</Button></div>
        </Card>
      )}

      {utiStep && drafts.map((d) => (
        <UtiReview key={d.id} draft={d.uti} onChange={(patch) => updateDraft(d.id, patch)} pregnantOrTrying={pregnant} busy={busy} onSave={(u) => saveDraft(d.id, u)} onDiscard={() => dropDraft(d.id)} />
      ))}

      {step === "utis" && !drafts.length && !prompt && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={linkBtn} disabled={busy} onClick={() => setDrafts([{ id: nextId++, uti: emptyUti(), asked: ["ended", "treatment", "worked", "tests"] }])}>{copy.guided.tapInstead}</button>
          <button type="button" className={`${linkBtn} ml-auto`} disabled={busy} onClick={finishUtis}>{mode !== "full" && savedCount === 0 ? copy.guided.skip : savedCount === 0 ? copy.guided.noneYet : copy.guided.allDone}</button>
        </div>
      )}

      {prompt?.kind === "another" && (
        <div className="flex flex-wrap gap-2" data-testid="guided-another">
          <Button variant="secondary" onClick={() => { setPrompt(null); say(copy.guided.askUtisQuick); }}>{copy.guided.another}</Button>
          <Button onClick={finishUtis}>{copy.guided.allDone}</Button>
        </div>
      )}
      {prompt?.kind === "changedTaking" && (
        <div className="flex flex-wrap gap-2" data-testid="guided-changed-taking">
          <Button variant="secondary" onClick={() => goTo("prevention")}>{copy.guided.yes}</Button>
          <Button onClick={finish}>{copy.guided.noDone}</Button>
        </div>
      )}
      {prompt?.kind === "rate" && (
        <div className="flex flex-wrap gap-2" data-testid="guided-rate">
          {HELPING.map((h) => <Chip key={h.key} disabled={busy} onClick={() => rate(prompt.id, h.key)}>{h.label}</Chip>)}
        </div>
      )}
      {prompt?.kind === "moreUtis" && (
        <div className="flex flex-wrap gap-2" data-testid="guided-more-utis">
          <Button variant="secondary" onClick={() => goTo("utis")}>{copy.guided.yes}</Button>
          <Button onClick={finish}>{copy.guided.noDone}</Button>
        </div>
      )}

      {step === "done" && !compact && (
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

/** One extracted UTI, every field editable in place, saved as a whole. */
function UtiReview({ draft, onChange, pregnantOrTrying, busy, onSave, onDiscard }: {
  draft: UtiExtract; onChange: (patch: Partial<UtiExtract>) => void; pregnantOrTrying: string; busy: boolean; onSave: (u: UtiSave) => void; onDiscard: () => void;
}) {
  const today = isoToday();
  const over = draft.ongoing === false || (!!draft.ended_on && draft.ongoing !== true);
  const [addingAb, setAddingAb] = useState(false);
  const [addingTest, setAddingTest] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const flag = redFlagFor(draft.symptoms, pregnantOrTrying);
  const f = copy.guided.fields;
  const toggle = (list: string[], k: string, on: boolean) => (on ? [...new Set([...list, k])] : list.filter((x) => x !== k));
  const setTreatments = (fn: (t: TreatmentExtract[]) => TreatmentExtract[]) => onChange({ treatments: fn(draft.treatments) });
  const setTests = (fn: (t: TestExtract[]) => TestExtract[]) => onChange({ tests: fn(draft.tests) });

  const save = () => {
    if (!draft.started_on) { setLocalError(copy.guided.startNeeded); return; }
    setLocalError(null);
    const ended = over ? draft.ended_on ?? today : null;
    onSave({
      started_on: draft.started_on,
      ended_on: ended && ended < draft.started_on ? draft.started_on : ended,
      symptoms: draft.symptoms,
      other_symptom: draft.other_symptom || null,
      triggers: draft.triggers,
      treatments: draft.treatments.filter((t) => t.antibiotic_id).map((t) => ({ ...t, days: t.days && t.days > 0 ? Math.min(t.days, 365) : null })),
      tests: draft.tests,
      notes: draft.notes || null,
    });
  };

  return (
    <Card data-testid="uti-review" className="space-y-5">
      <div data-testid="review-start">
        <DateChips label={f.started} value={draft.started_on || today} onChange={(iso) => onChange({ started_on: iso })} />
        {!draft.started_on && <p className="mt-2 text-xs text-slate-500">{copy.guided.startNeeded}</p>}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">{f.ended}</p>
        <div className="flex flex-wrap gap-2">
          <Chip selected={!over} onClick={() => onChange({ ongoing: true, ended_on: null })}>{f.stillGoing}</Chip>
          <Chip selected={over} onClick={() => onChange({ ongoing: false })}>{f.over}</Chip>
        </div>
        {over && <div className="mt-3" data-testid="review-end"><DateChips label={f.endedOn} value={draft.ended_on ?? today} onChange={(iso) => onChange({ ended_on: iso, ongoing: false })} /></div>}
      </div>
      <div data-testid="review-symptoms">
        <p className="text-sm font-semibold text-slate-700 mb-2">{f.symptoms}</p>
        <ChipGroup options={SYMPTOMS} selected={new Set(draft.symptoms)} onToggle={(k, on) => onChange({ symptoms: toggle(draft.symptoms, k, on) })} otherText={draft.other_symptom ?? ""} onOtherText={(t) => onChange({ other_symptom: t })} />
        {flag.show && <div className="mt-3"><RedFlagBanner flag={flag} /></div>}
      </div>
      <div data-testid="review-triggers">
        <p className="text-sm font-semibold text-slate-700 mb-2">{f.triggers}</p>
        <ChipGroup options={TRIGGERS.filter((t) => t.key !== "other")} selected={new Set(draft.triggers)} onToggle={(k, on) => onChange({ triggers: toggle(draft.triggers, k, on) })} />
      </div>
      <div data-testid="review-treatments">
        <p className="text-sm font-semibold text-slate-700 mb-2">{f.treatments}</p>
        <ul className="space-y-3">
          {draft.treatments.map((t, i) => (
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
          {draft.tests.map((t, i) => (
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
        <textarea id="review-notes" value={draft.notes ?? ""} onChange={(e) => onChange({ notes: e.target.value })} rows={2} className={`${inputClass} w-full`} />
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
