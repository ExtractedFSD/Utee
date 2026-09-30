import { loadPreventions, trackerContext } from "@/lib/tracker/data";
import { aiAvailable } from "@/lib/tracker/guided/extract";
import { ANTIBIOTIC_PREVENTIONS, preventionName } from "@/lib/tracker/prevention";
import { isoDaysAgo } from "@/lib/tracker/stats";
import { antibioticName } from "@/lib/tracker/search";
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
  // Open UTIs, newest first, with their antibiotics, so Una can close one and ask how it went.
  const { data: openRows } = ready
    ? await ctx.supabase.from("tracker_episodes").select("id, started_on, tracker_treatments(id, antibiotic_id, other_name, worked)").eq("user_id", ctx.user.id).is("ended_on", null).order("started_on", { ascending: false })
    : { data: [] };
  const today = isoDaysAgo(0);
  const openIds = (openRows ?? []).map((e) => e.id as string);
  const [{ data: todaySymptoms }, { data: todayCheckin }] = openIds.length
    ? await Promise.all([
        ctx.supabase.from("tracker_symptoms").select("episode_id, symptom").in("episode_id", openIds).eq("logged_on", today),
        ctx.supabase.from("tracker_checkins").select("episode_id, feeling").eq("user_id", ctx.user.id).eq("on_date", today),
      ])
    : [{ data: [] }, { data: [] }];
  const openEpisodes = (openRows ?? []).map((e) => ({
    id: e.id as string,
    startedOn: e.started_on as string,
    treatments: ((e.tracker_treatments ?? []) as { id: string; antibiotic_id: string; other_name: string | null; worked: string | null }[]).map((t) => ({ id: t.id, name: antibioticName(t.antibiotic_id, t.other_name), worked: t.worked })),
    symptomsToday: (todaySymptoms ?? []).filter((x) => x.episode_id === e.id).map((x) => x.symptom as string),
    feelingToday: (todayCheckin ?? []).find((c) => c.episode_id === e.id)?.feeling ?? null,
  }));
  const weekAgo = isoDaysAgo(7);
  const stale = [...openEpisodes].reverse().find((e) => e.startedOn <= weekAgo) ?? null;
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
          staleOpen: stale ? stale.id : null,
        }}
        openEpisodes={openEpisodes}
      />
    </>
  );
}
