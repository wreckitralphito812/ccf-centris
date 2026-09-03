"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { cx } from "@/components/ui";

interface Facets {
  topics: string[];
  books: string[];
  years: string[];
  series: { slug: string; title: string }[];
  speakers: { slug: string; name: string }[];
}

/**
 * Filters write to the URL, so every view is shareable and the back button
 * behaves. The list itself is rendered on the server from those params.
 */
export function MessageFilters({ facets, total }: { facets: Facets; total: number }) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const set = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      start(() => router.replace(`/watch/messages?${next}`, { scroll: false }));
    },
    [params, router],
  );

  const active = ["series", "speaker", "topic", "book", "year", "q"].filter((k) =>
    params.get(k),
  );

  return (
    <div className={cx("transition-opacity", pending && "opacity-60")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          set("q", q.trim());
        }}
        className="flex gap-2"
      >
        <label className="sr-only" htmlFor="msg-search">
          Search messages
        </label>
        <input
          id="msg-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title, speaker, passage, or topic"
          className="w-full border border-hairline bg-paper-bright px-4 py-3 text-[0.95rem] focus:border-ink"
        />
        <button
          type="submit"
          className="btn-press label shrink-0 border border-ink bg-ink px-5 text-paper-bright transition-colors hover:bg-night"
        >
          Search
        </button>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select
          label="Series"
          value={params.get("series") ?? ""}
          onChange={(v) => set("series", v)}
          options={facets.series.map((s) => [s.slug, s.title])}
        />
        <Select
          label="Speaker"
          value={params.get("speaker") ?? ""}
          onChange={(v) => set("speaker", v)}
          options={facets.speakers.map((s) => [s.slug, s.name])}
        />
        <Select
          label="Topic"
          value={params.get("topic") ?? ""}
          onChange={(v) => set("topic", v)}
          options={facets.topics.map((t) => [t, cap(t)])}
        />
        <Select
          label="Bible book"
          value={params.get("book") ?? ""}
          onChange={(v) => set("book", v)}
          options={facets.books.map((b) => [b, b])}
        />
        <Select
          label="Year"
          value={params.get("year") ?? ""}
          onChange={(v) => set("year", v)}
          options={facets.years.map((y) => [y, y])}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5">
        <p className="text-[0.88rem] text-ink-mute">
          <span className="tabular">{total}</span>{" "}
          {total === 1 ? "message" : "messages"}
          {active.length ? " matching your filters" : ""}
        </p>
        <div className="flex items-center gap-4">
          <Select
            label="Sort"
            compact
            value={params.get("sort") ?? "newest"}
            onChange={(v) => set("sort", v === "newest" ? "" : v)}
            options={[
              ["newest", "Newest first"],
              ["oldest", "Oldest first"],
            ]}
            allowEmpty={false}
          />
          {active.length ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                start(() => router.replace("/watch/messages", { scroll: false }));
              }}
              className="label text-clay underline underline-offset-4"
            >
              Clear all
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  compact,
  allowEmpty = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
  compact?: boolean;
  allowEmpty?: boolean;
}) {
  return (
    <label className={compact ? "flex items-center gap-2" : "block"}>
      <span className={cx("label text-ink-mute", !compact && "mb-1.5 block")}>
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cx(
          "border border-hairline bg-paper-bright px-3 py-2.5 text-[0.9rem] focus:border-ink",
          compact ? "w-auto" : "w-full",
        )}
      >
        {allowEmpty ? <option value="">All</option> : null}
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
