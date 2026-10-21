"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";
import { copy } from "@/lib/tracker/copy";

/**
 * One container for "open a row to edit it": a bottom sheet on phones, an
 * inline panel from tablet width up. Escape or the Done button closes it.
 */
export function Sheet({
  open,
  title,
  onClose,
  children,
  doneLabel = copy.episode.done,
  testId,
  modal = false,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  doneLabel?: string;
  testId?: string;
  /** Pop up on every screen size (centred on desktop) instead of opening inline. */
  modal?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  const panel = modal
    ? "fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-card bg-white p-5 shadow-card md:inset-x-auto md:bottom-auto md:left-1/2 md:top-1/2 md:w-[min(640px,calc(100vw-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-card md:max-h-[85vh]"
    : "fixed inset-x-0 bottom-0 z-50 max-h-[88vh] overflow-y-auto rounded-t-card bg-white p-5 shadow-card md:static md:z-auto md:mt-4 md:max-h-none md:rounded-2xl md:bg-pink-25 md:shadow-none";
  return (
    <>
      <div className={`fixed inset-0 z-40 bg-midnight/40 ${modal ? "" : "md:hidden"}`} onClick={onClose} aria-hidden />
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        className={panel}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="font-display text-2xl font-light text-midnight">{title}</p>
          <Button variant="secondary" onClick={onClose} className="!py-2">{doneLabel}</Button>
        </div>
        {children}
      </section>
    </>
  );
}
