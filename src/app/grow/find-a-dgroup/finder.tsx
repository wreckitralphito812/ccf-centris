"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useTransition } from "react";
import { cx } from "@/components/ui";
import { AUDIENCE_LABEL, MODE_LABEL, dayName } from "@/lib/format";

/**
 * Filters write to the URL so a leader can send someone a link straight to
 * "Wednesday, young professionals, in person" rather than describing it.
 */
export function DgroupFinder({
  total,
  languages,
  communities,
}: {
  total: number;
  languages: string[];
  communities: { slug: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  const set = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      start(() =>
        router.replace(`/grow/find-a-dgroup?${next}`, { scroll: false }),
      );
    },
    [params, router],
  );

  const activeKeys = ["audience", "mode", "day", "language", "community", "q"];
  const active = activeKeys.filter((k) => params.get(k));

  return (
    <div className={cx("transition-opacity", pending && "opacity-60")}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          set("q", q.trim());
        }}
        className="flex gap-2"
      >
        <label className="sr-only" htmlFor="dg-search">
          Search Dgroups
        </label>
        <input
          id="dg-search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, area, or description"
          className="w-full border border-hairline bg-paper-bright px-4 py-3 text-[0.95rem] outline-none focus:border-ink"
        />
        <button
          type="submit"
          className="label shrink-0 border border-ink bg-ink px-5 text-paper-bright transition-colors hover:bg-night"
        >
          Search
        </button>
      </form>

      {/* Day is the filter people actually reach for first, so it leads. */}
      <fieldset className="mt-6">
        <legend className="label text-ink-mute">Which day suits you?</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {[0, 1, 2, 3, 4, 5, 6].map((d) => {
            const on = params.get("day") === String(d);
            return (
              <button
                key={d}
                type="button"
                aria-pressed={on}
                onClick={() => set("day", on ? "" : String(d))}
                className={cx(
                  "label border px-3.5 py-2 transition-colors",
                  on
                    ? "border-clay bg-clay text-paper-bright"
                    : "border-ink/25 text-ink hover:border-ink",
                )}
              >
                {dayName(d).slice(0, 3)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Life stage"
          value={params.get("audience") ?? ""}
          onChange={(v) => set("audience", v)}
          options={Object.entries(AUDIENCE_LABEL)}
        />
        <Select
          label="Meeting style"
          value={params.get("mode") ?? ""}
          onChange={(v) => set("mode", v)}
          options={Object.entries(MODE_LABEL)}
        />
        <Select
          label="Language"
          value={params.get("language") ?? ""}
          onChange={(v) => set("language", v)}
          options={languages.map((l) => [l, l])}
        />
        <Select
          label="Community"
          value={params.get("community") ?? ""}
          onChange={(v) => set("community", v)}
          options={communities.map((c) => [c.slug, c.name])}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-hairline pt-5">
        <p className="text-[0.88rem] text-ink-mute">
          {total} {total === 1 ? "group" : "groups"}
          {active.length ? " matching" : " meeting around Centris"}
        </p>
        {active.length ? (
          <button
            type="button"
            onClick={() => {
              setQ("");
              start(() =>
                router.replace("/grow/find-a-dgroup", { scroll: false }),
              );
            }}
            className="label text-clay underline underline-offset-4"
          >
            Clear all
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block">
      <span className="label mb-1.5 block text-ink-mute">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-hairline bg-paper-bright px-3 py-2.5 text-[0.9rem] outline-none focus:border-ink"
      >
        <option value="">Any</option>
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
