import { loadPreventions, trackerContext } from "@/lib/tracker/data";
import { aiAvailable } from "@/lib/tracker/guided/extract";
import { ANTIBIOTIC_PREVENTIONS, preventionName } from "@/lib/tracker/prevention";
import { isoDaysAgo } from "@/lib/tracker/stats";
import { ChatBubble } from "./components/ChatBubble";

/**
 * Every tracker page gets Una in the corner once the person is set up. The
 * bubble is always in the tree (disabled before setup) so the layout's shape
 * never changes under the page.
 */
export default async function TrackerLayout({ children }: { children: React.ReactNode }) {
  const ctx = await trackerContext();
  const ready = ctx.consents.tracker && !!ctx.profile;
  const active = ready ? (await loadPreventions(ctx.supabase, ctx.user.id)).filter((p) => !p.stopped_on) : [];
  const threeWeeksAgo = isoDaysAgo(21);
  const unrated = active.find((p) => !p.helping && (p.started_on ?? p.created_at.slice(0, 10)) <= threeWeeksAgo) ?? null;
  const antibiotic = active.find((p) => ANTIBIOTIC_PREVENTIONS.includes(p.option_key)) ?? null;
  return (
    <>
      {/* Room at the bottom so the last control on a page never sits under the bubble. */}
      <div className={ready ? "pb-24" : ""}>{children}</div>
      <ChatBubble
        enabled={ready}
        aiAvailable={aiAvailable()}
        pregnantOrTrying={ctx.profile?.pregnant_or_trying ?? "no"}
        activePreventions={active.map((p) => p.option_key)}
        nudges={{
          unrated: unrated ? { id: unrated.id, name: preventionName(unrated) } : null,
          antibioticPrevention: antibiotic ? preventionName(antibiotic) : null,
        }}
      />
    </>
  );
}
