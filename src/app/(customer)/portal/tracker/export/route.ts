import { NextRequest, NextResponse } from "next/server";
import { audit, loadAll, requireTracker, trackerConsents } from "@/lib/tracker/data";
import { isoToday } from "@/lib/tracker/stats";

export const runtime = "nodejs";

function csvCell(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  return [columns.join(","), ...rows.map((r) => columns.map((c) => csvCell(r[c])).join(","))].join("\n");
}

/** Everything the tracker holds for this user. ?format=json (default) or csv */
export async function GET(req: NextRequest) {
  const { supabase, user, profile } = await requireTracker();
  const account = { full_name: user.fullName, date_of_birth: user.dateOfBirth, email: user.email };
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const [data, consents] = await Promise.all([loadAll(supabase, user.id), trackerConsents(supabase, user.id)]);
  await audit(supabase, user.id, "data_exported", { format });
  const today = isoToday();

  if (format === "json") {
    const body = { exported_at: new Date().toISOString(), account, profile, consents, ...data };
    return new NextResponse(JSON.stringify(body, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="utee-tracker-${today}.json"`,
        "cache-control": "private, no-store",
      },
    });
  }

  const sections = [
    ["episodes", toCsv(data.episodes, ["id", "started_on", "ended_on", "notes"])],
    ["symptoms", toCsv(data.symptoms, ["episode_id", "symptom", "other_text", "logged_on"])],
    ["triggers", toCsv(data.triggers, ["episode_id", "trigger", "other_text", "logged_on"])],
    ["treatments", toCsv(data.treatments, ["episode_id", "antibiotic_id", "other_name", "started_on", "days", "course_type", "source", "worked"])],
    ["tests", toCsv(data.tests, ["episode_id", "kind", "tested_on", "result", "notes", "kit_id"])],
    ["checkins", toCsv(data.checkins, ["episode_id", "on_date", "feeling"])],
  ];
  const csv = sections.map(([name, body]) => `# ${name}\n${body}`).join("\n\n") + "\n";
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="utee-tracker-${today}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
