"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

export function sectionFor(pathname: string): Section {
  if (/\/portal\/passport\/(history|timeline|diary|episodes)/.test(pathname)) return "history";
  if (/\/portal\/passport\/(record|about-me|investigations|cultures|prevention)/.test(pathname)) return "record";
  if (/\/portal\/passport\/share/.test(pathname)) return "share";
  return "today";
}

/** Full-screen flows (consent, the setup chat) stand alone, without the bar. */
export function navHidden(pathname: string): boolean {
  return /\/portal\/passport\/(consent|setup)/.test(pathname);
}

export function PassportNav({ variant, unaEnabled, unaOpen, onUna, hydrated }: { variant: "phone" | "desktop"; unaEnabled: boolean; unaOpen: boolean; onUna: () => void; hydrated: boolean }) {
  const pathname = usePathname() ?? "";
  if (navHidden(pathname)) return null;
  const active = sectionFor(pathname);

  if (variant === "desktop") {
    return (
      <nav aria-label={copy.nav.label} className="hidden lg:flex items-center gap-2 mb-8">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            aria-current={active === t.key ? "page" : undefined}
            className={`inline-flex min-h-[44px] items-center rounded-full px-5 text-[12px] font-semibold uppercase tracking-[.12em] transition-colors ${
              active === t.key ? "bg-maroon text-white shadow-card" : "bg-white text-midnight border border-midnight/15 hover:bg-pink-25"
            }`}
          >
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
            className={`flex min-h-[60px] flex-col items-center justify-center gap-1 text-[10px] font-semibold uppercase tracking-[.08em] ${on ? "text-maroon" : "text-[#8a7a9c]"}`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${on ? "bg-maroon" : "bg-transparent"}`} aria-hidden />
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
