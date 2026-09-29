import { formatDateTime } from "@/lib/status";

export type TimelineEvent = {
  id: string;
  label: string;
  detail?: string | null;
  created_at: string;
  type: string;
};

/*
 * Thin-stroke line icons per event type. The brand icon set is thin, clinical
 * and minimal (design-system/readme.md → ICONOGRAPHY); no emoji. Paths follow
 * Lucide at stroke-width 1.25, the closest CDN-free match.
 */
const ICON_PATHS: Record<string, string> = {
  order: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z M3 6h18 M16 10a4 4 0 0 1-8 0",
  fulfilment:
    "m7.5 4.27 9 5.15 M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z M3.3 7 12 12l8.7-5 M12 22V12",
  tracking:
    "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2 M15 18H9 M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62L18.3 9.38a1 1 0 0 0-.78-.38H14 M17 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z M7 20a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  triage:
    "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2 M9 2h6a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z M12 11h4 M12 16h4 M8 11h.01 M8 16h.01",
  lab: "M14.5 2v17.5c0 1.4-1.1 2.5-2.5 2.5s-2.5-1.1-2.5-2.5V2 M8.5 2h7 M14.5 16h-5",
  clinic:
    "M11 2v2 M5 2v2 M5 3H4a2 2 0 0 0-2 2v4a6 6 0 0 0 12 0V5a2 2 0 0 0-2-2h-1 M8 15a6 6 0 0 0 12 0v-3 M20 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  report:
    "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z M14 2v4a2 2 0 0 0 2 2h4 M10 9H8 M16 13H8 M16 17H8",
  system: "M12 12h.01",
};

function EventIcon({ type }: { type: string }) {
  const d = ICON_PATHS[type] ?? ICON_PATHS.system;
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {d.split(" M").map((segment, i) => (
        <path key={i} d={i === 0 ? segment : `M${segment}`} />
      ))}
    </svg>
  );
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return <p className="text-sm text-slate-500">No events yet.</p>;
  }
  return (
    <ol className="relative space-y-0">
      {events.map((event, i) => (
        <li key={event.id} className="relative flex gap-4 pb-6 last:pb-0">
          {i < events.length - 1 && (
            <span className="absolute left-[17px] top-9 bottom-0 w-px bg-pink-50" aria-hidden />
          )}
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
              i === 0 ? "bg-gradient-brand text-white shadow-card" : "bg-pink-25 text-maroon"
            }`}
          >
            <EventIcon type={event.type} />
          </span>
          <div className="min-w-0 pt-1.5">
            <p className="text-sm font-semibold text-midnight">{event.label}</p>
            {event.detail && <p className="text-sm text-slate-600 mt-0.5">{event.detail}</p>}
            <p className="text-xs text-slate-500 mt-1">{formatDateTime(event.created_at)}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
