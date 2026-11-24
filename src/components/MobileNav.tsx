"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * The portal's section row on narrow screens: wraps onto a second line
 * rather than scrolling, so every section is visible, and underlines the
 * section the page is in.
 */
export function MobileNav({ items }: { items: { href: string; label: string }[] }) {
  const pathname = usePathname() ?? "";
  const activeHref = [...items].sort((a, b) => b.href.length - a.href.length).find((i) => (i.href === "/portal" || i.href === "/" ? pathname === i.href : pathname.startsWith(i.href)))?.href;
  return (
    <div className="relative md:hidden -mx-4 sm:-mx-6">
      <nav className="flex flex-wrap gap-x-1 px-4 sm:px-6 pb-2" aria-label="Sections">
        {items.map((item) => {
          const on = item.href === activeHref;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              className={`whitespace-nowrap px-3 py-2.5 text-eyebrow uppercase transition-colors border-b-2 ${on ? "text-white border-white" : "text-white/90 border-transparent hover:text-white"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
