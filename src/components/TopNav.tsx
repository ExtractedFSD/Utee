"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavItem } from "@/components/Shell";

/**
 * The wide-screen section links. The section the page is in is underlined
 * and marked aria-current, the same cue the phone row uses. A group renders
 * as a dropdown of its links.
 */
export function TopNav({ nav }: { nav: NavItem[] }) {
  const pathname = usePathname() ?? "";
  const flat = nav.flatMap((item) => ("items" in item ? item.items : [item]));
  const activeHref = [...flat].sort((a, b) => b.href.length - a.href.length).find((i) => (i.href === "/portal" || i.href === "/" ? pathname === i.href : pathname.startsWith(i.href)))?.href;
  // A straight underline marks the current section; no pill shape, so the line stays flat.
  const base = "whitespace-nowrap px-3.5 py-2 text-eyebrow uppercase transition-colors border-b-2";
  const link = (href: string) => `${base} ${href === activeHref ? "text-white border-white" : "text-white/90 border-transparent hover:text-white"}`;
  return (
    <nav className="hidden md:flex items-center gap-1" aria-label="Sections">
      {nav.map((item) =>
        "items" in item ? (
          <details key={item.label} className="relative group">
            <summary className={`${base} ${item.items.some((s) => s.href === activeHref) ? "text-white border-white" : "text-white/90 border-transparent hover:text-white"} list-none cursor-pointer select-none flex items-center gap-1 [&::-webkit-details-marker]:hidden`}>
              {item.label}
              <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform group-open:rotate-180"><path d="m5 8 5 5 5-5" /></svg>
            </summary>
            <div className="absolute right-0 z-30 mt-2 min-w-[11rem] rounded-2xl bg-white p-1.5 text-midnight shadow-card">
              {item.items.map((sub) => (
                <Link key={sub.href} href={sub.href} aria-current={sub.href === activeHref ? "page" : undefined} className="block rounded-xl px-3.5 py-2 text-eyebrow uppercase text-midnight hover:bg-pink-25">
                  {sub.label}
                </Link>
              ))}
            </div>
          </details>
        ) : (
          <Link key={item.href} href={item.href} aria-current={item.href === activeHref ? "page" : undefined} className={link(item.href)}>
            {item.label}
          </Link>
        )
      )}
    </nav>
  );
}
