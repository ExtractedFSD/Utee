import { formatDateTime } from "@/lib/status";

export type TimelineEvent = {
  id: string;
  label: string;
  detail?: string | null;
  created_at: string;
  type: string;
};

const TYPE_ICONS: Record<string, string> = {
  order: "🛒",
  fulfilment: "📦",
  tracking: "🚚",
  triage: "📝",
  lab: "🧪",
  clinic: "🩺",
  report: "📄",
  system: "•",
};

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-slate-400">No events yet.</p>;
  }
  return (
    <ol className="relative space-y-0">
      {events.map((event, i) => (
        <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i < events.length - 1 && (
            <span className="absolute left-[15px] top-8 bottom-0 w-px bg-slate-200" aria-hidden />
          )}
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 border border-brand-200 text-sm">
            {TYPE_ICONS[event.type] ?? "•"}
          </span>
          <div className="min-w-0 pt-1">
            <p className="text-sm font-medium text-slate-900">{event.label}</p>
            {event.detail && <p className="text-sm text-slate-500">{event.detail}</p>}
            <p className="text-xs text-slate-400 mt-0.5">{formatDateTime(event.created_at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
