import type { ReactNode } from "react";
import { Container, Eyebrow, cx } from "./ui";

export function PageHeader({
  eyebrow,
  title,
  lead,
  actions,
  tone = "deep",
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  tone?: "deep" | "paper" | "ink" | "clay";
  align?: "left" | "center";
}) {
  const tones = {
    deep: "bg-paper-deep text-ink",
    paper: "bg-paper text-ink",
    ink: "bg-night text-paper-bright",
    clay: "bg-clay text-paper-bright",
  } as const;

  const dark = tone === "ink" || tone === "clay";

  return (
    <header className={cx("relative overflow-hidden border-b border-hairline", tones[tone])}>
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(${dark ? "#f4efe6" : "#17150f"} 1px, transparent 1.2px)`,
          backgroundSize: "8px 8px",
        }}
      />
      <Container
        className={cx(
          "relative py-14 sm:py-20",
          align === "center" && "text-center",
        )}
      >
        <div className={cx("max-w-3xl", align === "center" && "mx-auto")}>
          {eyebrow ? (
            <Eyebrow
              tone={dark ? "paper" : "clay"}
              className={align === "center" ? "justify-center" : undefined}
            >
              {eyebrow}
            </Eyebrow>
          ) : null}
          <h1 className="display-lg mt-5 text-balance">{title}</h1>
          {lead ? (
            <p
              className={cx(
                "mt-6 text-[1.05rem] leading-relaxed",
                dark ? "text-current/75" : "text-ink-soft",
              )}
            >
              {lead}
            </p>
          ) : null}
          {actions ? (
            <div
              className={cx(
                "mt-8 flex flex-wrap gap-3",
                align === "center" && "justify-center",
              )}
            >
              {actions}
            </div>
          ) : null}
        </div>
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
