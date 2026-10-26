"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Nudges, OpenEpisode } from "../setup/GuidedChat";
import { PassportNav, navHidden } from "./PassportNav";
import { UnaSheet } from "./UnaSheet";

/**
 * Everything around a passport page: the tab bar (or pill row), room at the
 * bottom so nothing sits under it, and Una as a sheet over the current page.
 * Before consent and setup there is no bar and no Una.
 */
export function PassportShell({ ready, una, children }: {
  ready: boolean;
  una: { aiAvailable: boolean; pregnantOrTrying: string; activePreventions: string[]; nudges: Nudges; openEpisodes: OpenEpisode[] };
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const step = useSearchParams()?.get("step");
  const [unaOpen, setUnaOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  // Moving to another page closes the sheet; the chat itself is kept until it is closed on purpose.
  useEffect(() => { setUnaOpen(false); }, [pathname]);
  const bar = ready && !navHidden(pathname, step);
  const nav = { unaEnabled: ready, unaOpen, onUna: () => setUnaOpen((o) => !o), hydrated };
  return (
    <>
      {bar && <Suspense><PassportNav variant="desktop" {...nav} /></Suspense>}
      <div className={bar ? "pb-28 lg:pb-6" : ""}>{children}</div>
      {bar && <Suspense><PassportNav variant="phone" {...nav} /></Suspense>}
      {ready && <UnaSheet open={unaOpen} onClose={() => setUnaOpen(false)} {...una} />}
    </>
  );
}
