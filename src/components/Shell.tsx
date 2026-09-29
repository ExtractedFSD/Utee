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
export function Shell({
  nav,
  areaLabel,
  userEmail,
  tone = "staff",
  children,
}: {
  nav: { href: string; label: string }[];
  areaLabel: string;
  userEmail: string;
  tone?: "brand" | "staff";
  children: React.ReactNode;
}) {
  const header = tone === "brand" ? "bg-gradient-brand" : "bg-midnight";
  const ground = tone === "brand" ? "bg-pink-25" : "bg-slate-50";
  const navLink =
    "whitespace-nowrap rounded-full px-3.5 py-1.5 text-eyebrow uppercase text-white/80 hover:bg-white/15 hover:text-white transition-colors";

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
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((item) => (
                <Link key={item.href} href={item.href} className={navLink}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-4 shrink-0">
              <span className="hidden sm:block text-xs text-white/70 max-w-[220px] truncate" title={userEmail}>{userEmail}</span>
              <form action={signOut}>
                <button className="text-eyebrow uppercase whitespace-nowrap text-white/80 hover:text-white">Sign out</button>
              </form>
            </div>
          </div>
          <nav className="md:hidden flex gap-1 overflow-x-auto pb-3 -mx-1 px-1">
            {nav.map((item) => (
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
