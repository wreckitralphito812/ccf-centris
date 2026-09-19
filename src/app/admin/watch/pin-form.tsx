"use client";

import { useActionState } from "react";
import { pinVideo, type WatchAdminResult } from "@/app/actions/watch-admin";

const input = "mt-1 w-full border border-hairline bg-paper px-3 py-2.5 text-[0.95rem] text-ink focus:border-clay";

export function PinForm() {
  const [state, action, pending] = useActionState<WatchAdminResult | null, FormData>(pinVideo, null);
  return (
    <form action={action} className="grid gap-4">
      <label className="block">
        <span className="label text-ink-mute">YouTube link</span>
        <input name="url" required placeholder="https://www.youtube.com/watch?v=…" className={input} />
      </label>
      <div className="grid gap-4 sm:grid-cols-[1fr_14rem_11rem]">
        <label className="block">
          <span className="label text-ink-mute">Title (optional)</span>
          <input name="title" maxLength={200} placeholder="Read from YouTube if left blank" className={input} />
        </label>
        <label className="block">
          <span className="label text-ink-mute">Speaker (optional)</span>
          <input name="speaker" maxLength={120} className={input} />
        </label>
        <label className="block">
          <span className="label text-ink-mute">Sunday (optional)</span>
          <input name="service_date" type="date" className={input} />
        </label>
      </div>
      {state?.error ? <p role="alert" className="text-[0.9rem] text-sky">{state.error}</p> : null}
      {state?.ok ? <p role="status" className="text-[0.9rem] text-moss">{state.message}</p> : null}
      <div>
        <button
          disabled={pending}
          className="btn-press label border border-clay bg-clay px-5 py-3 text-paper-bright hover:bg-clay-deep disabled:opacity-50"
        >
          {pending ? "Pinning…" : "Pin this video"}
        </button>
      </div>
    </form>
  );
}
