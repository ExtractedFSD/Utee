import Link from "next/link";
import Image from "next/image";
import { formatKitCode } from "@/lib/kit-code";
import { createClient } from "@/lib/supabase/server";
import { Card, LinkButton, Notice, PageHeader } from "@/components/ui";
import { formatDate, formatMoney, type KitStatus } from "@/lib/status";
import { copy } from "@/lib/tracker/copy";
import { loadAll, trackerConsents, trackerProfile } from "@/lib/tracker/data";
import { isoToday, summarise } from "@/lib/tracker/stats";

/*
 * The portal front door. One state-aware passport card at the top (the same
 * three states as Today), then the kits, orders and subscriptions as
 * compact cards, then what Utee offers in a scrolling row.
 */
export default async function PortalHome({
  searchParams,
}: {
  searchParams: Promise<{ kit?: string; tracker?: string }>;
}) {
  const { kit: kitFlag, tracker: trackerFlag } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: kits }, { data: orders }, { data: subscriptions }, passport] = await Promise.all([
    supabase
      .from("kits")
      .select("id, code, status, created_at")
      .neq("status", "closed")
      .order("created_at", { ascending: false }),
    supabase
      .from("orders")
      .select("id, order_number, total_price, currency, placed_at, fulfillment_status")
      .order("placed_at", { ascending: false })
      .limit(3),
    supabase
      .from("subscriptions")
      .select("id, product_title, status, next_charge_scheduled_at")
      .eq("status", "active"),
    user ? passportState(supabase, user.id) : Promise.resolve<PassportState>({ kind: "new" }),
  ]);

  const storeUrl = process.env.NEXT_PUBLIC_SHOPIFY_STORE_URL ?? "#";
  // The urologist appointment is for people who have a Utee test on their account.
  const hasTest = (kits ?? []).length > 0;
  const shownKits = (kits ?? []).slice(0, 2);

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Your portal" title="Welcome back" />

      {kitFlag === "not-yours" && (
        <Notice>
          That kit isn&apos;t linked to your account. If you believe this is a mistake,
          please contact us with your order number.
        </Notice>
      )}
      {kitFlag === "not-found" && (
        <Notice>We couldn&apos;t find that kit code. Please check the QR code or contact us.</Notice>
      )}
      {kitFlag === "voided" && (
        <Notice>That kit code has been cancelled and can&apos;t be used. Please contact us and we&apos;ll sort out a replacement.</Notice>
      )}
      {trackerFlag === "deleted" && <Notice tone="mint">Your UTI Passport data has been deleted.</Notice>}

      <PassportHero state={passport} />

      <Card data-testid="home-kits">
        <div className="flex items-baseline justify-between gap-4 mb-3">
          <h2 className="font-display text-2xl font-light text-midnight">Your test kits</h2>
          {(kits?.length ?? 0) > 0 && <Link href="/portal/tests" className="shrink-0 text-sm font-semibold text-maroon">All kits ({kits!.length})</Link>}
        </div>
        {shownKits.length ? (
          <ul className="divide-y divide-[rgba(29,0,58,.08)]">
            {shownKits.map((kit) => {
              const stage = kitStage(kit.status as KitStatus);
              return (
                <li key={kit.id}>
                  <Link href={`/portal/tests/${kit.id}`} className="block py-3 -mx-2 px-2 rounded-xl hover:bg-pink-25">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="font-semibold text-midnight whitespace-nowrap">Kit {formatKitCode(kit.code)}</p>
                      <p className="text-xs text-[#8a7a9c] whitespace-nowrap">Started {formatDate(kit.created_at)}</p>
                    </div>
                    <span className={`mt-2 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[.1em] ${stage.tone}`}>{stage.label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center py-6">
            <p className="text-[13px] text-[#5a4a6e] mb-4">When you order a Utee test it will appear here once it is on its way.</p>
            <LinkButton href={storeUrl} variant="secondary" external>Order a Utee test</LinkButton>
          </div>
        )}
      </Card>

      <div className="grid gap-5 md:grid-cols-2">
        <Card>
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="font-display text-2xl font-light text-midnight">Recent orders</h2>
            <Link href="/portal/orders" className="shrink-0 text-sm font-semibold text-maroon">View all</Link>
          </div>
          {orders?.length ? (
            <ul className="divide-y divide-[rgba(29,0,58,.08)]">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link href={`/portal/orders/${order.id}`} className="flex items-baseline justify-between gap-4 py-3 -mx-2 px-2 rounded-xl hover:bg-pink-25">
                    <p className="min-w-0 truncate text-midnight"><span className="font-semibold">{order.order_number}</span> <span className="text-[#5a4a6e]">{formatDate(order.placed_at)}</span></p>
                    <span className="shrink-0 text-midnight">{formatMoney(order.total_price, order.currency)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[#5a4a6e]">No orders yet</p>
          )}
        </Card>

        <Card>
          <div className="flex items-baseline justify-between gap-4 mb-3">
            <h2 className="font-display text-2xl font-light text-midnight">Subscriptions</h2>
            <Link href="/portal/subscriptions" className="shrink-0 text-sm font-semibold text-maroon">{subscriptions?.length ? "Manage" : "Browse"}</Link>
          </div>
          {subscriptions?.length ? (
            <ul className="divide-y divide-[rgba(29,0,58,.08)]">
              {subscriptions.map((sub) => (
                <li key={sub.id} className="py-3">
                  <p className="font-semibold text-midnight">{sub.product_title}</p>
                  <p className="text-xs text-[#8a7a9c]">Next delivery {formatDate(sub.next_charge_scheduled_at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[#5a4a6e]">No active subscriptions</p>
          )}
        </Card>
      </div>

      <section aria-labelledby="from-utee">
        <p id="from-utee" className="text-[11px] font-semibold uppercase tracking-[.16em] text-maroon mb-3">From Utee</p>
        <div className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:overflow-visible">
          <Promo testId="urologist" badge={hasTest ? "Coming soon" : null}>
            <div className="flex items-start gap-3">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white p-2">
                <Image src="/images/uti-institute-logo.png" alt="UTI Institute" width={444} height={170} unoptimized className="h-auto w-full" />
              </div>
              <div className="min-w-0">
                <h3 className="font-display text-2xl font-light leading-tight">Consultant urologist appointment</h3>
                <p className="mt-2 text-sm text-white/90">£50 · discuss your Utee result</p>
              </div>
            </div>
            <p className="mt-3 text-[13px] text-white/85 leading-relaxed">A telephone appointment to review your result alongside your symptoms, previous UTIs and antibiotic history. Where clinically appropriate, this may include a treatment plan and prescription.</p>
            {!hasTest && (
              <div data-testid="urologist-locked" className="mt-4">
                <p className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                  Unlocked once you have a Utee test on your account
                </p>
                <div><LinkButton href={storeUrl} variant="white" external>Order a Utee test</LinkButton></div>
              </div>
            )}
          </Promo>
          <Promo badge="From £19.99">
            <h3 className="font-display text-2xl font-light leading-tight">The Utee range</h3>
            <p className="mt-2 text-sm font-semibold">Urinary Tract Care, made for people living with UTIs.</p>
            <p className="mt-1 text-[13px] text-white/85 leading-relaxed">D-Mannose sachets, Vaginal Probiotics and the On-The-Go pack.</p>
            <div className="mt-4"><LinkButton href={storeUrl} variant="white" external>Shop supplements</LinkButton></div>
          </Promo>
          <Promo testId="community" badge="Coming soon">
            <h3 className="font-display text-2xl font-light leading-tight">Join the Utee Community</h3>
            <p className="mt-2 text-sm font-semibold">You are not the only one dealing with this.</p>
            <p className="mt-1 text-[13px] text-white/85 leading-relaxed">A private space for people living with UTIs to share what has helped, ask the questions you cannot ask anywhere else, and hear from people who understand. Members get early access to new Utee products and events.</p>
          </Promo>
        </div>
      </section>
    </div>
  );
}

type PassportState = { kind: "new" } | { kind: "open"; day: number } | { kind: "between"; daysSince: number };

/** What the passport card says: set up, a UTI open today, or days since the last one. Nothing here redirects. */
async function passportState(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<PassportState> {
  const [consents, profile] = await Promise.all([trackerConsents(supabase, userId), trackerProfile(supabase, userId)]);
  if (!consents.tracker || !profile) return { kind: "new" };
  const data = await loadAll(supabase, userId);
  if (data.episodes.length === 0) return { kind: "new" };
  const s = summarise(data.episodes, data.treatments, isoToday());
  if (s.openEpisode) return { kind: "open", day: s.openDay };
  return { kind: "between", daysSince: s.daysSinceLast ?? 0 };
}

function PassportHero({ state }: { state: PassportState }) {
  const title = state.kind === "open" ? copy.dashboard.openEpisodeDay(state.day) : state.kind === "between" ? copy.dashboard.sinceLast(state.daysSince) : "Your UTI Passport";
  const href = state.kind === "open" ? "/portal/passport" : state.kind === "between" ? "/portal/passport/log" : "/portal/passport";
  const action = state.kind === "open" ? copy.dashboard.logToday : state.kind === "between" ? copy.dashboard.logNew : "Open my passport";
  return (
    <div className="rounded-card bg-gradient-brand p-5 text-white" style={{ boxShadow: "0 10px 30px rgba(145,25,59,.25)" }} data-testid="home-passport">
      <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-white/85">UTI Passport</p>
      <p className="mt-1 font-display text-3xl font-light leading-tight">{title}</p>
      {state.kind === "new" && <p className="mt-2 text-sm text-white/85 leading-relaxed max-w-xl">Keep a private record of your UTIs to show a GP or clinic, and spot your own patterns over time.</p>}
      <div className="mt-4"><LinkButton href={href} variant="white">{action}</LinkButton></div>
    </div>
  );
}

/** Where a kit is, in the patient's words, with the colour of that stage. */
function kitStage(status: KitStatus): { label: string; tone: string } {
  switch (status) {
    case "assigned":
    case "shipped":
    case "delivered":
      return { label: "Posted to you", tone: "bg-sky-50 text-sky-900" };
    case "activated":
    case "in_transit_to_lab":
    case "received_by_lab":
    case "lab_query":
      return { label: status === "lab_query" ? "Lab checking a problem" : "At the lab", tone: "bg-sun text-amber-900" };
    case "lab_complete":
    case "clinic_received":
      return { label: "With the clinical team", tone: "bg-lavender-50 text-violet-900" };
    case "report_ready":
      return { label: "Result ready · view", tone: "bg-mint-50 text-emerald-900" };
    case "voided":
      return { label: "Cancelled", tone: "bg-rose-50 text-rose-700" };
    default:
      return { label: "Closed", tone: "bg-slate-100 text-slate-600" };
  }
}

function Promo({ children, badge, testId }: { children: React.ReactNode; badge: string | null; testId?: string }) {
  return (
    <div data-testid={testId} className="w-[82%] shrink-0 snap-start rounded-card bg-gradient-brand p-5 text-white shadow-card md:w-auto">
      {badge && <span className="mb-3 inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[.12em] text-white">{badge}</span>}
      {children}
    </div>
  );
}
