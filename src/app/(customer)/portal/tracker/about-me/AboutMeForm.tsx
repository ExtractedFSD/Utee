"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { CONTRACEPTION, MENOPAUSE_STAGES, PREGNANT } from "@/lib/tracker/options";
import type { PreventionRow, TrackerProfile } from "@/lib/tracker/data";
import { ANTIBIOTIC_PREVENTIONS } from "@/lib/tracker/prevention";
import { Chip } from "../components/Chips";
import { PreventionPicker } from "../components/PreventionPicker";
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
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving..." : copy.aboutMe.button}</Button>
    </form>
  );
}
