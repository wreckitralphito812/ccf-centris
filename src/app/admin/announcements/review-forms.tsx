"use client";

import { useActionState } from "react";
import { addAnnouncementRep, reviewAnnouncement, type ReviewResult } from "@/app/actions/admin-announcements";
import { cx } from "@/components/ui";

const BTN = "btn-press min-h-10 rounded-lg px-4 text-[0.92rem] font-semibold transition-colors disabled:opacity-50";

/** Approve, send back with a note, or decline one announcement. */
export function ReviewActions({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(reviewAnnouncement, null);
  if (state?.ok) return <p className="font-semibold text-moss">{state.message}</p>;
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <label className="block">
        <span className="block text-[0.88rem] font-semibold text-ink">
          Note to the ministry <span className="font-normal text-ink-mute">(needed to send back or decline)</span>
        </span>
        <textarea name="note" rows={2} maxLength={500} placeholder="e.g. Please add the sign-up link and the end time." className="calm-input mt-1.5 w-full px-3.5 py-2.5 text-[0.95rem] text-ink" />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" name="decision" value="approve" disabled={pending} className={cx(BTN, "bg-clay text-paper-bright hover:bg-clay-deep")}>
          Approve and publish
        </button>
        <button type="submit" name="decision" value="changes" disabled={pending} className={cx(BTN, "border border-edge bg-paper-bright text-ink hover:border-clay")}>
          Ask for changes
        </button>
        <button type="submit" name="decision" value="decline" disabled={pending} className={cx(BTN, "text-sky hover:bg-sky-wash")}>
          Decline
        </button>
      </div>
      {state?.formError ? <p role="alert" className="text-[0.9rem] font-semibold text-sky">{state.formError}</p> : null}
    </form>
  );
}

/** Take a live announcement down. */
export function TakeDown({ id }: { id: string }) {
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(reviewAnnouncement, null);
  if (state?.ok) return <span className="text-[0.88rem] font-semibold text-ink-mute">Taken down</span>;
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm("Take this announcement off What's Happening?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="decision" value="takedown" />
      <button type="submit" disabled={pending} className="label text-ink-mute hover:text-sky">
        Take down
      </button>
      {state?.formError ? <span className="ml-2 text-[0.85rem] text-sky">{state.formError}</span> : null}
    </form>
  );
}

/** Add a ministry rep by email. */
export function AddRepForm() {
  const [state, action, pending] = useActionState<ReviewResult | null, FormData>(addAnnouncementRep, null);
  const input = "calm-input min-h-11 w-full px-3.5 text-[0.95rem] text-ink";
  return (
    <form action={action} className="space-y-3 p-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <input name="email" type="email" required placeholder="Email they sign in with" className={input} />
        <input name="name" placeholder="Name" maxLength={120} className={input} />
        <input name="ministry" placeholder="Ministry" maxLength={80} className={input} />
      </div>
      <button type="submit" disabled={pending} className={cx(BTN, "bg-clay text-paper-bright hover:bg-clay-deep")}>
        {pending ? "Adding…" : "Add rep"}
      </button>
      {state ? (
        <p role={state.ok ? "status" : "alert"} className={cx("text-[0.9rem] font-semibold", state.ok ? "text-moss" : "text-sky")}>
          {state.ok ? state.message : state.formError}
        </p>
      ) : null}
    </form>
  );
}
