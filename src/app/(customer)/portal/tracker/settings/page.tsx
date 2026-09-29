import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardTitle, LinkButton, PageHeader } from "@/components/ui";
import { trackerContext } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { SettingsPanel } from "./SettingsPanel";

export default async function TrackerSettingsPage() {
  const ctx = await trackerContext();
  if (!ctx.consents.tracker) redirect("/portal/tracker/consent");
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader eyebrow="Tracker" title={copy.settings.title} action={<Link href="/portal/tracker" className="text-sm font-semibold text-maroon">Back to tracker</Link>} />
      <Card>
        <CardTitle>{copy.settings.aboutMe}</CardTitle>
        <LinkButton href="/portal/tracker/about-me?edit=1" variant="secondary">Edit my answers</LinkButton>
      </Card>
      <Card>
        <CardTitle>{copy.settings.export}</CardTitle>
        <p className="text-sm text-slate-600 mb-4">{copy.settings.exportBody}</p>
        <div className="flex flex-wrap gap-2">
          <a href="/portal/tracker/export?format=json" className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[.14em] bg-white text-midnight border border-midnight/15 hover:bg-pink-25">{copy.settings.exportJson}</a>
          <a href="/portal/tracker/export?format=csv" className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[.14em] bg-white text-midnight border border-midnight/15 hover:bg-pink-25">{copy.settings.exportCsv}</a>
        </div>
      </Card>
      <SettingsPanel
        consents={ctx.consents}
        reminderDaily={ctx.profile?.reminder_daily ?? false}
        reminderMonthly={ctx.profile?.reminder_monthly ?? false}
      />
    </div>
  );
}
