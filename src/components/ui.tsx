import Link from "next/link";
import { KIT_STATUS_COLORS, KIT_STATUS_LABELS, type KitStatus } from "@/lib/status";

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-semibold text-slate-900 mb-4">{children}</h2>;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status, admin = false }: { status: KitStatus; admin?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${KIT_STATUS_COLORS[status]}`}
    >
      {KIT_STATUS_LABELS[status]}
    </span>
  );
}

export function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    amber: "bg-amber-100 text-amber-800",
    red: "bg-rose-100 text-rose-800",
    brand: "bg-brand-100 text-brand-800",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone] ?? tones.slate}`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  const styles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
    danger: "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50",
  };
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
  external = false,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
  external?: boolean;
}) {
  const styles = {
    primary: "bg-brand-600 text-white hover:bg-brand-700",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50",
  };
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className={`inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-medium transition-colors ${styles[variant]}`}
    >
      {children}
    </Link>
  );
}

export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100";

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm font-medium text-slate-600">{title}</p>
      {body && <p className="text-sm text-slate-400 mt-1">{body}</p>}
    </div>
  );
}
