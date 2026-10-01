"use client";

import { useActionState, useState } from "react";
import { completeProfile, type SetupResult } from "@/app/actions/account";
import { FormNote, IconField, PhoneField, submitClass } from "@/components/auth-fields";

/**
 * "About you", once after the first sign-in: name and mobile number
 * (2026-10-01: the Prayer Wall screen name moved to the Wall itself).
 */
export function SetupForm({
  next,
  email,
  first,
  last,
  mobile: initialMobile,
}: {
  next: string;
  email: string;
  first: string;
  last: string;
  mobile: string;
}) {
  const [state, action, pending] = useActionState<SetupResult | null, FormData>(completeProfile, null);
  const [mobile, setMobile] = useState(initialMobile);
  const e = state?.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="next" value={next} />
      {email ? (
        <p className="text-[0.95rem] text-ink-mute">
          Signed in as <span className="font-medium text-ink">{email}</span>
        </p>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        <IconField id="first_name" name="first_name" label="First name" icon="person" defaultValue={first} autoComplete="given-name" maxLength={60} error={e.first} />
        <IconField id="last_name" name="last_name" label="Surname" icon="person" defaultValue={last} autoComplete="family-name" maxLength={60} error={e.last} />
      </div>
      <PhoneField
        id="mobile"
        name="mobile"
        label="Mobile number"
        value={mobile}
        onValue={setMobile}
        error={e.mobile}
        hint="For bookings and same-day changes. We don't share it."
      />
      {state?.formError ? <FormNote>{state.formError}</FormNote> : null}
      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}
