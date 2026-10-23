import { Card, CardTitle } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import type { Patterns } from "@/lib/tracker/stats";

/**
 * A person's own patterns as thin bars (share of their UTIs), one hue per
 * group, direct labels, no legend. Only rendered once two UTIs are logged.
 */
export function PatternsCard({ p }: { p: Patterns }) {
  const has = p.enough && (p.triggers.length || p.symptoms.length || p.antibiotics.length);
  if (!has) return null;
  return (
    <Card data-testid="patterns-card">
      <CardTitle>{copy.dashboard.patterns}</CardTitle>
      <div className="space-y-5">
        {p.symptoms.length > 0 && (
          <Bars title={copy.patterns.noticedMost(p.total)} rows={p.symptoms.map((t) => ({ label: t.label, value: t.count, max: p.total, text: `${t.count}` }))} tone="bg-lavender" track="bg-lavender-50" />
        )}
        {p.triggers.length > 0 && (
          <Bars title={copy.patterns.triggersTitle} rows={p.triggers.map((t) => ({ label: t.label, value: t.count, max: p.total, text: `${t.count}` }))} tone="bg-maroon" track="bg-pink-50" />
        )}
        {p.antibiotics.length > 0 && (
          <Bars title={copy.patterns.antibioticsRated} rows={p.antibiotics.map((a) => ({ label: a.name, value: a.worked, max: a.rated, text: copy.patterns.helpedOf(a.worked, a.rated) }))} tone="bg-mint" track="bg-mint-50" />
        )}
      </div>
    </Card>
  );
}

function Bars({ title, rows, tone, track }: { title: string; rows: { label: string; value: number; max: number; text: string }[]; tone: string; track: string }) {
  return (
    <div>
      <p className="text-xs text-[#5a4a6e] mb-2">{title}</p>
      <ul className="space-y-2.5">
        {rows.map((r) => {
          const pct = r.max ? Math.round((r.value / r.max) * 100) : 0;
          return (
            <li key={r.label} className="grid grid-cols-[minmax(0,11rem)_1fr_auto] items-center gap-3 text-sm">
              <span className="min-w-0 text-midnight">{r.label}</span>
              <span className={`block h-2 rounded-full ${track}`} role="img" aria-label={`${r.label}: ${r.text}`}>
                <span className={`block h-2 rounded-full ${tone}`} style={{ width: `${Math.max(pct, r.value ? 4 : 0)}%` }} />
              </span>
              <span className="text-xs font-semibold text-[#5a4a6e] tabular-nums">{r.text}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
