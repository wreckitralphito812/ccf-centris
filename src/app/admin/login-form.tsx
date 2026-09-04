"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui";
import { Field, controlClass } from "@/components/form";
import { adminLogin, type AdminActionResult } from "@/app/actions/admin";

export function LoginForm() {
  const [state, action, pending] = useActionState<
    AdminActionResult | null,
    FormData
  >(adminLogin, null);

  return (
    <form action={action} className="space-y-5" noValidate>
      {state?.formError ? (
        <p className="border border-clay bg-clay/8 px-4 py-3 text-[0.85rem] font-semibold text-clay-deep">
          {state.formError}
        </p>
      ) : null}

      <Field label="Access code" name="code" required>
        {(p) => (
          <input
            {...p}
            type="password"
            autoComplete="off"
            autoFocus
            className={controlClass}
          />
        )}
      </Field>

      <Button type="submit" size="lg" full disabled={pending}>
        {pending ? "Checking…" : "Sign in"}
      </Button>
    </form>
  );
}
