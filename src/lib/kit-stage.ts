import type { KitStatus } from "@/lib/status";

/** Where a kit is, in the patient's words, with the colour of that stage. */
export function kitStage(status: KitStatus): { label: string; tone: string } {
  switch (status) {
    case "assigned":
    case "shipped":
    case "delivered":
      return { label: "Posted to you", tone: "bg-sky-50 text-sky-900" };
    case "activated":
    case "in_transit_to_lab":
    case "received_by_lab":
    case "lab_query":
      return { label: status === "lab_query" ? "Lab checking a problem" : "At the lab", tone: "bg-sun text-amber-900" };
    case "lab_complete":
    case "clinic_received":
      return { label: "With the clinical team", tone: "bg-lavender-50 text-violet-900" };
    case "report_ready":
      return { label: "Result ready · view", tone: "bg-mint-50 text-emerald-900" };
    case "voided":
      return { label: "Cancelled", tone: "bg-rose-50 text-rose-700" };
    default:
      return { label: "Closed", tone: "bg-slate-100 text-slate-600" };
  }
}
