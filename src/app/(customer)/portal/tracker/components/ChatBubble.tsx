"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/tracker/copy";
import { GuidedChat, type Nudges } from "../setup/GuidedChat";

/**
 * Una as a floating bubble on every tracker page: tap to open a panel with
 * the free-form chat. Hidden on the pages that are themselves a chat or a
 * form step.
 */
export function ChatBubble({ enabled, aiAvailable, pregnantOrTrying, activePreventions, nudges }: {
  enabled: boolean; aiAvailable: boolean; pregnantOrTrying: string; activePreventions: string[]; nudges: Nudges;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const hidden = /\/portal\/tracker\/(setup|consent|about-me|log)/.test(pathname ?? "");
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!enabled || hidden) return null;
  const name = copy.guided.name;
  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={copy.guided.bubbleOpen}
          data-testid="chat-bubble"
          data-hydrated={hydrated ? "true" : "false"}
          className="fixed bottom-5 right-5 z-30 inline-flex min-h-[52px] items-center gap-2 rounded-full bg-maroon px-5 text-[12px] font-semibold uppercase tracking-[.14em] text-white shadow-card hover:bg-maroon/90"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1.1-4.3A8 8 0 1 1 21 12Z" /></svg>
          {name}
        </button>
      )}
      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-midnight/40 md:hidden" onClick={() => setOpen(false)} aria-hidden />
          <section
            role="dialog"
            aria-modal="true"
            aria-label={name}
            data-testid="chat-panel"
            className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-card bg-pink-25 shadow-card md:inset-x-auto md:bottom-5 md:right-5 md:w-[440px] md:max-h-[78vh] md:rounded-card"
          >
            <div className="flex items-center justify-between gap-3 border-b border-maroon/10 px-5 py-3">
              <p className="font-display text-2xl font-light text-midnight">{name}</p>
              <button type="button" onClick={() => setOpen(false)} className="min-h-[44px] px-2 text-sm font-semibold text-maroon">{copy.guided.bubbleClose}</button>
            </div>
            <div className="overflow-y-auto px-4 pt-4 pb-20 md:pb-6">
              <GuidedChat mode="free" compact aiAvailable={aiAvailable} pregnantOrTrying={pregnantOrTrying} activePreventions={activePreventions} initialAbout={null} nudges={nudges} />
            </div>
          </section>
        </>
      )}
    </>
  );
}
