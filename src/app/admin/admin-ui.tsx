import Link from "next/link";
import type { ReactNode } from "react";
import { cx } from "@/components/ui";

/* Shared admin furniture. Plain, dense, and quiet by design. */

export function AdminHeader({
  title,
  lead,
  action,
}: {
  title: string;
  lead?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-5">
      <div>
        <h1 className="font-display text-3xl leading-tight">{title}</h1>
        {lead ? (
          <p className="mt-1.5 max-w-2xl text-[0.92rem] leading-relaxed text-ink-soft">
            {lead}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function AdminPanel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("border border-hairline bg-paper-bright", className)}>
      {title ? (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-3.5">
          <h2 className="font-display text-lg">{title}</h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  note,
  tone = "ink",
}: {
  label: string;
  value: string | number;
  note?: string;
  tone?: "ink" | "clay" | "moss";
}) {
  const c = {
    ink: "text-ink",
    clay: "text-clay",
    moss: "text-moss",
  }[tone];
  return (
    <div className="border border-hairline bg-paper-bright p-5">
      <p className="label text-ink-mute">{label}</p>
      <p className={cx("font-display mt-2 text-4xl leading-none tabular-nums", c)}>
        {value}
      </p>
      {note ? <p className="mt-2 text-[0.82rem] text-ink-mute">{note}</p> : null}
    </div>
  );
}

/** Simple data table. Scrolls rather than squeezing. */
export function Table({
  columns,
  children,
}: {
  columns: string[];
  children: ReactNode;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] border-collapse text-[0.9rem]">
        <thead>
          <tr className="border-b border-hairline">
            {columns.map((c) => (
              <th
                key={c}
                scope="col"
                className="label px-5 py-3 text-left text-ink-mute"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={cx("px-5 py-3.5 align-top", className)}>{children}</td>;
}

const STATUS_TONE: Record<string, string> = {
  new: "border-clay/40 bg-clay/10 text-clay-deep",
  pending: "border-clay/40 bg-clay/10 text-clay-deep",
  approved: "border-moss/40 bg-moss/10 text-moss",
  confirmed: "border-moss/40 bg-moss/10 text-moss",
  published: "border-moss/40 bg-moss/10 text-moss",
  open: "border-moss/40 bg-moss/10 text-moss",
  draft: "border-ink/20 bg-ink/5 text-ink-mute",
  closed: "border-ink/20 bg-ink/5 text-ink-mute",
  completed: "border-ink/20 bg-ink/5 text-ink-mute",
  cancelled: "border-ink/20 bg-ink/5 text-ink-mute",
  rejected: "border-ink/20 bg-ink/5 text-ink-mute",
  full: "border-ink/20 bg-ink/5 text-ink-mute",
  urgent: "border-transparent bg-clay text-paper-bright",
};

export function Status({ value }: { value: string }) {
  const tone = STATUS_TONE[value.toLowerCase()] ?? "border-ink/20 text-ink";
  return (
    <span className={cx("label inline-flex border px-2 py-1", tone)}>
      {value}
    </span>
  );
}

/** Row of quick actions that do nothing yet, and say so honestly. */
export function RowActions({ actions }: { actions: string[] }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {actions.map((a) => (
        <span
          key={a}
          className="label border border-ink/20 px-2 py-1 text-ink-mute"
        >
          {a}
        </span>
      ))}
    </span>
  );
}

export function AdminNote({ children }: { children: ReactNode }) {
  return (
    <p className="mt-6 border-l-2 border-clay bg-paper-bright py-3 pl-4 pr-3 text-[0.85rem] leading-relaxed text-ink-soft">
      {children}
    </p>
  );
}

export function QuickLink({
  href,
  title,
  note,
}: {
  href: string;
  title: string;
  note: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col border border-hairline bg-paper-bright p-5 transition-colors hover:border-ink"
    >
      <span className="font-display text-lg transition-colors group-hover:text-clay">
        {title}
      </span>
      <span className="mt-1 text-[0.85rem] leading-relaxed text-ink-mute">
        {note}
      </span>
    </Link>
  );
}
