import type { ReactNode } from "react";
import Image from "next/image";
import { Container, Eyebrow, cx } from "./ui";

export interface PageHeaderImage {
  src: string;
  alt: string;
  /** CSS object-position, for keeping the subject in frame. */
  position?: string;
}

/**
 * The top of every inner page. Kept plain on purpose: a heading at reading
 * size rather than poster size, no texture, and, where the Centris team has a
 * good photo of the place, that photo beside the text (below it on phones).
 */
export function PageHeader({
  eyebrow,
  eyebrowAside,
  title,
  lead,
  actions,
  image,
  tone = "deep",
  align = "left",
}: {
  eyebrow?: string;
  /** Something small beside the eyebrow, e.g. a partner's logo. */
  eyebrowAside?: ReactNode;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  image?: PageHeaderImage;
  tone?: "deep" | "paper" | "ink" | "clay";
  align?: "left" | "center";
}) {
  const tones = {
    // Colour glows (design A, 2026-10-01): CCF teal from the top corner and a
    // touch of CCF maroon below it, over white, after Calendly's blobs.
    deep:
      "bg-paper-bright bg-[radial-gradient(42%_95%_at_94%_8%,rgb(0_166_182/0.30),transparent_70%),radial-gradient(30%_75%_at_74%_115%,rgb(176_23_74/0.13),transparent_70%),radial-gradient(40%_80%_at_0%_100%,rgb(0_128_143/0.06),transparent_70%)] text-ink",
    paper: "bg-paper text-ink",
    ink: "bg-night text-paper-bright",
    clay: "bg-clay text-paper-bright",
  } as const;

  const dark = tone === "ink" || tone === "clay";
  const centered = align === "center" && !image;

  return (
    <header className={cx(tones[tone])}>
      <Container
        className={cx(
          "py-10 sm:py-14 lg:py-16",
          image && "grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-14",
          centered && "text-center",
        )}
      >
        <div className={cx("max-w-2xl", centered && "mx-auto")}>
          {eyebrow ? (
            <div className={cx("flex items-center gap-4", centered && "justify-center")}>
              <Eyebrow
                tone={dark ? "paper" : "clay"}
                className={centered ? "justify-center" : undefined}
              >
                {eyebrow}
              </Eyebrow>
              {eyebrowAside ? (
                <>
                  <span aria-hidden className="h-5 w-px bg-ink/15" />
                  {eyebrowAside}
                </>
              ) : null}
            </div>
          ) : null}
          <h1 className="page-title mt-3 text-balance">{title}</h1>
          {lead ? (
            <p
              className={cx(
                "mt-5 text-[1.05rem] leading-relaxed",
                dark ? "text-current/75" : "text-ink-mute",
              )}
            >
              {lead}
            </p>
          ) : null}
          {actions ? (
            <div
              className={cx(
                "mt-8 flex flex-wrap gap-3",
                centered && "justify-center",
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>

        {image ? (
          <div className="photo relative aspect-[16/9] bg-paper shadow-sm lg:aspect-[3/2]">
            <Image
              src={image.src}
              alt={image.alt}
              fill
              priority
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover"
              style={image.position ? { objectPosition: image.position } : undefined}
            />
          </div>
        ) : null}
      </Container>
    </header>
  );
}

/** Simple prose wrapper with the site's measure and rhythm. */
export function Prose({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cx(
        "max-w-2xl space-y-5 text-[1.02rem] leading-relaxed text-ink-soft",
        "[&_h2]:font-display [&_h2]:text-3xl [&_h2]:text-ink [&_h2]:mt-12 [&_h2]:mb-1",
        "[&_h3]:font-display [&_h3]:text-xl [&_h3]:text-ink [&_h3]:mt-8 [&_h3]:mb-1",
        "[&_strong]:text-ink [&_strong]:font-semibold",
        "[&_a]:text-clay [&_a]:underline [&_a]:underline-offset-4",
        "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2",
        "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
