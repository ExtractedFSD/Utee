"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Button, Card, LinkButton, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { CONTRACEPTION, COURSE_DAYS, MENOPAUSE_STAGES, PREGNANT, SOURCES, SYMPTOMS, TEST_KINDS, TRIGGERS, WORKED, labelFor } from "@/lib/tracker/options";
import { antibioticName } from "@/lib/tracker/search";
import { HELPING, PREVENTION_GROUPS, RETIRED_OPTIONS, diffPreventions } from "@/lib/tracker/prevention";
import { redFlagFor } from "@/lib/tracker/redflags";
import { formatDay, isoToday } from "@/lib/tracker/stats";
import { freeTextAnswer, parseDatePhrase, workedIn } from "@/lib/tracker/guided/local";
import { emptyUti, type AboutExtract, type FreeExtract, type PreventionExtract, type UtiExtract, type UtiSave } from "@/lib/tracker/guided/schema";
import type { ChatMessage } from "@/lib/tracker/data";
import { Chip, DateChips } from "../components/Chips";
import { PreventionPicker } from "../components/PreventionPicker";
import { AntibioticPicker } from "../components/AntibioticPicker";
import { RedFlagBanner } from "../components/RedFlagBanner";
import { addPreventions, extractGuided, saveAboutMeValues, saveChat, saveGuidedUti, stopPreventions, updatePrevention } from "../actions";

type Msg = ChatMessage & { id: number };
type Step = "about" | "prevention" | "utis" | "free" | "done";
type Mode = "full" | "utis" | "prevention" | "free";
export type Nudges = { unrated: { id: string; name: string } | null; antibioticPrevention: string | null };
type About = { menopause_stage: string | null; contraception: string | null; pregnant_or_trying: string | null };
type Draft = { uti: UtiExtract; asked: Q[]; flagged: boolean };
type Q =
  | "menopause" | "contraception" | "pregnant" | "aboutOverview"
  | "wasTaking" | "started" | "ended" | "endedOn" | "symptoms" | "triggers" | "treatment" | "days" | "worked" | "tests" | "overview" | "change"
  | "preventionOverview" | "preventionPick"
  | "rate" | "another" | "changedTaking" | "moreUtis";

let nextId = 1;
const linkBtn = "min-h-[44px] px-2 text-sm font-semibold text-maroon";
const UTI_QS: Q[] = ["wasTaking", "started", "ended", "endedOn", "symptoms", "triggers", "treatment", "days", "worked", "tests"];

/**
 * Chat-first: Una asks one thing at a time, with chips for the common
 * answers and a text box for everything else. A typed answer is read into
 * fields and the questions it answered are skipped. Before saving she shows
 * a short overview. Every line she says comes from the copy file, and the
 * whole conversation is kept so it can be reopened later.
 */
export function GuidedChat({ mode, aiAvailable, pregnantOrTrying, activePreventions, initialAbout, nudges, compact = false, resume }: {
  mode: Mode; aiAvailable: boolean; pregnantOrTrying: string; activePreventions: string[]; initialAbout: About | null; nudges?: Nudges; compact?: boolean;
  resume?: { id: string; messages: ChatMessage[] } | null;
}) {
  const stamp = () => new Date().toISOString();
  const mk = (text: string): Msg => ({ id: nextId++, role: "assistant", text, at: stamp() });
  const [messages, setMessages] = useState<Msg[]>(() => {
    if (resume) return [...resume.messages.map((m) => ({ ...m, id: nextId++ })), mk(copy.guided.resume)];
    if (mode === "utis") return [mk(copy.guided.introQuick), mk(copy.guided.askUtisQuick)];
    if (mode === "prevention") return [mk(copy.guided.askPreventionUpdate)];
    if (mode === "free") return [mk(copy.guided.introFree), ...(nudges?.unrated ? [mk(copy.guided.nudgeHelping(nudges.unrated.name))] : [])];
    return [mk(copy.guided.intro), mk(copy.guided.ask.menopause)];
  });
  const [chatId, setChatId] = useState<string | null>(resume?.id ?? null);
  const [step, setStep] = useState<Step>(mode === "full" ? "about" : mode);
  const [q, setQ] = useState<Q | null>(mode === "full" ? "menopause" : mode === "free" && nudges?.unrated && !resume ? "rate" : null);
  const [useAi, setUseAi] = useState(aiAvailable);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [about, setAbout] = useState<About>(initialAbout ?? { menopause_stage: null, contraception: null, pregnant_or_trying: null });
  const [active, setActive] = useState<string[]>(activePreventions);
  const [prevention, setPrevention] = useState<PreventionExtract>({ keys: activePreventions, stopped_keys: [], other_name: null, antibiotic_id: null });
  const [antibioticOther, setAntibioticOther] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [queue, setQueue] = useState<UtiExtract[]>([]);
  const [pendingTaking, setPendingTaking] = useState<PreventionExtract | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [visited, setVisited] = useState<Set<Step>>(new Set([mode === "full" ? "about" : mode]));
  const [pregnant, setPregnant] = useState(pregnantOrTrying);
  const [pickingAb, setPickingAb] = useState(false);
  // Option chips stay hidden behind "Let me pick" so the chat stays clean.
  const [picking, setPicking] = useState(false);
  useEffect(() => { setPicking(false); }, [q]);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const say = (text: string, role: Msg["role"] = "assistant", extra: Partial<Msg> = {}) => setMessages((m) => [...m, { id: nextId++, role, text, at: stamp(), ...extra }]);
  useEffect(() => { endRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages, q, draft]);

  // ------------------------------------------------------- persistence
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatIdRef = useRef<string | null>(chatId);
  const saving = useRef<Promise<void>>(Promise.resolve());
  useEffect(() => { chatIdRef.current = chatId; }, [chatId]);
  useEffect(() => {
    if (!messages.some((m) => m.role === "user")) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const snapshot = messages.map(({ role, text, lines, flag, at }) => ({ role, text, lines, flag, at }));
    saveTimer.current = setTimeout(() => {
      // Saves run one after another so the first one's id is known before the next starts.
      saving.current = saving.current.then(async () => {
        const r = await saveChat({ id: chatIdRef.current, mode, messages: snapshot });
        if ("id" in r && r.id && !chatIdRef.current) { chatIdRef.current = r.id; setChatId(r.id); }
      }).catch(() => undefined);
    }, 600);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [messages, mode]);

  const run = (fn: () => Promise<unknown>, after?: () => void) => {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      const err = (r as { error?: string } | null | undefined)?.error;
      if (err) setError(err);
      else after?.();
    });
  };

  // ------------------------------------------------------------- about
  const askAbout = (a: About) => {
    if (!a.menopause_stage) { setQ("menopause"); say(copy.guided.ask.menopause); return; }
    if (!a.contraception) { setQ("contraception"); say(copy.guided.ask.contraception); return; }
    if (!a.pregnant_or_trying) { setQ("pregnant"); say(copy.guided.ask.pregnant); return; }
    setQ("aboutOverview");
    say(copy.guided.ask.aboutOverview, "assistant", { lines: [
      `${copy.guided.overview.menopause}: ${labelFor(MENOPAUSE_STAGES, a.menopause_stage)}`,
      `${copy.guided.overview.contraception}: ${labelFor(CONTRACEPTION, a.contraception)}`,
      `${copy.guided.overview.pregnant}: ${labelFor(PREGNANT, a.pregnant_or_trying)}`,
    ] });
  };
  const answerAbout = (patch: Partial<About>) => { const a = { ...about, ...patch }; setAbout(a); askAbout(a); };
  const saveAbout = () => run(() => saveAboutMeValues({ menopause_stage: about.menopause_stage!, contraception: about.contraception!, pregnant_or_trying: about.pregnant_or_trying! }), () => {
    setPregnant(about.pregnant_or_trying!);
    say(copy.guided.savedAbout);
    goTo("prevention");
  });

  // -------------------------------------------------------- prevention
  const preventionOverview = (p: PreventionExtract) => {
    const { add, stop } = diffPreventions(active, p.keys);
    const name = (k: string) => (k === "other" ? p.other_name || "Other" : [...PREVENTION_GROUPS.flatMap((g) => g.options), ...RETIRED_OPTIONS].find((o) => o.key === k)?.label ?? k);
    const lines = [
      add.length ? `${copy.guided.overview.adding}: ${add.map(name).join(", ")}` : "",
      stop.length ? `${copy.guided.overview.stopping}: ${stop.map(name).join(", ")}` : "",
    ].filter(Boolean);
    setQ("preventionOverview");
    say(copy.guided.ask.preventionOverview, "assistant", { lines: lines.length ? lines : [copy.guided.overview.unchanged] });
  };
  const savePrevention = () => {
    const { add, stop } = diffPreventions(active, prevention.keys);
    const done = () => {
      say(mode === "full" ? copy.guided.savedPrevention(add.length) : copy.guided.savedPreventionUpdate(add.length, stop.length));
      setActive(prevention.keys);
      setQ(null);
      if (mode === "full") goTo("utis");
      else if (mode === "free" || visited.has("utis")) finish();
      else { setQ("moreUtis"); say(copy.guided.askMoreUtis); }
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

  // --------------------------------------------------------------- utis
  const current = draft;
  const nextQ = (d: Draft): Q => {
    const u = d.uti;
    const asked = (x: Q) => d.asked.includes(x);
    if (nudges?.antibioticPrevention && !asked("wasTaking")) return "wasTaking";
    if (!u.started_on) return "started";
    if (u.ongoing === null && !u.ended_on && !asked("ended")) return "ended";
    if (u.ongoing === false && !u.ended_on && !asked("endedOn")) return "endedOn";
    if (!u.symptoms.length && !asked("symptoms")) return "symptoms";
    if (!u.triggers.length && !asked("triggers")) return "triggers";
    if (!u.treatments.length && !asked("treatment")) return "treatment";
    if (u.treatments.some((t) => !t.days) && !asked("days")) return "days";
    if (u.treatments.some((t) => !t.worked) && !asked("worked")) return "worked";
    if (!u.tests.length && !asked("tests")) return "tests";
    return "overview";
  };
  const overviewLines = (u: UtiExtract): string[] => {
    const o = copy.guided.overview;
    const lines = [
      `${o.started}: ${u.started_on ? formatDay(u.started_on) : "?"}`,
      u.ongoing === true || (!u.ended_on && u.ongoing !== false) ? o.stillGoing : `${o.ended}: ${u.ended_on ? formatDay(u.ended_on) : formatDay(isoToday())}`,
      `${o.noticed}: ${u.symptoms.length ? u.symptoms.map((k) => (k === "other" ? u.other_symptom || "Other" : labelFor(SYMPTOMS, k))).join(", ") : o.nothingNoted}`,
    ];
    if (u.triggers.length) lines.push(`${o.triggers}: ${u.triggers.map((k) => (k === "other" ? u.other_trigger || "Other" : labelFor(TRIGGERS, k))).join(", ")}`);
    lines.push(`${o.antibiotics}: ${u.treatments.length ? u.treatments.map((t) => [t.antibiotic_id ? antibioticName(t.antibiotic_id, t.other_name) : "Antibiotic", t.days && `${t.days} ${copy.guided.fields.days}`, t.source && labelFor(SOURCES, t.source), t.worked && `${o.helped}: ${labelFor(WORKED, t.worked).toLowerCase()}`].filter(Boolean).join(" · ")).join("; ") : o.none}`);
    lines.push(`${o.tests}: ${u.tests.length ? u.tests.map((t) => labelFor(TEST_KINDS, t.kind)).join(", ") : o.none}`);
    if (u.notes) lines.push(`${o.notes}: ${u.notes}`);
    return lines;
  };
  const ask = (d: Draft) => {
    const next = nextQ(d);
    setDraft(d);
    setQ(next);
    setPickingAb(false);
    const a = copy.guided.ask;
    if (next === "wasTaking") say(copy.guided.followUp.wasTaking(nudges!.antibioticPrevention!));
    else if (next === "worked") {
      const t = d.uti.treatments.find((x) => !x.worked)!;
      say(a.worked(t.antibiotic_id ? antibioticName(t.antibiotic_id, t.other_name) : "antibiotic"));
    } else if (next === "overview") say(a.overview, "assistant", { lines: overviewLines(d.uti) });
    else say(a[next as keyof typeof a] as string);
  };
  const flagIfNeeded = (d: Draft): Draft => {
    if (d.flagged) return d;
    const f = redFlagFor(d.uti.symptoms, pregnant);
    if (!f.show) return d;
    say(copy.redFlag.title, "assistant", { flag: d.uti.symptoms });
    return { ...d, flagged: true };
  };
  const answer = (patch: Partial<UtiExtract>, asked?: Q) => {
    if (!current) return;
    let d: Draft = { ...current, uti: { ...current.uti, ...patch }, asked: asked && !current.asked.includes(asked) ? [...current.asked, asked] : current.asked };
    if (patch.symptoms) d = flagIfNeeded(d);
    ask(d);
  };
  const startDrafts = (utis: UtiExtract[]) => {
    const [first, ...rest] = utis;
    setQueue(rest);
    const d = flagIfNeeded({ uti: first, asked: [], flagged: false });
    ask(d);
  };
  const wasTakingNote = (answerText: string) => {
    const line = copy.guided.followUp.wasTakingNote(nudges?.antibioticPrevention ?? "", answerText);
    return { notes: [current?.uti.notes, line].filter(Boolean).join("\n") };
  };
  const toSave = (u: UtiExtract): UtiSave => {
    const over = u.ongoing === false || (!!u.ended_on && u.ongoing !== true);
    const ended = over ? u.ended_on ?? isoToday() : null;
    return {
      started_on: u.started_on!,
      ended_on: ended && ended < u.started_on! ? u.started_on! : ended,
      symptoms: u.symptoms,
      other_symptom: u.other_symptom || null,
      triggers: u.triggers,
      other_trigger: u.other_trigger || null,
      treatments: u.treatments.filter((t) => t.antibiotic_id).map((t) => ({ ...t, days: t.days && t.days > 0 ? Math.min(t.days, 365) : null })),
      tests: u.tests,
      notes: u.notes || null,
    };
  };
  const afterDraft = () => {
    setDraft(null);
    if (queue.length) { const [next, ...rest] = queue; setQueue(rest); ask(flagIfNeeded({ uti: next, asked: [], flagged: false })); return; }
    setQ("another");
    say(copy.guided.anotherQ);
  };
  const saveDraft = () => {
    if (!current?.uti.started_on) return;
    const u = toSave(current.uti);
    run(() => saveGuidedUti(u), () => { setSavedCount((n) => n + 1); say(copy.guided.savedUti(formatDay(u.started_on))); afterDraft(); });
  };
  const reask = (target: Q) => {
    if (!current) return;
    const cleared: Partial<UtiExtract> =
      target === "started" ? { started_on: null }
      : target === "ended" ? { ongoing: null, ended_on: null }
      : target === "symptoms" ? { symptoms: [] }
      : target === "triggers" ? { triggers: [] }
      : target === "treatment" ? { treatments: [] }
      : target === "tests" ? { tests: [] } : {};
    ask({ ...current, uti: { ...current.uti, ...cleared }, asked: current.asked.filter((x) => x !== target && !(target === "treatment" && (x === "days" || x === "worked"))) });
  };

  /** A typed answer to the open question, using what was read from it. */
  const applyTyped = (question: Q, t: string, read: UtiExtract): { patch: Partial<UtiExtract>; asked?: Q } => {
    const lower = t.toLowerCase();
    const no = /^\s*(no|nope|nothing|none|didn'?t|not really|no,? |skip)/.test(lower);
    const u = current!.uti;
    switch (question) {
      case "wasTaking": return { patch: wasTakingNote(no ? "No" : /^\s*(yes|yeah|yep|i was|still)/.test(lower) ? "Yes" : copy.guided.followUp.notSure), asked: "wasTaking" };
      case "started": return { patch: { started_on: read.started_on ?? parseDatePhrase(lower) ?? u.started_on } };
      case "ended":
        if (read.ongoing || /still|ongoing|not yet|hasn'?t/.test(lower)) return { patch: { ongoing: true, ended_on: null }, asked: "ended" };
        return { patch: { ongoing: false, ended_on: read.ended_on ?? parseDatePhrase(lower) }, asked: "ended" };
      case "endedOn": return { patch: { ended_on: read.ended_on ?? parseDatePhrase(lower) ?? read.started_on }, asked: "endedOn" };
      case "symptoms": {
        if (!read.symptoms.length && !no) {
          const other = read.other_symptom ?? freeTextAnswer(t);
          return { patch: { symptoms: [...new Set([...u.symptoms, "other"])], other_symptom: other }, asked: "symptoms" };
        }
        return { patch: { symptoms: [...new Set([...u.symptoms, ...read.symptoms])], other_symptom: read.other_symptom ?? u.other_symptom }, asked: "symptoms" };
      }
      case "triggers": {
        // Something not in the list is kept as "Other" with their words.
        if (!read.triggers.length && !no) {
          const other = read.other_trigger ?? freeTextAnswer(t);
          return { patch: { triggers: [...new Set([...u.triggers, "other"])], other_trigger: other }, asked: "triggers" };
        }
        return { patch: { triggers: [...new Set([...u.triggers, ...read.triggers])], other_trigger: read.other_trigger ?? u.other_trigger }, asked: "triggers" };
      }
      case "treatment": return { patch: no && !read.treatments.length ? {} : { treatments: [...u.treatments, ...read.treatments] }, asked: "treatment" };
      case "days": {
        const n = read.treatments.find((x) => x.days)?.days ?? Number((lower.match(/\d+/) ?? [])[0]);
        return { patch: n ? { treatments: u.treatments.map((x) => (x.days ? x : { ...x, days: n })) } : {}, asked: "days" };
      }
      case "worked": {
        const w = read.treatments.find((x) => x.worked)?.worked ?? workedIn(lower) ?? (no ? "no" : null);
        return { patch: w ? { treatments: u.treatments.map((x) => (x.worked ? x : { ...x, worked: w })) } : {}, asked: "worked" };
      }
      case "tests": return { patch: no && !read.tests.length ? {} : { tests: [...u.tests, ...read.tests] }, asked: "tests" };
      default: return { patch: {} };
    }
  };

  // ------------------------------------------------------------ typing
  const send = () => {
    const t = text.trim();
    if (!t || step === "done") return;
    say(t, "user");
    setText("");
    const question = q;
    if ((step === "utis" || step === "free") && !current && /^(none|no(ne)? yet|nothing|no|skip|not yet)\b/i.test(t)) { finishUtis(); return; }
    setReading(true);
    startTransition(async () => {
      const extractStep = step === "about" ? "about" : step === "prevention" ? "prevention" : current ? "utis" : step === "free" ? "free" : "utis";
      const r = await extractGuided(extractStep, t);
      setReading(false);
      if ("error" in r) { setError(r.error); return; }
      if (step === "about") {
        const a = r.result as AboutExtract;
        const merged: About = {
          menopause_stage: a.menopause_stage ?? about.menopause_stage,
          contraception: a.contraception ?? about.contraception,
          pregnant_or_trying: a.pregnant_or_trying ?? about.pregnant_or_trying,
        };
        if (!Object.values(a).some(Boolean)) say(copy.guided.gotNothing);
        setAbout(merged);
        askAbout(merged);
      } else if (step === "prevention") {
        const p = r.result as PreventionExtract;
        if (!p.keys.length && !p.stopped_keys.length && !/^\s*(no|nothing|none|nope)\b/.test(t.toLowerCase())) { say(copy.guided.gotNothing); return; }
        const next = { keys: [...new Set([...prevention.keys, ...p.keys])].filter((k) => !p.stopped_keys.includes(k)), stopped_keys: p.stopped_keys, other_name: p.other_name ?? prevention.other_name, antibiotic_id: p.antibiotic_id ?? prevention.antibiotic_id };
        setPrevention(next);
        preventionOverview(next);
      } else if (current && question && UTI_QS.includes(question)) {
        const read = (r.result as { utis: UtiExtract[] }).utis[0] ?? emptyUti();
        const { patch, asked } = applyTyped(question, t, read);
        answer(patch, asked);
      } else if (step === "free") {
        const f = r.result as FreeExtract;
        const utis = f.utis.filter((u) => u.started_on || u.symptoms.length || u.treatments.length || u.tests.length);
        const changes = f.taking.keys.length || f.taking.stopped_keys.length ? f.taking : null;
        if (!utis.length && !changes) { say(copy.guided.gotNothing); return; }
        if (changes) setPrevention({ keys: [...new Set([...active, ...changes.keys])].filter((k) => !changes.stopped_keys.includes(k)), stopped_keys: changes.stopped_keys, other_name: changes.other_name, antibiotic_id: changes.antibiotic_id });
        if (utis.length) { setPendingTaking(changes); say(utis.length > 1 ? copy.guided.gotSeveral(utis.length) : copy.guided.gotIt); startDrafts(utis); }
        else preventionOverview({ keys: [...new Set([...active, ...changes!.keys])].filter((k) => !changes!.stopped_keys.includes(k)), stopped_keys: changes!.stopped_keys, other_name: changes!.other_name, antibiotic_id: changes!.antibiotic_id });
      } else {
        const utis = (r.result as { utis: UtiExtract[] }).utis.filter((u) => u.started_on || u.symptoms.length || u.treatments.length || u.tests.length);
        if (!utis.length) { say(copy.guided.gotNothing); startDrafts([emptyUti()]); return; }
        say(utis.length > 1 ? copy.guided.gotSeveral(utis.length) : copy.guided.gotIt);
        startDrafts(utis);
      }
    });
  };

  // ------------------------------------------------------------ steps
  const goTo = (next: Step) => {
    setVisited((v) => new Set(v).add(next));
    setStep(next);
    setQ(null);
    if (next === "prevention") {
      say(visited.has("about") || mode === "full" ? copy.guided.askPrevention : copy.guided.askPreventionUpdate);
    }
    if (next === "utis") say(mode === "full" && !visited.has("utis") ? copy.guided.askUtis : copy.guided.askUtisQuick);
  };
  const finishUtis = () => {
    setDraft(null); setQueue([]); setQ(null);
    if (mode === "free") { if (pendingTaking) { const p = pendingTaking; setPendingTaking(null); preventionOverview({ keys: [...new Set([...active, ...p.keys])].filter((k) => !p.stopped_keys.includes(k)), stopped_keys: p.stopped_keys, other_name: p.other_name, antibiotic_id: p.antibiotic_id }); } else finish(); }
    else if (mode === "full" || visited.has("prevention")) finish();
    else { setQ("changedTaking"); say(copy.guided.askChangedTaking); }
  };
  const finish = () => {
    setQ(null);
    if (mode === "free") { say(copy.guided.anythingElse); setStep("free"); return; }
    say(mode === "full" ? copy.guided.done : copy.guided.doneQuick);
    setStep("done");
  };
  const rate = (id: string, helping: string) => run(() => updatePrevention(id, { helping }), () => { say(copy.guided.nudgeThanks); say(copy.guided.askFree); setQ(null); });

  const OPTION_QS: (Q | null)[] = ["menopause", "contraception", "pregnant", "wasTaking", "started", "ended", "endedOn", "symptoms", "triggers", "treatment", "days", "worked", "tests", "rate", null];
  const busy = pending || reading;
  const promptOnly = q === "rate" || q === "another" || q === "changedTaking" || q === "moreUtis" || q === "overview" || q === "aboutOverview" || q === "preventionOverview" || q === "change";
  const showInput = step !== "done" && !promptOnly;
  const toggleIn = (list: string[], k: string) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]);

  // ------------------------------------------------------------ chips
  const chips = (): React.ReactNode => {
    const c = copy.guided.chips;
    const u = current?.uti;
    switch (q) {
      case "menopause": return MENOPAUSE_STAGES.map((o) => <Chip key={o.key} onClick={() => answerAbout({ menopause_stage: o.key })}>{o.label}</Chip>);
      case "contraception": return CONTRACEPTION.map((o) => <Chip key={o.key} onClick={() => answerAbout({ contraception: o.key })}>{o.label}</Chip>);
      case "pregnant": return PREGNANT.map((o) => <Chip key={o.key} onClick={() => answerAbout({ pregnant_or_trying: o.key })}>{o.label}</Chip>);
      case "aboutOverview": return <>
        <Chip onClick={saveAbout} disabled={busy}>{c.save}</Chip>
        <Chip onClick={() => { setAbout({ menopause_stage: null, contraception: null, pregnant_or_trying: null }); askAbout({ menopause_stage: null, contraception: null, pregnant_or_trying: null }); }}>{c.change}</Chip>
      </>;
      case "wasTaking": return <>
        <Chip onClick={() => answer(wasTakingNote("Yes"), "wasTaking")}>{copy.guided.yes}</Chip>
        <Chip onClick={() => answer(wasTakingNote("No"), "wasTaking")}>No</Chip>
        <Chip onClick={() => answer(wasTakingNote(copy.guided.followUp.notSure), "wasTaking")}>{copy.guided.followUp.notSure}</Chip>
      </>;
      case "started": return <div className="w-full" data-testid="chip-dates"><DateChips value={u?.started_on ?? ""} onChange={(iso) => answer({ started_on: iso })} /></div>;
      case "ended": return <>
        <Chip onClick={() => answer({ ongoing: true, ended_on: null }, "ended")}>{copy.guided.fields.stillGoing}</Chip>
        <Chip onClick={() => answer({ ongoing: false }, "ended")}>{copy.guided.fields.over}</Chip>
      </>;
      case "endedOn": return <div className="w-full" data-testid="chip-dates"><DateChips value={u?.ended_on ?? isoToday()} onChange={(iso) => answer({ ended_on: iso, ongoing: false }, "endedOn")} /></div>;
      case "symptoms": return <>
        {SYMPTOMS.filter((o) => o.key !== "other").map((o) => <Chip key={o.key} selected={u?.symptoms.includes(o.key)} onClick={() => current && setDraft({ ...current, uti: { ...current.uti, symptoms: toggleIn(current.uti.symptoms, o.key) } })}>{o.label}</Chip>)}
        <Chip onClick={() => answer({}, "symptoms")}>{c.done}</Chip>
      </>;
      case "triggers": return <>
        {TRIGGERS.filter((o) => o.key !== "other").map((o) => <Chip key={o.key} selected={u?.triggers.includes(o.key)} onClick={() => current && setDraft({ ...current, uti: { ...current.uti, triggers: toggleIn(current.uti.triggers, o.key) } })}>{o.label}</Chip>)}
        <Chip onClick={() => answer({}, "triggers")}>{u?.triggers.length ? c.done : c.skip}</Chip>
      </>;
      case "treatment": return <>
        {u?.treatments.map((t, i) => <Chip key={i} selected onClick={() => current && setDraft({ ...current, uti: { ...current.uti, treatments: current.uti.treatments.filter((_, j) => j !== i) } })}>{c.remove(t.antibiotic_id ? antibioticName(t.antibiotic_id, t.other_name) : "antibiotic")}</Chip>)}
        <Chip onClick={() => setPickingAb((v) => !v)}>{c.chooseFromList}</Chip>
        <Chip onClick={() => answer({}, "treatment")}>{u?.treatments.length ? c.done : c.noAntibiotics}</Chip>
        {pickingAb && (
          <div className="w-full rounded-2xl bg-white p-3" data-testid="chip-antibiotics">
            <AntibioticPicker value={null} autoFocus onChange={(id, other) => { if (id && current) { setDraft({ ...current, uti: { ...current.uti, treatments: [...current.uti.treatments, { antibiotic_id: id, other_name: other ?? null, days: null, course_type: "treatment", source: null, worked: null }] } }); setPickingAb(false); } }} />
          </div>
        )}
      </>;
      case "days": return <>
        {COURSE_DAYS.map((n) => <Chip key={n} onClick={() => answer({ treatments: u!.treatments.map((t) => (t.days ? t : { ...t, days: n })) }, "days")}>{n} {copy.guided.fields.days}</Chip>)}
        <Chip onClick={() => answer({}, "days")}>{c.dontKnow}</Chip>
      </>;
      case "worked": return WORKED.map((w) => <Chip key={w.key} onClick={() => answer({ treatments: u!.treatments.map((t) => (t.worked ? t : { ...t, worked: w.key })) }, "worked")}>{w.label}</Chip>);
      case "tests": return <>
        <Chip onClick={() => answer({}, "tests")}>{c.noTest}</Chip>
        {TEST_KINDS.map((k) => <Chip key={k.key} onClick={() => answer({ tests: [...u!.tests, { kind: k.key, result: null, tested_on: null }] }, "tests")}>{k.label}</Chip>)}
      </>;
      case "overview": return <>
        <Chip onClick={saveDraft} disabled={busy}>{c.save}</Chip>
        <Chip onClick={() => { setQ("change"); say(copy.guided.ask.change); }}>{c.change}</Chip>
        <Chip onClick={afterDraft}>{copy.guided.discardUti}</Chip>
      </>;
      case "change": return (["started", "ended", "symptoms", "triggers", "treatment", "tests"] as Q[]).map((target) => (
        <Chip key={target} onClick={() => reask(target)}>{copy.guided.overview[target === "started" ? "started" : target === "ended" ? "ended" : target === "symptoms" ? "noticed" : target === "triggers" ? "triggers" : target === "treatment" ? "antibiotics" : "tests"]}</Chip>
      ));
      case "preventionOverview": return <>
        <Chip onClick={savePrevention} disabled={busy}>{c.save}</Chip>
        <Chip onClick={() => { setQ("preventionPick"); say(copy.guided.ask.preventionPick); }}>{c.change}</Chip>
      </>;
      case "rate": return HELPING.map((h) => <Chip key={h.key} disabled={busy} onClick={() => rate(nudges!.unrated!.id, h.key)}>{h.label}</Chip>);
      case "another": return <>
        <Chip onClick={() => { setQ(null); say(copy.guided.askUtisQuick); }}>{copy.guided.another}</Chip>
        <Chip onClick={finishUtis}>{copy.guided.allDone}</Chip>
      </>;
      case "changedTaking": return <>
        <Chip onClick={() => goTo("prevention")}>{copy.guided.yes}</Chip>
        <Chip onClick={finish}>{copy.guided.noDone}</Chip>
      </>;
      case "moreUtis": return <>
        <Chip onClick={() => goTo("utis")}>{copy.guided.yes}</Chip>
        <Chip onClick={finish}>{copy.guided.noDone}</Chip>
      </>;
      default:
        if (step === "prevention" && q === null) return <>
          <Chip onClick={() => preventionOverview(prevention)}>{mode === "full" ? c.nothing : c.nothingChanged}</Chip>
          <Chip onClick={() => { setQ("preventionPick"); say(copy.guided.ask.preventionPick); }}>{c.chooseFromList}</Chip>
        </>;
        if ((step === "utis" || step === "free") && !current && q === null) return <>
          <Chip onClick={() => startDrafts([emptyUti()])}>{copy.guided.tapInstead}</Chip>
          {step === "utis" && <Chip onClick={finishUtis}>{mode !== "full" && savedCount === 0 ? copy.guided.skip : savedCount === 0 ? copy.guided.noneYet : copy.guided.allDone}</Chip>}
        </>;
        return null;
    }
  };
  const chipNodes = chips();

  return (
    <div className="space-y-4" data-testid="guided-chat" data-hydrated={hydrated ? "true" : "false"} data-question={q ?? ""}>
      <div className="space-y-3" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.flag ? (
              <div className="w-full"><RedFlagBanner flag={redFlagFor(m.flag, pregnant)} /></div>
            ) : (
              <div className={`max-w-[88%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-maroon text-white rounded-br-md" : "bg-white text-midnight shadow-card rounded-bl-md"}`} data-role={m.role} data-testid={m.lines ? "chat-overview" : undefined}>
                {m.text}
                {m.lines && (
                  <ul className="mt-2 space-y-1 border-t border-slate-100 pt-2">
                    {m.lines.map((l, i) => <li key={i} className="text-sm font-semibold text-midnight">{l}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
        ))}
        {reading && <div className="flex justify-start"><div className="rounded-3xl rounded-bl-md bg-white px-4 py-3 text-sm text-slate-500 shadow-card">{copy.guided.thinking}</div></div>}
      </div>

      {chipNodes && step !== "done" && (
        OPTION_QS.includes(q) && !picking ? (
          <button type="button" onClick={() => setPicking(true)} className="-mt-1 min-h-[44px] text-sm font-semibold text-maroon" data-testid="let-me-pick">{copy.guided.letMePick}</button>
        ) : (
          <div className="flex flex-wrap gap-2" data-testid="chat-chips">{chipNodes}</div>
        )
      )}

      {q === "preventionPick" && (
        <Card data-testid="guided-prevention">
          <PreventionPicker
            selected={new Set(prevention.keys)}
            onToggle={(key, on) => setPrevention((p) => ({ ...p, keys: on ? [...new Set([...p.keys, key])] : p.keys.filter((k) => k !== key) }))}
            otherName={prevention.other_name ?? ""}
            onOtherName={(t) => setPrevention((p) => ({ ...p, other_name: t }))}
            antibioticId={prevention.antibiotic_id}
            antibioticOther={antibioticOther}
            onAntibiotic={(id, other) => { setPrevention((p) => ({ ...p, antibiotic_id: id })); if (other !== undefined) setAntibioticOther(other); }}
            autoFocus
          />
          <div className="mt-5 flex justify-end"><Button disabled={busy} onClick={() => preventionOverview(prevention)}>{copy.guided.chips.done}</Button></div>
        </Card>
      )}

      {showInput && (
        <Card>
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
