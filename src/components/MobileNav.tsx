"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The portal's section row on narrow screens: scrolls sideways with a fade
 * at the right edge so a clipped label reads as "more", and underlines the
 * section the page is in.
 */
export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname() ?? "";
  const activeHref = [...items].sort((a, b) => b.href.length - a.href.length).find((i) => (i.href === "/portal" || i.href === "/" ? pathname === i.href : pathname.startsWith(i.href)))?.href;
  return (
    <div className="relative md:hidden -mx-4 sm:-mx-6">
      <nav className="flex gap-1 overflow-x-auto px-4 sm:px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Sections">
        {items.map((item) => {
          const on = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`whitespace-nowrap px-3.5 py-2 text-eyebrow uppercase transition-colors border-b-2 ${on ? "text-white border-white" : "text-white/80 border-transparent hover:text-white"}`}
            >
              {item.label}
            </Link>
          );
        })}
        <span className="shrink-0 w-6" aria-hidden />
      </nav>
      <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-maroon/60 to-transparent" aria-hidden />
    </div>
  );
}
