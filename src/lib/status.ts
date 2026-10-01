export type KitStatus =
  | "generated"
  | "printed"
  | "assigned"
  | "shipped"
  | "delivered"
  | "activated"
  | "in_transit_to_lab"
  | "received_by_lab"
  | "lab_complete"
  | "clinic_received"
  | "report_ready"
  | "closed"
  | "voided";

export type Role = "customer" | "lab" | "clinic" | "admin" | "super_admin";

/** Order of the pipeline, used for the admin funnel and timeline rendering. */
export const KIT_PIPELINE: KitStatus[] = [
  "generated",
  "printed",
  "assigned",
  "shipped",
  "delivered",
  "activated",
  "in_transit_to_lab",
  "received_by_lab",
  "lab_complete",
  "clinic_received",
  "report_ready",
  "closed",
  "voided",
];

/** Statuses before a kit belongs to anyone; left out of patient funnels. */
export const PRE_ASSIGNMENT_STATUSES: KitStatus[] = ["generated", "printed", "voided"];

export const KIT_STATUS_LABELS: Record<KitStatus, string> = {
  generated: "Kit code generated",
  printed: "Kit printed",
  assigned: "Kit assigned to order",
  shipped: "Kit on its way to you",
  delivered: "Kit delivered",
  activated: "Symptoms submitted",
  in_transit_to_lab: "Sample on its way to the lab",
  received_by_lab: "Received by lab",
  lab_complete: "Lab analysis complete",
  clinic_received: "With the clinical team",
  report_ready: "Your report is ready",
  closed: "Closed",
  voided: "Kit code cancelled",
};

/** Admin-facing pipeline stage names. */
export const KIT_STATUS_ADMIN_LABELS: Record<KitStatus, string> = {
  generated: "Generated, not yet printed",
  printed: "Unassigned stock",
  assigned: "Awaiting dispatch",
  shipped: "Outbound",
  delivered: "With patient",
  activated: "Triage submitted",
  in_transit_to_lab: "Returning to lab",
  received_by_lab: "At lab",
  lab_complete: "Awaiting clinic",
  clinic_received: "Clinic reviewing",
  report_ready: "Report ready",
  closed: "Closed",
  voided: "Voided",
};

export const KIT_STATUS_COLORS: Record<KitStatus, string> = {
  generated: "bg-slate-100 text-slate-500",
  printed: "bg-slate-100 text-slate-700",
  assigned: "bg-slate-100 text-slate-700",
  shipped: "bg-pink-50 text-maroon",
  delivered: "bg-pink-50 text-maroon",
  activated: "bg-lavender-50 text-violet-800",
  in_transit_to_lab: "bg-sun text-amber-800",
  received_by_lab: "bg-sun text-amber-800",
  lab_complete: "bg-pink-50 text-maroon",
  clinic_received: "bg-pink-50 text-maroon",
  report_ready: "bg-mint text-emerald-800",
  closed: "bg-slate-100 text-slate-500",
  voided: "bg-rose-50 text-rose-700",
};

/**
 * One-stage rollback map for super-admin recovery (e.g. a lab pot mix-up).
 * Only statuses listed here can be reverted; each reverts to its value.
 */
export const KIT_REVERT_MAP: Partial<Record<KitStatus, KitStatus>> = {
  report_ready: "clinic_received",
  clinic_received: "lab_complete",
  lab_complete: "received_by_lab",
  received_by_lab: "activated",
};

export function homeForRole(role: Role): string {
  switch (role) {
    case "lab":
      return "/lab";
    case "clinic":
      return "/clinic";
    case "admin":
    case "super_admin":
      return "/admin";
    default:
      return "/portal";
  }
}

export function formatMoney(amount: number | string, currency = "GBP") {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(
    Number(amount)
  );
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
