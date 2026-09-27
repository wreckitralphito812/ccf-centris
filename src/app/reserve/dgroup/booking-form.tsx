"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { reserveDgroupTable, type DgroupBookingResult } from "@/app/actions/dgroup-tables";
import { AcceptRules, Chip, ChoiceGroup, ContactFields } from "@/components/booking";
import { Field, controlClass } from "@/components/form";
import { FloorPlanDrawing } from "@/components/floor-plan";
import { DGROUP_POLICIES, MAX_GROUP_SIZE, type NightOption } from "@/lib/dgroup-tables";

export type { NightOption };

/** "Monday, Oct 5" → "Mon, Oct 5", for a day chip. */
export const shortNight = (label: string) => `${label.slice(0, 3)}${label.slice(label.indexOf(","))}`;

/** The form, remounted fresh for each new booking after a confirmation. */
export function BookingForm({
  nights,
  email,
  name = "",
  mobile = "",
}: {
  nights: NightOption[];
  email: string;
  name?: string;
  mobile?: string;
}) {
  const [attempt, setAttempt] = useState(0);
  return (
    <BookingAttempt
      key={attempt}
      nights={nights}
      email={email}
      name={name}
      mobile={mobile}
      onAnother={() => setAttempt((a) => a + 1)}
    />
  );
}

function BookingAttempt({
  nights,
  email,
  name,
  mobile,
  onAnother,
}: {
  nights: NightOption[];
  email: string;
  name: string;
  mobile: string;
  onAnother: () => void;
}) {
  const [state, action, pending] = useActionState<DgroupBookingResult | null, FormData>(
    reserveDgroupTable,
    null,
  );
  const [date, setDate] = useState(nights[0]?.date ?? "");
  const slots = nights.find((n) => n.date === date)?.slots ?? [];
  const [slot, setSlot] = useState(slots[0]?.id ?? "");
  const e = state?.fieldErrors ?? {};

  if (state?.ok && state.booking) {
    const b = state.booking;
    return (
      <div role="status" className="border border-clay bg-paper-bright p-7">
        <p className="label text-clay">You&rsquo;re booked</p>
        <p className="font-display mt-3 text-4xl leading-tight text-ink">{b.tables}</p>
        <p className="mt-1 text-lg text-ink-soft">{b.roomName}</p>
        <p className="mt-4 text-lg text-ink">
          {b.night}, {b.slot} · {b.groupSize} {b.groupSize === 1 ? "person" : "people"}
        </p>
        <div className="mt-6 max-w-sm">
          <FloorPlanDrawing room={b.roomSlug} highlight={b.labels} width={320} />
        </div>
        <p className="mt-6 border-t border-hairline pt-4 text-[0.9rem] leading-relaxed text-ink-soft">
          {b.emailed
            ? `We've emailed the details to ${b.email}.`
            : `We couldn't email ${b.email} just now, but your booking is saved.`}{" "}
          Change or cancel it any time from My reservations.
        </p>
        <div className="mt-5 flex flex-wrap gap-5">
          <button
            type="button"
            onClick={onAnother}
            className="label text-clay underline underline-offset-4 hover:text-clay-deep"
          >
            Book another slot
          </button>
          <Link href="/my/reservations" className="label text-clay underline underline-offset-4">
            My reservations
          </Link>
        </div>
      </div>
    );
  }

  if (!nights.length) {
    return (
      <p className="border border-dashed border-hairline p-8 text-center text-ink-mute">
        No slots are open right now. Next week&rsquo;s days open on Sunday.
      </p>
    );
  }

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={(ev) => {
        ev.preventDefault();
        const fd = new FormData(ev.currentTarget);
        startTransition(() => action(fd));
      }}
    >
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="slot" value={slot} />

      <ChoiceGroup legend="Day" note="Next week opens every Sunday." error={e.date}>
        {nights.map((n) => (
          <Chip
            key={n.date}
            on={date === n.date}
            onClick={() => {
              setDate(n.date);
              // Keep the same time if that day still has it.
              if (!n.slots.some((s) => s.id === slot)) setSlot(n.slots[0]?.id ?? "");
            }}
          >
            {shortNight(n.label)}
          </Chip>
        ))}
      </ChoiceGroup>

      <ChoiceGroup legend="Time" error={e.slotId}>
        {slots.map((s) => (
          <Chip key={s.id} on={slot === s.id} onClick={() => setSlot(s.id)}>
            {s.label}
          </Chip>
        ))}
      </ChoiceGroup>

      <Field
        label="How many are coming?"
        name="group_size"
        required
        hint={`Including you, up to ${MAX_GROUP_SIZE}. We'll pick a table that fits.`}
        error={e.groupSize}
      >
        {(p) => (
          <input
            {...p}
            type="number"
            min={1}
            max={MAX_GROUP_SIZE}
            inputMode="numeric"
            className={`${controlClass} max-w-32`}
          />
        )}
      </Field>

      <ContactFields
        fields={[
          {
            name: "leader_name",
            label: "Dleader name",
            value: name,
            autoComplete: "name",
            required: true,
            error: e.leaderName,
          },
          {
            name: "leader_email",
            label: "Dleader email",
            value: email,
            type: "email",
            autoComplete: "email",
            required: true,
            hint: "Your table number is sent here.",
            error: e.leaderEmail,
          },
          {
            name: "contact_mobile",
            label: "Dleader contact number",
            value: mobile,
            type: "tel",
            autoComplete: "tel",
            required: true,
            error: e.contactMobile,
          },
        ]}
      />

      <AcceptRules
        rules={[...DGROUP_POLICIES]}
        fields={DGROUP_POLICIES.map((p) => `policy_${p.id}`)}
        label="I accept these on behalf of my Dgroup."
        error={e.policies}
      />

      {state?.formError ? (
        <p role="alert" className="border-l-2 border-clay pl-4 text-[0.95rem] font-semibold text-clay-deep">
          {state.formError}
          {state.needsAuth ? (
            <>
              {" "}
              <Link href="/sign-in?next=/reserve/dgroup" className="underline underline-offset-4">
                Sign in
              </Link>
            </>
          ) : null}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="btn-press label border border-clay bg-clay px-6 py-3.5 text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50"
      >
        {pending ? "Assigning your table…" : "Confirm booking"}
      </button>
    </form>
  );
}
