import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { loadPreventions, trackerContext } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { AboutMeForm } from "./AboutMeForm";

export default async function AboutMePage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const ctx = await trackerContext();
  if (!ctx.consents.tracker) redirect("/portal/tracker/consent");
  if (ctx.profile && !edit) redirect("/portal/tracker");
  const active = (await loadPreventions(ctx.supabase, ctx.user.id)).filter((p) => !p.stopped_on);
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader eyebrow="Tracker" title={copy.aboutMe.title} subtitle={copy.aboutMe.intro} />
      <Card>
        <AboutMeForm profile={ctx.profile} active={active} next={edit ? "/portal/tracker/settings" : "/portal/tracker"} />
      </Card>
    </div>
  );
}
