"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { CONTRACEPTION, MENOPAUSE_STAGES, PREGNANT } from "@/lib/tracker/options";
import type { TrackerProfile } from "@/lib/tracker/data";
import { Chip } from "../components/Chips";
import { AntibioticPicker } from "../components/AntibioticPicker";
import { saveAboutMe } from "../actions";

function ChipRadio({ name, options, value, onChange }: { name: string; options: { key: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={name}>
      <input type="hidden" name={name} value={value} />
      {options.map((o) => (
        <Chip key={o.key} selected={value === o.key} onClick={() => onChange(o.key)}>{o.label}</Chip>
      ))}
    </div>
  );
}

export function AboutMeForm({ profile, next }: { profile: TrackerProfile | null; next: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [meno, setMeno] = useState(profile?.menopause_stage ?? "prefer_not");
  const [contra, setContra] = useState(profile?.contraception ?? "prefer_not");
  const [pregnant, setPregnant] = useState(profile?.pregnant_or_trying ?? "no");
  const [takesPreventive, setTakesPreventive] = useState(!!profile?.preventive_treatment_id);
  const [preventive, setPreventive] = useState<string | null>(profile?.preventive_treatment_id ?? null);
  const [preventiveOther, setPreventiveOther] = useState(profile?.preventive_treatment_other ?? "");

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
        <div className="flex gap-2 mb-3">
          <Chip selected={!takesPreventive} onClick={() => { setTakesPreventive(false); setPreventive(null); }}>No</Chip>
          <Chip selected={takesPreventive} onClick={() => setTakesPreventive(true)}>Yes</Chip>
        </div>
        <input type="hidden" name="preventive_treatment_id" value={takesPreventive ? preventive ?? "" : ""} />
        <input type="hidden" name="preventive_treatment_other" value={preventiveOther} />
        {takesPreventive && (
          <AntibioticPicker value={preventive} otherName={preventiveOther} compact onChange={(id, other) => { setPreventive(id); if (other !== undefined) setPreventiveOther(other); }} />
        )}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : copy.aboutMe.button}</Button>
    </form>
  );
}
