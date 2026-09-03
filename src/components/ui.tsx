import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ---------------------------------------------------------------------------
   Primitives shared across the whole site. Everything visual starts here.
   --------------------------------------------------------------------------- */

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* --- Button ---------------------------------------------------------------- */

type ButtonTone = "primary" | "ink" | "outline" | "ghost" | "sky";
type ButtonSize = "sm" | "md" | "lg";

const TONE: Record<ButtonTone, string> = {
  primary:
    "bg-clay text-paper-bright border-clay hover:bg-clay-deep hover:border-clay-deep",
  ink: "bg-ink text-paper-bright border-ink hover:bg-night hover:border-night",
  outline:
    "bg-transparent text-ink border-ink hover:bg-ink hover:text-paper-bright",
  ghost:
    "bg-transparent text-ink border-transparent hover:border-ink/30 hover:bg-ink/5",
  sky: "bg-sky text-paper-bright border-sky hover:brightness-110",
};

const SIZE: Record<ButtonSize, string> = {
  sm: "px-3.5 py-1.5 text-[0.78rem]",
  md: "px-5 py-2.5 text-[0.86rem]",
  lg: "px-7 py-3.5 text-[0.95rem]",
};

function buttonClass(tone: ButtonTone, size: ButtonSize, full?: boolean) {
  return cx(
    "inline-flex items-center justify-center gap-2 border font-semibold uppercase tracking-[0.1em]",
    "transition-colors duration-200 disabled:opacity-40 disabled:pointer-events-none",
    TONE[tone],
    SIZE[size],
    full && "w-full",
  );
}

export function Button({
  tone = "primary",
  size = "md",
  full,
  className,
  ...rest
}: ComponentProps<"button"> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  full?: boolean;
}) {
  return <button className={cx(buttonClass(tone, size, full), className)} {...rest} />;
}

export function ButtonLink({
  tone = "primary",
  size = "md",
  full,
  className,
  ...rest
}: ComponentProps<typeof Link> & {
  tone?: ButtonTone;
  size?: ButtonSize;
  full?: boolean;
}) {
  return <Link className={cx(buttonClass(tone, size, full), className)} {...rest} />;
}

/* --- Structure -------------------------------------------------------------- */

export function Container({
  children,
  className,
  wide,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={cx(
        "mx-auto w-full px-5 sm:px-8",
        wide ? "max-w-[110rem]" : "max-w-[82rem]",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Section({
  children,
  className,
  tone = "paper",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: "paper" | "deep" | "bright" | "ink";
  id?: string;
}) {
  const tones = {
    paper: "bg-paper text-ink",
    deep: "bg-paper-deep text-ink",
    bright: "bg-paper-bright text-ink",
    ink: "bg-night text-paper-bright",
  } as const;
  return (
    <section id={id} className={cx("py-16 sm:py-24", tones[tone], className)}>
      {children}
    </section>
  );
}

/** Eyebrow label with a rule, used above most section headings. */
export function Eyebrow({
  children,
  tone = "clay",
  className,
}: {
  children: ReactNode;
  tone?: "clay" | "ink" | "paper";
  className?: string;
}) {
  const c = {
    clay: "text-clay",
    ink: "text-ink-mute",
    paper: "text-paper-bright/60",
  }[tone];
  return (
    <p className={cx("label flex items-center gap-3", c, className)}>
      <span aria-hidden className="h-px w-8 bg-current opacity-50" />
      {children}
    </p>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  action,
  tone = "clay",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  tone?: "clay" | "ink" | "paper";
  className?: string;
}) {
  return (
    <div
      className={cx(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
        <h2 className="display-md mt-4 text-balance">{title}</h2>
        {lead ? (
          <p
            className={cx(
              "mt-4 text-[1.02rem] leading-relaxed",
              tone === "paper" ? "text-paper-bright/70" : "text-ink-soft",
            )}
          >
            {lead}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* --- Surfaces --------------------------------------------------------------- */

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}) {
  return (
    <As
      className={cx(
        "border border-hairline bg-paper-bright transition-colors duration-200",
        className,
      )}
    >
      {children}
    </As>
  );
}

/** Card that is entirely a link, with a hover lift on the border only. */
export function LinkCard({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cx(
        "group block border border-hairline bg-paper-bright",
        "transition-colors duration-200 hover:border-ink",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Pill({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: "default" | "clay" | "sky" | "moss" | "live" | "muted";
  className?: string;
}) {
  const tones = {
    default: "border-ink/25 text-ink",
    clay: "border-clay/40 bg-clay/10 text-clay-deep",
    sky: "border-sky/40 bg-sky/10 text-sky",
    moss: "border-moss/40 bg-moss/10 text-moss",
    live: "border-transparent bg-clay text-paper-bright",
    muted: "border-transparent bg-ink/8 text-ink-mute",
  } as const;
  return (
    <span
      className={cx(
        "label inline-flex items-center gap-1.5 border px-2.5 py-1",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cx("live-dot inline-block h-1.5 w-1.5 rounded-full bg-current", className)}
    />
  );
}

/** Key/value row used in facility specs and event details. */
export function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline py-3 last:border-0">
      <dt className="label text-ink-mute">{label}</dt>
      <dd className="text-right text-[0.95rem] text-ink">{children}</dd>
    </div>
  );
}

/* --- States ----------------------------------------------------------------- */

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed border-hairline bg-paper-bright/60 px-6 py-16 text-center">
      <div
        aria-hidden
        className="halftone mx-auto mb-6 h-12 w-24 opacity-25"
      />
      <p className="font-display text-2xl">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[0.95rem] leading-relaxed text-ink-soft">
        {body}
      </p>
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Cropped oversized numeral used as a section ornament. */
export function BigNumeral({ n, className }: { n: number | string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cx(
        "font-display pointer-events-none select-none leading-none text-ink/8",
        className,
      )}
      style={{ fontSize: "clamp(6rem, 18vw, 16rem)" }}
    >
      {n}
    </span>
  );
}
