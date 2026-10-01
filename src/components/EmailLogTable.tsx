import { formatDateTime } from "@/lib/status";

export type EmailLogRow = {
  id: string;
  to_email: string;
  subject: string;
  kind: string | null;
  status: string;
  error: string | null;
  created_at: string;
  kit_code?: string | null;
};

const TONE: Record<string, string> = {
  sent: "bg-slate-100 text-slate-700",
  delivered: "bg-mint text-emerald-800",
  failed: "bg-peach-50 text-maroon",
  bounced: "bg-peach-50 text-maroon",
  complained: "bg-peach-50 text-maroon",
  skipped: "bg-sun text-amber-800",
  delivery_delayed: "bg-sun text-amber-800",
};

/** Super admin view of what was emailed, to whom, and whether it got there. */
export function EmailLogTable({ rows, showKit = false }: { rows: EmailLogRow[]; showKit?: boolean }) {
  if (!rows.length) return <p className="text-sm text-slate-400">No emails recorded.</p>;
  return (
    <table className="w-full text-sm" data-testid="email-log">
      <thead className="text-left text-xs font-semibold uppercase tracking-[.12em] text-slate-400">
        <tr>
          <th className="py-2 pr-3">When</th>
          {showKit && <th className="py-2 pr-3">Kit</th>}
          <th className="py-2 pr-3">To</th>
          <th className="py-2 pr-3">Subject</th>
          <th className="py-2">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-t border-slate-100 align-top">
            <td className="py-2 pr-3 whitespace-nowrap text-slate-500">{formatDateTime(r.created_at)}</td>
            {showKit && <td className="py-2 pr-3 font-mono text-slate-600">{r.kit_code ?? ""}</td>}
            <td className="py-2 pr-3 text-slate-700">{r.to_email}</td>
            <td className="py-2 pr-3 text-slate-700">
              {r.subject}
              {r.kind && <span className="block text-xs text-slate-400">{r.kind}</span>}
            </td>
            <td className="py-2">
              <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONE[r.status] ?? TONE.sent}`}>{r.status}</span>
              {r.error && <span className="block max-w-xs text-xs text-rose-600">{r.error}</span>}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
