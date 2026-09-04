import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ---------------------------------------------------------------------------
   Primitives shared across the whole site. Everything visual starts here.
   --------------------------------------------------------------------------- */

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(" ");
}

/* --- Button -------------------------------------------------------------- */

/* The primitive lives in ./ui/button (shadcn-derived, CCF-themed). These
   wrappers keep the historic prop surface — `tone` (not `variant`), `size`,
   `full` — so call sites are unchanged. */

import {
  Button as ButtonBase,
  type ButtonTone,
  buttonVariants,
} from "./ui/button";
import { Badge } from "./ui/badge";

type ButtonSize = "sm" | "md" | "lg";

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
  return (
    <ButtonBase
      variant={tone}
      size={size}
      full={full}
      className={className}
      {...rest}
    />
  );
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
  return (
    <Link
      className={cx(buttonVariants({ variant: tone, size, full }), className)}
      {...rest}
    />
  );
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
    <section id={id} className={cx("py-12 sm:py-24", tones[tone], className)}>
      {children}
    </section>
  );
}

/** Eyebrow label with a rule, used above most section headings. */
export function Eyebrow({
  children,
  tone = "clay",
  rule = true,
  className,
}: {
  children: ReactNode;
  tone?: "clay" | "ink" | "paper";
  /** The short leading rule. Drop it when something else already leads the
   *  line — a logo mark, say — so the two do not read as competing marks. */
  rule?: boolean;
  className?: string;
}) {
  const c = {
    clay: "text-clay",
    ink: "text-ink-mute",
    paper: "text-paper-bright/60",
  }[tone];
  return (
    <p className={cx("label flex items-center", rule && "gap-3", c, className)}>
      {rule ? (
        <span aria-hidden className="h-px w-8 bg-current opacity-50" />
      ) : null}
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
        "flex flex-col gap-4 md:flex-row md:items-end md:justify-between md:gap-6",
        className,
      )}
    >
      <div className="max-w-2xl">
        {eyebrow ? <Eyebrow tone={tone}>{eyebrow}</Eyebrow> : null}
        <h2 className="display-md mt-4 text-balance">{title}</h2>
        {lead ? (
          <p
            className={cx(
              "mt-3 text-[0.98rem] leading-relaxed sm:mt-4 sm:text-[1.02rem]",
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

import { Card as CardBase } from "./ui/card";

export function Card({
  children,
  className,
  as: As = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "article" | "li";
}) {
  // CardBase renders a <div>; when the caller needs <article>/<li> we fall
  // back to a plain element with the same class so semantics are preserved.
  if (As === "div") {
    return <CardBase className={className}>{children}</CardBase>;
  }
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
  tone?: import("./ui/badge").PillTone;
  className?: string;
}) {
  return (
    <Badge variant={tone} className={className}>
      {children}
    </Badge>
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
