import Link from "next/link";
import { Card, CardTitle, LinkButton } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";
import type { PassportGlance } from "@/lib/tracker/passport";
import { formatDay } from "@/lib/tracker/stats";
import { SourcePill } from "./SourcePill";

/**
 * At a glance: the three numbers and three lines a clinician asks for
 * first, each a tap away from where it is edited. Before the first UTI it
 * is one sentence and one button.
 */
export function PassportCard({ glance, brandNew }: { glance: PassportGlance; brandNew: boolean }) {
  if (brandNew) {
    return (
      <Card data-testid="passport-card">
        <div className="text-center">
          <CardTitle>{copy.passport.title}</CardTitle>
          <p className="mx-auto max-w-sm text-[13px] text-[#5a4a6e] -mt-2 mb-4">{copy.dashboard.glanceEmpty}</p>
          <LinkButton href="/portal/passport/log" variant="secondary">{copy.dashboard.logPastUti}</LinkButton>
        </div>
      </Card>
    );
  }
  const row = "flex items-center justify-between gap-4 py-3";
  const add = "text-sm font-semibold text-maroon";
  return (
    <Card data-testid="passport-card">
      <CardTitle>{copy.passport.title}</CardTitle>
      <dl className="grid grid-cols-3 gap-3 mb-2">
        <Stat label={copy.passport.utis6m} value={String(glance.utis6m)} />
        <Stat label={copy.passport.utis12m} value={String(glance.utis12m)} />
        <Stat label={copy.passport.lifetime} value={glance.lifetime === null ? "–" : String(glance.lifetime)} href={glance.lifetime === null ? "/portal/passport/record?tab=about" : undefined} />
      </dl>
      <dl className="divide-y divide-[rgba(29,0,58,.08)] text-sm">
        <div className={row}>
          <dt className="text-[#5a4a6e]">{copy.dashboard.mainOrganism}</dt>
          <dd className="flex items-center gap-2 text-right">
            {glance.mainOrganism ? (
              <>
                <Link href="/portal/passport/record?tab=results" className="font-semibold text-midnight">{glance.mainOrganism.name}</Link>
                <SourcePill source={glance.mainOrganism.source} />
              </>
            ) : (
              <Link href="/portal/passport/record?tab=results" className={add}>{copy.dashboard.add}</Link>
            )}
          </dd>
        </div>
        <div className={row}>
          <dt className="text-[#5a4a6e]">{copy.dashboard.lastInvestigation}</dt>
          <dd className="text-right">
            {glance.lastInvestigation ? (
              <Link href="/portal/passport/record?tab=investigations" className="font-semibold text-midnight">
                {glance.lastInvestigation.title} · {formatDay(glance.lastInvestigation.on).replace(/ \d{4}$/, "")}
              </Link>
            ) : (
              <Link href="/portal/passport/record?tab=investigations" className={add}>{copy.dashboard.add}</Link>
            )}
          </dd>
        </div>
        <div className={row}>
          <dt className="text-[#5a4a6e]">{copy.dashboard.allergies}</dt>
          <dd className="text-right">
            {glance.allergies.length ? (
              <Link href="/portal/passport/record?tab=about" className="font-semibold text-midnight">{glance.allergies.join("; ")}</Link>
            ) : (
              <Link href="/portal/passport/record?tab=about" className="font-semibold text-midnight">{copy.dashboard.noneRecorded}</Link>
            )}
          </dd>
        </div>
      </dl>
    </Card>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <>
      <dt className="text-xs text-[#5a4a6e]">{label}</dt>
      <dd className="font-display text-[28px] font-light leading-tight text-midnight">{value}</dd>
    </>
  );
  return href ? <Link href={href} className="block">{body}</Link> : <div>{body}</div>;
}
