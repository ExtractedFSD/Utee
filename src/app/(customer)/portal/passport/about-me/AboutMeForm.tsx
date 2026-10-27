"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Button, inputClass } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { CONTRACEPTION, MENOPAUSE_STAGES, PREGNANT } from "@/lib/tracker/options";
import type { PreventionRow, TrackerProfile } from "@/lib/tracker/data";
import { ANTIBIOTIC_PREVENTIONS } from "@/lib/tracker/prevention";
import { FIRST_UTI_ONSET, MEDICAL_HISTORY, formatNhsNumber, type Allergy } from "@/lib/tracker/passport";
import { antibioticName } from "@/lib/tracker/search";
import { Chip } from "../components/Chips";
import { PreventionPicker } from "../components/PreventionPicker";
import { AntibioticPicker } from "../components/AntibioticPicker";
import { saveAboutMe } from "../actions";

/*
 * About you in three steps, each saved on its own: About you (menopause,
 * contraception, pregnancy, what you take), Your UTI history (first UTI,
 * how many, medical history, allergies), Contact and hospital. Every step
 * posts the whole profile, so saving one never blanks another.
 */
export type Step = 1 | 2 | 3;

function ChipRadio({ name, options, value, onChange }: { name: string; options: { key: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      <input type="hidden" name={name} value={value} />
      {options.map((o) => (
        <Chip key={o.key} selected={value === o.key} onClick={() => onChange(value === o.key && name === "first_uti_onset" ? "" : o.key)}>{o.label}</Chip>
      ))}
    </div>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-midnight mb-1">{label}</label>
      {hint && <p className="text-[13px] text-[#5a4a6e] mb-2">{hint}</p>}
      {children}
    </div>
  );
}

const card = "rounded-card bg-white p-5 shadow-card space-y-5";

export function AboutMeForm({ profile, active, step, base, backHref, done }: {
  profile: TrackerProfile | null;
  active: PreventionRow[];
  step: Step;
  /** The address the steps hang off; step N is `${base}&step=N` (or `?step=N`). */
  base: string;
  /** Where Back goes from step 1. */
  backHref: string;
  /** Where the last step lands. */
  done: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [meno, setMeno] = useState(profile?.menopause_stage ?? "prefer_not");
  const [contra, setContra] = useState(profile?.contraception ?? "prefer_not");
  const [pregnant, setPregnant] = useState(profile?.pregnant_or_trying ?? "no");
  const [preventions, setPreventions] = useState<Set<string>>(new Set(active.map((a) => a.option_key)));
  const [preventionOther, setPreventionOther] = useState(active.find((a) => a.option_key === "other")?.other_name ?? "");
  const activeAntibiotic = active.find((a) => ANTIBIOTIC_PREVENTIONS.includes(a.option_key) && a.antibiotic_id);
  const [antibioticId, setAntibioticId] = useState<string | null>(activeAntibiotic?.antibiotic_id ?? null);
  const [antibioticOther, setAntibioticOther] = useState(activeAntibiotic?.other_name ?? "");
  const [firstUti, setFirstUti] = useState(profile?.first_uti_onset ?? "");
  const [firstUtiYear, setFirstUtiYear] = useState(profile?.first_uti_year ? String(profile.first_uti_year) : "");
  const [lifetime, setLifetime] = useState(profile?.lifetime_utis !== null && profile?.lifetime_utis !== undefined ? String(profile.lifetime_utis) : "");
  const [history, setHistory] = useState<Set<string>>(new Set(profile?.medical_history ?? []));
  const [historyOther, setHistoryOther] = useState(profile?.medical_history_other ?? "");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [allergies, setAllergies] = useState<Allergy[]>(profile?.allergies ?? []);
  const [addingAllergy, setAddingAllergy] = useState(false);
  const [allergyId, setAllergyId] = useState<string | null>(null);
  const [allergyOther, setAllergyOther] = useState("");
  const [allergyReaction, setAllergyReaction] = useState("");
  const [contact, setContact] = useState({
    phone: profile?.phone ?? "",
    local_hospital: profile?.local_hospital ?? "",
    address_line1: profile?.address_line1 ?? "",
    address_line2: profile?.address_line2 ?? "",
    city: profile?.city ?? "",
    postcode: profile?.postcode ?? "",
    nhs_number: formatNhsNumber(profile?.nhs_number) ?? profile?.nhs_number ?? "",
  });
  const [addressOpen, setAddressOpen] = useState(!!(profile?.address_line1 || profile?.postcode));

  function addAllergy() {
    if (!allergyId) return;
    setAllergies((list) => [...list, { antibiotic_id: allergyId, other_name: allergyId === "other" ? allergyOther.trim() || null : null, reaction: allergyReaction.trim() || null }]);
    setAllergyId(null);
    setAllergyOther("");
    setAllergyReaction("");
    setAddingAllergy(false);
  }

  const stepHref = (n: Step) => `${base}${base.includes("?") ? "&" : "?"}step=${n}`;
  const next = step < 3 ? stepHref((step + 1) as Step) : done;
  const visibleHistory = showAllHistory ? MEDICAL_HISTORY : MEDICAL_HISTORY.filter((o, i) => i < 4 || history.has(o.key));
  const hiddenHistory = MEDICAL_HISTORY.length - visibleHistory.length;

  return (
    <form
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const r = await saveAboutMe(fd);
          if (r?.error) setError(r.error);
        });
      }}
      className="space-y-5 pb-28"
    >
      {/* Everything, every time: the step only decides what is shown. */}
      <input type="hidden" name="next" value={next} />
      <input type="hidden" name="menopause_stage" value={meno} />
      <input type="hidden" name="contraception" value={contra} />
      <input type="hidden" name="pregnant_or_trying" value={pregnant} />
      <input type="hidden" name="prevention_keys" value={[...preventions].join(",")} />
      <input type="hidden" name="prevention_other" value={preventionOther} />
      <input type="hidden" name="prevention_antibiotic_id" value={antibioticId ?? ""} />
      <input type="hidden" name="prevention_antibiotic_other" value={antibioticOther} />
      <input type="hidden" name="first_uti_onset" value={firstUti} />
      <input type="hidden" name="first_uti_year" value={firstUti && firstUti !== "unsure" ? firstUtiYear : ""} />
      <input type="hidden" name="lifetime_utis" value={lifetime} />
      <input type="hidden" name="medical_history" value={[...history].join(",")} />
      <input type="hidden" name="medical_history_other" value={historyOther} />
      <input type="hidden" name="allergies" value={JSON.stringify(allergies)} />
      {Object.entries(contact).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}

      <div className="grid grid-cols-3 gap-2" aria-label={copy.record.steps.eyebrow(step)}>
        {[1, 2, 3].map((n) => <span key={n} className={`h-1 rounded-full ${n <= step ? "bg-maroon" : "bg-pink-50"}`} />)}
      </div>

      {step === 1 && (
        <>
          <div className={card}>
            <div>
              <p className="text-sm font-semibold text-midnight mb-2">Menopause</p>
              <div role="radiogroup" aria-label="menopause_stage" className="flex flex-wrap gap-2">
                {MENOPAUSE_STAGES.map((o) => <Chip key={o.key} selected={meno === o.key} onClick={() => setMeno(o.key)}>{o.label}</Chip>)}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-midnight mb-2">Contraception</p>
              <div role="radiogroup" aria-label="contraception" className="flex flex-wrap gap-2">
                {CONTRACEPTION.map((o) => <Chip key={o.key} selected={contra === o.key} onClick={() => setContra(o.key)}>{o.label}</Chip>)}
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-midnight mb-1">Currently pregnant or trying?</p>
              <p className="text-[13px] text-[#5a4a6e] mb-2">{copy.aboutMe.pregnantHint}</p>
              <div role="radiogroup" aria-label="pregnant_or_trying" className="flex flex-wrap gap-2">
                {PREGNANT.map((o) => <Chip key={o.key} selected={pregnant === o.key} onClick={() => setPregnant(o.key)}>{o.label}</Chip>)}
              </div>
            </div>
          </div>
          <div className={card}>
            <div>
              <p className="text-sm font-semibold text-midnight mb-1">{copy.aboutMe.preventiveTitle}</p>
              <p className="text-[13px] text-[#5a4a6e] mb-2">{copy.aboutMe.preventiveHint}</p>
              <div data-testid="prevention-picker">
                <PreventionPicker
                  selected={preventions}
                  onToggle={(key, on) => setPreventions((prev) => { const n = new Set(prev); if (on) n.add(key); else n.delete(key); return n; })}
                  otherName={preventionOther}
                  onOtherName={setPreventionOther}
                  antibioticId={antibioticId}
                  antibioticOther={antibioticOther}
                  onAntibiotic={(id, other) => { setAntibioticId(id); if (other !== undefined) setAntibioticOther(other); }}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className={card}>
            <div>
              <p className="text-sm font-semibold text-midnight mb-2">{copy.aboutMe.firstUti}</p>
              <ChipRadio name="first_uti_onset_ui" options={FIRST_UTI_ONSET} value={firstUti} onChange={setFirstUti} />
              {firstUti && firstUti !== "unsure" && (
                <div className="mt-3 max-w-xs">
                  <Field id="first_uti_year" label={copy.aboutMe.firstUtiYear}>
                    <input id="first_uti_year" type="number" inputMode="numeric" min={1900} max={2100} value={firstUtiYear} onChange={(e) => setFirstUtiYear(e.target.value)} className={inputClass} placeholder="For example 2015" />
                  </Field>
                </div>
              )}
            </div>
            <div className="max-w-xs">
              <Field id="lifetime_utis" label={copy.aboutMe.lifetime} hint={copy.aboutMe.lifetimeHint}>
                <input id="lifetime_utis" type="number" inputMode="numeric" min={0} max={10000} value={lifetime} onChange={(e) => setLifetime(e.target.value)} className={inputClass} />
              </Field>
            </div>
          </div>
          <div className={card}>
            <div>
              <p className="text-sm font-semibold text-midnight">{copy.aboutMe.history}</p>
              <p className="text-[13px] text-[#5a4a6e] mb-1">{copy.aboutMe.historyHint}</p>
              <ul className="divide-y divide-[rgba(29,0,58,.08)]" data-testid="medical-history">
                {visibleHistory.map((o) => {
                  const on = history.has(o.key);
                  return (
                    <li key={o.key}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => setHistory((prev) => { const n = new Set(prev); if (n.has(o.key)) n.delete(o.key); else n.add(o.key); return n; })}
                        className="flex w-full min-h-[44px] items-center gap-3 py-2 text-left text-sm text-midnight"
                      >
                        <span className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border ${on ? "border-maroon bg-maroon text-white" : "border-[rgba(29,0,58,.18)] bg-white"}`} aria-hidden>
                          {on && <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>}
                        </span>
                        {o.label}
                      </button>
                    </li>
                  );
                })}
              </ul>
              {hiddenHistory > 0 && <button type="button" onClick={() => setShowAllHistory(true)} className="min-h-[44px] text-sm font-semibold text-maroon">{copy.record.steps.showMore(hiddenHistory)}</button>}
              {showAllHistory && hiddenHistory === 0 && MEDICAL_HISTORY.length > 4 && <button type="button" onClick={() => setShowAllHistory(false)} className="min-h-[44px] text-sm font-semibold text-maroon">{copy.record.steps.showLess}</button>}
              {history.has("other") && (
                <input value={historyOther} onChange={(e) => setHistoryOther(e.target.value)} placeholder={copy.aboutMe.historyOther} aria-label={copy.aboutMe.historyOther} className={`${inputClass} mt-3 max-w-md`} maxLength={300} />
              )}
            </div>
          </div>
          <div className={card}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-midnight">{copy.record.steps.allergiesRow}</p>
                {allergies.length > 0 ? (
                  <ul className="mt-1 space-y-1" data-testid="allergy-list">
                    {allergies.map((a, i) => (
                      <li key={`${a.antibiotic_id}-${i}`} className="flex flex-wrap items-center gap-2 text-sm text-[#5a4a6e]">
                        <span>{antibioticName(a.antibiotic_id, a.other_name)}{a.reaction ? ` · ${a.reaction}` : ""}</span>
                        <button type="button" className="text-[13px] font-semibold text-maroon" onClick={() => setAllergies((list) => list.filter((_, j) => j !== i))}>Remove</button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-[#8a7a9c]">{copy.record.steps.none}</p>
                )}
              </div>
              {!addingAllergy && <button type="button" className="shrink-0 min-h-[44px] text-sm font-semibold text-maroon" onClick={() => setAddingAllergy(true)}>+ Add</button>}
            </div>
            {addingAllergy && (
              <div className="space-y-3 rounded-2xl bg-pink-25 p-4" data-testid="allergy-form">
                <AntibioticPicker value={allergyId} otherName={allergyOther} exclude={["dont_know"]} onChange={(id, other) => { setAllergyId(id); if (other !== undefined) setAllergyOther(other); }} autoFocus />
                {allergyId && (
                  <>
                    <input value={allergyReaction} onChange={(e) => setAllergyReaction(e.target.value)} placeholder={copy.aboutMe.allergyReaction} aria-label={copy.aboutMe.allergyReaction} className={`${inputClass} max-w-md`} maxLength={300} />
                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="secondary" onClick={addAllergy}>Add</Button>
                      <button type="button" className="text-sm font-semibold text-[#8a7a9c]" onClick={() => setAddingAllergy(false)}>Cancel</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {step === 3 && (
        <div className={card}>
          <Field id="phone" label="Phone number">
            <input id="phone" type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact({ ...contact, phone: e.target.value })} className={inputClass} />
          </Field>
          <Field id="local_hospital" label={copy.aboutMe.hospital} hint={copy.aboutMe.hospitalHint}>
            <input id="local_hospital" value={contact.local_hospital} onChange={(e) => setContact({ ...contact, local_hospital: e.target.value })} className={inputClass} placeholder="Royal Berkshire Hospital" />
          </Field>
          {addressOpen ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="address_line1" label="Address">
                <input id="address_line1" autoComplete="address-line1" value={contact.address_line1} onChange={(e) => setContact({ ...contact, address_line1: e.target.value })} className={inputClass} placeholder="House and street" />
              </Field>
              <Field id="address_line2" label="Address line 2">
                <input id="address_line2" autoComplete="address-line2" value={contact.address_line2} onChange={(e) => setContact({ ...contact, address_line2: e.target.value })} className={inputClass} />
              </Field>
              <Field id="city" label="Town or city">
                <input id="city" autoComplete="address-level2" value={contact.city} onChange={(e) => setContact({ ...contact, city: e.target.value })} className={inputClass} />
              </Field>
              <Field id="postcode" label="Postcode">
                <input id="postcode" autoComplete="postal-code" value={contact.postcode} onChange={(e) => setContact({ ...contact, postcode: e.target.value })} className={`${inputClass} uppercase`} maxLength={12} />
              </Field>
            </div>
          ) : (
            <button type="button" onClick={() => setAddressOpen(true)} className="min-h-[44px] text-sm font-semibold text-maroon">+ {copy.record.steps.addressAdd}</button>
          )}
          <Field id="nhs_number" label={copy.aboutMe.nhsNumber} hint={copy.aboutMe.nhsHint}>
            <input id="nhs_number" inputMode="numeric" value={contact.nhs_number} onChange={(e) => setContact({ ...contact, nhs_number: e.target.value })} className={inputClass} placeholder="123 456 7890" />
          </Field>
        </div>
      )}

      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="fixed inset-x-0 bottom-0 z-30 bg-white/95 px-4 py-3 backdrop-blur" style={{ borderTop: "1px solid rgba(29,0,58,.08)", paddingBottom: "calc(12px + env(safe-area-inset-bottom, 0px))" }}>
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <Link href={step === 1 ? backHref : stepHref((step - 1) as Step)} className="min-h-[44px] inline-flex items-center px-3 text-sm font-semibold text-maroon">{copy.record.steps.back}</Link>
          <Button type="submit" disabled={pending} className="flex-1">{pending ? "Saving..." : step < 3 ? copy.record.steps.saveContinue : copy.record.steps.save}</Button>
        </div>
      </div>
    </form>
  );
}
