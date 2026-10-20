"use client";

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
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-slate-500 mb-2">{hint}</p>}
      {children}
    </div>
  );
}

function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="border-t border-slate-100 pt-6">
      <h2 className="font-display text-2xl font-light text-midnight">{children}</h2>
      {hint && <p className="text-sm text-slate-600 mt-1">{hint}</p>}
    </div>
  );
}

export function AboutMeForm({ profile, active, next }: { profile: TrackerProfile | null; active: PreventionRow[]; next: string }) {
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

  // Passport fields.
  const [firstUti, setFirstUti] = useState(profile?.first_uti_onset ?? "");
  const [history, setHistory] = useState<Set<string>>(new Set(profile?.medical_history ?? []));
  const [allergies, setAllergies] = useState<Allergy[]>(profile?.allergies ?? []);
  const [addingAllergy, setAddingAllergy] = useState(false);
  const [allergyId, setAllergyId] = useState<string | null>(null);
  const [allergyOther, setAllergyOther] = useState("");
  const [allergyReaction, setAllergyReaction] = useState("");

  function addAllergy() {
    if (!allergyId) return;
    setAllergies((list) => [...list, { antibiotic_id: allergyId, other_name: allergyId === "other" ? allergyOther.trim() || null : null, reaction: allergyReaction.trim() || null }]);
    setAllergyId(null);
    setAllergyOther("");
    setAllergyReaction("");
    setAddingAllergy(false);
  }

  return (
    <form
      action={(fd) => {
        setError(null);
        startTransition(async () => {
          const r = await saveAboutMe(fd);
          if (r?.error) setError(r.error);
        });
      }}
      className="space-y-6"
    >
      <input type="hidden" name="next" value={next} />
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">Menopause</p>
        <ChipRadio name="menopause_stage" options={MENOPAUSE_STAGES} value={meno} onChange={setMeno} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">Contraception</p>
        <ChipRadio name="contraception" options={CONTRACEPTION} value={contra} onChange={setContra} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-1">Currently pregnant or trying?</p>
        <p className="text-xs text-slate-500 mb-2">{copy.aboutMe.pregnantHint}</p>
        <ChipRadio name="pregnant_or_trying" options={PREGNANT} value={pregnant} onChange={setPregnant} />
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-700 mb-1">{copy.aboutMe.preventiveTitle}</p>
        <p className="text-xs text-slate-500 mb-2">{copy.aboutMe.preventiveHint}</p>
        <input type="hidden" name="prevention_keys" value={[...preventions].join(",")} />
        <input type="hidden" name="prevention_other" value={preventionOther} />
        <input type="hidden" name="prevention_antibiotic_id" value={antibioticId ?? ""} />
        <input type="hidden" name="prevention_antibiotic_other" value={antibioticOther} />
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

      <SectionTitle hint={copy.aboutMe.passportIntro}>{copy.aboutMe.passportTitle}</SectionTitle>

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-2">{copy.aboutMe.firstUti}</p>
        <ChipRadio name="first_uti_onset" options={FIRST_UTI_ONSET} value={firstUti} onChange={setFirstUti} />
        {firstUti && firstUti !== "unsure" && (
          <div className="mt-3 max-w-xs">
            <Field id="first_uti_year" label={copy.aboutMe.firstUtiYear}>
              <input id="first_uti_year" name="first_uti_year" type="number" inputMode="numeric" min={1900} max={2100} defaultValue={profile?.first_uti_year ?? ""} className={inputClass} placeholder="For example 2015" />
            </Field>
          </div>
        )}
      </div>
      <div className="max-w-xs">
        <Field id="lifetime_utis" label={copy.aboutMe.lifetime} hint={copy.aboutMe.lifetimeHint}>
          <input id="lifetime_utis" name="lifetime_utis" type="number" inputMode="numeric" min={0} max={10000} defaultValue={profile?.lifetime_utis ?? ""} className={inputClass} />
        </Field>
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-1">{copy.aboutMe.history}</p>
        <p className="text-xs text-slate-500 mb-2">{copy.aboutMe.historyHint}</p>
        <input type="hidden" name="medical_history" value={[...history].join(",")} />
        <div className="flex flex-wrap gap-2" data-testid="medical-history">
          {MEDICAL_HISTORY.map((o) => (
            <Chip key={o.key} selected={history.has(o.key)} onClick={() => setHistory((prev) => { const n = new Set(prev); if (n.has(o.key)) n.delete(o.key); else n.add(o.key); return n; })}>{o.label}</Chip>
          ))}
        </div>
        {history.has("other") && (
          <input name="medical_history_other" defaultValue={profile?.medical_history_other ?? ""} placeholder={copy.aboutMe.historyOther} aria-label={copy.aboutMe.historyOther} className={`${inputClass} mt-3 max-w-md`} maxLength={300} />
        )}
      </div>

      <div>
        <p className="text-sm font-semibold text-slate-700 mb-1">{copy.aboutMe.allergies}</p>
        <p className="text-xs text-slate-500 mb-2">{copy.aboutMe.allergiesHint}</p>
        <input type="hidden" name="allergies" value={JSON.stringify(allergies)} />
        {allergies.length > 0 && (
          <ul className="mb-3 space-y-2" data-testid="allergy-list">
            {allergies.map((a, i) => (
              <li key={`${a.antibiotic_id}-${i}`} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 px-4 py-2.5 text-sm">
                <span>
                  <span className="font-semibold text-midnight">{antibioticName(a.antibiotic_id, a.other_name)}</span>
                  {a.reaction && <span className="text-slate-600"> · {a.reaction}</span>}
                </span>
                <button type="button" className="text-sm font-semibold text-maroon" onClick={() => setAllergies((list) => list.filter((_, j) => j !== i))}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        {addingAllergy ? (
          <div className="space-y-3 rounded-2xl bg-pink-25 p-4" data-testid="allergy-form">
            <AntibioticPicker value={allergyId} otherName={allergyOther} exclude={["dont_know"]} onChange={(id, other) => { setAllergyId(id); if (other !== undefined) setAllergyOther(other); }} autoFocus />
            {allergyId && (
              <>
                <input value={allergyReaction} onChange={(e) => setAllergyReaction(e.target.value)} placeholder={copy.aboutMe.allergyReaction} aria-label={copy.aboutMe.allergyReaction} className={`${inputClass} max-w-md`} maxLength={300} />
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="secondary" onClick={addAllergy}>Add</Button>
                  <button type="button" className="text-sm font-semibold text-slate-500" onClick={() => setAddingAllergy(false)}>Cancel</button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button type="button" className="text-sm font-semibold text-maroon" onClick={() => setAddingAllergy(true)}>+ {copy.aboutMe.addAllergy}</button>
        )}
      </div>

      <SectionTitle>{copy.aboutMe.contact}</SectionTitle>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="phone" label="Phone number">
          <input id="phone" name="phone" type="tel" autoComplete="tel" defaultValue={profile?.phone ?? ""} className={inputClass} />
        </Field>
        <Field id="local_hospital" label={copy.aboutMe.hospital} hint={copy.aboutMe.hospitalHint}>
          <input id="local_hospital" name="local_hospital" defaultValue={profile?.local_hospital ?? ""} className={inputClass} placeholder="Royal Berkshire Hospital" />
        </Field>
        <Field id="address_line1" label="Address">
          <input id="address_line1" name="address_line1" autoComplete="address-line1" defaultValue={profile?.address_line1 ?? ""} className={inputClass} placeholder="House and street" />
        </Field>
        <Field id="address_line2" label="Address line 2">
          <input id="address_line2" name="address_line2" autoComplete="address-line2" defaultValue={profile?.address_line2 ?? ""} className={inputClass} />
        </Field>
        <Field id="city" label="Town or city">
          <input id="city" name="city" autoComplete="address-level2" defaultValue={profile?.city ?? ""} className={inputClass} />
        </Field>
        <Field id="postcode" label="Postcode">
          <input id="postcode" name="postcode" autoComplete="postal-code" defaultValue={profile?.postcode ?? ""} className={`${inputClass} uppercase`} maxLength={12} />
        </Field>
        <Field id="nhs_number" label={copy.aboutMe.nhsNumber} hint={copy.aboutMe.nhsHint}>
          <input id="nhs_number" name="nhs_number" inputMode="numeric" defaultValue={formatNhsNumber(profile?.nhs_number) ?? profile?.nhs_number ?? ""} className={inputClass} placeholder="123 456 7890" />
        </Field>
      </div>

      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : copy.aboutMe.button}</Button>
    </form>
  );
}
