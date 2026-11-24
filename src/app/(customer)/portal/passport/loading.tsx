/**
 * The Passport's loading state: the shape of the hero and two cards, so the
 * page does not sit still between a tap and the next screen.
 */
export default function PassportLoading() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-live="polite" aria-label="Loading" data-testid="route-loading">
      <div className="h-4 w-28 rounded-full bg-pink-50" />
      <div className="h-11 w-48 rounded-2xl bg-pink-50" />
      <div className="h-56 rounded-card bg-gradient-brand opacity-60" />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="h-40 rounded-card bg-white shadow-card" />
        <div className="h-40 rounded-card bg-white shadow-card" />
      </div>
      <span className="sr-only">Loading</span>
    </div>
  );
}
