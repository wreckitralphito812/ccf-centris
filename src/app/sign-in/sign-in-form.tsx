"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui";
import { Field, FormSuccess, controlClass } from "@/components/form";
import { sendMagicLink, type AuthResult } from "@/app/actions/auth";

export function SignInForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthResult | null, FormData>(
    sendMagicLink,
    null,
  );

  if (state?.sent) {
    return (
      <FormSuccess>
        <p className="font-display text-xl">Check your email</p>
        <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-soft">
          We sent you a sign-in link. Open it on this device to sign in. The
          link works once and expires within the hour.
        </p>
      </FormSuccess>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />

      {state?.formError ? (
        <p className="border border-clay bg-clay/8 px-4 py-3 text-[0.85rem] font-semibold text-clay-deep">
          {state.formError}
        </p>
      ) : null}

      <Field label="Email" name="email" required>
        {(p) => (
          <input
            {...p}
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            className={controlClass}
          />
        )}
      </Field>

      <Field
        label="Phone"
        name="phone"
        hint="Optional. So we can reach you about a booking."
      >
        {(p) => (
          <input
            {...p}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            className={controlClass}
          />
        )}
      </Field>

      <Button type="submit" size="lg" full disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
