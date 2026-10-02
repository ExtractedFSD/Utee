import type { Role } from "@/lib/status";

export const ROLES: Role[] = ["customer", "lab", "clinic", "fulfilment", "admin", "super_admin"];

export const ROLE_LABELS: Record<Role, string> = {
  customer: "Customer",
  lab: "Lab",
  clinic: "Clinic",
  fulfilment: "Fulfilment",
  admin: "Admin",
  super_admin: "Super admin",
};

/** What each role can see, in the words the users page shows. */
export const ROLE_HELP: Record<Role, string> = {
  customer: "Their own kits, results, tracker and orders.",
  lab: "Specimens by code only. No patient identity.",
  clinic: "Cases with symptoms and results; publishes reports.",
  fulfilment: "Dispatch and retail packing tools only.",
  admin: "Patients, kits, lab and clinic views.",
  super_admin: "Everything, plus batches, users, the email log and the dashboard.",
};
