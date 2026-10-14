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
  /** `confirm` asks first, in plain words, before anything that emails someone or can't be undone. */
  transitions: { label: string; status: string; tone?: "go" | "stop" | "mute"; confirm?: string }[];
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
                if (t.confirm && !window.confirm(t.confirm)) return;
                setError(null);
                start(async () => {
                  const res = await onSet(id, t.status as never);
                  if (!res.ok) setError(res.formError ?? "Update failed.");
                });
              }}
              className={cx(
                "btn-press inline-flex min-h-10 items-center rounded-lg border px-3.5 text-[0.9rem] font-semibold transition-colors",
                t.tone === "go" &&
                  "border-moss bg-moss text-paper-bright hover:bg-moss/90",
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
      {pending ? <span className="mt-1 block text-[0.8rem] text-ink-mute">Saving…</span> : null}
      {error ? (
        <span className="mt-1 block text-[0.85rem] font-semibold text-clay-deep">
          {error}
        </span>
      ) : null}
    </span>
  );
}
