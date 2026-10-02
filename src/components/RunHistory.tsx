import { judgeSheet, organismNames, type Controls, type UropathogenKey } from "@/lib/lab-sheet";
import { formatDateTime } from "@/lib/status";

export type LabResultRow = {
  outcome: string;
  organisms: string[] | null;
  controls: Controls | null;
  valid: boolean;
  comments: string | null;
  uploaded_at: string;
  lab_user_id: string | null;
  previous_attempts: unknown;
};

type Attempt = {
  outcome: string;
  organisms?: string[] | null;
  controls?: Controls | null;
  valid?: boolean;
  comments?: string | null;
  uploaded_at: string;
  lab_user_id?: string | null;
  amended?: boolean;
};

export type RunRow = {
  n: number;
  at: string;
  by: string | null;
  controls: Controls | null;
  organisms: string[];
  comments: string | null;
  verdict: "valid" | "invalid" | "amended";
  reasons: string[];
  outcome: string;
  current: boolean;
};

/** Every run of the test on this specimen, oldest first, from the result row. */
export function runsFrom(result: LabResultRow, names: Record<string, string> = {}): RunRow[] {
  const earlier = (Array.isArray(result.previous_attempts) ? result.previous_attempts : []) as Attempt[];
  const all: (Attempt & { current: boolean })[] = [
    ...earlier.map((a) => ({ ...a, current: false })),
    { ...result, current: true },
  ];
  let n = 0;
  let previousWasAmended = false;
  return all.map((a) => {
    const controls = (a.controls as Controls | null) ?? null;
    const organisms = (a.organisms as string[] | null) ?? [];
    const verdict = controls ? judgeSheet({ organisms: organisms as UropathogenKey[], controls }) : null;
    // A record marked amended is the superseded version of a run; the
    // correction that follows it belongs to the same run number.
    if (!previousWasAmended) n += 1;
    previousWasAmended = !!a.amended;
    return {
      n,
      at: a.uploaded_at,
      by: (a.lab_user_id && names[a.lab_user_id]) || null,
      controls,
      organisms: organismNames(organisms),
      comments: a.comments ?? null,
      verdict: a.amended ? "amended" : (verdict ? verdict.valid : a.valid !== false) ? "valid" : "invalid",
      reasons: verdict && !verdict.valid ? verdict.reasons : [],
      outcome: a.outcome,
      current: a.current,
    };
  });
}

function Tick({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${ok ? "bg-mint text-emerald-800" : "bg-peach-50 text-maroon"}`}>
      {ok ? "✓" : "✗"} {label}
    </span>
  );
}

const VERDICT: Record<RunRow["verdict"], { text: string; cls: string }> = {
  valid: { text: "Valid", cls: "bg-mint text-emerald-800" },
  invalid: { text: "Invalid", cls: "bg-peach-50 text-maroon" },
  amended: { text: "Superseded by amendment", cls: "bg-slate-100 text-slate-600" },
};

/** The runs, newest first, each with its controls, ticks, comment and verdict. */
export function RunHistory({ runs }: { runs: RunRow[] }) {
  const shown = [...runs].reverse();
  return (
    <ol className="space-y-3" data-testid="run-history">
      {shown.map((r, i) => {
        const v = VERDICT[r.verdict];
        return (
          <li key={`${r.n}-${i}`} className={`rounded-2xl border p-4 ${r.current ? "border-maroon/30" : "border-slate-200"}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-midnight">
                Run {r.n}
                {r.current && <span className="ml-2 text-xs font-normal text-slate-500">current</span>}
              </p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${v.cls}`}>{v.text}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {formatDateTime(r.at)}
              {r.by ? ` · ${r.by}` : ""}
            </p>
            {r.controls && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Tick ok={r.controls.positive} label="Positive control" />
                <Tick ok={r.controls.negative} label="Negative control" />
                <Tick ok={!r.controls.error} label={r.controls.error ? "Error reported" : "No error"} />
              </div>
            )}
            <p className="mt-2 text-sm text-slate-700">
              {r.organisms.length ? `Ticked: ${r.organisms.join(", ")}` : "No uropathogen ticked"}
              {r.verdict !== "invalid" && <span className="text-slate-500"> · outcome {r.outcome}</span>}
            </p>
            {r.reasons.length > 0 && <p className="mt-1 text-sm text-maroon">{r.reasons.join("; ")}</p>}
            {r.comments && <p className="mt-1 text-sm text-slate-600">Comment: {r.comments}</p>}
          </li>
        );
      })}
    </ol>
  );
}
