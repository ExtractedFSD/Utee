/**
 * Where an entry came from, wherever it is shown. On the patient's own
 * screens their entries say "You"; the clinician's view says "Patient".
 */
export function SourcePill({ source, own = true }: { source: "patient" | "utee" | "verified"; own?: boolean }) {
  const look = source === "utee" ? "bg-sky-50 text-sky-900" : source === "verified" ? "bg-mint-50 text-emerald-900" : "bg-pink-50 text-maroon";
  const label = source === "utee" ? "Utee lab" : source === "verified" ? "Clinician checked" : own ? "You" : "Patient";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[12px] font-semibold uppercase tracking-[.08em] whitespace-nowrap ${look}`}>{label}</span>;
}
