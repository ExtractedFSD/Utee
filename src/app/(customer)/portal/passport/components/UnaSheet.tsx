"use client";

import { useEffect, useState } from "react";
import { copy } from "@/lib/tracker/copy";
import type { ChatMessage } from "@/lib/tracker/data";
import { formatDay } from "@/lib/tracker/stats";
import { GuidedChat, type Nudges, type OpenEpisode } from "../setup/GuidedChat";
import { getChat, listChats } from "../actions";

type ChatSummary = { id: string; title: string | null; mode: string; updated_at: string; count: number };

/**
 * Una as a sheet over whatever page is open: a bottom sheet on phones, a
 * side panel from 1024px up. Opened from the passport navigation. The panel
 * has a History view listing earlier chats, any of which can be reopened.
 */
export function UnaSheet({ open, onClose, aiAvailable, pregnantOrTrying, activePreventions, nudges, openEpisodes }: {
  open: boolean; onClose: () => void; aiAvailable: boolean; pregnantOrTrying: string; activePreventions: string[]; nudges: Nudges; openEpisodes: OpenEpisode[];
}) {
  const [view, setView] = useState<"chat" | "history">("chat");
  const [chats, setChats] = useState<ChatSummary[] | null>(null);
  const [session, setSession] = useState<{ key: number; resume: { id: string; messages: ChatMessage[] } | null }>({ key: 1, resume: null });
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
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
      <div className="fixed inset-0 z-40 bg-midnight/40" onClick={onClose} aria-hidden />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={name}
        data-testid="chat-panel"
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[88vh] flex-col rounded-t-[28px] bg-white lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[440px] lg:max-h-none lg:rounded-none"
        style={{ boxShadow: "0 -12px 40px rgba(29,0,58,.2)" }}
      >
        <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-pink-50 lg:hidden" aria-hidden />
        <div className="flex items-center justify-between gap-3 px-5 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-maroon font-display text-xl leading-none text-white" aria-hidden>U</span>
            <div className="flex min-w-0 items-center gap-2">
              <p className="text-sm font-semibold text-midnight">{name}</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${aiAvailable ? "bg-sky-50 text-sky-900" : "bg-slate-100 text-slate-600"}`}>{aiAvailable ? copy.guided.aiOn : copy.guided.aiOff}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {view === "chat" ? (
              <button type="button" onClick={showHistory} className="min-h-[44px] px-2 text-sm font-semibold text-maroon" data-testid="chat-history">{copy.guided.history}</button>
            ) : (
              <button type="button" onClick={() => setView("chat")} className="min-h-[44px] px-2 text-sm font-semibold text-maroon">{copy.guided.backToChat}</button>
            )}
            <button type="button" onClick={onClose} className="min-h-[44px] px-2 text-sm font-semibold text-maroon">{copy.guided.bubbleClose}</button>
          </div>
        </div>
        <div className="overflow-y-auto px-4 pt-2 pb-8">
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
                <GuidedChat key={session.key} mode="free" compact aiAvailable={aiAvailable} pregnantOrTrying={pregnantOrTrying} activePreventions={activePreventions} initialAbout={null} nudges={nudges} openEpisodes={openEpisodes} resume={session.resume} />
              )}
            </div>
      </section>
    </>
  );
}
