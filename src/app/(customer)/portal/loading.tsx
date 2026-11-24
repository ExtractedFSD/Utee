/**
 * Shown while a portal page is on its way, so a tap always does something
 * visible even on a slow connection. Grey blocks in the shape of a page.
 */
export default function PortalLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-live="polite" aria-label="Loading" data-testid="route-loading">
      <div className="h-4 w-28 rounded-full bg-pink-50" />
      <div className="h-11 w-2/3 max-w-md rounded-2xl bg-pink-50" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-44 rounded-card bg-white shadow-card" />
        <div className="h-44 rounded-card bg-white shadow-card" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
