import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { requireTracker, loadAll, ownKits } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { SYMPTOMS, TRIGGERS } from "@/lib/tracker/options";
import { redFlagFor } from "@/lib/tracker/redflags";
import { episodeLength, formatDay, isoToday, orderByUsage } from "@/lib/tracker/stats";
import { RedFlagBanner } from "../../components/RedFlagBanner";
import { EpisodeEditor } from "./EpisodeEditor";

export default async function EpisodePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
}) {
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const { supabase, user, profile } = await requireTracker();
  const data = await loadAll(supabase, user.id);
  const episode = data.episodes.find((e) => e.id === id);
  if (!episode) notFound();

  const symptoms = data.symptoms.filter((s) => s.episode_id === id);
  const triggers = data.triggers.filter((t) => t.episode_id === id);
  const treatments = data.treatments.filter((t) => t.episode_id === id);
  const tests = data.tests.filter((t) => t.episode_id === id);
  const today = isoToday();
  const checkin = data.checkins.find((c) => c.on_date === today) ?? null;
  const kits = await ownKits(supabase);
  const flag = redFlagFor(symptoms.map((s) => s.symptom), profile.pregnant_or_trying);
  const previousAntibiotics = [...new Set(data.treatments.map((t) => t.antibiotic_id))].filter((a) => a !== "other" && a !== "dont_know").slice(0, 5);
  const symptomOrder = orderByUsage(SYMPTOMS.map((s) => s.key), data.symptoms.map((s) => ({ key: s.symptom })));
  const triggerOrder = orderByUsage(TRIGGERS.map((t) => t.key), data.triggers.map((t) => ({ key: t.trigger })));
  const day = episodeLength(episode, today);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        eyebrow={episode.ended_on ? copy.log.closed(formatDay(episode.ended_on)) : copy.dashboard.openEpisodeDay(day)}
        title={`UTI from ${formatDay(episode.started_on)}`}
        action={<Link href="/portal/tracker" className="text-sm font-semibold text-maroon">Back to tracker</Link>}
      />
      <RedFlagBanner flag={flag} />
      <EpisodeEditor
        episode={episode}
        isNew={!!isNew}
        symptoms={symptoms.map((s) => ({ id: s.id, key: s.symptom, other: s.other_text }))}
        triggers={triggers.map((t) => ({ id: t.id, key: t.trigger, other: t.other_text }))}
        treatments={treatments}
        tests={tests.map((t) => {
          const kit = t.kit_id ? kits.find((k) => k.id === t.kit_id) : null;
          return { ...t, kitCode: kit?.code ?? null, kitStatus: kit?.status ?? null, kitReportReady: kit?.reportReady ?? false };
        })}
        feelingToday={checkin?.feeling ?? null}
        symptomOrder={symptomOrder}
        triggerOrder={triggerOrder}
        previousAntibiotics={previousAntibiotics}
        lastSource={profile.last_treatment_source}
        kits={kits.filter((k) => !tests.some((t) => t.kit_id === k.id))}
      />
    </div>
  );
}
