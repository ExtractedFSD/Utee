import Link from "next/link";
import { KIT_STATUS_COLORS, KIT_STATUS_LABELS, type KitStatus } from "@/lib/status";

/*
 * Shared primitives, styled to the Utee design system
 * (design-system/readme.md → VISUAL FOUNDATIONS):
 *   - everything rounded: pill buttons and tags, 24px cards
 *   - white cards float on coloured grounds with a soft maroon-tinted shadow
 *   - Cooper Light headings, Poppins body, ALL-CAPS letterspaced labels/CTAs
 */

export function Card({
  children,
  className = "",
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  return (
    <div {...rest} className={`bg-white rounded-card shadow-card p-6 ${className}`}>
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-2xl font-light text-midnight mb-4">{children}</h2>;
}

/** ALL-CAPS letterspaced section label, the design system's EyebrowTab. */
export function Eyebrow({
  children,
  pill = false,
  className = "",
}: {
  children: React.ReactNode;
  pill?: boolean;
  className?: string;
}) {
  return (
    <span
      className={`inline-block text-eyebrow uppercase ${
        pill ? "rounded-full bg-white text-midnight px-4 py-2 shadow-card" : ""
      } ${className}`}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
}: {
  title: string;
  subtitle?: React.ReactNode;
  eyebrow?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div className="max-w-2xl">
        {eyebrow && <Eyebrow className="text-maroon mb-3">{eyebrow}</Eyebrow>}
        <h1 className="font-display text-4xl sm:text-5xl font-light leading-[1.08] text-midnight">
          {title}
        </h1>
        {subtitle && <p className="text-base text-slate-600 mt-3 leading-relaxed">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Small ALL-CAPS pill, the design system's RangeTag, used for statuses. */
const tagClass =
  "inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[.12em] whitespace-nowrap";

export function StatusBadge({ status }: { status: KitStatus; admin?: boolean }) {
  return <span className={`${tagClass} ${KIT_STATUS_COLORS[status]}`}>{KIT_STATUS_LABELS[status]}</span>;
}

export function Pill({ children, tone = "slate" }: { children: React.ReactNode; tone?: string }) {
  const tones: Record<string, string> = {
    slate: "bg-slate-100 text-slate-700",
    green: "bg-mint text-emerald-800",
    amber: "bg-sun text-amber-800",
    red: "bg-peach-50 text-maroon",
    brand: "bg-pink-50 text-maroon",
    lavender: "bg-lavender-50 text-violet-800",
  };
  return <span className={`${tagClass} ${tones[tone] ?? tones.slate}`}>{children}</span>;
}

/*
 * Buttons: white pill with ALL-CAPS midnight label is the brand CTA (used on
 * coloured grounds → variant "white"). On white cards the same pill is filled
 * maroon (→ "primary"). Hover is a slight darken, not specified in the
 * source, flagged there as an assumption.
 */
export const buttonBase =
  "inline-flex min-h-[44px] items-center justify-center whitespace-nowrap rounded-full px-5 py-2.5 text-[12px] font-semibold uppercase tracking-[.14em] transition-colors disabled:opacity-50 disabled:cursor-not-allowed";

export const buttonVariants = {
  primary: "bg-maroon text-white hover:bg-brand-700 shadow-card",
  secondary: "bg-white text-midnight border border-midnight/15 hover:bg-pink-25",
  white: "bg-white text-midnight hover:bg-pink-25 shadow-card",
  danger: "bg-white text-maroon border border-maroon/30 hover:bg-rose-50",
};

export type ButtonVariant = keyof typeof buttonVariants;

export function Button({
  children,
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button {...props} className={`${buttonBase} ${buttonVariants[variant]} ${props.className ?? ""}`}>
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
  variant?: ButtonVariant;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      className={`${buttonBase} ${buttonVariants[variant]}`}
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
      <span className="block text-sm font-semibold text-slate-700 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-slate-500 mt-1.5">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "block w-full rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-midnight placeholder-slate-400 focus:border-maroon focus:outline-none focus:ring-2 focus:ring-pink-50";

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="text-center py-12">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {body && <p className="text-sm text-slate-500 mt-1">{body}</p>}
    </div>
  );
}

/** Pink→maroon gradient call-out with white text, for upsells and highlights. */
export function Callout({
  children,
  className = "",
  ...props
}: {
  children: React.ReactNode;
  className?: string;
} & Omit<React.HTMLAttributes<HTMLDivElement>, "className" | "children">) {
  return (
    <div {...props} className={`rounded-card bg-gradient-brand text-white p-6 shadow-card ${className}`}>
      {children}
    </div>
  );
}

/** Soft notice banner (amber/sun tint) for inline warnings. */
export function Notice({ children, tone = "sun" }: { children: React.ReactNode; tone?: "sun" | "mint" | "pink" }) {
  const tones = {
    sun: "bg-sun-50 border-sun text-amber-800",
    mint: "bg-mint-50 border-mint text-emerald-800",
    pink: "bg-pink-25 border-pink-50 text-midnight",
  };
  return <div className={`rounded-card border p-4 text-sm ${tones[tone]}`}>{children}</div>;
}

export { Logo } from "@/components/Logo";
