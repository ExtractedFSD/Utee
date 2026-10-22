/*
 * Clinician verification: a named clinician has confirmed that a
 * patient-entered investigation or culture matches the original report.
 * Entries stay patient-owned; a verification is a mark on them that goes
 * when the entry changes.
 */
export type VerificationEntity = "investigation" | "culture";

export type VerificationRow = {
  id: string;
  entity: VerificationEntity;
  entity_id: string;
  verified_name: string;
  verified_at: string;
};

export function verificationFor(list: VerificationRow[], entity: VerificationEntity, entityId: string): VerificationRow | null {
  return list.find((v) => v.entity === entity && v.entity_id === entityId) ?? null;
}

/** "Verified by Prof Bob Yang, 3 Nov 2026" */
export function verifiedLine(v: VerificationRow | null): string | null {
  if (!v) return null;
  const on = new Date(v.verified_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/London" });
  return `Verified by ${v.verified_name}, ${on}`;
}
