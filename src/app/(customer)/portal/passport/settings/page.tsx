import { redirect } from "next/navigation";
import { Breadcrumb, PageHeader } from "@/components/ui";
import { trackerContext } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { SettingsPanel } from "./SettingsPanel";

export default async function TrackerSettingsPage() {
  const ctx = await trackerContext();
  if (!ctx.consents.tracker) redirect("/portal/passport/consent");
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader eyebrow="UTI Passport" title={copy.settings.title} breadcrumb={<Breadcrumb href="/portal/passport" label={copy.nav.today} />} />
      <SettingsPanel
        consents={ctx.consents}
        reminderDaily={ctx.profile?.reminder_daily ?? false}
        reminderMonthly={ctx.profile?.reminder_monthly ?? false}
        unaAi={ctx.profile?.una_ai ?? true}
      />
    </div>
  );
}
