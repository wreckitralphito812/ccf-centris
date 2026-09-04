"use client";

import { useTransition, useState } from "react";
import { cx } from "@/components/ui";
import type { AdminActionResult } from "@/app/actions/admin";

/**
 * Inline status controls for an admin queue row. Each button calls a server
 * action; while it runs the row is dimmed. Errors surface as a small note
 * under the buttons rather than a toast system we don't have.
 */
export function QueueActions({
  id,
  current,
  transitions,
  onSet,
}: {
  id: string;
  current: string;
  transitions: { label: string; status: string; tone?: "go" | "stop" | "mute" }[];
  // A server action. Typed loosely so each queue can pass its own status union.
  onSet: (id: string, status: never) => Promise<AdminActionResult>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className={cx("block", pending && "opacity-50")}>
      <span className="flex flex-wrap gap-1.5">
        {transitions
          .filter((t) => t.status !== current)
          .map((t) => (
            <button
              key={t.status}
              type="button"
              disabled={pending}
              onClick={() => {
                setError(null);
                start(async () => {
                  const res = await onSet(id, t.status as never);
                  if (!res.ok) setError(res.formError ?? "Update failed.");
                });
              }}
              className={cx(
                "label border px-2 py-1 transition-colors",
                t.tone === "go" &&
                  "border-moss/50 text-moss hover:bg-moss hover:text-paper-bright",
                t.tone === "stop" &&
                  "border-clay/50 text-clay-deep hover:bg-clay hover:text-paper-bright",
                (!t.tone || t.tone === "mute") &&
                  "border-ink/20 text-ink-mute hover:border-ink hover:text-ink",
              )}
            >
              {t.label}
            </button>
          ))}
      </span>
      {error ? (
        <span className="mt-1 block text-[0.75rem] font-semibold text-clay-deep">
          {error}
        </span>
      ) : null}
    </span>
  );
}
