import React from "react";
import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { PDF_COLOURS as C, brandFonts, readPublicAsset } from "@/lib/pdf/fonts";
import type { TrackerData, TrackerProfile } from "./data";
import { TEST_KINDS, TEST_RESULTS, labelFor } from "./options";
import {
  MEDICAL_HISTORY,
  antibioticHistory,
  firstUtiText,
  formatNhsNumber,
  investigationLine,
  prophylaxisLine,
  timeline,
} from "./passport";
import { antibioticName } from "./search";
import { episodeLength, formatDay, summarise } from "./stats";
import { SIR_LABELS, cultureLine, cultureSummary, methodLabel, organismShort, sensitivityText } from "./cultures";
import { diaryEntries, feelingLabel, scoreSummary, symptomScores } from "./diary";

/*
 * The recurrent UTI summary ("UTI passport"): the patient's record in the
 * shape a clinician reads. Every section says it is patient-entered. The
 * document describes and dates; it never interprets.
 */

const { display: DISPLAY, body: BODY } = brandFonts();
const PAD = 48;

const s = StyleSheet.create({
  // lineHeight sits on text styles with their own fontSize (see report/pdf.tsx).
  page: { paddingTop: 60, paddingBottom: 64, paddingHorizontal: PAD, fontFamily: BODY, fontSize: 9.4, color: C.ink },
  header: { position: "absolute", top: 24, left: PAD, right: PAD, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerText: { fontSize: 7.6, color: C.faint, letterSpacing: 0.6, textTransform: "uppercase" },
  footer: { position: "absolute", bottom: 26, left: PAD, right: PAD, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderTopWidth: 0.6, borderTopColor: C.line, paddingTop: 7 },
  footerText: { fontSize: 7.2, color: C.muted, maxWidth: 400, lineHeight: 1.4 },
  pageNo: { fontSize: 7.2, color: C.muted, width: 80, minHeight: 10, textAlign: "right" },
  eyebrow: { fontSize: 7.4, fontWeight: 600, letterSpacing: 1.6, textTransform: "uppercase", color: C.maroon, marginBottom: 5 },
  h1: { fontFamily: DISPLAY, fontWeight: 300, fontSize: 26, lineHeight: 1.15, color: C.midnight, marginBottom: 10 },
  h2: { fontFamily: DISPLAY, fontWeight: 300, fontSize: 17, lineHeight: 1.2, color: C.midnight, marginTop: 16, marginBottom: 6 },
  p: { fontSize: 9.4, lineHeight: 1.5, marginBottom: 5 },
  muted: { fontSize: 8.4, lineHeight: 1.45, color: C.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -5 },
  cell: { width: "33.333%", paddingHorizontal: 5, marginBottom: 8 },
  cellWide: { width: "50%", paddingHorizontal: 5, marginBottom: 8 },
  key: { fontSize: 7, letterSpacing: 1.1, textTransform: "uppercase", color: C.muted, marginBottom: 1 },
  val: { fontSize: 9.6, lineHeight: 1.4, color: C.midnight, fontWeight: 600 },
  big: { fontFamily: DISPLAY, fontWeight: 300, fontSize: 24, lineHeight: 1.1, color: C.midnight },
  box: { borderRadius: 12, padding: 12, marginBottom: 10 },
  boxPink: { backgroundColor: C.pink25 },
  boxSun: { backgroundColor: C.sun50 },
  boxOutline: { borderWidth: 0.8, borderColor: C.line },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line, paddingVertical: 4 },
  rowHead: { flexDirection: "row", borderBottomWidth: 0.8, borderBottomColor: C.midnight, paddingVertical: 4 },
  th: { fontSize: 7, letterSpacing: 1, textTransform: "uppercase", color: C.muted, fontWeight: 600 },
  td: { fontSize: 8.8, lineHeight: 1.4 },
  bullet: { flexDirection: "row", marginBottom: 3 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.maroon, marginTop: 5, marginRight: 7 },
  bulletText: { fontSize: 9.2, lineHeight: 1.45, flex: 1 },
});

function Chrome({ name }: { name: string }) {
  const logo = readPublicAsset("logo-maroon.png");
  return (
    <>
      <View style={s.header} fixed>
        {logo ? <Image src={logo} style={{ height: 13 }} /> : <Text style={[s.headerText, { color: C.maroon }]}>Utee</Text>}
        <Text style={s.headerText}>UTI passport · {name}</Text>
      </View>
      <View style={s.footer} fixed>
        <Text style={s.footerText}>Entered by the patient in the Utee tracker. A record, not a diagnosis or treatment plan. Check anything that matters against the original reports.</Text>
        <Text style={s.pageNo} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  );
}

function Cell({ k, v, wide }: { k: string; v: string; wide?: boolean }) {
  return (
    <View style={wide ? s.cellWide : s.cell}>
      <Text style={s.key}>{k}</Text>
      <Text style={s.val}>{v}</Text>
    </View>
  );
}

function Bullet({ text }: { text: string }) {
  return (
    <View style={s.bullet}>
      <View style={s.dot} />
      <Text style={s.bulletText}>{text}</Text>
    </View>
  );
}

export type PassportInput = {
  patient: { name: string | null; email: string; dateOfBirth: string | null };
  profile: TrackerProfile;
  data: TrackerData;
  generatedOn: string;
};

export function passportText(input: PassportInput) {
  const { profile, data } = input;
  const sum = summarise(data.episodes, data.treatments);
  const history = antibioticHistory(data.treatments, profile.allergies ?? [], data.cultures);
  const cultures = cultureSummary(data.cultures);
  const recentCultures = [...data.cultures].sort((a, b) => ((a.sample_on ?? "") < (b.sample_on ?? "") ? 1 : -1)).slice(0, 8);
  const active = data.preventions.filter((p) => !p.stopped_on);
  const stopped = data.preventions.filter((p) => p.stopped_on).sort((a, b) => (a.stopped_on! < b.stopped_on! ? 1 : -1));
  const investigations = [...data.investigations].sort((a, b) => ((a.performed_on ?? "") < (b.performed_on ?? "") ? 1 : -1));
  const medical = (profile.medical_history ?? []).map((k) => (k === "other" ? profile.medical_history_other?.trim() || "" : MEDICAL_HISTORY.find((o) => o.key === k)?.label ?? k)).filter(Boolean);
  const allergies = (profile.allergies ?? []).map((a) => [antibioticName(a.antibiotic_id, a.other_name), a.reaction?.trim()].filter(Boolean).join(": "));
  const events = timeline(
    data.episodes,
    data.treatments,
    data.tests.filter((t) => !t.kit_id || !data.cultures.some((c) => c.id === `utee:${t.kit_id}`)),
    data.investigations,
    data.preventions,
    { testKind: (k) => labelFor(TEST_KINDS, k), testResult: (r) => (r ? labelFor(TEST_RESULTS, r) : "") },
    data.cultures,
    data.checkins
  );
  return { sum, history, active, stopped, investigations, medical, allergies, events, cultures, recentCultures };
}

function PassportDoc({ input }: { input: PassportInput }) {
  const { patient, profile, data } = input;
  const { sum, history, active, stopped, investigations, medical, allergies, events, cultures, recentCultures } = passportText(input);
  const name = patient.name ?? "Utee patient";
  const address = [profile.address_line1, profile.address_line2, profile.city, profile.postcode].filter(Boolean).join(", ");
  const episodes = [...data.episodes].sort((a, b) => (a.started_on < b.started_on ? 1 : -1));

  return (
    <Document title={`UTI passport ${name}`} author="Utee tracker" subject="Recurrent UTI summary">
      <Page size="A4" style={s.page} wrap>
        <Chrome name={name} />
        <Text style={s.eyebrow}>Recurrent UTI summary</Text>
        <Text style={s.h1}>{name}</Text>

        <View style={[s.box, s.boxOutline]}>
          <View style={s.grid}>
            <Cell k="Date of birth" v={patient.dateOfBirth ? formatDay(patient.dateOfBirth) : "Not given"} />
            <Cell k="NHS number" v={formatNhsNumber(profile.nhs_number) ?? "Not given"} />
            <Cell k="Local hospital" v={profile.local_hospital ?? "Not given"} />
            <Cell k="Email" v={patient.email} />
            <Cell k="Phone" v={profile.phone ?? "Not given"} />
            <Cell k="Generated" v={formatDay(input.generatedOn)} />
            {address ? <Cell k="Address" v={address} wide /> : null}
          </View>
        </View>

        <Text style={s.h2}>Disease burden and timeline</Text>
        <View style={[s.box, s.boxPink]}>
          <View style={s.grid}>
            <View style={s.cell}><Text style={s.key}>UTIs, last 6 months</Text><Text style={s.big}>{sum.episodes6m}</Text></View>
            <View style={s.cell}><Text style={s.key}>UTIs, last 12 months</Text><Text style={s.big}>{sum.episodes12m}</Text></View>
            <View style={s.cell}><Text style={s.key}>Lifetime (patient estimate)</Text><Text style={s.big}>{profile.lifetime_utis ?? "?"}</Text></View>
            <Cell k="First UTI" v={firstUtiText(profile) ?? "Not given"} />
            <Cell k="UTIs logged in the tracker" v={String(data.episodes.length)} />
            <Cell k="Average length" v={sum.averageLengthDays !== null ? `${sum.averageLengthDays} days` : "Not enough data"} />
          </View>
          {cultures.organisms.length ? (
            <View style={s.grid}>
              <Cell k="Predominant uropathogens" v={cultures.organisms.slice(0, 3).map((o) => `${o.name} (${o.times} of ${cultures.positive})`).join("; ")} wide />
              <Cell k="Results logged" v={`${cultures.cultures}, ${cultures.positive} with bacteria found`} />
              {cultures.resistance.some((r) => r.R) ? <Cell k="Resistant to (ever)" v={cultures.resistance.filter((r) => r.R).map((r) => r.name).join(", ")} wide /> : null}
              {cultures.resistance.some((r) => r.S) ? <Cell k="Sensitive to (ever)" v={cultures.resistance.filter((r) => r.S).map((r) => r.name).join(", ")} wide /> : null}
            </View>
          ) : (
            <Text style={s.muted}>Predominant uropathogens and resistance patterns appear here once culture results are logged.</Text>
          )}
        </View>

        <Text style={s.h2}>Past medical history and allergies</Text>
        {medical.length ? medical.map((m) => <Bullet key={m} text={m} />) : <Text style={s.p}>None recorded.</Text>}
        <View style={[s.box, allergies.length ? s.boxSun : s.boxOutline, { marginTop: 6 }]}>
          <Text style={s.key}>Antibiotic allergies and reactions</Text>
          {allergies.length ? allergies.map((a) => <Text key={a} style={s.p}>{a}</Text>) : <Text style={s.p}>None recorded.</Text>}
        </View>

        {recentCultures.length > 0 && (
          <View>
            <Text style={s.h2}>Culture and test results</Text>
            {recentCultures.map((c) => (
              <View key={c.id} style={{ marginBottom: 5 }}>
                <Text style={s.p}>
                  <Text style={{ fontWeight: 600, color: C.midnight }}>{c.sample_on ? formatDay(c.sample_on) : "Date unknown"}, {methodLabel(c)}: {cultureLine(c).title}</Text>
                  {c.organisms.some((o) => o.count) ? ` (${c.organisms.filter((o) => o.count).map((o) => `${organismShort(o)} ${o.count}`).join(", ")})` : ""}
                </Text>
                {c.organisms.map((o) => {
                  const text = sensitivityText(c, o.key);
                  return text ? <Text key={o.key} style={[s.muted, { marginLeft: 10 }]}>{organismShort(o)}: {text}</Text> : null;
                })}
                {(c.microscopy.white_cells !== undefined && c.microscopy.white_cells !== null) || (c.microscopy.red_cells !== undefined && c.microscopy.red_cells !== null) ? (
                  <Text style={[s.muted, { marginLeft: 10 }]}>Microscopy: {[c.microscopy.white_cells !== undefined && c.microscopy.white_cells !== null && `white cells ${c.microscopy.white_cells}`, c.microscopy.red_cells !== undefined && c.microscopy.red_cells !== null && `red cells ${c.microscopy.red_cells}`].filter(Boolean).join(", ")}</Text>
                ) : null}
                {c.source === "utee" ? <Text style={[s.muted, { marginLeft: 10 }]}>From the patient&apos;s Utee test, as reported by the laboratory.</Text> : null}
              </View>
            ))}
            {data.cultures.length > recentCultures.length && <Text style={s.muted}>{data.cultures.length - recentCultures.length} earlier results are in the passport.</Text>}
          </View>
        )}

        <Text style={s.h2}>Key diagnostic findings</Text>
        {investigations.length === 0 ? (
          <Text style={s.p}>No investigations recorded.</Text>
        ) : (
          investigations.map((i) => {
            const line = investigationLine(i);
            return <Bullet key={i.id} text={`${line.title}${i.performed_on ? ` ${formatDay(i.performed_on)}` : ""}: ${line.detail || "no detail recorded"}`} />;
          })
        )}

        <Text style={s.h2}>Treatment strategy</Text>
        <Text style={[s.key, { marginTop: 2 }]}>Active prophylaxis</Text>
        {active.length ? active.map((p) => <Bullet key={p.id} text={prophylaxisLine(p)} />) : <Text style={s.p}>Nothing currently.</Text>}
        {stopped.length > 0 && (
          <>
            <Text style={[s.key, { marginTop: 6 }]}>Previous prophylaxis</Text>
            {stopped.map((p) => <Bullet key={p.id} text={`${prophylaxisLine(p)}${p.helping ? ` (patient: helping ${p.helping.replace("_", " ")})` : ""}${p.notes ? `. ${p.notes}` : ""}`} />)}
          </>
        )}

        <View style={{ marginTop: 8 }}>
          <Text style={[s.key, { marginBottom: 3 }]} minPresenceAhead={60}>Antibiotic history (patient-reported outcome and laboratory sensitivities)</Text>
          {history.length === 0 ? (
            <Text style={s.p}>No antibiotic courses recorded.</Text>
          ) : (
            <>
              <View style={s.rowHead}>
                <Text style={[s.th, { width: "26%" }]}>Antibiotic</Text>
                <Text style={[s.th, { width: "10%" }]}>Courses</Text>
                <Text style={[s.th, { width: "22%" }]}>Patient said it worked</Text>
                <Text style={[s.th, { width: "20%" }]}>Lab (S / I / R)</Text>
                <Text style={[s.th, { width: "22%" }]}>Last used / reactions</Text>
              </View>
              {history.map((h) => (
                <View key={h.antibiotic_id + h.name} style={s.row}>
                  <Text style={[s.td, { width: "26%" }]}>{h.name}{h.allergy ? " (allergy listed)" : ""}</Text>
                  <Text style={[s.td, { width: "10%" }]}>{h.courses || "-"}</Text>
                  <Text style={[s.td, { width: "22%" }]}>{[h.worked && `yes ${h.worked}`, h.partly && `partly ${h.partly}`, h.failed && `no ${h.failed}`].filter(Boolean).join(", ") || (h.courses ? "not rated" : "-")}</Text>
                  <Text style={[s.td, { width: "20%" }]}>{h.lab ? `${h.lab.S} / ${h.lab.I} / ${h.lab.R}${h.lab.lastResult ? `, last ${SIR_LABELS[h.lab.lastResult].toLowerCase()}` : ""}` : "-"}</Text>
                  <Text style={[s.td, { width: "22%" }]}>{[h.lastUsed && formatDay(h.lastUsed), h.reactions.join("; ")].filter(Boolean).join(" · ") || "-"}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <Text style={[s.eyebrow, { marginTop: 22 }]} minPresenceAhead={120}>Detail</Text>
        <Text style={s.h1} minPresenceAhead={100}>UTIs and treatment courses</Text>
        {episodes.length === 0 && <Text style={s.p}>No UTIs logged.</Text>}
        {episodes.map((e) => {
          const treatments = data.treatments.filter((t) => t.episode_id === e.id);
          const tests = data.tests.filter((t) => t.episode_id === e.id);
          const symptoms = [...new Set(data.symptoms.filter((x) => x.episode_id === e.id).map((x) => x.symptom))];
          const scores = symptomScores(data.symptoms, e);
          const shape = scoreSummary(scores);
          const diary = diaryEntries(data.checkins.filter((c) => c.episode_id === e.id || (c.on_date >= e.started_on && c.on_date <= (e.ended_on ?? input.generatedOn))), data.symptoms.filter((x) => x.episode_id === e.id), [], [], [e], { testKind: (k) => labelFor(TEST_KINDS, k) }, input.generatedOn)
            .filter((d) => d.feeling !== null || d.note || d.score !== null)
            .sort((a, b) => (a.on < b.on ? -1 : 1))
            .slice(0, 21);
          return (
            <View key={e.id} wrap={false} style={{ marginBottom: 8, paddingBottom: 6, borderBottomWidth: 0.5, borderBottomColor: C.line }}>
              <Text style={[s.val, { fontSize: 10 }]}>
                {formatDay(e.started_on)} to {e.ended_on ? formatDay(e.ended_on) : "ongoing"}{e.ended_on ? ` (${episodeLength(e)} days)` : ""}
              </Text>
              {symptoms.length > 0 && <Text style={s.muted}>Symptoms: {symptoms.join(", ").replace(/_/g, " ")}</Text>}
              {shape && <Text style={s.muted}>{shape.replace(/\.$/, "")} (each symptom rated 1 to 10 by the patient, added up per day).</Text>}
              {treatments.map((t) => (
                <Text key={t.id} style={s.p}>
                  {antibioticName(t.antibiotic_id, t.other_name)}
                  {[t.dose, t.frequency?.replace(/_/g, " "), t.route === "iv" ? "IV" : t.route === "oral" ? "oral" : null, t.days && `${t.days} days`, t.started_on && `from ${formatDay(t.started_on)}`, t.worked && `patient: worked ${t.worked}`, t.reaction && `reaction: ${t.reaction}`].filter(Boolean).map((x) => `, ${x}`).join("")}
                </Text>
              ))}
              {tests.map((t) => (
                <Text key={t.id} style={s.muted}>
                  {labelFor(TEST_KINDS, t.kind)}{t.tested_on ? ` ${formatDay(t.tested_on)}` : ""}{t.kit_id ? ", Utee test" : t.result ? `, ${labelFor(TEST_RESULTS, t.result).toLowerCase()}` : ""}{t.notes ? `. ${t.notes}` : ""}
                </Text>
              ))}
              {diary.length > 0 && (
                <View style={{ marginTop: 3 }}>
                  <Text style={[s.key, { fontSize: 7.5 }]}>Patient diary</Text>
                  {diary.map((d) => (
                    <Text key={d.on} style={[s.muted, { marginLeft: 10 }]}>
                      {`Day ${d.utiDay ?? "-"}, ${formatDay(d.on)}: `}
                      {[d.feeling && `feeling ${feelingLabel(d.feeling).toLowerCase()}`, d.score !== null && `score ${d.score} (${d.symptoms.filter((x) => x.severity).map((x) => `${x.label.toLowerCase()} ${x.severity}`).join(", ")})`, d.note].filter(Boolean).join("; ")}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          );
        })}

        <Text style={s.h2}>Timeline</Text>
        {events.slice(0, 80).map((e, i) => (
          <View key={i} style={s.row}>
            <Text style={[s.td, { width: "20%", color: C.muted }]}>{formatDay(e.on)}</Text>
            <Text style={[s.td, { width: "80%" }]}>{e.title}{e.detail ? `. ${e.detail}` : ""}</Text>
          </View>
        ))}
        {events.length > 80 && <Text style={[s.muted, { marginTop: 4 }]}>{events.length - 80} earlier entries are in the tracker.</Text>}
      </Page>
    </Document>
  );
}

export async function renderPassportPdf(input: PassportInput): Promise<Buffer> {
  return renderToBuffer(<PassportDoc input={input} />);
}
