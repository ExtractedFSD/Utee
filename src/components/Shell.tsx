import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Eyebrow, Logo } from "@/components/ui";
import { MobileNav } from "@/components/MobileNav";
import { TopNav } from "@/components/TopNav";

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

/**
 * The way to help, your data and the legal pages from every portal page.
 * The contact address comes from NEXT_PUBLIC_SUPPORT_EMAIL; without it the
 * footer still shows the data and privacy links.
 */
function PortalFooter() {
  const support = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;
  const link = "min-h-[44px] inline-flex items-center text-sm font-semibold text-maroon";
  return (
    <footer className="no-print border-t border-midnight/10 mt-6" aria-label="Help and your data">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm text-slate-600">
        <span>Utee patient portal</span>
        <Link href="/portal/passport/settings" className={link}>Your data and privacy</Link>
        {support && <a href={`mailto:${support}`} className={link}>Contact Utee</a>}
        <a href="/portal/tests" className={link}>Your test kits</a>
      </div>
    </footer>
  );
}

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
            <TopNav nav={nav} />
            <div className="flex items-center gap-4 shrink-0">
              <span className="hidden sm:block text-sm text-white/90 max-w-[220px] truncate" title={userEmail}>{userEmail}</span>
              <form action={signOut}>
                <button className="text-eyebrow uppercase whitespace-nowrap text-white/90 hover:text-white">Sign out</button>
              </form>
            </div>
          </div>
          <MobileNav items={flat} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-10">{children}</main>
      {tone === "brand" && <PortalFooter />}
    </div>
  );
}
