import { Document, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import type { PostalAddress } from "./royalmail-request";

/*
 * A label-shaped PDF for the stub Royal Mail client, so the kit page, the
 * email and the admin reissue can be exercised end to end before the live
 * key arrives. It says plainly that it is not valid postage.
 */
const s = StyleSheet.create({
  page: { padding: 24, fontSize: 11, fontFamily: "Helvetica", color: "#1d003a" },
  box: { border: "1 solid #1d003a", borderRadius: 8, padding: 14, marginBottom: 12 },
  eyebrow: { fontSize: 8, letterSpacing: 1.5, textTransform: "uppercase", color: "#5a4a6e", marginBottom: 4 },
  big: { fontSize: 22, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  line: { marginBottom: 2 },
  warn: { marginTop: 10, padding: 10, backgroundColor: "#ffe5f2", borderRadius: 8, fontSize: 10, color: "#91193b" },
});

const lines = (a: PostalAddress) => [a.companyName, `${a.firstName} ${a.lastName}`.trim(), a.addressLine1, a.addressLine2, a.city, a.postcode].filter(Boolean) as string[];

export async function renderReturnLabelPdf(input: { trackingNumber: string; serviceCode: string; reference: string; sender: PostalAddress; lab: PostalAddress; stub: boolean }): Promise<Buffer> {
  return renderToBuffer(
    <Document title={`Return label ${input.reference}`} author="Utee">
      <Page size={[288, 432]} style={s.page}>
        <View style={s.box}>
          <Text style={s.eyebrow}>Royal Mail {input.serviceCode === "TSS" ? "Tracked Returns 48" : "Tracked Returns 24"}</Text>
          <Text style={s.big}>{input.trackingNumber}</Text>
          <Text style={s.line}>Reference {input.reference}</Text>
        </View>
        <View style={s.box}>
          <Text style={s.eyebrow}>Deliver to</Text>
          {lines(input.lab).map((l) => <Text key={l} style={s.line}>{l}</Text>)}
        </View>
        <View style={s.box}>
          <Text style={s.eyebrow}>From</Text>
          {lines(input.sender).map((l) => <Text key={l} style={s.line}>{l}</Text>)}
        </View>
        {input.stub && <Text style={s.warn}>Test label. Not valid postage. The live Royal Mail label replaces this once the account key is in place.</Text>}
      </Page>
    </Document>
  );
}
