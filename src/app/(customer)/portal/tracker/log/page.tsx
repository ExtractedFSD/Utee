import { PageHeader } from "@/components/ui";
import { requireTracker, loadAll } from "@/lib/tracker/data";
import { copy } from "@/lib/tracker/copy";
import { SYMPTOMS } from "@/lib/tracker/options";
import { orderByUsage } from "@/lib/tracker/stats";
import { LogForm } from "./LogForm";

export default async function LogPage() {
  const { supabase, user } = await requireTracker();
  const data = await loadAll(supabase, user.id);
  const order = orderByUsage(SYMPTOMS.map((s) => s.key), data.symptoms.map((s) => ({ key: s.symptom })));
  const last = data.episodes[0];
  const lastSymptoms = last ? [...new Set(data.symptoms.filter((s) => s.episode_id === last.id).map((s) => s.symptom))] : [];
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader eyebrow="Tracker" title={copy.log.title} />
      <LogForm symptomOrder={order} lastSymptoms={lastSymptoms} />
    </div>
  );
}
