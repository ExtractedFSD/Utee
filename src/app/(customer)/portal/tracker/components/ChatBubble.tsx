"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { copy } from "@/lib/tracker/copy";
import type { ChatMessage } from "@/lib/tracker/data";
import { formatDay } from "@/lib/tracker/stats";
import { GuidedChat, type Nudges } from "../setup/GuidedChat";
import { getChat, listChats } from "../actions";

type ChatSummary = { id: string; title: string | null; mode: string; updated_at: string; count: number };

/**
 * Una as a floating bubble on every tracker page: tap to open a panel with
 * the free-form chat. The panel has a History view listing earlier chats,
 * any of which can be reopened and continued.
 */
export function ChatBubble({ enabled, aiAvailable, pregnantOrTrying, activePreventions, nudges }: {
  enabled: boolean; aiAvailable: boolean; pregnantOrTrying: string; activePreventions: string[]; nudges: Nudges;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [session, setSession] = useState<{ key: number; resume: { id: string; messages: ChatMessage[] } | null }>({ key: 1, resume: null });
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

  const showHistory = async () => { setView("history"); setChats(null); setChats(await listChats()); };
  const openChat = async (id: string) => {
    const c = await getChat(id);
    if (!c) return;
    setSession({ key: Date.now(), resume: { id: c.id as string, messages: c.messages as ChatMessage[] } });
    setView("chat");
  };
  const newChat = () => { setSession({ key: Date.now(), resume: null }); setView("chat"); };

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
              <div className="flex items-center gap-1">
                {view === "chat" ? (
                  <button type="button" onClick={showHistory} className="min-h-[44px] px-2 text-sm font-semibold text-maroon" data-testid="chat-history">{copy.guided.history}</button>
                ) : (
                  <button type="button" onClick={() => setView("chat")} className="min-h-[44px] px-2 text-sm font-semibold text-maroon">{copy.guided.backToChat}</button>
                )}
                <button type="button" onClick={() => setOpen(false)} className="min-h-[44px] px-2 text-sm font-semibold text-maroon">{copy.guided.bubbleClose}</button>
              </div>
            </div>
            <div className="overflow-y-auto px-4 pt-4 pb-20 md:pb-6">
              {view === "history" ? (
                <div className="space-y-3" data-testid="chat-history-list">
                  <button type="button" onClick={newChat} className="min-h-[44px] text-sm font-semibold text-maroon">{copy.guided.newChat}</button>
                  {chats === null ? <p className="text-sm text-slate-500">{copy.guided.thinking}</p>
                    : chats.length === 0 ? <p className="text-sm text-slate-600">{copy.guided.historyEmpty}</p>
                    : (
                      <ul className="divide-y divide-maroon/10 rounded-2xl bg-white">
                        {chats.map((c) => (
                          <li key={c.id}>
                            <button type="button" onClick={() => openChat(c.id)} className="flex w-full min-h-[56px] items-center justify-between gap-3 px-4 py-3 text-left">
                              <span className="min-w-0">
                                <span className="block truncate text-sm font-semibold text-midnight">{c.title ?? copy.guided.untitledChat}</span>
                                <span className="block text-xs text-slate-500">{formatDay(c.updated_at.slice(0, 10))}</span>
                              </span>
                              <span className="shrink-0 text-sm font-semibold text-maroon">{copy.guided.openChat}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              ) : (
                <GuidedChat key={session.key} mode="free" compact aiAvailable={aiAvailable} pregnantOrTrying={pregnantOrTrying} activePreventions={activePreventions} initialAbout={null} nudges={nudges} resume={session.resume} />
              )}
            </div>
          </section>
        </>
      )}
    </>
  );
}
