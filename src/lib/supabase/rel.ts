/*
 * PostgREST returns an embedded relation as an array, except when the join
 * column is unique (a one-to-one), when it returns a single object or null.
 * clinic_reports, lab_results and triage_submissions are all keyed one per
 * kit, so a kit with a report came back as an object and `.some` threw on
 * it. Read every embedded relation through this so the shape never matters.
 */
export function rel<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  return value ? [value as T] : [];
}
