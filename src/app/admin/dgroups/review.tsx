"use client";

import { useActionState, useState } from "react";
import { reviewDgroup, type DgroupReviewResult } from "@/app/actions/admin-dgroups";
import { cx } from "@/components/ui";
import { keepForm } from "@/lib/keep-form";

/* The team's decision on one Dgroup (2026-10-08). Each button submits its
   own decision value, so the click that wins is the one that's sent. */

const BTN = "inline-flex min-h-10 items-center rounded-lg border px-3.5 text-[0.9rem] font-semibold transition-colors disabled:opacity-50";

export function DgroupReview({ id, status }: { id: string; status: string }) {
  const [state, action, pending] = useActionState<DgroupReviewResult | null, FormData>(reviewDgroup, null);
  const [noting, setNoting] = useState(false);

  if (state?.ok) {
    return (
      <p role="status" className="text-[0.92rem] font-semibold text-moss">
        ✓ {state.message}
      </p>
    );
  }

  return (
    <form action={action} onSubmit={keepForm(action)} className="space-y-2.5">
      <input type="hidden" name="id" value={id} />
      {noting ? (
        <label className="block">
          <span className="sr-only">Note to the leader</span>
          <textarea
            name="note"
            rows={2}
            maxLength={500}
            placeholder="A short note to the leader: what to change, or why not."
            className="calm-input w-full px-3 py-2 text-[0.95rem]"
          />
        </label>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {status === "pending" || status === "changes_requested" || status === "declined" ? (
          <button type="submit" name="decision" value="approve" disabled={pending} className={cx(BTN, "border-clay bg-clay text-paper-bright hover:bg-clay-deep")}>
            Approve
          </button>
        ) : null}
        {status === "pending" ? (
          noting ? (
            <>
              <button type="submit" name="decision" value="changes" disabled={pending} className={cx(BTN, "border-edge text-ink hover:border-clay")}>
                Send back with note
              </button>
              <button type="submit" name="decision" value="decline" disabled={pending} className={cx(BTN, "border-transparent text-ink-mute hover:text-sky")}>
                Decline with note
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setNoting(true)} className={cx(BTN, "border-edge text-ink hover:border-clay")}>
              Send back or decline…
            </button>
          )
        ) : null}
        {status === "approved" ? (
          <button type="submit" name="decision" value="archive" disabled={pending} className={cx(BTN, "border-edge text-ink-soft hover:border-ink")}>
            Archive (stopped meeting)
          </button>
        ) : null}
        {status === "archived" ? (
          <button type="submit" name="decision" value="restore" disabled={pending} className={cx(BTN, "border-edge text-ink hover:border-clay")}>
            Restore
          </button>
        ) : null}
      </div>
      {state?.error ? (
        <p role="alert" className="text-[0.88rem] font-semibold text-sky">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
