"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui";
import { isoDaysAgo, isoToday } from "@/lib/tracker/stats";

/* Tap targets for the tracker. Big, rounded, one tap to toggle. */

export function Chip({
  selected,
  onClick,
  children,
  disabled,
  size = "md",
}: {
  selected?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  size?: "md" | "lg";
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border text-sm font-semibold transition-colors disabled:opacity-60 ${
        size === "lg" ? "px-5 py-3" : "px-4 py-2.5"
      } ${
        selected
          ? "bg-maroon border-maroon text-white shadow-card"
          : "bg-white border-slate-200 text-midnight hover:border-maroon/40"
      }`}
    >
      {selected && (
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      )}
      {children}
    </button>
  );
}

/** Today / Yesterday / 2 days ago / Earlier (date picker). Never a calendar by default. */
export function DateChips({
  value,
  onChange,
  label,
  max,
}: {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
  max?: string;
}) {
  const today = isoToday();
  const presets = [
    { label: "Today", iso: today },
    { label: "Yesterday", iso: isoDaysAgo(1) },
    { label: "2 days ago", iso: isoDaysAgo(2) },
  ];
  const isPreset = presets.some((p) => p.iso === value);
  const [earlier, setEarlier] = useState(!isPreset);
  return (
    <div>
      {label && <p className="text-sm font-semibold text-slate-700 mb-2">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <Chip key={p.iso} selected={!earlier && value === p.iso} onClick={() => { setEarlier(false); onChange(p.iso); }}>
            {p.label}
          </Chip>
        ))}
        <Chip selected={earlier} onClick={() => setEarlier(true)}>Earlier</Chip>
      </div>
      {earlier && (
        <input
          type="date"
          value={value}
          max={max ?? today}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className={`${inputClass} mt-3 max-w-xs`}
          aria-label={label ?? "Date"}
        />
      )}
    </div>
  );
}

export function ChipGroup({
  options,
  selected,
  onToggle,
  otherText,
  onOtherText,
}: {
  options: { key: string; label: string }[];
  selected: Set<string>;
  onToggle: (key: string, on: boolean) => void;
  otherText?: string;
  onOtherText?: (text: string) => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Chip key={o.key} selected={selected.has(o.key)} onClick={() => onToggle(o.key, !selected.has(o.key))} size="lg">
            {o.label}
          </Chip>
        ))}
      </div>
      {selected.has("other") && onOtherText && (
        <input
          value={otherText ?? ""}
          onChange={(e) => onOtherText(e.target.value)}
          placeholder="Describe it"
          className={`${inputClass} mt-3 max-w-md`}
          aria-label="Other, describe it"
        />
      )}
    </div>
  );
}
