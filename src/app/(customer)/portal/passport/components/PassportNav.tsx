"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { copy } from "@/lib/tracker/copy";

/*
 * The passport's own navigation: Today · History · Record · Share, with Una
 * as the fifth item. A bottom tab bar on phones, a pill row under the
 * portal header from 1024px up. One component, two variants, so the active
 * section is decided in one place.
 */
export type Section = "today" | "history" | "record" | "share";

const TABS: { key: Section; href: string; label: string }[] = [
  { key: "today", href: "/portal/passport", label: copy.nav.today },
  { key: "history", href: "/portal/passport/history", label: copy.nav.history },
  { key: "record", href: "/portal/passport/record", label: copy.nav.record },
  { key: "share", href: "/portal/passport/share", label: copy.nav.share },
];

/** Thin-stroke icons, one per section: a sun, a clock turning back, a page with a plus, three linked points. */
function TabIcon({ section, size = 18 }: { section: Section; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  switch (section) {
    case "today":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.6" />
          <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M5.6 18.4l1.6-1.6M16.8 7.2l1.6-1.6" />
        </svg>
      );
    case "history":
      return (
        <svg {...common}>
          <path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3" />
          <path d="M4.2 3.8v3.4h3.4" />
          <path d="M12 8v4.3l2.8 1.7" />
        </svg>
      );
    case "record":
      return (
        <svg {...common}>
          <rect x="5" y="3.5" width="14" height="17" rx="2.5" />
          <path d="M12 8.5v7M8.5 12h7" />
        </svg>
      );
    case "share":
      return (
        <svg {...common}>
          <circle cx="17.5" cy="5.5" r="2.3" />
          <circle cx="6.5" cy="12" r="2.3" />
          <circle cx="17.5" cy="18.5" r="2.3" />
          <path d="M8.6 10.9l6.8-4.2M8.6 13.1l6.8 4.2" />
        </svg>
      );
  }
}

export function sectionFor(pathname: string): Section {
  if (/\/portal\/passport\/(history|timeline|diary|episodes)/.test(pathname)) return "history";
  if (/\/portal\/passport\/(record|about-me|investigations|cultures|prevention)/.test(pathname)) return "record";
  if (/\/portal\/passport\/share/.test(pathname)) return "share";
  return "today";
}

/** Full-screen flows (consent, the setup chat, pages with a sticky save bar) stand alone, without the bar. */
export function navHidden(pathname: string, step?: string | null): boolean {
  return /\/portal\/passport\/(consent|setup|log|about-me)/.test(pathname) || (!!step && /\/portal\/passport\/record/.test(pathname));
}

export function PassportNav({ variant, unaEnabled, unaOpen, onUna, hydrated }: { variant: "phone" | "desktop"; unaEnabled: boolean; unaOpen: boolean; onUna: () => void; hydrated: boolean }) {
  const pathname = usePathname() ?? "";
  const step = useSearchParams()?.get("step");
  if (navHidden(pathname, step)) return null;
  const active = sectionFor(pathname);

  if (variant === "desktop") {
    return (
      <nav aria-label={copy.nav.label} className="hidden lg:flex items-center gap-2 mb-8">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active === t.key ? "page" : undefined}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-[12px] font-semibold uppercase tracking-[.12em] transition-colors ${
              active === t.key ? "bg-maroon text-white shadow-card" : "bg-white text-midnight border border-midnight/15 hover:bg-pink-25"
            }`}
          >
            <TabIcon section={t.key} />
            {t.label}
          </Link>
        ))}
        {unaEnabled && (
          <button
            type="button"
            onClick={onUna}
            aria-pressed={unaOpen}
            className="ml-auto inline-flex min-h-[44px] items-center gap-2 rounded-full bg-white px-4 text-[12px] font-semibold uppercase tracking-[.12em] text-midnight border border-midnight/15 hover:bg-pink-25"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-maroon font-display text-base text-white" aria-hidden>U</span>
            {copy.nav.una}
          </button>
        )}
      </nav>
    );
  }

  return (
    <nav
      aria-label={copy.nav.label}
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 bg-white lg:hidden"
      style={{ borderTop: "1px solid rgba(29,0,58,.08)", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      data-testid="passport-nav"
    >
      {TABS.map((t) => {
        const on = active === t.key;
        return (
          <Link
            key={t.key}
            href={t.href}
            aria-current={on ? "page" : undefined}
            className={`flex min-h-[60px] flex-col items-center justify-center gap-0.5 text-[10px] font-semibold uppercase tracking-[.08em] ${on ? "text-maroon" : "text-[#8a7a9c]"}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-maroon" : "bg-transparent"}`} aria-hidden />
            <TabIcon section={t.key} size={22} />
            {t.label}
          </Link>
        );
      })}
      {unaEnabled ? (
        <button
          type="button"
          onClick={onUna}
          aria-label={copy.guided.bubbleOpen}
          aria-pressed={unaOpen}
          data-testid="chat-bubble"
          data-hydrated={hydrated ? "true" : "false"}
          className="flex min-h-[60px] flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[.08em] text-maroon"
        >
          <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full bg-maroon font-display text-lg leading-none text-white" aria-hidden>U</span>
          {copy.nav.una}
        </button>
      ) : (
        <span aria-hidden />
      )}
    </nav>
  );
}
