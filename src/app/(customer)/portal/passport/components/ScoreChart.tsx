"use client";

import { useId, useState } from "react";
import { copy } from "@/lib/tracker/copy";
import type { ScorePoint } from "@/lib/tracker/diary";
import { formatDayShort } from "@/lib/tracker/stats";

/*
 * One line: the day's symptom ratings added up, over the days of a UTI.
 * A single series, so no legend; the title says what is plotted. Hover or
 * tap a day for the symptoms behind the number, and a table sits below for
 * anyone who prefers it.
 */
const W = 640;
const H = 220;
const PAD = { top: 16, right: 20, bottom: 36, left: 36 };

export function ScoreChart({ points }: { points: ScorePoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const id = useId();
  if (points.length < 2) return <p className="text-sm text-slate-600">{copy.episode.chartEmpty}</p>;

  const days = points.map((p) => p.day);
  const minDay = Math.min(...days);
  const maxDay = Math.max(...days);
  const maxScore = Math.max(10, Math.ceil(Math.max(...points.map((p) => p.score)) / 10) * 10);
  const x = (day: number) => PAD.left + ((day - minDay) / Math.max(1, maxDay - minDay)) * (W - PAD.left - PAD.right);
  const y = (score: number) => PAD.top + (1 - score / maxScore) * (H - PAD.top - PAD.bottom);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.day).toFixed(1)} ${y(p.score).toFixed(1)}`).join(" ");
  const ticks = [0, maxScore / 2, maxScore];
  // Day labels: every day when there is room, otherwise first, last and a few between.
  const span = maxDay - minDay;
  const step = span <= 8 ? 1 : Math.ceil(span / 6);
  const dayLabels: number[] = [];
  for (let d = minDay; d <= maxDay; d += step) dayLabels.push(d);
  if (dayLabels[dayLabels.length - 1] !== maxDay) dayLabels.push(maxDay);
  const current = active === null ? null : points[active];

  const nearest = (clientX: number, el: SVGSVGElement) => {
    const rect = el.getBoundingClientRect();
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    points.forEach((p, i) => { if (Math.abs(x(p.day) - px) < Math.abs(x(points[best].day) - px)) best = i; });
    setActive(best);
  };

  return (
    <div data-testid="score-chart">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full h-auto touch-pan-y"
          role="img"
          aria-labelledby={`${id}-title`}
          onPointerMove={(e) => nearest(e.clientX, e.currentTarget)}
          onPointerDown={(e) => nearest(e.clientX, e.currentTarget)}
          onPointerLeave={() => setActive(null)}
        >
          <title id={`${id}-title`}>{copy.episode.chartTitle}: {points.map((p) => `day ${p.day} ${p.score}`).join(", ")}</title>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(t)} y2={y(t)} stroke="#e7e5e4" strokeWidth="1" />
              <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#64748b">{t}</text>
            </g>
          ))}
          {dayLabels.map((d) => (
            <text key={d} x={x(d)} y={H - PAD.bottom + 18} textAnchor="middle" fontSize="11" fill="#64748b">Day {d}</text>
          ))}
          {current && <line x1={x(current.day)} x2={x(current.day)} y1={PAD.top} y2={H - PAD.bottom} stroke="#1d003a" strokeOpacity="0.25" strokeWidth="1" />}
          <path d={path} fill="none" stroke="#91193b" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <circle key={p.on} cx={x(p.day)} cy={y(p.score)} r={active === i ? 6 : 4.5} fill="#91193b" stroke="#ffffff" strokeWidth="2" />
          ))}
          {/* The latest value is the one worth labelling directly. */}
          <text x={x(points[points.length - 1].day)} y={y(points[points.length - 1].score) - 10} textAnchor="middle" fontSize="12" fontWeight="600" fill="#1d003a">{points[points.length - 1].score}</text>
        </svg>
        {current && (
          <div className="pointer-events-none absolute left-0 top-0 rounded-xl bg-midnight px-3 py-2 text-xs text-white shadow-card" style={{ transform: `translate(${Math.min(Math.max(0, (x(current.day) / W) * 100 - 20), 60)}%, 0)` }} role="status">
            <p className="font-semibold">Day {current.day} · {formatDayShort(current.on)} · {copy.diary.score(current.score)}</p>
            <ul>{current.items.map((it) => <li key={it.symptom}>{it.label}{it.severity ? ` ${it.severity}` : ""}</li>)}</ul>
          </div>
        )}
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs font-semibold text-maroon min-h-[32px] inline-flex items-center">{copy.episode.chartTable}</summary>
        <table className="mt-2 w-full text-xs text-slate-700">
          <thead><tr className="text-left text-slate-500"><th className="py-1 pr-2 font-semibold">Day</th><th className="py-1 pr-2 font-semibold">Date</th><th className="py-1 pr-2 font-semibold">Score</th><th className="py-1 font-semibold">Symptoms</th></tr></thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.on} className="border-t border-slate-100">
                <td className="py-1 pr-2">{p.day}</td>
                <td className="py-1 pr-2">{formatDayShort(p.on)}</td>
                <td className="py-1 pr-2 font-semibold text-midnight">{p.score}</td>
                <td className="py-1">{p.items.map((it) => `${it.label}${it.severity ? ` ${it.severity}` : ""}`).join(", ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
