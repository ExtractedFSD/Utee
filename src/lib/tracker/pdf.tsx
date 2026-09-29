import React from "react";
import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { copy } from "./copy";
import { COURSE_TYPES, SOURCES, SYMPTOMS, TEST_KINDS, TEST_RESULTS, TRIGGERS, WORKED, labelFor } from "./options";
import { antibioticName } from "./search";
import { episodeLength, formatDay } from "./stats";
import { HELPING, preventionName } from "./prevention";
import type { TrackerData } from "./data";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 9.5, fontFamily: "Helvetica", color: "#1d003a" },
  h1: { fontSize: 20, marginBottom: 2 },
  meta: { fontSize: 9, color: "#4d3f69", marginBottom: 14 },
  episode: { marginBottom: 10, paddingBottom: 8, borderBottomWidth: 0.5, borderBottomColor: "#cfc4dd" },
  title: { fontSize: 11.5, fontFamily: "Helvetica-Bold", marginBottom: 3 },
  row: { flexDirection: "row", marginBottom: 1.5 },
  key: { width: 70, color: "#4d3f69" },
  val: { flex: 1 },
  footer: { position: "absolute", bottom: 24, left: 36, right: 36, fontSize: 8, color: "#6f6188", textAlign: "center" },
});

export type PdfOptions = {
  fullName: string | null;
  dateOfBirth: string | null;
  from: string;
  to: string;
  includeNotes: boolean;
  kitByEpisodeTest: Record<string, { code: string; status: string; reportReady: boolean }>;
  generatedOn: string;
};

function SummaryDoc({ data, opts }: { data: TrackerData; opts: PdfOptions }) {
  const episodes = data.episodes.filter((e) => e.started_on >= opts.from && e.started_on <= opts.to).sort((a, b) => (a.started_on < b.started_on ? -1 : 1));
  return (
    <Document title={copy.pdf.title} author="Utee tracker">
      <Page size="A4" style={s.page}>
        <Text style={s.h1}>{copy.pdf.title}</Text>
        <Text style={s.meta}>
          {[opts.fullName, opts.dateOfBirth && `Date of birth ${formatDay(opts.dateOfBirth)}`, copy.pdf.range(formatDay(opts.from), formatDay(opts.to))].filter(Boolean).join("  ·  ")}
        </Text>
        {(() => {
          const describe = (p: TrackerData["preventions"][number]) => [
            preventionName(p),
            p.started_on && `since ${formatDay(p.started_on)}`,
            p.stopped_on && `until ${formatDay(p.stopped_on)}`,
            p.helping && `patient says helping: ${labelFor(HELPING, p.helping).toLowerCase()}`,
          ].filter(Boolean).join(", ");
          const current = data.preventions.filter((p) => !p.stopped_on);
          const past = data.preventions.filter((p) => p.stopped_on);
          if (!current.length && !past.length) return null;
          return (
            <View style={s.episode} wrap={false}>
              <Text style={s.title}>{copy.pdf.prevention}</Text>
              {current.length > 0 && <Row k="Current" v={current.map(describe).join("; ")} />}
              {past.length > 0 && <Row k="Previous" v={past.map(describe).join("; ")} />}
            </View>
          );
        })()}
        {episodes.length === 0 && <Text>{copy.pdf.noEpisodes}</Text>}
        {episodes.map((e) => {
          const symptoms = [...new Set(data.symptoms.filter((x) => x.episode_id === e.id).map((x) => x.symptom === "other" ? x.other_text || "Other" : labelFor(SYMPTOMS, x.symptom)))];
          const triggers = [...new Set(data.triggers.filter((x) => x.episode_id === e.id).map((x) => x.trigger === "other" ? x.other_text || "Other" : labelFor(TRIGGERS, x.trigger)))];
          const treatments = data.treatments.filter((x) => x.episode_id === e.id);
          const tests = data.tests.filter((x) => x.episode_id === e.id);
          return (
            <View key={e.id} style={s.episode} wrap={false}>
              <Text style={s.title}>
                {formatDay(e.started_on)} to {e.ended_on ? formatDay(e.ended_on) : "ongoing"}
                {e.ended_on ? ` (${episodeLength(e)} days)` : ""}
              </Text>
              {symptoms.length > 0 && <Row k="Symptoms" v={symptoms.join(", ")} />}
              {treatments.map((t) => (
                <Row key={t.id} k="Antibiotic" v={[
                  antibioticName(t.antibiotic_id, t.other_name),
                  t.started_on && `from ${formatDay(t.started_on)}`,
                  t.days && `${t.days} days`,
                  labelFor(COURSE_TYPES, t.course_type),
                  t.source && `from ${labelFor(SOURCES, t.source)}`,
                  t.worked && `patient says: worked ${labelFor(WORKED, t.worked).toLowerCase()}`,
                ].filter(Boolean).join(", ")} />
              ))}
              {tests.map((t) => {
                const kit = opts.kitByEpisodeTest[t.id];
                return (
                  <Row key={t.id} k="Test" v={kit
                    ? `${copy.pdf.uteeTest} ${kit.code}, ${kit.reportReady ? copy.pdf.reportInPortal : kit.status.replace(/_/g, " ")}`
                    : [labelFor(TEST_KINDS, t.kind), t.tested_on && formatDay(t.tested_on), t.result && `result as reported: ${labelFor(TEST_RESULTS, t.result).toLowerCase()}`, t.notes].filter(Boolean).join(", ")} />
                );
              })}
              {triggers.length > 0 && <Row k="Noted" v={triggers.join(", ")} />}
              {opts.includeNotes && e.notes && <Row k="Notes" v={e.notes} />}
            </View>
          );
        })}
        <Text style={s.footer} fixed>
          {copy.pdf.footer}  ·  {copy.pdf.generated(formatDay(opts.generatedOn))}
        </Text>
      </Page>
    </Document>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={s.row}>
      <Text style={s.key}>{k}</Text>
      <Text style={s.val}>{v}</Text>
    </View>
  );
}

export async function renderSummaryPdf(data: TrackerData, opts: PdfOptions): Promise<Buffer> {
  return renderToBuffer(<SummaryDoc data={data} opts={opts} />);
}
