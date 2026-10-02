import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, Logo } from "@/components/ui";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

/**
 * App chrome. Two tones from the design system:
 *   brand, pink→maroon gradient header over a pale pink ground (patients)
 *   staff, midnight header over a near-white ground (lab, clinic, admin),
 *           kept deliberately plain for operational screens
 */
export type NavItem = { href: string; label: string } | { label: string; items: { href: string; label: string }[] };

export function Shell({
  nav,
  areaLabel,
  userEmail,
  tone = "staff",
  children,
}: {
  nav: NavItem[];
  areaLabel: string;
  userEmail: string;
  tone?: "brand" | "staff";
  children: React.ReactNode;
}) {
  const header = tone === "brand" ? "bg-gradient-brand" : "bg-midnight";
  const ground = tone === "brand" ? "bg-pink-25" : "bg-slate-50";
  const navLink =
    "whitespace-nowrap rounded-full px-3.5 py-1.5 text-eyebrow uppercase text-white/80 hover:bg-white/15 hover:text-white transition-colors";

  // A group renders as a dropdown on wide screens and as its flat links on narrow ones.
  const desktopItem = (item: NavItem) =>
    "items" in item ? (
      <details key={item.label} className="relative group">
        <summary className={`${navLink} list-none cursor-pointer select-none flex items-center gap-1 [&::-webkit-details-marker]:hidden`}>
          {item.label}
          <svg viewBox="0 0 20 20" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform group-open:rotate-180"><path d="m5 8 5 5 5-5" /></svg>
        </summary>
        <div className="absolute right-0 z-30 mt-2 min-w-[11rem] rounded-2xl bg-white p-1.5 text-midnight shadow-card">
          {item.items.map((sub) => (
            <Link key={sub.href} href={sub.href} className="block rounded-xl px-3.5 py-2 text-eyebrow uppercase text-midnight hover:bg-pink-25">
              {sub.label}
            </Link>
          ))}
        </div>
      </details>
    ) : (
      <Link key={item.href} href={item.href} className={navLink}>
        {item.label}
      </Link>
    );
  const flat = nav.flatMap((item) => ("items" in item ? item.items : [item]));

  return (
    <div className={`min-h-screen ${ground}`}>
      <header className={`${header} text-white no-print`}>
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-[72px] items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/" className="text-white hover:text-white/90">
                <Logo className="h-8 w-auto" />
              </Link>
              <Eyebrow pill className="hidden sm:inline-block !py-1.5 !px-3.5 !shadow-none">
                {areaLabel}
              </Eyebrow>
            </div>
            <nav className="hidden md:flex items-center gap-1">{nav.map(desktopItem)}</nav>
            <div className="flex items-center gap-4 shrink-0">
              <span className="hidden sm:block text-xs text-white/70 max-w-[220px] truncate" title={userEmail}>{userEmail}</span>
              <form action={signOut}>
                <button className="text-eyebrow uppercase whitespace-nowrap text-white/80 hover:text-white">Sign out</button>
              </form>
            </div>
          </div>
          <nav className="md:hidden flex gap-1 overflow-x-auto pb-3 -mx-1 px-1">
            {flat.map((item) => (
              <Link key={item.href} href={item.href} className={navLink}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">{children}</main>
    </div>
  );
}
