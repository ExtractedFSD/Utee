import { Card, Logo, Pill } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import { diaryEntries, feelingLabel, scoreSummary, symptomScores } from "@/lib/tracker/diary";
import { TEST_KINDS, TEST_RESULTS, labelFor } from "@/lib/tracker/options";
import { passportText } from "@/lib/tracker/passport-pdf";
import { firstUtiText, formatNhsNumber, investigationLine, prophylaxisLine } from "@/lib/tracker/passport";
import { SIR_LABELS, cultureLine, methodLabel, organismShort, sensitivityText } from "@/lib/tracker/cultures";
import { antibioticName } from "@/lib/tracker/search";
import { formatShareCode, formatUntil } from "@/lib/tracker/share";
import type { SharedPassport as Shared } from "@/lib/tracker/share-load";
import { episodeLength, formatDay } from "@/lib/tracker/stats";
import { verificationFor, verifiedLine } from "@/lib/tracker/verify";
import { VerifyButton } from "./VerifyButton";

/*
 * The passport as a clinician reads it: the same sections and order as the
 * PDF, on one page, with nothing to edit. Every line is what the patient
 * logged (or the Utee laboratory reported), and says so.
 */
export function SharedPassport({ shared, code, canVerify }: { shared: Shared; code: string; canVerify: boolean }) {
  const { patient, profile, data, share } = shared;
  const generatedOn = new Date().toISOString().slice(0, 10);
  const t = passportText({ patient, profile, data, generatedOn });
  const name = patient.name ?? "Utee patient";
  const address = [profile.address_line1, profile.address_line2, profile.city, profile.postcode].filter(Boolean).join(", ");
  const episodes = [...data.episodes].sort((a, b) => (a.started_on < b.started_on ? 1 : -1));
  const display = formatShareCode(share.code);
  const verified = (entity: "investigation" | "culture", id: string) => verificationFor(data.verifications, entity, id);

  return (
    <div className="min-h-screen bg-pink-25">
      <header className="bg-gradient-brand text-white">
        <div className="mx-auto max-w-4xl px-4 py-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Logo className="h-9 w-auto" />
            <div>
              <p className="text-eyebrow uppercase text-white/80">{copy.shared.eyebrow}</p>
              <p className="font-display text-2xl font-light">{name}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/passport/${display}/pdf`} className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-white px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[.14em] text-midnight shadow-card hover:bg-pink-25">{copy.shared.downloadPdf}</a>
            <a href={`/passport/${display}/fhir`} className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-white/40 px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[.14em] text-white hover:bg-white/10">{copy.shared.downloadFhir}</a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 space-y-6" data-testid="shared-passport">
        <p className="text-xs text-slate-600">{copy.shared.readOnly} {copy.shared.opensUntil(formatUntil(share.expires_at))}{canVerify ? "" : ` ${copy.shared.verifySignedOut}`}</p>

        <Card>
          <dl className="grid gap-3 sm:grid-cols-3 text-sm">
            <Item k="Date of birth" v={patient.dateOfBirth ? formatDay(patient.dateOfBirth) : "Not given"} />
            <Item k="NHS number" v={formatNhsNumber(profile.nhs_number) ?? "Not given"} />
            <Item k="Local hospital" v={profile.local_hospital ?? "Not given"} />
            <Item k="Email" v={patient.email} />
            <Item k="Phone" v={profile.phone ?? "Not given"} />
            <Item k="Address" v={address || "Not given"} />
          </dl>
        </Card>

        <Section title="Disease burden and timeline">
          <dl className="grid grid-cols-3 gap-3 mb-4">
            <Stat label="UTIs, last 6 months" value={String(t.sum.episodes6m)} />
            <Stat label="UTIs, last 12 months" value={String(t.sum.episodes12m)} />
            <Stat label="Lifetime (patient estimate)" value={profile.lifetime_utis === null ? "?" : String(profile.lifetime_utis)} />
          </dl>
          <dl className="grid gap-3 sm:grid-cols-3 text-sm">
            <Item k="First UTI" v={firstUtiText(profile) ?? "Not given"} />
            <Item k="UTIs logged" v={String(data.episodes.length)} />
            <Item k="Average length" v={t.sum.averageLengthDays !== null ? `${t.sum.averageLengthDays} days` : "Not enough data"} />
            {t.cultures.organisms.length > 0 && <Item k="Predominant uropathogens" v={t.cultures.organisms.slice(0, 3).map((o) => `${o.name} (${o.times} of ${t.cultures.positive})`).join("; ")} />}
            {t.cultures.resistance.some((r) => r.R) && <Item k="Resistant to (ever)" v={t.cultures.resistance.filter((r) => r.R).map((r) => r.name).join(", ")} />}
            {t.cultures.resistance.some((r) => r.S) && <Item k="Sensitive to (ever)" v={t.cultures.resistance.filter((r) => r.S).map((r) => r.name).join(", ")} />}
          </dl>
        </Section>

        <Section title="Past medical history and allergies">
          {t.medical.length ? <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">{t.medical.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="text-sm text-slate-600">None recorded.</p>}
          <div className={`mt-3 rounded-2xl p-4 ${t.allergies.length ? "bg-sun" : "bg-slate-50"}`}>
            <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-600 mb-1">Antibiotic allergies and reactions</p>
            {t.allergies.length ? t.allergies.map((a) => <p key={a} className="text-sm text-midnight">{a}</p>) : <p className="text-sm text-slate-600">None recorded.</p>}
          </div>
        </Section>

        <Section title="Culture and test results">
          {data.cultures.length === 0 ? <p className="text-sm text-slate-600">None logged.</p> : (
            <ul className="divide-y divide-slate-100" data-testid="shared-cultures">
              {data.cultures.map((c) => {
                const v = c.source === "utee" ? null : verified("culture", c.id);
                return (
                  <li key={c.id} className="py-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-midnight">{c.sample_on ? formatDay(c.sample_on) : "Date unknown"}, {methodLabel(c)}: {cultureLine(c).title}</p>
                        {c.organisms.map((o) => { const s = sensitivityText(c, o.key); return s ? <p key={o.key} className="text-xs text-slate-600">{organismShort(o)}{o.count ? ` ${o.count}` : ""}: {s}</p> : o.count ? <p key={o.key} className="text-xs text-slate-600">{organismShort(o)} {o.count}</p> : null; })}
                        {(c.microscopy.white_cells ?? null) !== null || (c.microscopy.red_cells ?? null) !== null ? <p className="text-xs text-slate-600">Microscopy: {[(c.microscopy.white_cells ?? null) !== null && `white cells ${c.microscopy.white_cells}`, (c.microscopy.red_cells ?? null) !== null && `red cells ${c.microscopy.red_cells}`].filter(Boolean).join(", ")}</p> : null}
                        {c.notes && <p className="text-xs text-slate-600">{c.notes}</p>}
                        <p className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                          <Pill tone={c.source === "utee" ? "brand" : "slate"}>{c.source === "utee" ? "Utee laboratory" : "Patient-entered"}</Pill>
                          {v && <Pill tone="green">{verifiedLine(v)}</Pill>}
                        </p>
                      </div>
                      {canVerify && c.source !== "utee" && <VerifyButton code={code} entity="culture" entityId={c.id} verified={!!v} />}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Key diagnostic findings">
          {t.investigations.length === 0 ? <p className="text-sm text-slate-600">No investigations recorded.</p> : (
            <ul className="divide-y divide-slate-100" data-testid="shared-investigations">
              {t.investigations.map((i) => {
                const line = investigationLine(i);
                const v = verified("investigation", i.id);
                return (
                  <li key={i.id} className="py-3 flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-midnight">{line.title}{i.performed_on ? ` ${formatDay(i.performed_on)}` : ""}</p>
                      <p className="text-xs text-slate-600">{line.detail || "No detail recorded"}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-xs"><Pill tone="slate">Patient-entered</Pill>{v && <Pill tone="green">{verifiedLine(v)}</Pill>}</p>
                    </div>
                    {canVerify && <VerifyButton code={code} entity="investigation" entityId={i.id} verified={!!v} />}
                  </li>
                );
              })}
            </ul>
          )}
        </Section>

        <Section title="Treatment strategy">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-600 mb-1">Active prophylaxis</p>
          {t.active.length ? <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">{t.active.map((p) => <li key={p.id}>{prophylaxisLine(p)}</li>)}</ul> : <p className="text-sm text-slate-600">Nothing currently.</p>}
          {t.stopped.length > 0 && (
            <>
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-600 mt-4 mb-1">Previous prophylaxis</p>
              <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">{t.stopped.map((p) => <li key={p.id}>{prophylaxisLine(p)}{p.helping ? ` (patient: helping ${p.helping.replace("_", " ")})` : ""}{p.notes ? `. ${p.notes}` : ""}</li>)}</ul>
            </>
          )}
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-600 mt-5 mb-2">Antibiotic history (patient-reported outcome and laboratory sensitivities)</p>
          {t.history.length === 0 ? <p className="text-sm text-slate-600">No antibiotic courses recorded.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-xs uppercase tracking-[.1em] text-slate-500"><th className="py-2 pr-3 font-semibold">Antibiotic</th><th className="py-2 pr-3 font-semibold">Courses</th><th className="py-2 pr-3 font-semibold">Patient said it worked</th><th className="py-2 pr-3 font-semibold">Lab (S / I / R)</th><th className="py-2 font-semibold">Last used / reactions</th></tr></thead>
                <tbody>
                  {t.history.map((h) => (
                    <tr key={h.antibiotic_id + h.name} className="border-t border-slate-100 text-slate-700">
                      <td className="py-2 pr-3 font-semibold text-midnight">{h.name}{h.allergy ? " (allergy listed)" : ""}</td>
                      <td className="py-2 pr-3">{h.courses || "-"}</td>
                      <td className="py-2 pr-3">{[h.worked && `yes ${h.worked}`, h.partly && `partly ${h.partly}`, h.failed && `no ${h.failed}`].filter(Boolean).join(", ") || (h.courses ? "not rated" : "-")}</td>
                      <td className="py-2 pr-3">{h.lab ? `${h.lab.S} / ${h.lab.I} / ${h.lab.R}${h.lab.lastResult ? `, last ${SIR_LABELS[h.lab.lastResult].toLowerCase()}` : ""}` : "-"}</td>
                      <td className="py-2">{[h.lastUsed && formatDay(h.lastUsed), h.reactions.join("; ")].filter(Boolean).join(" · ") || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="UTIs and treatment courses">
          {episodes.length === 0 && <p className="text-sm text-slate-600">No UTIs logged.</p>}
          <ul className="divide-y divide-slate-100">
            {episodes.map((e) => {
              const treatments = data.treatments.filter((x) => x.episode_id === e.id);
              const tests = data.tests.filter((x) => x.episode_id === e.id);
              const symptoms = [...new Set(data.symptoms.filter((x) => x.episode_id === e.id).map((x) => x.symptom))];
              const shape = scoreSummary(symptomScores(data.symptoms, e));
              const diary = diaryEntries(data.checkins.filter((c) => c.episode_id === e.id || (c.on_date >= e.started_on && c.on_date <= (e.ended_on ?? generatedOn))), data.symptoms.filter((x) => x.episode_id === e.id), [], [], [e], { testKind: (k) => labelFor(TEST_KINDS, k) }, generatedOn)
                .filter((d) => d.feeling !== null || d.note || d.score !== null)
                .sort((a, b) => (a.on < b.on ? -1 : 1));
              return (
                <li key={e.id} className="py-3 text-sm">
                  <p className="font-semibold text-midnight">{formatDay(e.started_on)} to {e.ended_on ? formatDay(e.ended_on) : "ongoing"}{e.ended_on ? ` (${episodeLength(e)} days)` : ""}</p>
                  {symptoms.length > 0 && <p className="text-xs text-slate-600">Symptoms: {symptoms.join(", ").replace(/_/g, " ")}</p>}
                  {shape && <p className="text-xs text-slate-600">{shape.replace(/\.$/, "")} (each symptom rated 1 to 10 by the patient, added up per day).</p>}
                  {treatments.map((x) => (
                    <p key={x.id} className="text-slate-700">{antibioticName(x.antibiotic_id, x.other_name)}{[x.dose, x.frequency?.replace(/_/g, " "), x.route === "iv" ? "IV" : x.route === "oral" ? "oral" : null, x.days && `${x.days} days`, x.started_on && `from ${formatDay(x.started_on)}`, x.worked && `patient: worked ${x.worked}`, x.reaction && `reaction: ${x.reaction}`].filter(Boolean).map((y) => `, ${y}`).join("")}</p>
                  ))}
                  {tests.map((x) => <p key={x.id} className="text-xs text-slate-600">{labelFor(TEST_KINDS, x.kind)}{x.tested_on ? ` ${formatDay(x.tested_on)}` : ""}{x.kit_id ? ", Utee test" : x.result ? `, ${labelFor(TEST_RESULTS, x.result).toLowerCase()}` : ""}{x.notes ? `. ${x.notes}` : ""}</p>)}
                  {diary.length > 0 && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs font-semibold text-maroon">Patient diary ({diary.length} day{diary.length === 1 ? "" : "s"})</summary>
                      <ul className="mt-1 space-y-0.5">
                        {diary.map((d) => <li key={d.on} className="text-xs text-slate-600">Day {d.utiDay ?? "-"}, {formatDay(d.on)}: {[d.feeling && `feeling ${feelingLabel(d.feeling).toLowerCase()}`, d.score !== null && `score ${d.score} (${d.symptoms.filter((x) => x.severity).map((x) => `${x.label.toLowerCase()} ${x.severity}`).join(", ")})`, d.note].filter(Boolean).join("; ")}</li>)}
                      </ul>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>

        <Section title="Timeline">
          <ol className="divide-y divide-slate-100">
            {t.events.slice(0, 80).map((e, i) => (
              <li key={`${e.kind}-${e.on}-${i}`} className="flex gap-3 py-2 text-sm">
                <span className="w-24 shrink-0 text-xs text-slate-500 pt-0.5">{formatDay(e.on)}</span>
                <span className="min-w-0 text-slate-700"><span className="font-semibold text-midnight">{e.title}</span>{e.detail ? `. ${e.detail}` : ""}</span>
              </li>
            ))}
          </ol>
        </Section>

        <p className="text-xs text-slate-500 pb-8">Entered by the patient in the Utee UTI Passport. A record, not a diagnosis or treatment plan. Check anything that matters against the original reports. Code {display}, generated {formatDay(generatedOn)}.</p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <h2 className="font-display text-2xl font-light text-midnight mb-3">{title}</h2>
      {children}
    </Card>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{k}</dt>
      <dd className="font-semibold text-midnight">{v}</dd>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-display text-3xl font-light text-midnight">{value}</dd>
    </div>
  );
}
