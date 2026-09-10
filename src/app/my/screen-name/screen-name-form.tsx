"use client";

import { useActionState } from "react";
import { setScreenName, type WallResult } from "@/app/actions/prayer-wall";
import { SCREEN_NAME_RULE } from "@/lib/prayer-wall";

export function ScreenNameForm({ next, current }: { next: string; current: string }) {
  const [state, action, pending] = useActionState<WallResult | null, FormData>(
    setScreenName,
    null,
  );

  return (
    <form action={action} className="max-w-md">
      <input type="hidden" name="next" value={next} />
      <label htmlFor="screen_name" className="label text-clay">
        Screen name
      </label>
      <input
        id="screen_name"
        name="screen_name"
        defaultValue={current}
        required
        minLength={3}
        maxLength={24}
        autoComplete="nickname"
        aria-describedby="screen-name-rule"
        className="mt-3 w-full border border-hairline bg-paper-bright px-4 py-3 text-lg text-ink focus:border-clay"
      />
      <p id="screen-name-rule" className="mt-2 text-[0.85rem] leading-relaxed text-ink-mute">
        {SCREEN_NAME_RULE}
      </p>
      {state?.error ? (
        <p role="alert" className="mt-3 text-[0.9rem] text-sky">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="btn-press label mt-6 border border-clay bg-clay px-6 py-3 text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save screen name"}
      </button>
    </form>
  );
}
