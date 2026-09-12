"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, cx } from "@/components/ui";
import { Field, FormSuccess, controlClass } from "@/components/form";
import { submitDgroupInquiry, type InquiryResult } from "@/app/actions/inquiries";

/**
 * Dgroup interest. Goes to the Dgroup team, never straight to the leader,
 * and never publishes the enquirer's details anywhere public.
 */

export function InterestForm({
  dgroupId,
  dgroupName,
}: {
  dgroupId: string;
  dgroupName: string;
}) {
  const [state, action, pending] = useActionState<InquiryResult | null, FormData>(
    submitDgroupInquiry,
    null,
  );
  const errs = state?.fieldErrors ?? {};

  if (state?.ok) {
    return (
      <FormSuccess>
        <p className="label text-clay">Sent</p>
        <h2 className="font-display mt-3 text-2xl leading-tight">
          Thanks. Someone will be in touch.
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          A member of the Dgroup team reads every note and usually replies
          within a few days. They will introduce you to {dgroupName} and answer
          anything before you go along.
        </p>
        {state.reference ? (
          <p className="mt-4 text-[0.88rem] text-ink-mute">
            Your reference:{" "}
            <span className="font-semibold tracking-wide text-ink">
              {state.reference}
            </span>
          </p>
        ) : null}
        <p className="mt-4 text-[0.88rem] text-ink-mute">
          You are never added to a group without a conversation first.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/grow/find-a-dgroup"
            className="btn-press label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Browse other groups
          </Link>
          <Link
            href="/visit/new-here"
            className="btn-press label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            Plan your visit
          </Link>
        </div>
      </FormSuccess>
    );
  }

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="dgroup_id" value={dgroupId} />

      {state?.formError ? (
        <p className="border border-clay bg-clay/8 px-4 py-3 text-[0.85rem] font-semibold text-clay-deep">
          {state.formError}
        </p>
      ) : null}

      <Field label="Your name" name="name" required error={errs.name}>
        {(p) => (
          <input
            {...p}
            type="text"
            autoComplete="name"
            className={controlClass}
          />
        )}
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" name="email" required error={errs.email}>
          {(p) => (
            <input
              {...p}
              type="email"
              inputMode="email"
              autoComplete="email"
              className={controlClass}
            />
          )}
        </Field>
        <Field label="Mobile" name="mobile" hint="Optional">
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
      </div>

      <Field
        label="Age bracket"
        name="age"
        hint="Optional, helps us place you well"
      >
        {(p) => (
          <select {...p} defaultValue="" className={cx(controlClass, "py-2.5")}>
            <option value="">Prefer not to say</option>
            {["Under 18", "18–24", "25–34", "35–44", "45–59", "60+"].map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        )}
      </Field>

      <Field
        label="Anything you'd like them to know"
        name="message"
        hint="Optional"
      >
        {(p) => (
          <textarea
            {...p}
            rows={4}
            className={controlClass}
            placeholder="New to CCF, work shifts, coming with my spouse, anything at all."
          />
        )}
      </Field>

      <p className="text-[0.82rem] leading-relaxed text-ink-mute">
        Your details go to the CCF Centris Dgroup team only. They are not
        published, not shared with other members, and not used for anything
        else.
      </p>

      <Button type="submit" size="lg" full disabled={pending}>
        {pending ? "Sending…" : "Send my interest"}
      </Button>
    </form>
  );
}
