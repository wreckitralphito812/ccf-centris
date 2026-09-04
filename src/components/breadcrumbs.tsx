import type { ComponentProps } from "react";
import Link from "next/link";
import { cx } from "./ui";
import { type Crumb, breadcrumbJsonLd, withHome } from "./breadcrumbs-trail";

/* ---------------------------------------------------------------------------
   Breadcrumbs — the "Home › Section › … › Current page" trail on deep pages.

   Two layers:
   • Primitives (Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink,
     BreadcrumbPage, BreadcrumbSeparator) — the shadcn/ui Breadcrumb API shape,
     restyled with this site's own tokens. Zero JS, zero dependencies. Each
     takes a `tone` ("light" | "dark") for use on light vs. dark sections.
   • <Breadcrumbs items tone> — a thin wrapper that builds the trail from an
     array (prepending Home) and emits schema.org BreadcrumbList JSON-LD.

   Trail-building and JSON-LD live in ./breadcrumbs-trail so they can be unit
   tested with the project's `tsx --test` runner, which can't load JSX.
   --------------------------------------------------------------------------- */

export type { Crumb } from "./breadcrumbs-trail";

type Tone = "light" | "dark";

const LINK_TONE: Record<Tone, string> = {
  light: "text-ink-mute hover:text-clay",
  dark: "text-paper-bright/50 hover:text-paper-bright",
};
const PAGE_TONE: Record<Tone, string> = {
  light: "text-ink",
  dark: "text-paper-bright",
};
const SEP_TONE: Record<Tone, string> = {
  light: "text-ink-mute/50",
  dark: "text-paper-bright/30",
};

/* --- Primitives (shadcn Breadcrumb shape) -------------------------------- */

export function Breadcrumb({ className, ...props }: ComponentProps<"nav">) {
  return <nav aria-label="Breadcrumb" className={className} {...props} />;
}

export function BreadcrumbList({ className, ...props }: ComponentProps<"ol">) {
  return (
    <ol
      className={cx(
        "label flex flex-wrap items-center gap-x-2 gap-y-1",
        className,
      )}
      {...props}
    />
  );
}

export function BreadcrumbItem({ className, ...props }: ComponentProps<"li">) {
  return (
    <li className={cx("inline-flex items-center gap-x-2", className)} {...props} />
  );
}

export function BreadcrumbLink({
  className,
  tone = "light",
  href,
  ...props
}: ComponentProps<typeof Link> & { tone?: Tone }) {
  return (
    <Link
      href={href}
      className={cx("transition-colors", LINK_TONE[tone], className)}
      {...props}
    />
  );
}

export function BreadcrumbPage({
  className,
  tone = "light",
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      aria-current="page"
      className={cx("max-w-[16rem] truncate", PAGE_TONE[tone], className)}
      {...props}
    />
  );
}

export function BreadcrumbSeparator({
  children,
  className,
  tone = "light",
  ...props
}: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span aria-hidden className={cx(SEP_TONE[tone], className)} {...props}>
      {children ?? "›"}
    </span>
  );
}

/* --- Wrapper: build a trail from an items array ------------------------- */

export function Breadcrumbs({
  items,
  tone = "light",
  className,
}: {
  /** The trail below Home. Home is prepended automatically. The last item is
   *  the current page: pass it with no `href` so it renders as plain text. */
  items: Crumb[];
  tone?: Tone;
  className?: string;
}) {
  const trail = withHome(items);

  return (
    <Breadcrumb className={className}>
      <script
        type="application/ld+json"
        // Trusted, build-time content — labels come from our own data.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd(trail)),
        }}
      />
      <BreadcrumbList>
        {trail.map((c, i) => {
          const isLast = i === trail.length - 1;
          return (
            <BreadcrumbItem key={`${c.label}-${i}`}>
              {isLast || !c.href ? (
                <BreadcrumbPage tone={tone}>{c.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink href={c.href} tone={tone}>
                  {c.label}
                </BreadcrumbLink>
              )}
              {!isLast ? <BreadcrumbSeparator tone={tone} /> : null}
            </BreadcrumbItem>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
