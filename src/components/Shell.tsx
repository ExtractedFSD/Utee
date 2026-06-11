import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function signOut() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export function Shell({
  nav,
  areaLabel,
  userEmail,
  children,
}: {
  nav: { href: string; label: string }[];
  areaLabel: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="bg-white border-b border-slate-200 no-print">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-2xl font-bold tracking-tight text-brand-600">
                utee
              </Link>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                {areaLabel}
              </span>
            </div>
            <nav className="hidden md:flex items-center gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-3">
              <span className="hidden sm:block text-xs text-slate-400">{userEmail}</span>
              <form action={signOut}>
                <button className="text-sm font-medium text-slate-500 hover:text-slate-900">
                  Sign out
                </button>
              </form>
            </div>
          </div>
          <nav className="md:hidden flex gap-1 overflow-x-auto pb-3">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
