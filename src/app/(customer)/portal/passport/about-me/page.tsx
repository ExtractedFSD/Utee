import { redirect } from "next/navigation";
import { Breadcrumb, PageHeader } from "@/components/ui";
import { loadPreventions, trackerContext } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { AboutMeForm, type Step } from "./AboutMeForm";

/** First-time setup by form (the alternative to Una), in three steps. Once a profile exists this lives under Record. */
export default async function AboutMePage({ searchParams }: { searchParams: Promise<{ edit?: string; step?: string }> }) {
  const { edit, step: wanted } = await searchParams;
  const ctx = await trackerContext();
  if (!ctx.consents.tracker) redirect("/portal/passport/consent");
  // Mid-setup the profile already exists after step 1; only a cold visit goes to Record.
  if (ctx.profile && !edit && !wanted) redirect("/portal/passport/record?tab=about");
  const step = ([1, 2, 3].includes(Number(wanted)) ? Number(wanted) : 1) as Step;
  const active = (await loadPreventions(ctx.supabase, ctx.user.id)).filter((p) => !p.stopped_on);
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        eyebrow={copy.record.steps.eyebrow(step)}
        title={copy.record.steps.titles[step - 1]}
        subtitle={copy.record.steps.reasons[step - 1]}
        breadcrumb={step > 1 ? <Breadcrumb href={`/portal/passport/about-me?step=${step - 1}`} label={copy.record.steps.back} /> : undefined}
      />
      <AboutMeForm profile={ctx.profile} active={active} step={step} base={edit ? "/portal/passport/about-me?edit=1" : "/portal/passport/about-me"} backHref="/portal/passport/setup" done="/portal/passport" />
    </div>
  );
}
