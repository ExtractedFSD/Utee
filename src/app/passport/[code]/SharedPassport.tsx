import { Card, Logo } from "@/components/ui";
import { MonthStrip } from "@/app/(customer)/portal/passport/components/MonthStrip";
import { SourcePill } from "@/app/(customer)/portal/passport/components/SourcePill";
import { detailsGiven, inBrief } from "@/lib/tracker/brief";
import { copy } from "@/lib/tracker/copy";
import { diaryEntries, feelingLabel, scoreSummary, symptomScores } from "@/lib/tracker/diary";
import { TEST_KINDS, TEST_RESULTS, labelFor } from "@/lib/tracker/options";
import { passportText } from "@/lib/tracker/passport-pdf";
import { firstUtiText, formatNhsNumber, investigationLine, prophylaxisLine } from "@/lib/tracker/passport";
import { cultureLine, methodLabel, organismShort, sensitivityText } from "@/lib/tracker/cultures";
import { antibioticDisplayName } from "@/lib/tracker/search";
import { formatShareCode, formatUntil } from "@/lib/tracker/share";
import type { SharedPassport as Shared } from "@/lib/tracker/share-load";
import { episodeLength, formatDay } from "@/lib/tracker/stats";
import { verificationFor } from "@/lib/tracker/verify";
import { VerifyButton } from "./VerifyButton";

/*
 * The passport as a clinician reads it on a phone in clinic: one line that
 * says the most, then only the sections with something in them. Every row
 * carries where it came from (the patient, the Utee lab, a clinician's
 * check) and nothing here is interpreted.
 */
export function SharedPassport({ shared, code, canVerify }: { shared: Shared; code: string; canVerify: boolean }) {
  const { patient, profile, data, share } = shared;
  const generatedOn = new Date().toISOString().slice(0, 10);
  const t = passportText({ patient, profile, data, generatedOn });
  const name = patient.name ?? "Utee patient";
  const display = formatShareCode(share.code);
  const brief = inBrief(profile, data, generatedOn);
  const details = detailsGiven(profile, patient, formatNhsNumber(profile.nhs_number));
  const episodes = [...data.episodes].sort((a, b) => (a.started_on < b.started_on ? 1 : -1));
  const verified = (entity: "investigation" | "culture", id: string) => verificationFor(data.verifications, entity, id);
  const shortDay = (iso: string) => formatDay(iso).replace(/ \d{4}$/, "");
  const sh = copy.shared;

  return (
    <div className="min-h-screen bg-pink-25">
      <header className="bg-gradient-brand text-white">
        <div className="mx-auto max-w-4xl px-4 pt-5 pb-6">
          <div className="flex items-start justify-between gap-3">
            <Logo className="h-9 w-auto" />
            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[12px] font-semibold text-white">{sh.readOnlyPill}</span>
          </div>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[.16em] text-white/85">{sh.eyebrow.replace(", ", " · ")}</p>
          <h1 className="mt-3 font-display text-[22px] font-light leading-tight sm:text-3xl">{name}</h1>
          <p className="mt-1 text-sm text-white/90">Code {display} · valid until {formatUntil(share.expires_at)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={`/passport/${display}/pdf`} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-6 text-[12px] font-semibold uppercase tracking-[.14em] text-midnight shadow-card hover:bg-pink-25">{sh.downloadPdf}</a>
            <a href={`/passport/${display}/fhir`} className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/60 px-5 text-[12px] font-semibold uppercase tracking-[.14em] text-white hover:bg-white/10">{sh.fhir}</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-5 space-y-4" data-testid="shared-passport">
        <section className="rounded-[20px] bg-midnight px-5 py-5 text-white" data-testid="shared-brief">
          <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/70">{sh.inBrief}</p>
          <p className="mt-2 text-[17px] leading-relaxed">
            {brief.parts.map((part, i) => (
              <span key={part}>
                {i > 0 && " · "}
                {i === 0 || part.startsWith("allerg") ? <strong className="font-semibold">{part}</strong> : part}
              </span>
            ))}
          </p>
          {brief.missing.length > 0 && <p className="mt-2 text-sm text-white/75">{sh.nothingFor(brief.missing.join(", "))}</p>}
        </section>

        <Card>
          {details.given.length > 0 && (
            <dl className="space-y-2 text-sm">
              {details.given.map((d) => (
                <div key={d.k} className="flex items-baseline justify-between gap-4">
                  <dt className="shrink-0 text-[#5a4a6e]">{d.k}</dt>
                  <dd className="min-w-0 break-words text-right font-semibold text-midnight">{d.v}</dd>
                </div>
              ))}
            </dl>
          )}
          {details.notGiven.length > 0 && <p className={`text-sm text-[#8a7a9c] ${details.given.length ? "mt-3" : ""}`}>{sh.notGiven(details.notGiven.join(", "))}</p>}
          {!canVerify && <p className="mt-3 text-xs text-[#8a7a9c]">{sh.verifySignedOut}</p>}
        </Card>

        <Section title={sh.burden}>
          <dl className="grid grid-cols-3 gap-3">
            <Stat label={sh.burden6} value={String(t.sum.episodes6m)} />
            <Stat label={sh.burden12} value={String(t.sum.episodes12m)} />
            <Stat label={sh.burdenLifetime} value={profile.lifetime_utis === null ? "Not given" : String(profile.lifetime_utis)} small={profile.lifetime_utis === null} />
          </dl>
          <div className="mt-4"><MonthStrip months={t.sum.months} /></div>
          <p className="mt-3 text-xs text-[#8a7a9c]">
            {[firstUtiText(profile) && `First UTI: ${firstUtiText(profile)}`, `${data.episodes.length} UTI${data.episodes.length === 1 ? "" : "s"} logged`, t.sum.averageLengthDays !== null && `average ${t.sum.averageLengthDays} days`].filter(Boolean).join(" · ")}
          </p>
        </Section>

        {t.history.length > 0 && (
          <Section title={sh.history}>
            <ul className="divide-y divide-pink-50" data-testid="shared-history">
              {t.history.map((h) => {
                const said = [h.worked && `${sh.said("worked")}${h.worked > 1 ? ` ${h.worked}×` : ""}`, h.partly && `${sh.said("partly worked")}${h.partly > 1 ? ` ${h.partly}×` : ""}`, h.failed && `${sh.said("did not work")}${h.failed > 1 ? ` ${h.failed}×` : ""}`].filter(Boolean).join(", ");
                const bits = [
                  h.courses ? sh.courses(h.courses) : null,
                  h.courses ? said || sh.notRated : null,
                  h.lastUsed ? sh.lastUsed(formatDay(h.lastUsed)) : null,
                  h.lab?.lastResult ? sh.lab(h.lab.lastResult, h.lab.lastOn ? shortDay(h.lab.lastOn) : "date unknown") : null,
                  ...h.reactions,
                ].filter(Boolean);
                return (
                  <li key={h.antibiotic_id + h.name} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-midnight">{h.name}{h.allergy ? <span className="ml-2 rounded-full bg-sun px-2 py-0.5 text-[11px] font-semibold text-amber-900">{sh.allergyListed}</span> : null}</p>
                      <SourcePill source={h.courses ? "patient" : "utee"} />
                    </div>
                    <p className="mt-0.5 text-sm text-[#5a4a6e]">{bits.join(" · ")}</p>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {data.cultures.length > 0 && (
          <Section title={sh.cultures}>
            <ul className="divide-y divide-pink-50" data-testid="shared-cultures">
              {t.recentCultures.map((c) => {
                const v = c.source === "utee" ? null : verified("culture", c.id);
                const sens = c.organisms.map((o) => { const s = sensitivityText(c, o.key); return s ? `${c.organisms.length > 1 ? `${organismShort(o)}: ` : ""}${s}` : null; }).filter(Boolean).join(" · ");
                return (
                  <li key={c.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-midnight">
                          <span className="font-semibold">{c.sample_on ? formatDay(c.sample_on) : "Date unknown"}</span> · {cultureLine(c).title}{" "}
                          <SourcePill source={c.source === "utee" ? "utee" : "patient"} />
                        </p>
                        {sens && <p className="mt-0.5 text-sm text-[#5a4a6e]">{sens}</p>}
                        {((c.microscopy.white_cells ?? null) !== null || (c.microscopy.red_cells ?? null) !== null) && <p className="text-sm text-[#5a4a6e]">Microscopy: {[(c.microscopy.white_cells ?? null) !== null && `white cells ${c.microscopy.white_cells}`, (c.microscopy.red_cells ?? null) !== null && `red cells ${c.microscopy.red_cells}`].filter(Boolean).join(", ")}</p>}
                        <p className="text-xs text-[#8a7a9c]">{methodLabel(c)}{c.notes ? `. ${c.notes}` : ""}</p>
                      </div>
                      {c.source !== "utee" && (canVerify ? <VerifyButton code={code} entity="culture" entityId={c.id} verification={v} /> : v ? <SourcePill source="verified" /> : null)}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {t.investigations.length > 0 && (
          <Section title={sh.investigations}>
            <ul className="divide-y divide-pink-50" data-testid="shared-investigations">
              {t.investigations.map((i) => {
                const line = investigationLine(i);
                const v = verified("investigation", i.id);
                return (
                  <li key={i.id} className="py-3 first:pt-0 last:pb-0 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-midnight"><span className="font-semibold">{line.title}</span>{i.performed_on ? ` · ${formatDay(i.performed_on)}` : ""} <SourcePill source="patient" /></p>
                      <p className="mt-0.5 text-sm text-[#5a4a6e]">{line.detail || "No detail recorded"}</p>
                    </div>
                    {canVerify ? <VerifyButton code={code} entity="investigation" entityId={i.id} verification={v} /> : v ? <SourcePill source="verified" /> : null}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {(t.medical.length > 0 || t.allergies.length > 0) && (
          <Section title={sh.pmh}>
            {t.medical.length > 0 && <ul className="space-y-1 text-sm text-midnight">{t.medical.map((m) => <li key={m}>{m}</li>)}</ul>}
            {t.allergies.length > 0 && (
              <div className={`rounded-2xl bg-sun p-4 ${t.medical.length ? "mt-3" : ""}`}>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[.14em] text-amber-900">Antibiotic allergies and reactions</p>
                {t.allergies.map((a) => <p key={a} className="text-sm text-midnight">{a}</p>)}
              </div>
            )}
            <p className="mt-3"><SourcePill source="patient" /></p>
          </Section>
        )}

        {(t.active.length > 0 || t.stopped.length > 0) && (
          <Section title={sh.prophylaxis}>
            <ul className="divide-y divide-pink-50">
              {t.active.map((p) => (
                <li key={p.id} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <span className="text-sm text-midnight"><span className="font-semibold">{prophylaxisLine(p)}</span>{p.started_on ? <span className="text-[#5a4a6e]"> · since {formatDay(p.started_on)}</span> : null}</span>
                  <SourcePill source="patient" />
                </li>
              ))}
              {t.stopped.map((p) => (
                <li key={p.id} className="py-2 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                  <span className="text-sm text-[#5a4a6e]">{prophylaxisLine(p)} · stopped {formatDay(p.stopped_on)}{p.helping ? ` · patient: helping ${p.helping.replace("_", " ")}` : ""}{p.notes ? `. ${p.notes}` : ""}</span>
                  <SourcePill source="patient" />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {episodes.length > 0 && (
          <Section title={sh.utis}>
            <ul className="divide-y divide-pink-50">
              {episodes.map((e) => {
                const treatments = data.treatments.filter((x) => x.episode_id === e.id);
                const tests = data.tests.filter((x) => x.episode_id === e.id);
                const symptoms = [...new Set(data.symptoms.filter((x) => x.episode_id === e.id).map((x) => x.symptom))];
                const shape = scoreSummary(symptomScores(data.symptoms, e));
                const diary = diaryEntries(data.checkins.filter((c) => c.episode_id === e.id || (c.on_date >= e.started_on && c.on_date <= (e.ended_on ?? generatedOn))), data.symptoms.filter((x) => x.episode_id === e.id), [], [], [e], { testKind: (k) => labelFor(TEST_KINDS, k) }, generatedOn)
                  .filter((d) => d.feeling !== null || d.note || d.score !== null)
                  .sort((a, b) => (a.on < b.on ? -1 : 1));
                return (
                  <li key={e.id} className="py-3 first:pt-0 last:pb-0 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold text-midnight">{formatDay(e.started_on)} to {e.ended_on ? formatDay(e.ended_on) : "ongoing"}{e.ended_on ? ` (${episodeLength(e)} day${episodeLength(e) === 1 ? "" : "s"})` : ""}</p>
                      <SourcePill source="patient" />
                    </div>
                    {symptoms.length > 0 && <p className="text-[#5a4a6e]">Symptoms: {symptoms.join(", ").replace(/_/g, " ")}</p>}
                    {shape && <p className="text-xs text-[#8a7a9c]">{shape.replace(/\.$/, "")} (each symptom rated 1 to 10 by the patient, added up per day).</p>}
                    {treatments.map((x) => (
                      <p key={x.id} className="text-midnight">{antibioticDisplayName(x.antibiotic_id, x.other_name)}{[x.dose, x.frequency?.replace(/_/g, " "), x.route === "iv" ? "IV" : x.route === "oral" ? "oral" : null, x.days && `${x.days} days`, x.started_on && `from ${formatDay(x.started_on)}`, x.worked && `patient: worked ${x.worked}`, x.reaction && `reaction: ${x.reaction}`].filter(Boolean).map((y) => `, ${y}`).join("")}</p>
                    ))}
                    {tests.map((x) => <p key={x.id} className="text-[#5a4a6e]">{labelFor(TEST_KINDS, x.kind)}{x.tested_on ? ` ${formatDay(x.tested_on)}` : ""}{x.kit_id ? ", Utee test" : x.result ? `, ${labelFor(TEST_RESULTS, x.result).toLowerCase()}` : ""}{x.notes ? `. ${x.notes}` : ""}</p>)}
                    {diary.length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs font-semibold text-maroon">Patient diary ({diary.length} day{diary.length === 1 ? "" : "s"})</summary>
                        <ul className="mt-1 space-y-0.5">
                          {diary.map((d) => <li key={d.on} className="text-xs text-[#5a4a6e]">Day {d.utiDay ?? "-"}, {formatDay(d.on)}: {[d.feeling && `feeling ${feelingLabel(d.feeling).toLowerCase()}`, d.score !== null && `score ${d.score} (${d.symptoms.filter((x) => x.severity).map((x) => `${x.label.toLowerCase()} ${x.severity}`).join(", ")})`, d.note].filter(Boolean).join("; ")}</li>)}
                        </ul>
                      </details>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>
        )}

        {t.events.length > 0 && (
          <Card>
            <details>
              <summary className="cursor-pointer font-display text-2xl font-light text-midnight">{sh.timeline}</summary>
              <ol className="mt-3 divide-y divide-pink-50">
                {t.events.slice(0, 80).map((e, i) => (
                  <li key={`${e.kind}-${e.on}-${i}`} className="flex gap-3 py-2 text-sm">
                    <span className="w-24 shrink-0 pt-0.5 text-xs text-[#8a7a9c]">{formatDay(e.on)}</span>
                    <span className="min-w-0 text-[#5a4a6e]"><span className="font-semibold text-midnight">{e.title}</span>{e.detail ? `. ${e.detail}` : ""}</span>
                  </li>
                ))}
              </ol>
            </details>
          </Card>
        )}

        <p className="px-1 pb-8 text-sm text-[#8a7a9c]">{sh.readOnly} Code {display}, generated {formatDay(generatedOn)}.</p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 font-display text-2xl font-light text-midnight">{title}</h2>
      {children}
    </Card>
  );
}

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-[#5a4a6e]">{label}</dt>
      <dd className={small ? "mt-1 text-sm font-semibold text-[#8a7a9c]" : "font-display text-3xl font-light text-midnight"}>{value}</dd>
    </div>
  );
}
