"use client";

import { useActionState } from "react";
import { requestAnnouncementAccess, type AnnounceResult } from "@/app/actions/announcements";

/** Ask to post announcements; the admin inbox is told. */
export function AccessForm() {
  const [state, action, pending] = useActionState<AnnounceResult | null, FormData>(requestAnnouncementAccess, null);
  if (state?.ok) {
    return <p className="rounded-xl bg-clay-wash px-5 py-4 font-semibold text-clay-deep">{state.message}</p>;
  }
  return (
    <form action={action} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="block flex-1">
        <span className="block text-[0.98rem] font-semibold text-ink">Which ministry do you post for?</span>
        <input name="ministry" maxLength={80} required placeholder="e.g. Elevate, Kids, Ushering" className="calm-input mt-1.5 min-h-12 w-full px-4 text-[1rem] text-ink" />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="btn-press min-h-12 rounded-lg bg-clay px-6 text-[1rem] font-semibold text-paper-bright hover:bg-clay-deep disabled:opacity-50"
      >
        {pending ? "Sending…" : "Ask for access"}
      </button>
      {state?.formError ? <p role="alert" className="text-[0.92rem] font-semibold text-sky sm:basis-full">{state.formError}</p> : null}
    </form>
  );
}
