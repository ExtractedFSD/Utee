import { Card, CardTitle } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import type { Patterns } from "@/lib/tracker/stats";
import { tipsFor } from "@/lib/tracker/tips";

/**
 * A person's own patterns as thin bars (share of their UTIs), one hue per
 * group, direct labels, no legend. Then a few ideas that fit the triggers
 * they log most, clearly marked as general information.
 */
export function PatternsCard({ p }: { p: Patterns }) {
  const has = p.enough && (p.triggers.length || p.symptoms.length || p.antibiotics.length);
  const tips = tipsFor(has ? p.triggers.map((t) => t.key) : []);
  return (
    <Card data-testid="patterns-card">
      <CardTitle>{copy.dashboard.patterns}</CardTitle>
      {has ? (
        <div className="space-y-6">
          {p.triggers.length > 0 && (
            <Bars title={copy.patterns.triggersTitle} sub={copy.patterns.ofUtis(p.total)} rows={p.triggers.map((t) => ({ label: t.label, value: t.count, max: p.total, text: `${t.count}` }))} tone="bg-maroon" />
          )}
          {p.symptoms.length > 0 && (
            <Bars title={copy.patterns.symptomsTitle} sub={copy.patterns.ofUtis(p.total)} rows={p.symptoms.map((t) => ({ label: t.label, value: t.count, max: p.total, text: `${t.count}` }))} tone="bg-lavender" />
          )}
          {p.antibiotics.length > 0 && (
            <Bars title={copy.patterns.antibioticsTitle} rows={p.antibiotics.map((a) => ({ label: a.name, value: a.worked, max: a.rated, text: copy.patterns.helpedOf(a.worked, a.rated) }))} tone="bg-emerald-500" />
          )}
        </div>
      ) : (
        <p className="text-sm text-slate-600">{copy.dashboard.patternsEmpty}</p>
      )}

      <div className="mt-6 border-t border-slate-100 pt-5" data-testid="patterns-tips">
        <p className="text-sm font-semibold text-midnight mb-3">{has && p.triggers.length ? copy.patterns.tipsTitle : copy.patterns.tipsTitleGeneral}</p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {tips.map((t) => (
            <li key={t.key} className="rounded-2xl bg-pink-25 p-4">
              <p className="text-sm font-semibold text-midnight">{t.title}</p>
              <p className="mt-1 text-sm text-slate-700 leading-relaxed">{t.body}</p>
              {t.source && (
                <a href={t.source.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-maroon">{copy.patterns.readMore(t.source.name)}</a>
              )}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-slate-500">{copy.patterns.tipsNote}</p>
      </div>
    </Card>
  );
}

function Bars({ title, sub, rows, tone }: { title: string; sub?: string; rows: { label: string; value: number; max: number; text: string }[]; tone: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <p className="text-sm font-semibold text-slate-700">{title}</p>
        {sub && <p className="text-xs text-slate-500">{sub}</p>}
      </div>
      <ul className="space-y-2.5">
        {rows.map((r) => {
          const pct = r.max ? Math.round((r.value / r.max) * 100) : 0;
          return (
            <li key={r.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm sm:flex-nowrap">
              <span className="min-w-0 flex-1 truncate text-midnight sm:w-44 sm:flex-none">{r.label}</span>
              <span className="order-2 text-xs font-semibold text-slate-600 tabular-nums sm:order-3">{r.text}</span>
              <span className="order-3 h-2 basis-full rounded-r bg-slate-100 sm:order-2 sm:flex-1 sm:basis-auto" role="img" aria-label={`${r.label}: ${r.text}`}>
                <span className={`block h-2 rounded-r ${tone}`} style={{ width: `${Math.max(pct, r.value ? 4 : 0)}%` }} />
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
