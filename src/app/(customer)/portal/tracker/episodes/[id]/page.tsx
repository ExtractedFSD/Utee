import { notFound } from "next/navigation";
import { requireTracker, loadAll, ownKits } from "@/lib/tracker/data";
import { SYMPTOMS, TRIGGERS } from "@/lib/tracker/options";
import { isoDaysAgo, isoToday, orderByUsage } from "@/lib/tracker/stats";
import { EpisodeEditor } from "./EpisodeEditor";

export default async function EpisodePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user, profile } = await requireTracker();
  const data = await loadAll(supabase, user.id);
  const episode = data.episodes.find((e) => e.id === id);
  if (!episode) notFound();

  const today = isoToday();
  const yesterday = isoDaysAgo(1);
  const symptoms = data.symptoms.filter((s) => s.episode_id === id);
  const triggers = data.triggers.filter((t) => t.episode_id === id);
  const treatments = data.treatments.filter((t) => t.episode_id === id);
  const tests = data.tests.filter((t) => t.episode_id === id);
  const kits = await ownKits(supabase);
  const previousAntibiotics = [...new Set(data.treatments.map((t) => t.antibiotic_id))].slice(0, 6);

  return (
    <EpisodeEditor
      episode={episode}
      today={today}
      pregnantOrTrying={profile.pregnant_or_trying}
      todaySymptoms={symptoms.filter((s) => s.logged_on === today).map((s) => ({ key: s.symptom, other: s.other_text }))}
      yesterdayHasSymptoms={symptoms.some((s) => s.logged_on === yesterday)}
      triggers={[...new Map(triggers.map((t) => [t.trigger, { key: t.trigger, other: t.other_text }])).values()]}
      treatments={treatments}
      tests={tests.map((t) => {
        const kit = t.kit_id ? kits.find((k) => k.id === t.kit_id) : null;
        return { ...t, kitCode: kit?.code ?? null, kitStatus: kit?.status ?? null, kitReportReady: kit?.reportReady ?? false };
      })}
      feelingToday={data.checkins.find((c) => c.on_date === today)?.feeling ?? null}
      symptomOrder={orderByUsage(SYMPTOMS.map((s) => s.key), data.symptoms.map((s) => ({ key: s.symptom })))}
      triggerOrder={orderByUsage(TRIGGERS.map((t) => t.key), data.triggers.map((t) => ({ key: t.trigger })))}
      previousAntibiotics={previousAntibiotics}
      lastSource={profile.last_treatment_source}
      kits={kits.filter((k) => !tests.some((t) => t.kit_id === k.id))}
    />
  );
}
