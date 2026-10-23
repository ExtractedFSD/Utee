/** Where an entry came from, wherever it is shown: the patient, the Utee lab, or a clinician's check. */
export function SourcePill({ source }: { source: "patient" | "utee" | "verified" }) {
  const look = source === "utee" ? "bg-sky-50 text-sky-900" : source === "verified" ? "bg-mint-50 text-emerald-900" : "bg-pink-50 text-maroon";
  const label = source === "utee" ? "Utee lab" : source === "verified" ? "Clinician checked" : "Patient";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[.08em] whitespace-nowrap ${look}`}>{label}</span>;
}
