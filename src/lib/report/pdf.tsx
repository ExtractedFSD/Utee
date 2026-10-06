import React from "react";
import fs from "node:fs";
import path from "node:path";
import { Document, Font, Image, Link, Page, StyleSheet, Svg, Circle, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { ReportContent, SheetSummary } from "./content";
import { detectedKeys, paragraphsOf } from "./content";
import {
  ANTIBIOTIC_PROFILE,
  ANTIBIOTICS_HEADING,
  BEHAVIOUR_HEADING,
  HOW_IT_WORKS,
  IMPORTANT_INFORMATION,
  NEXT_STEPS,
  NO_PATHOGEN,
  PANEL_ORDER,
  PARTNERS,
  PATHOGEN_PROFILES,
  REPORT_TITLE,
  SIGNED_HEADING,
  UROBIOME,
} from "./copy";

/* ------------------------------------------------------------------ fonts */

const FONT_DIR = path.join(process.cwd(), "design-system", "fonts");

function fontFile(name: string): string | null {
  const p = path.join(FONT_DIR, name);
  return fs.existsSync(p) ? p : null;
}

const cooperLight = fontFile("CooperLight.ttf");
const poppinsRegular = fontFile("Poppins-Regular.ttf");
const poppinsSemi = fontFile("Poppins-SemiBold.ttf");
const poppinsBold = fontFile("Poppins-Bold.ttf");

const DISPLAY = cooperLight ? "Cooper" : "Times-Roman";
const BODY = poppinsRegular ? "Poppins" : "Helvetica";

if (cooperLight) {
  Font.register({ family: "Cooper", fonts: [{ src: cooperLight, fontWeight: 300 }] });
}
if (poppinsRegular) {
  Font.register({
    family: "Poppins",
    fonts: [
      { src: poppinsRegular, fontWeight: 400 },
      ...(poppinsSemi ? [{ src: poppinsSemi, fontWeight: 600 }] : []),
      ...(poppinsBold ? [{ src: poppinsBold, fontWeight: 700 }] : []),
    ],
  });
}
// Never break a word across lines: bacteria names hyphenated mid-word read badly.
Font.registerHyphenationCallback((word) => [word]);

/* ----------------------------------------------------------------- palette */

const C = {
  midnight: "#1d003a",
  maroon: "#91193b",
  maroonDeep: "#5e0f27",
  pink: "#fe98cb",
  pink50: "#ffcce5",
  pink25: "#ffe5f2",
  mint: "#c3ffd0",
  mint50: "#e1ffe8",
  sun50: "#fcede0",
  sun: "#f9dcbf",
  ink: "#382a52",
  muted: "#6f6188",
  faint: "#9a8db0",
  line: "#e6dfee",
  paper: "#faf7fc",
  white: "#ffffff",
};

const PAGE_PAD_X = 52;

const s = StyleSheet.create({
  // lineHeight is set per text style, never on the page or a wrapper View: a
  // page-level lineHeight stops react-pdf drawing render-prop text such as the
  // page numbers. A text-level lineHeight is multiplied by the fontSize set on
  // that same style (not an inherited one), so each carries its own fontSize.
  page: { paddingTop: 64, paddingBottom: 70, paddingHorizontal: PAGE_PAD_X, fontFamily: BODY, fontSize: 9.6, color: C.ink },
  cover: { padding: 0, backgroundColor: C.midnight, color: C.white, fontFamily: BODY },

  header: { position: "absolute", top: 26, left: PAGE_PAD_X, right: PAGE_PAD_X, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerText: { fontSize: 8, color: C.faint, letterSpacing: 0.6, textTransform: "uppercase" },
  footer: { position: "absolute", bottom: 28, left: PAGE_PAD_X, right: PAGE_PAD_X, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderTopWidth: 0.6, borderTopColor: C.line, paddingTop: 8 },
  footerText: { fontSize: 7.4, color: C.muted, maxWidth: 400, lineHeight: 1.4 },
  // Rendered after layout, so it needs a width of its own or it is laid out at zero width.
  pageNo: { fontSize: 7.4, color: C.muted, width: 80, minHeight: 10, textAlign: "right" },

  eyebrow: { fontSize: 7.6, fontWeight: 600, letterSpacing: 1.6, textTransform: "uppercase", color: C.maroon, marginBottom: 6 },
  h1: { fontFamily: DISPLAY, fontWeight: 300, fontSize: 27, lineHeight: 1.15, color: C.midnight, marginBottom: 12 },
  h2: { fontFamily: DISPLAY, fontWeight: 300, fontSize: 19, lineHeight: 1.2, color: C.midnight, marginTop: 18, marginBottom: 7 },
  h3: { fontSize: 10.5, fontWeight: 600, color: C.midnight, marginTop: 10, marginBottom: 4 },
  p: { fontSize: 9.6, lineHeight: 1.55, marginBottom: 7, textAlign: "left" },
  pLast: { fontSize: 9.6, lineHeight: 1.55, marginBottom: 0 },
  strong: { fontWeight: 600, color: C.midnight },
  link: { color: C.maroon, textDecoration: "underline" },

  tiles: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -4, marginTop: 6, marginBottom: 14 },
  tile: { width: "33.333%", paddingHorizontal: 4, paddingVertical: 4 },
  tileInner: { borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12, minHeight: 58, justifyContent: "space-between" },
  tileOn: { backgroundColor: C.maroon },
  tileOff: { backgroundColor: C.pink25 },
  tileName: { fontSize: 9.4, fontWeight: 600, lineHeight: 1.3 },
  tileNameOn: { color: C.white },
  tileNameOff: { color: C.midnight },
  tileState: { fontSize: 7.2, letterSpacing: 1.2, textTransform: "uppercase", marginTop: 6 },
  tileStateOn: { color: C.pink50 },
  tileStateOff: { color: C.muted },

  box: { borderRadius: 14, padding: 14, marginTop: 10, marginBottom: 12 },
  boxSun: { backgroundColor: C.sun50 },
  boxPink: { backgroundColor: C.pink25 },
  boxMint: { backgroundColor: C.mint50 },
  boxOutline: { borderWidth: 0.8, borderColor: C.line, backgroundColor: C.white },
  boxTitle: { fontSize: 8, fontWeight: 600, letterSpacing: 1.4, textTransform: "uppercase", color: C.maroon, marginBottom: 5 },

  meta: { flexDirection: "row", flexWrap: "wrap", marginTop: 4 },
  metaItem: { width: "50%", marginBottom: 8, paddingRight: 10 },
  metaKey: { fontSize: 7.2, letterSpacing: 1.2, textTransform: "uppercase", color: C.muted, marginBottom: 1 },
  metaVal: { fontSize: 9.8, lineHeight: 1.4, color: C.midnight, fontWeight: 600 },

  bullet: { flexDirection: "row", marginBottom: 6 },
  bulletDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: C.maroon, marginTop: 5, marginRight: 8 },
  bulletBody: { fontSize: 9.6, lineHeight: 1.55, flex: 1 },

  sig: { width: "50%", paddingRight: 18, marginBottom: 16 },
  sigImageWrap: { height: 56, justifyContent: "flex-end", marginBottom: 4 },
  sigImage: { maxHeight: 56, maxWidth: 170, objectFit: "contain", objectPosition: "left bottom" },
  sigLine: { borderTopWidth: 0.8, borderTopColor: C.midnight, paddingTop: 5 },
  sigName: { fontSize: 10, fontWeight: 600, color: C.midnight },
  sigMeta: { fontSize: 8.4, color: C.muted, lineHeight: 1.4 },
  sigPending: { height: 56, borderWidth: 0.8, borderColor: C.faint, borderStyle: "dashed", borderRadius: 8, justifyContent: "center", alignItems: "center", marginBottom: 4 },

  draftBand: { position: "absolute", top: 110, left: 0, right: 0, alignItems: "center" },
  draftText: { fontSize: 11, fontWeight: 700, letterSpacing: 4, color: C.maroon, backgroundColor: C.pink25, paddingVertical: 4, paddingHorizontal: 14, borderRadius: 20 },
});

/* ------------------------------------------------------------------- types */

export type ReportSignature = {
  name: string;
  title: string | null;
  organisation: string | null;
  signedAt: string;
  image: Buffer | null;
};

export type ReportInput = {
  /** Display form, e.g. UT-7K4M-92QX. */
  kitCode: string;
  patient: { name: string | null; dateOfBirth: string | null };
  dates: { sampleReceived: string | null; labCompleted: string | null; report: string };
  sheet: SheetSummary;
  content: ReportContent;
  signatures: ReportSignature[];
  /** Unsigned preview: watermarked, with an empty signature slot. */
  draft: boolean;
  assets: { logoWhite: Buffer | null; logoMaroon: Buffer | null };
};

/* ----------------------------------------------------------------- helpers */

export function formatLongDate(iso: string | null | undefined): string {
  if (!iso) return "Not recorded";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not recorded";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/London" });
}

function Paragraphs({ items, last = true }: { items: readonly string[]; last?: boolean }) {
  return (
    <>
      {items.map((t, i) => (
        <Text key={i} style={[s.p, last && i === items.length - 1 ? s.pLast : {}]}>
          {t}
        </Text>
      ))}
    </>
  );
}

function Bullet({ term, text, link, linkLabel }: { term?: string; text: string; link?: string; linkLabel?: string }) {
  return (
    <View style={s.bullet}>
      <View style={s.bulletDot} />
      <Text style={s.bulletBody}>
        {term ? <Text style={s.strong}>{term}: </Text> : null}
        {text}
        {link ? (
          <>
            {" "}
            <Link src={link} style={s.link}>
              {linkLabel ?? link}
            </Link>
          </>
        ) : null}
      </Text>
    </View>
  );
}

function Chrome({ kitCode, draft, logo }: { kitCode: string; draft: boolean; logo: Buffer | null }) {
  return (
    <>
      <View style={s.header} fixed>
        {logo ? <Image src={logo} style={{ height: 14 }} /> : <Text style={[s.headerText, { color: C.maroon }]}>Utee</Text>}
        <Text style={s.headerText}>
          {REPORT_TITLE} · {kitCode}
          {draft ? " · DRAFT" : ""}
        </Text>
      </View>
      <View style={s.footer} fixed>
        <Text style={s.footerText}>
          This report is descriptive. It is not a prescription or a treatment plan. For medical advice, speak to a healthcare professional.
        </Text>
        <Text style={s.pageNo} fixed render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
      </View>
    </>
  );
}

/* ------------------------------------------------------------------- pages */

function Cover({ input }: { input: ReportInput }) {
  const { patient, dates, kitCode, assets, draft } = input;
  return (
    <Page size="A4" style={s.cover}>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <Svg width="595" height="842" viewBox="0 0 595 842">
          <Circle cx="520" cy="130" r="230" fill={C.maroon} opacity={0.55} />
          <Circle cx="80" cy="760" r="170" fill={C.pink} opacity={0.22} />
          <Circle cx="535" cy="470" r="46" fill={C.pink} opacity={0.5} />
        </Svg>
      </View>
      <View style={{ position: "absolute", top: 54, left: 56, right: 56, bottom: 56, justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          {assets.logoWhite ? <Image src={assets.logoWhite} style={{ height: 30 }} /> : <Text style={{ fontSize: 22, fontWeight: 700 }}>Utee</Text>}
          {draft ? <Text style={s.draftText}>DRAFT</Text> : null}
        </View>

        <View>
          <Text style={{ fontSize: 9, letterSpacing: 2.4, textTransform: "uppercase", color: C.pink, marginBottom: 14 }}>Lodestar Dx molecular UTI test</Text>
          <Text style={{ fontFamily: DISPLAY, fontWeight: 300, fontSize: 50, lineHeight: 1.05, color: C.white, maxWidth: 420 }}>{REPORT_TITLE}</Text>
          <Text style={{ fontSize: 11, color: C.pink50, marginTop: 16, maxWidth: 400, lineHeight: 1.6 }}>
            Prepared for you by Utee and the UTI Institute. Share it with your GP, pharmacist or urologist.
          </Text>
        </View>

        <View style={{ borderTopWidth: 0.8, borderTopColor: "rgba(255,255,255,0.3)", paddingTop: 18, flexDirection: "row", flexWrap: "wrap" }}>
          <CoverMeta k="Prepared for" v={patient.name ?? "Utee patient"} />
          <CoverMeta k="Date of birth" v={patient.dateOfBirth ? formatLongDate(patient.dateOfBirth) : "Not provided"} />
          <CoverMeta k="Kit code" v={kitCode} />
          <CoverMeta k="Sample received by lab" v={formatLongDate(dates.sampleReceived)} />
          <CoverMeta k="Report date" v={formatLongDate(dates.report)} />
          <CoverMeta k="Test" v="Lodestar Dx by Llusern Scientific" />
        </View>
      </View>
    </Page>
  );
}

function CoverMeta({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ width: "33.333%", marginBottom: 14, paddingRight: 12 }}>
      <Text style={{ fontSize: 7.2, letterSpacing: 1.4, textTransform: "uppercase", color: C.pink50, marginBottom: 2 }}>{k}</Text>
      <Text style={{ fontSize: 10.5, color: C.white, fontWeight: 600 }}>{v}</Text>
    </View>
  );
}

function ResultsPage({ input }: { input: ReportInput }) {
  const { content, sheet, dates } = input;
  const detected = new Set(detectedKeys(sheet.organisms));
  const paragraphs = paragraphsOf(content.resultText);
  return (
    <Page size="A4" style={s.page}>
      <Chrome kitCode={input.kitCode} draft={input.draft} logo={input.assets.logoMaroon} />
      <Text style={s.eyebrow}>Your result</Text>
      <Text style={s.h1}>{content.headline}</Text>

      <View style={s.tiles}>
        {PANEL_ORDER.map((key) => {
          const on = detected.has(key);
          return (
            <View key={key} style={s.tile}>
              <View style={[s.tileInner, on ? s.tileOn : s.tileOff]}>
                <Text style={[s.tileName, on ? s.tileNameOn : s.tileNameOff]}>{PATHOGEN_PROFILES[key].name}</Text>
                <Text style={[s.tileState, on ? s.tileStateOn : s.tileStateOff]}>{on ? "Detected" : "Not detected"}</Text>
              </View>
            </View>
          );
        })}
      </View>

      <Paragraphs items={paragraphs} />

      {content.clinicianNote.trim() ? (
        <View style={[s.box, s.boxSun]}>
          <Text style={s.boxTitle}>A note from the reviewing clinician</Text>
          <Paragraphs items={paragraphsOf(content.clinicianNote)} />
        </View>
      ) : null}

      <View style={[s.box, s.boxOutline]}>
        <Text style={s.boxTitle}>About your sample</Text>
        <View style={s.meta}>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>Received by the laboratory</Text>
            <Text style={s.metaVal}>{formatLongDate(dates.sampleReceived)}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>Result recorded</Text>
            <Text style={s.metaVal}>{formatLongDate(dates.labCompleted)}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>Test</Text>
            <Text style={s.metaVal}>Lodestar Dx, six-target molecular panel</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaKey}>Laboratory</Text>
            <Text style={s.metaVal}>Llusern Scientific Ltd</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

function UnderstandingPages({ input }: { input: ReportInput }) {
  const keys = input.content.contamination ? [] : detectedKeys(input.sheet.organisms);
  const negative = input.sheet.outcome === "negative" || keys.length === 0;
  return (
    <Page size="A4" style={s.page} wrap>
      <Chrome kitCode={input.kitCode} draft={input.draft} logo={input.assets.logoMaroon} />
      <Text style={s.eyebrow}>Understanding your result</Text>
      <Text style={s.h1}>About the test</Text>

      <Text style={[s.h2, { marginTop: 0 }]}>{HOW_IT_WORKS.title}</Text>
      <Paragraphs items={HOW_IT_WORKS.body} />
      <Text style={s.h2}>{UROBIOME.title}</Text>
      <Paragraphs items={UROBIOME.body} />
      {!negative && !input.content.contamination ? (
        <>
          <Text style={s.h2}>{ANTIBIOTIC_PROFILE.title}</Text>
          <Paragraphs items={ANTIBIOTIC_PROFILE.body} />
        </>
      ) : null}

      {negative && !input.content.contamination ? (
        <>
          <Text style={s.h2}>{NO_PATHOGEN.title}</Text>
          <Paragraphs items={NO_PATHOGEN.body} />
        </>
      ) : null}

      {keys.map((key, i) => {
        const p = PATHOGEN_PROFILES[key];
        return (
          <View key={key} break={i === 0} wrap>
            <Text style={[s.eyebrow, i > 0 ? { marginTop: 22 } : {}]} minPresenceAhead={120}>Pathogen profile</Text>
            <Text style={[s.h1, { fontSize: 23 }]} minPresenceAhead={100}>{p.name}</Text>
            <Text style={s.p}>{p.intro}</Text>
            <Text style={s.h3}>{BEHAVIOUR_HEADING}</Text>
            <Paragraphs items={p.behaviour} />
            <View style={[s.box, s.boxPink]} wrap={false}>
              <Text style={s.boxTitle}>{ANTIBIOTICS_HEADING}</Text>
              <Text style={s.pLast}>{p.antibiotics}</Text>
            </View>
          </View>
        );
      })}

      <View style={[s.box, s.boxSun, { marginTop: 18 }]} wrap={false}>
        <Text style={s.boxTitle}>{IMPORTANT_INFORMATION.title}</Text>
        <Paragraphs items={IMPORTANT_INFORMATION.body} />
      </View>
    </Page>
  );
}

function NextStepsPages({ input }: { input: ReportInput }) {
  const n = NEXT_STEPS;
  return (
    <Page size="A4" style={s.page} wrap>
      <Chrome kitCode={input.kitCode} draft={input.draft} logo={input.assets.logoMaroon} />
      <Text style={s.eyebrow}>What happens next</Text>
      <Text style={s.h1}>{n.title}</Text>

      <Text style={[s.h2, { marginTop: 0 }]}>{n.common.title}</Text>
      <Paragraphs items={n.common.body} />

      <Text style={s.h2}>{n.recurrent.title}</Text>
      <Text style={s.p}>{n.recurrent.intro}</Text>
      {n.recurrent.items.map((it) => (
        <Bullet key={it.term} term={it.term} text={it.text} />
      ))}

      <Text style={s.h2}>{n.investigations.title}</Text>
      <Paragraphs items={n.investigations.body} />

      <View wrap={false}>
        <Text style={s.h2}>{n.consultation.title}</Text>
        <Text style={s.p}>{n.consultation.intro}</Text>
        {n.consultation.items.map((it) => (
          <Bullet key={it.term} term={it.term} text={it.text} link={it.link} linkLabel={it.linkLabel} />
        ))}
      </View>

      <Text style={s.h2}>{n.prevention.title}</Text>
      <Text style={s.p}>{n.prevention.intro}</Text>
      {n.prevention.items.map((it) => (
        <Bullet key={it.term} term={it.term} text={it.text} />
      ))}
      <Text style={s.p}>{n.prevention.outro}</Text>

      <View style={[s.box, s.boxMint]} wrap={false}>
        <Text style={s.boxTitle}>{n.supplements.title}</Text>
        <Paragraphs items={n.supplements.body} last={false} />
        <Link src={n.supplements.link} style={s.link}>
          {n.supplements.linkLabel}
        </Link>
      </View>

      <View wrap={false} style={{ marginTop: 10 }}>
        <Text style={s.h2}>About this report</Text>
        <Paragraphs items={PARTNERS.body} />
      </View>

      <View wrap={false} style={{ marginTop: 22 }}>
        <Text style={s.eyebrow}>{SIGNED_HEADING}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginTop: 6 }}>
          {input.signatures.map((sig, i) => (
            <View key={i} style={s.sig}>
              <View style={s.sigImageWrap}>{sig.image ? <Image src={sig.image} style={s.sigImage} /> : null}</View>
              <View style={s.sigLine}>
                <Text style={s.sigName}>{sig.name}</Text>
                {sig.title ? <Text style={s.sigMeta}>{sig.title}</Text> : null}
                {sig.organisation ? <Text style={s.sigMeta}>On behalf of {sig.organisation}</Text> : null}
                <Text style={s.sigMeta}>Signed electronically on {formatLongDate(sig.signedAt)}</Text>
              </View>
            </View>
          ))}
          {input.signatures.length === 0 ? (
            <View style={s.sig}>
              <View style={s.sigPending}>
                <Text style={{ fontSize: 8, color: C.faint, letterSpacing: 1.2, textTransform: "uppercase" }}>Awaiting signature</Text>
              </View>
              <View style={s.sigLine}>
                <Text style={s.sigMeta}>This report has not been signed yet.</Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Page>
  );
}

function ReportDoc({ input }: { input: ReportInput }) {
  return (
    <Document title={`${REPORT_TITLE} ${input.kitCode}`} author="Utee" subject="Lodestar Dx UTI test report" creator="Utee portal">
      <Cover input={input} />
      <ResultsPage input={input} />
      <UnderstandingPages input={input} />
      <NextStepsPages input={input} />
    </Document>
  );
}

export async function renderReportPdf(input: ReportInput): Promise<Buffer> {
  return renderToBuffer(<ReportDoc input={input} />);
}
