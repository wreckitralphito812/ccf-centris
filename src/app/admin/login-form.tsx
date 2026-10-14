"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui";
import { Field, controlClass } from "@/components/form";
import { EyeIcon } from "@/components/auth-fields";
import { adminLogin, type AdminActionResult } from "@/app/actions/admin";

export function LoginForm() {
  const [state, action, pending] = useActionState<
    AdminActionResult | null,
    FormData
  >(adminLogin, null);
  // A show/hide eye, as on the member sign-in (Ralph, 2026-10-14).
  const [shown, setShown] = useState(false);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.formError ? (
        <p className="border border-clay bg-clay/8 px-4 py-3 text-[0.85rem] font-semibold text-clay-deep">
          {state.formError}
        </p>
      ) : null}

      <Field label="Access code" name="code" required>
        {(p) => (
          <div className="relative">
            <input
              {...p}
              type={shown ? "text" : "password"}
              autoComplete="off"
              autoFocus
              className={`${controlClass} pr-14`}
            />
            <button
              type="button"
              onClick={() => setShown((v) => !v)}
              aria-label={shown ? "Hide access code" : "Show access code"}
              aria-pressed={shown}
              className="absolute inset-y-0 right-1.5 my-auto grid h-11 w-11 place-items-center rounded-full text-ink-mute transition-colors hover:text-clay"
            >
              <EyeIcon off={shown} />
            </button>
          </div>
        )}
      </Field>

      <Button type="submit" size="lg" full disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </Button>
    </form>
  );
}
