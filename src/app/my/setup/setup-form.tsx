"use client";

import { useActionState, type ReactNode } from "react";
import { completeProfile, type SetupResult } from "@/app/actions/account";
import { SCREEN_NAME_RULE } from "@/lib/prayer-wall";

const input =
  "mt-2 w-full border border-hairline bg-paper-bright px-4 py-3 text-lg text-ink focus:border-clay";

export function SetupForm({
  next,
  email,
  first,
  last,
  screen,
}: {
  next: string;
  email: string;
  first: string;
  last: string;
  screen: string;
}) {
  const [state, action, pending] = useActionState<SetupResult | null, FormData>(completeProfile, null);
  const e = state?.fieldErrors ?? {};

  return (
    <form action={action} className="max-w-xl space-y-6">
      <input type="hidden" name="next" value={next} />
      {email ? (
        <p className="text-[0.95rem] text-ink-soft">
          Signed in as <span className="font-semibold text-ink">{email}</span>
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="First name" error={e.first}>
          <input name="first_name" defaultValue={first} required autoComplete="given-name" maxLength={60} className={input} />
        </Field>
        <Field label="Surname" error={e.last}>
          <input name="last_name" defaultValue={last} required autoComplete="family-name" maxLength={60} className={input} />
        </Field>
      </div>
      <Field label="Screen name" error={e.screen} hint={`Shown on the Prayer Wall instead of your real name. ${SCREEN_NAME_RULE}`}>
        <input name="screen_name" defaultValue={screen} required minLength={3} maxLength={24} autoComplete="nickname" className={input} />
      </Field>
      {state?.formError ? (
        <p role="alert" className="border-l-2 border-sky pl-4 text-[0.95rem] text-sky">
          {state.formError}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="btn-press label border border-clay bg-clay px-6 py-3.5 text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label text-clay">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[0.82rem] leading-relaxed text-ink-mute">{hint}</span> : null}
      {error ? (
        <span role="alert" className="mt-1.5 block text-[0.85rem] text-sky">
          {error}
        </span>
      ) : null}
    </label>
  );
}
