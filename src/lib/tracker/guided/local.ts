import { ANTIBIOTICS } from "../search";
import { isoDaysAgo, isoToday } from "../stats";
import type { AboutExtract, PreventionExtract, TestExtract, TreatmentExtract, UtiExtract, UtisExtract } from "./schema";
import { emptyUti } from "./schema";

/*
 * Rule-based reading of a typed answer. It runs when there is no AI key, when
 * the AI call fails, and in tests. It only ever recognises phrases; when it
 * is not sure it leaves the field empty for the person to tap.
 */

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  couple: 2, few: 3, fortnight: 14,
};
const num = (s: string) => (/^\d+$/.test(s) ? Number(s) : NUMBER_WORDS[s.toLowerCase()] ?? null);
const NUM = "(\\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|couple|few)";
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** First date phrase in `text`, as an ISO date, or null. */
export function parseDatePhrase(text: string, today = isoToday()): string | null {
  const t = text.toLowerCase();
  const now = new Date(`${today}T12:00:00Z`);
  const daysAgo = (n: number) => isoDaysAgo(n, now);
  if (/\btoday\b|this morning|tonight/.test(t)) return today;
  if (/\byesterday\b/.test(t)) return daysAgo(1);
  if (/day before yesterday/.test(t)) return daysAgo(2);
  let m = t.match(new RegExp(`\\b${NUM} days? ago`));
  if (m && num(m[1]) !== null) return daysAgo(num(m[1])!);
  if (/\bfortnight ago\b|\btwo weeks ago\b|\b2 weeks ago\b/.test(t)) return daysAgo(14);
  m = t.match(new RegExp(`\\b${NUM} weeks? ago`));
  if (m && num(m[1]) !== null) return daysAgo(num(m[1])! * 7);
  if (/\blast week\b|\ba week ago\b/.test(t)) return daysAgo(7);
  m = t.match(new RegExp(`\\b${NUM} months? ago`));
  if (m && num(m[1]) !== null) return daysAgo(num(m[1])! * 30);
  if (/\blast month\b|\ba month ago\b/.test(t)) return daysAgo(30);
  m = t.match(new RegExp(`\\b${NUM} years? ago`));
  if (m && num(m[1]) !== null) return daysAgo(num(m[1])! * 365);
  if (/\blast year\b|\ba year ago\b/.test(t)) return daysAgo(365);
  // 12/9, 12/09/2026, 12.9.26
  m = t.match(/\b(\d{1,2})[/.](\d{1,2})(?:[/.](\d{2,4}))?\b/);
  if (m) {
    const d = Number(m[1]); const mo = Number(m[2]);
    let y = m[3] ? Number(m[3]) : now.getUTCFullYear();
    if (y < 100) y += 2000;
    if (d >= 1 && d <= 31 && mo >= 1 && mo <= 12) {
      const dt = new Date(Date.UTC(y, mo - 1, d));
      if (!m[3] && dt > now) dt.setUTCFullYear(y - 1);
      return iso(dt);
    }
  }
  // 12 sept, 12th of september 2026, september 12
  const monthRe = "(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*";
  m = t.match(new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?(?: of)? ${monthRe}(?: (\\d{4}))?`)) ?? t.match(new RegExp(`\\b${monthRe} (\\d{1,2})(?:st|nd|rd|th)?(?:,? (\\d{4}))?`));
  if (m) {
    const dayFirst = /^\d/.test(m[1]);
    const d = Number(dayFirst ? m[1] : m[2]);
    const mo = MONTHS.indexOf((dayFirst ? m[2] : m[1]).slice(0, 3));
    const y = m[3] ? Number(m[3]) : now.getUTCFullYear();
    if (d >= 1 && d <= 31 && mo >= 0) {
      const dt = new Date(Date.UTC(y, mo, d));
      if (!m[3] && dt > now) dt.setUTCFullYear(y - 1);
      return iso(dt);
    }
  }
  // "in march", "back in june 2025": middle of the month
  m = t.match(new RegExp(`\\b(?:in|back in|around|during) ${monthRe}(?: (\\d{4}))?`));
  if (m) {
    const mo = MONTHS.indexOf(m[1].slice(0, 3));
    const y = m[2] ? Number(m[2]) : now.getUTCFullYear();
    const dt = new Date(Date.UTC(y, mo, 15));
    if (!m[2] && dt > now) dt.setUTCFullYear(y - 1);
    return iso(dt);
  }
  return null;
}

const SYMPTOM_RULES: [string, RegExp][] = [
  ["burning", /burn|sting|painful (to |when )?(pee|wee|urinat)|hurts? (to|when) (i )?(pee|wee)|razor/],
  ["frequency", /more often|frequen|all the time|constantly|keep (needing|going|wanting)|every (few|\d+) minutes|going a lot|needing to go/],
  ["urgency", /urgen|sudden|rush(ing)? to|desperate|can'?t hold/],
  ["cloudy", /cloud/],
  ["smelly", /smell|odou?r|stink/],
  ["blood", /blood|bleed|pink|red (urine|wee|pee)/],
  ["lower_tummy_pain", /tummy|abdom|pelvi|bladder (pain|ache)|low(er)? (belly|stomach)|cramp|pressure/],
  ["back_side_pain", /\bback (pain|ache)|(my |lower )back\b|\bsides?\b|flank|kidney/],
  ["fever_chills", /fever|temperature|shiver|chill|hot and cold|sweat/],
  ["nausea_vomiting", /nause|feeling sick|felt sick|vomit|throw(ing)? up|threw up/],
  ["confusion_tired", /confus|tired|exhaust|fatigue|foggy|wiped out/],
];

const TRIGGER_RULES: [string, RegExp][] = [
  ["sex", /\bsex\b|intercourse|slept with|after (we|being) intimate/],
  ["dehydration", /not drinking|dehydrat|didn'?t drink|not enough (water|fluid)|hadn'?t drunk/],
  ["holding_pee", /holding (it|in|my)|held (it|my)|couldn'?t get to a (loo|toilet)/],
  ["period_cycle", /\bperiod\b|cycle|ovulat|time of the month/],
  ["new_contraception", /new (pill|coil|contracept)|started (the|a new) pill|changed (my )?(pill|coil)/],
  ["menopause", /menopaus/],
  ["swimming_hot_bath", /swim|hot bath|jacuzzi|hot tub|pool|spa\b/],
  ["constipation", /constipat/],
  ["recent_antibiotics", /antibiotics for (something|a|my) (else|chest|throat|tooth|ear|skin)/],
];

const TEST_KIND_RULES: [string, RegExp][] = [
  ["utee", /\butee\b/],
  ["lab", /sample|culture|\blab\b|sent (it )?(off|away)|msu/],
  ["dipstick_gp_pharmacy", /dip(stick)?[^.]{0,40}(gp|doctor|surgery|pharmac|chemist|nurse)|(gp|doctor|surgery|pharmac|chemist|nurse)[^.]{0,40}dip(stick)?/],
  ["dipstick_home", /dipstick|test strip|home test|tested (it )?myself|strip test/],
];

const SOURCE_RULES: [string, RegExp][] = [
  ["hospital", /hospital|a&e|a and e|\bae\b|emergency/],
  ["pharmacy", /pharmac|chemist|\bboots\b|lloyds|superdrug/],
  ["private_clinic", /private/],
  ["online", /online|\bapp\b|internet/],
  ["gp", /\bgp\b|doctor|surgery|\bnhs\b|\bdr\b|111/],
];

function matchAll(rules: [string, RegExp][], t: string): string[] {
  return rules.filter(([, re]) => re.test(t)).map(([k]) => k);
}

function antibioticsIn(t: string): { id: string; index: number }[] {
  const found: { id: string; index: number }[] = [];
  for (const a of ANTIBIOTICS) {
    if (a.id === "other" || a.id === "dont_know") continue;
    const names = [a.name, ...(a.brands ?? []), ...(a.aliases ?? [])].map((n) => n.toLowerCase());
    for (const n of names) {
      const i = t.indexOf(n);
      if (i >= 0 && !found.some((f) => f.id === a.id)) { found.push({ id: a.id, index: i }); break; }
    }
  }
  return found.sort((x, y) => x.index - y.index);
}

export function workedIn(t: string): string | null {
  if (/didn'?t (work|help|do anything)|did not (work|help)|no (better|help|good)|made no difference|not work|no difference|useless|still had it/.test(t)) return "no";
  if (/partly|a bit better|somewhat|little better|helped a bit|half/.test(t)) return "partly";
  if (/too early|still taking|just started|only started/.test(t)) return "too_early";
  if (/worked|helped|cleared|better|sorted|fixed|gone|did the (trick|job)/.test(t)) return "yes";
  return null;
}

export function parseTreatments(t: string): TreatmentExtract[] {
  const found = antibioticsIn(t);
  const worked = workedIn(t);
  // Course length: look after the antibiotic's name first, and never read
  // "lasted 5 days" (the UTI's length) as a course.
  const scope = (found.length ? t.slice(found[0].index) : t).replace(/(lasted|went on for|had it for|took) [a-z0-9]+ (days?|weeks?)/g, "");
  const daysM = scope.match(new RegExp(`\\b${NUM}[ -]?days?\\b(?! ago)`)) ?? scope.match(new RegExp(`for ${NUM} days`));
  const days = daysM && num(daysM[1]) !== null && num(daysM[1])! <= 60 ? num(daysM[1]) : null;
  const source = matchAll(SOURCE_RULES, t)[0] ?? null;
  const course = /low[- ]dose|daily|prophyla|to prevent/.test(t) ? "preventive_daily" : /after sex/.test(t) && /antibiotic|dose/.test(t) ? "post_sex_single" : null;
  if (!found.length) {
    if (/antibiotic/.test(t)) return [{ antibiotic_id: "dont_know", other_name: null, days, course_type: course ?? "treatment", source, worked }];
    return [];
  }
  return found.map((f, i) => ({ antibiotic_id: f.id, other_name: null, days: i === 0 ? days : null, course_type: course ?? "treatment", source, worked: i === found.length - 1 ? worked : null }));
}

export function parseTests(t: string, today: string): TestExtract[] {
  const kinds = matchAll(TEST_KIND_RULES, t);
  if (!kinds.length) return [];
  const kind = kinds.includes("dipstick_gp_pharmacy") ? "dipstick_gp_pharmacy" : kinds[0];
  const result = /positive|showed (an )?infection|came back with|confirmed|found (an )?infection|bacteria/.test(t) ? "positive"
    : /negative|came back clear|nothing (showed|found)|no infection|all clear/.test(t) ? "negative"
    : /waiting|awaiting|not back yet|haven'?t heard/.test(t) ? "waiting" : null;
  void today;
  return [{ kind, result, tested_on: null }];
}

/** One UTI from one chunk of text. */
export function parseUti(text: string, today = isoToday()): UtiExtract {
  const t = text.toLowerCase();
  const uti = emptyUti();
  uti.started_on = parseDatePhrase(t, today);
  const ongoing = /still (going|have|got|there|ongoing)|ongoing|not (gone|cleared|better)|haven'?t (got )?rid|right now|at the moment|currently/.test(t);
  const lastedM = t.match(new RegExp(`(?:lasted|went on for|took|had it for|for about|for around|for roughly|over) ${NUM} (days?|weeks?)`));
  if (ongoing) uti.ongoing = true;
  else if (lastedM && num(lastedM[1]) !== null && uti.started_on) {
    const n = num(lastedM[1])! * (lastedM[2].startsWith("week") ? 7 : 1);
    const d = new Date(`${uti.started_on}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + Math.max(0, n - 1));
    uti.ended_on = iso(d) > today ? today : iso(d);
    uti.ongoing = false;
  } else {
    const endPart = t.match(/(?:ended|finished|cleared( up)?|gone|better|over|stopped)[^.]{0,60}/);
    const endDate = endPart ? parseDatePhrase(endPart[0].replace(/^[a-z ]+?(ago|by|on|after|around|until)?/, ""), today) : null;
    if (endDate && (!uti.started_on || endDate >= uti.started_on)) { uti.ended_on = endDate; uti.ongoing = false; }
  }
  uti.symptoms = matchAll(SYMPTOM_RULES, t);
  uti.triggers = matchAll(TRIGGER_RULES, t);
  uti.treatments = parseTreatments(t);
  uti.tests = parseTests(t, today);
  return uti;
}

/** Several UTIs when the text is clearly split into parts, else one. */
export function parseUtis(text: string, today = isoToday()): UtisExtract {
  const parts = text
    .split(/\n+|;|\b(?:and )?(?:then )?(?:another (?:one|uti)|the (?:second|third|next|other) (?:one|uti|time))\b/i)
    .map((p) => p.trim())
    .filter((p) => p.length > 3);
  const utis = parts.map((p) => parseUti(p, today)).filter((u) => u.started_on || u.symptoms.length || u.treatments.length);
  if (utis.length <= 1) return { utis: [parseUti(text, today)] };
  return { utis };
}

export function parseAbout(text: string): AboutExtract {
  const t = text.toLowerCase();
  const out: AboutExtract = { menopause_stage: null, contraception: null, pregnant_or_trying: null };
  if (/post[- ]?menopaus|after (the )?menopause|been through (the )?menopause|had (the|my) menopause|past (the )?menopause/.test(t)) out.menopause_stage = "after";
  else if (/peri[- ]?menopaus|around (the )?menopause|going through|starting (the )?menopause|hot flush|in the menopause|menopausal/.test(t)) out.menopause_stage = "around";
  else if (/not (yet|there|menopausal|at that stage)|pre[- ]?menopaus|too young|before (the )?menopause|no menopause|haven'?t (started|reached)/.test(t)) out.menopause_stage = "not_yet";
  else if (/rather not|prefer not/.test(t)) out.menopause_stage = "prefer_not";

  if (/no contraception|not on (any|anything|contraception)|don'?t use (any|contraception)|none\b|nothing for contraception/.test(t)) out.contraception = "none";
  else if (/copper/.test(t)) out.contraception = "coil_copper";
  else if (/mirena|hormonal coil|\bius\b|kyleena|jaydess/.test(t)) out.contraception = "coil_hormonal";
  else if (/implant|nexplanon/.test(t)) out.contraception = "implant";
  else if (/injection|depo/.test(t)) out.contraception = "injection";
  else if (/\bpatch\b|\bring\b|nuvaring/.test(t)) out.contraception = "patch_ring";
  else if (/condom/.test(t)) out.contraception = "condoms";
  else if (/\bpill\b|combined|progest|desogestrel|microgynon|cerazette|cerelle/.test(t)) out.contraception = "pill";

  if (/not pregnant|not trying|no(t)?,? (i'?m )?not pregnant|neither/.test(t)) out.pregnant_or_trying = "no";
  else if (/pregnant|trying (for|to conceive)|ttc|expecting/.test(t)) out.pregnant_or_trying = "yes";
  else if (/\bno\b/.test(t) && out.menopause_stage !== null) out.pregnant_or_trying = "no";
  return out;
}

const PREVENTION_RULES: [string, RegExp][] = [
  ["d_mannose", /mannose/],
  ["cranberry", /cranberr/],
  ["probiotics", /probiotic/],
  ["vitamin_c", /vitamin c|vit c/],
  ["uva_ursi", /uva/],
  ["hyaluronic", /hyaluron|chondroitin/],
  ["oregano_garlic", /oregano|garlic/],
  ["low_dose_antibiotic", /low[- ]dose|daily antibiotic|prophyla|antibiotic every (day|night)/],
  ["post_sex_antibiotic", /antibiotic (after|before) sex|after sex antibiotic/],
  ["standby_antibiotic", /stand-?by|rescue (pack|pot)|keep (some )?antibiotics|antibiotics (at home|in the cupboard)/],
  ["methenamine", /hiprex|methenamine/],
  ["bladder_instillation", /instillation|ialuril/],
  ["vaginal_oestrogen", /oestrogen|estrogen|vagifem|estriol|ovestin|imvaggis|\bgina\b|vagirux|blissel/],
  ["hrt", /\bhrt\b|hormone replacement/],
  ["contraception_change", /changed (my )?contraception|switched (pill|coil|contraception)|came off the pill/],
  ["uromune", /uromune|mv140/],
  ["urovaxom", /uro-?vaxom|om-?89/],
  ["other_vaccine", /vaccine|immunotherapy/],
  ["p_happi", /p[- ]?happi/],
  ["vaginal_moisturiser", /moisturi[sz]er|replens|hyalofemme|yes vm|sylk/],
  ["lubricant", /lubricant|\blube\b/],
  ["barrier_cream", /barrier cream|sudocrem|bepanthen/],
  ["intimate_wash", /intimate wash|femfresh|ph[- ]balanced|ph wash/],
  ["water", /\bwater\b|hydrat|drink(ing)? (more|lots|plenty)|fluids/],
  ["pee_after_sex", /(pee|wee|urinat|go to the (loo|toilet)|empty(ing)? (my )?bladder) (straight )?after sex/],
  ["front_to_back", /front to back|wipe/],
  ["no_holding", /not hold|don'?t hold|never hold/],
  ["double_void", /double void|empty(ing)? (it )?(fully|properly|completely)/],
  ["showers", /shower/],
  ["cotton_underwear", /cotton/],
  ["no_perfumed", /perfum|unscented|fragrance|scented/],
  ["constipation", /constipat/],
  ["pelvic_physio", /pelvic floor|physio/],
  ["bladder_training", /bladder training|bladder retraining/],
];

const STOP_WORDS = /stopp?ed|no longer|not (taking|using|doing) .* any ?more|gave up|quit|came off|ran out|finished with|don'?t (take|use|do) .* any ?more|used to/;

/** Things being taken now and things that have stopped, read clause by clause. */
export function parsePrevention(text: string): PreventionExtract {
  const t = text.toLowerCase();
  const empty: PreventionExtract = { keys: [], stopped_keys: [], other_name: null, antibiotic_id: null };
  if (/^\s*(no|nothing|none|nope|not really|no,? nothing|nothing'?s changed|no change)\b/.test(t)) return empty;
  const taking: string[] = [];
  const stopped: string[] = [];
  for (const clause of t.split(/[,.;]|\bbut\b|\band\b(?= (?:i'?ve |i |also |have )?(?:stopp?ed|started|no longer|gave up|quit|came off|take|taking|use|using))/)) {
    const found = matchAll(PREVENTION_RULES, clause);
    (STOP_WORDS.test(clause) ? stopped : taking).push(...found);
  }
  const tidy = (list: string[]) => {
    let keys = [...new Set(list)];
    if (keys.includes("uromune") || keys.includes("urovaxom")) keys = keys.filter((k) => k !== "other_vaccine");
    return keys;
  };
  const ab = antibioticsIn(t)[0]?.id ?? null;
  const keys = tidy(taking).filter((k) => !stopped.includes(k));
  if (ab && !keys.some((k) => k.endsWith("_antibiotic")) && !STOP_WORDS.test(t)) keys.push("low_dose_antibiotic");
  return { keys, stopped_keys: tidy(stopped), other_name: null, antibiotic_id: ab };
}
