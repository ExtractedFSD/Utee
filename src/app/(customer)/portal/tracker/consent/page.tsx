import { redirect } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { trackerContext } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { ConsentForm } from "./ConsentForm";

export default async function TrackerConsentPage() {
  const ctx = await trackerContext();
  if (ctx.consents.tracker) redirect(ctx.profile ? "/portal/tracker" : "/portal/tracker/about-me");
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader eyebrow="Tracker" title={copy.consent.title} subtitle={copy.consent.intro} />
      <Card>
        <ConsentForm />
      </Card>
    </div>
  );
}
