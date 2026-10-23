import Link from "next/link";
import { Card, CardTitle, LinkButton } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import type { PassportGlance } from "@/lib/tracker/passport";
import { formatDay } from "@/lib/tracker/stats";

/**
 * The passport at a glance: the few numbers and lines a clinician asks for
 * first, each a tap away from where it is edited. Empty sections say what
 * would go there rather than showing blanks.
 */
export function PassportCard({ glance, started }: { glance: PassportGlance; started: boolean }) {
  return (
    <Card data-testid="passport-card">
      <CardTitle>{copy.passport.title}</CardTitle>

      {!started ? (
        <div>
          <p className="text-sm text-slate-600 mb-4 max-w-xl">{copy.passport.completeBody}</p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/portal/passport/record?tab=about" variant="secondary">{copy.passport.aboutYou}</LinkButton>
            <LinkButton href="/portal/passport/record?tab=investigations" variant="secondary">{copy.investigations.add}</LinkButton>
            <LinkButton href="/portal/passport/record?tab=results" variant="secondary">{copy.cultures.add}</LinkButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <dl className="grid grid-cols-3 gap-3">
            <Stat label={copy.passport.utis6m} value={String(glance.utis6m)} />
            <Stat label={copy.passport.utis12m} value={String(glance.utis12m)} />
            <Stat label={copy.passport.lifetime} value={glance.lifetime === null ? "?" : String(glance.lifetime)} hint={glance.lifetime === null ? copy.passport.lifetimeUnknown : undefined} href={glance.lifetime === null ? "/portal/passport/record?tab=about" : undefined} />
          </dl>
          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500 mb-1">{copy.passport.prophylaxis}</p>
              {glance.activeProphylaxis.length ? (
                <ul className="space-y-0.5 text-slate-700">{glance.activeProphylaxis.map((line) => <li key={line}>{line}</li>)}</ul>
              ) : (
                <Link href="/portal/passport/record?tab=taking" className="text-slate-500 hover:text-midnight">{copy.passport.prophylaxisNone}</Link>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500 mb-1">{copy.cultures.mainOrganism}</p>
              {glance.mainOrganism ? (
                <Link href="/portal/passport/record?tab=results" className="text-slate-700 hover:text-midnight">
                  <span className="font-semibold text-midnight">{glance.mainOrganism.name}</span>
                  <span className="text-slate-600"> in {glance.mainOrganism.times} of {glance.mainOrganism.of} positive result{glance.mainOrganism.of === 1 ? "" : "s"}</span>
                  {glance.lastCulture && <span className="text-slate-500"> · last {formatDay(glance.lastCulture.on)}</span>}
                </Link>
              ) : (
                <Link href="/portal/passport/record?tab=results" className="text-slate-500 hover:text-midnight">{copy.cultures.culturesNone}</Link>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-slate-500 mb-1">{copy.passport.lastInvestigation}</p>
              {glance.lastInvestigation ? (
                <Link href="/portal/passport/record?tab=investigations" className="text-slate-700 hover:text-midnight">
                  <span className="font-semibold text-midnight">{glance.lastInvestigation.title}</span> {formatDay(glance.lastInvestigation.on)}
                  {glance.lastInvestigation.detail && <span className="text-slate-600">: {glance.lastInvestigation.detail}</span>}
                  {glance.investigationCount > 1 && <span className="text-slate-500"> · {glance.investigationCount} in total</span>}
                </Link>
              ) : (
                <Link href="/portal/passport/record?tab=investigations" className="text-slate-500 hover:text-midnight">{copy.passport.investigationsNone}</Link>
              )}
            </div>
            {(glance.allergies.length > 0 || glance.medicalHistory.length > 0) && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                {glance.allergies.length > 0 && <span><span className="font-semibold text-maroon">Allergies:</span> {glance.allergies.join("; ")}</span>}
                {glance.medicalHistory.length > 0 && <span><span className="font-semibold text-midnight">History:</span> {glance.medicalHistory.join(", ")}</span>}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value, hint, href }: { label: string; value: string; hint?: string; href?: string }) {
  const body = (
    <>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="font-display text-3xl font-light text-midnight">{value}</dd>
      {hint && <dd className="text-xs text-maroon">{hint}</dd>}
    </>
  );
  return href ? <Link href={href} className="block">{body}</Link> : <div>{body}</div>;
}
