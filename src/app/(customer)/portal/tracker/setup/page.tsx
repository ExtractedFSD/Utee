import { redirect } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { loadPreventions, trackerContext } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { aiAvailable } from "@/lib/tracker/guided/extract";
import { GuidedChat } from "./GuidedChat";

/**
 * Conversational setup: about you, what you take, then UTIs one message at
 * a time. ?mode=utis skips straight to adding UTIs for people already set up.
 */
export default async function GuidedSetupPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const { mode } = await searchParams;
  const ctx = await trackerContext();
  if (!ctx.consents.tracker) redirect("/portal/tracker/consent");
  const quick = mode === "utis" && !!ctx.profile;
  const active = ctx.profile ? (await loadPreventions(ctx.supabase, ctx.user.id)).filter((p) => !p.stopped_on).map((p) => p.option_key) : [];
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader
        eyebrow="Tracker"
        title={quick ? copy.guided.titleQuick : copy.guided.title}
        action={quick
          ? <Link href="/portal/tracker" className="text-sm font-semibold text-maroon">Back to tracker</Link>
          : <Link href="/portal/tracker/about-me" className="text-sm font-semibold text-maroon">{copy.guided.preferForm}</Link>}
      />
      <GuidedChat
        mode={quick ? "utis" : "full"}
        aiAvailable={aiAvailable()}
        pregnantOrTrying={ctx.profile?.pregnant_or_trying ?? "no"}
        activePreventions={active}
        initialAbout={ctx.profile ? { menopause_stage: ctx.profile.menopause_stage ?? "prefer_not", contraception: ctx.profile.contraception ?? "prefer_not", pregnant_or_trying: ctx.profile.pregnant_or_trying } : null}
      />
    </div>
  );
}
