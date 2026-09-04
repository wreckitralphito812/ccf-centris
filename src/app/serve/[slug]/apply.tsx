"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button, cx } from "@/components/ui";
import { Field, FormSuccess, controlClass } from "@/components/form";
import {
  submitVolunteerApplication,
  type InquiryResult,
} from "@/app/actions/inquiries";

/**
 * Volunteer application. Goes to the volunteer team for that ministry, and
 * for child-facing or pastoral roles it opens a screening process rather than
 * placing someone on a rota. The copy says so, because a volunteer who is
 * surprised by a background check is a volunteer who drops out.
 */

export function ApplyForm({
  roleId,
  roleTitle,
  screened,
}: {
  roleId: string;
  roleTitle: string;
  screened: boolean;
}) {
  const [state, action, pending] = useActionState<InquiryResult | null, FormData>(
    submitVolunteerApplication,
    null,
  );
  const errs = state?.fieldErrors ?? {};

  if (state?.ok) {
    return (
      <FormSuccess>
        <p className="label text-clay">Application sent</p>
        <h2 className="font-display mt-3 text-2xl leading-tight">
          Someone will be in touch.
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          The team lead for {roleTitle} reads these and usually replies within a
          week. It is a conversation about whether the role suits you, not an
          interview.
        </p>
        {state.reference ? (
          <p className="mt-3 text-[0.88rem] text-ink-mute">
            Your reference:{" "}
            <span className="font-semibold tracking-wide text-ink">
              {state.reference}
            </span>
          </p>
        ) : null}
        {screened ? (
          <p className="mt-3 text-[0.88rem] leading-relaxed text-ink-mute">
            This role involves children or pastoral confidence, so the next step
            includes a background check and training before a first shift.
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/serve"
            className="btn-press label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            Other roles
          </Link>
          <Link
            href="/serve/at-centris"
            className="btn-press label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Teams at Centris
          </Link>
        </div>
      </FormSuccess>
    );
  }

  return (
    <div className="border border-hairline bg-paper-bright p-7">
      <h2 className="font-display text-2xl leading-tight">Apply for this role</h2>
      <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-soft">
        No experience needed unless the role says otherwise.
      </p>

      <form action={action} className="mt-6 space-y-5" noValidate>
        <input type="hidden" name="role_id" value={roleId} />

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

        <Field label="When are you usually free?" name="availability">
          {(p) => (
            <select {...p} defaultValue="" className={cx(controlClass, "py-2.5")}>
              <option value="">Choose one</option>
              {[
                "Saturday evening service",
                "Sunday early service",
                "Sunday later service",
                "Weekday evenings",
                "Weekends, flexible",
                "Occasional events only",
              ].map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          )}
        </Field>

        <Field label="Anything we should know?" name="message" hint="Optional">
          {(p) => (
            <textarea
              {...p}
              rows={4}
              className={controlClass}
              placeholder="Experience, questions, or constraints on your time."
            />
          )}
        </Field>

        {screened ? (
          <p className="border-l-2 border-clay pl-4 text-[0.85rem] leading-relaxed text-ink-soft">
            This role involves children or pastoral confidence. A background
            check and training are required before your first shift, without
            exception.
          </p>
        ) : null}

        <Button type="submit" size="lg" full disabled={pending}>
          {pending ? "Sending…" : "Send application"}
        </Button>

        <p className="text-[0.8rem] leading-relaxed text-ink-mute">
          Your details go to the CCF Centris volunteer team only.
        </p>
      </form>
    </div>
  );
}
