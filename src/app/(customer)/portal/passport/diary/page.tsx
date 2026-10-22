import { requireTracker, loadAll } from "@/lib/tracker/data";
import { diaryEntries, feelingStrip } from "@/lib/tracker/diary";
import { SYMPTOMS, TEST_KINDS, labelFor } from "@/lib/tracker/options";
import { isoToday, orderByUsage } from "@/lib/tracker/stats";
import { DiaryManager } from "./DiaryManager";

export default async function DiaryPage() {
  const { supabase, user } = await requireTracker();
  const data = await loadAll(supabase, user.id);
  const today = isoToday();
  return (
    <DiaryManager
      today={today}
      entries={diaryEntries(data.checkins, data.symptoms, data.treatments, data.tests, data.episodes, { testKind: (k) => labelFor(TEST_KINDS, k) }, today)}
      strip={feelingStrip(data.checkins, 30, today)}
      episodes={data.episodes.map((e) => ({ id: e.id, started_on: e.started_on, ended_on: e.ended_on }))}
      symptomOrder={orderByUsage(SYMPTOMS.map((s) => s.key), data.symptoms.map((s) => ({ key: s.symptom })))}
    />
  );
}
