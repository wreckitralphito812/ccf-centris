"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Service } from "@/lib/types";
import { fmtDayLong, fmtTime } from "@/lib/format";
import { MAPS_LINK, SITE } from "@/lib/site";
import { Button, ButtonLink, Pill, cx } from "@/components/ui";

type Step = 1 | 2 | 3 | 4;

interface Party {
  adults: number;
  children: number;
  seniors: number;
}

export function PlanWizard({ services }: { services: Service[] }) {
  const [step, setStep] = useState<Step>(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [party, setParty] = useState<Party>({ adults: 1, children: 0, seniors: 0 });
  const [accessibility, setAccessibility] = useState<string[]>([]);
  const [firstTime, setFirstTime] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saved, setSaved] = useState(false);

  const service = useMemo(
    () => services.find((s) => s.id === serviceId) ?? null,
    [serviceId, services],
  );

  const calendarHref = useMemo(() => {
    if (!service) return "#";
    const fmt = (v: string) => v.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const params = new URLSearchParams({
      action: "TEMPLATE",
      text: `${service.title} — CCF Centris`,
      dates: `${fmt(service.starts_at)}/${fmt(service.ends_at)}`,
      location: `${SITE.addressLines.join(", ")}`,
      details: `Your visit to CCF Centris. ${service.venue?.name ?? ""}`,
    });
    return `https://calendar.google.com/calendar/render?${params}`;
  }, [service]);

  const total = party.adults + party.children + party.seniors;

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div>
        <Steps step={step} />

        {step === 1 ? (
          <Panel
            title="Which service works for you?"
            body="Pick one and we will have someone ready to meet you at the door."
          >
            <fieldset className="mt-6">
              <legend className="sr-only">Choose a service</legend>
              <div className="space-y-px border border-hairline bg-hairline">
                {services.map((s) => (
                  <label
                    key={s.id}
                    className={cx(
                      "flex cursor-pointer items-center gap-4 bg-paper-bright p-5 transition-colors",
                      serviceId === s.id ? "bg-bone" : "hover:bg-bone/50",
                    )}
                  >
                    <input
                      type="radio"
                      name="service"
                      value={s.id}
                      checked={serviceId === s.id}
                      onChange={() => setServiceId(s.id)}
                      className="h-4 w-4 accent-[var(--clay)]"
                    />
                    <span className="flex-1">
                      <span className="font-display block text-2xl leading-none">
                        {fmtTime(s.starts_at)}
                      </span>
                      <span className="mt-1.5 block text-[0.88rem] text-ink-soft">
                        {fmtDayLong(s.starts_at)} · {s.venue?.name}
                      </span>
                    </span>
                    {s.nxtgen_available ? <Pill tone="muted">NXTGEN</Pill> : null}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(2)} disabled={!serviceId}>
                Continue
              </Button>
            </div>
          </Panel>
        ) : null}

        {step === 2 ? (
          <Panel
            title="Who's coming?"
            body="This only helps us prepare. Nothing here is required and nothing is shared."
          >
            <div className="mt-6 space-y-px border border-hairline bg-hairline">
              {(
                [
                  ["adults", "Adults"],
                  ["children", "Children"],
                  ["seniors", "Seniors"],
                ] as const
              ).map(([key, label]) => (
                <div
                  key={key}
                  className="flex items-center justify-between bg-paper-bright p-5"
                >
                  <span className="font-display text-lg">{label}</span>
                  <Counter
                    label={label}
                    value={party[key]}
                    onChange={(v) => setParty((p) => ({ ...p, [key]: v }))}
                  />
                </div>
              ))}
            </div>

            <fieldset className="mt-8">
              <legend className="label text-ink-mute">
                Anything we can prepare? (optional)
              </legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  "Wheelchair space",
                  "Step-free route",
                  "Assisted listening",
                  "Seat near an exit",
                ].map((opt) => {
                  const on = accessibility.includes(opt);
                  return (
                    <button
                      key={opt}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setAccessibility((a) =>
                          on ? a.filter((x) => x !== opt) : [...a, opt],
                        )
                      }
                      className={cx(
                        "label border px-3.5 py-2 transition-colors",
                        on
                          ? "border-clay bg-clay text-paper-bright"
                          : "border-ink/25 text-ink hover:border-ink",
                      )}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="mt-8 flex items-start gap-3">
              <input
                type="checkbox"
                checked={firstTime}
                onChange={(e) => setFirstTime(e.target.checked)}
                className="mt-1 h-4 w-4 accent-[var(--clay)]"
              />
              <span className="text-[0.95rem] text-ink-soft">
                This is my first time at CCF Centris
              </span>
            </label>

            <div className="mt-8 flex justify-between">
              <Button tone="ghost" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)}>Continue</Button>
            </div>
          </Panel>
        ) : null}

        {step === 3 ? (
          <Panel
            title="Getting here"
            body="The center is on the second floor of Centris Station, inside Eton Centris."
          >
            <div className="mt-6 space-y-px border border-hairline bg-hairline">
              {[
                {
                  t: "By MRT",
                  b: "Take MRT-3 to Quezon Avenue. The station connects directly into the Centris Station concourse. Follow signs to Eton Centris and take the escalator or lift to 2/F.",
                },
                {
                  t: "Driving",
                  b: "Enter Eton Centris from EDSA or Quezon Avenue. Parking is on site. Use the mall lifts to the second floor and follow signage for CCF Centris.",
                },
                {
                  t: "Grab or taxi",
                  b: "Set your drop-off to Eton Centris, EDSA corner Quezon Avenue. The covered drop-off is closest to the concourse entrance.",
                },
                {
                  t: "Accessibility",
                  b: "The route from the concourse is step-free, with lift access to 2/F, accessible washrooms on the same floor, and wheelchair spaces with companion seats in the worship hall.",
                },
              ].map((d) => (
                <div key={d.t} className="bg-paper-bright p-5">
                  <h3 className="font-display text-lg">{d.t}</h3>
                  <p className="mt-1.5 text-[0.9rem] leading-relaxed text-ink-soft">
                    {d.b}
                  </p>
                </div>
              ))}
            </div>

            <a
              href={MAPS_LINK}
              target="_blank"
              rel="noreferrer"
              className="label mt-6 inline-flex border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
            >
              Open in maps
            </a>

            <div className="mt-8 flex justify-between">
              <Button tone="ghost" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)}>Continue</Button>
            </div>
          </Panel>
        ) : null}

        {step === 4 ? (
          <Panel
            title={saved ? "You're set." : "Save your visit"}
            body={
              saved
                ? "We will have someone at the Welcome Center looking out for you."
                : "Optional. Give us a name and we will meet you at the door. Skip it and just turn up."
            }
          >
            {saved ? (
              <div className="mt-6 border border-clay bg-clay/8 p-6">
                <p className="label text-clay">Visit saved</p>
                <p className="font-display mt-3 text-3xl leading-tight">
                  {service ? fmtTime(service.starts_at) : ""}
                </p>
                <p className="mt-1 text-ink-soft">
                  {service ? fmtDayLong(service.starts_at) : ""} ·{" "}
                  {service?.venue?.name}
                </p>
                <p className="mt-3 text-[0.9rem] text-ink-soft">
                  {total} {total === 1 ? "person" : "people"}
                  {accessibility.length ? ` · ${accessibility.join(", ")}` : ""}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={calendarHref}
                    target="_blank"
                    rel="noreferrer"
                    className="label inline-flex border border-ink bg-ink px-5 py-2.5 text-paper-bright transition-colors hover:bg-night"
                  >
                    Add to calendar
                  </a>
                  <a
                    href={MAPS_LINK}
                    target="_blank"
                    rel="noreferrer"
                    className="label inline-flex border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
                  >
                    Directions
                  </a>
                  <ButtonLink href="/grow/find-a-dgroup" tone="ghost">
                    Find a Dgroup →
                  </ButtonLink>
                </div>
              </div>
            ) : (
              <form
                className="mt-6 space-y-5"
                onSubmit={(e) => {
                  e.preventDefault();
                  setSaved(true);
                }}
              >
                <Field label="Your name (optional)">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="w-full border border-hairline bg-paper-bright px-4 py-3 text-[0.95rem] outline-none focus:border-ink"
                  />
                </Field>
                <Field
                  label="Email (optional)"
                  hint="Only used to send you a reminder and directions."
                >
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    className="w-full border border-hairline bg-paper-bright px-4 py-3 text-[0.95rem] outline-none focus:border-ink"
                  />
                </Field>

                <div className="flex flex-wrap justify-between gap-3 pt-2">
                  <Button type="button" tone="ghost" onClick={() => setStep(3)}>
                    Back
                  </Button>
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      tone="outline"
                      onClick={() => setSaved(true)}
                    >
                      Skip
                    </Button>
                    <Button type="submit">Save my visit</Button>
                  </div>
                </div>
              </form>
            )}
          </Panel>
        ) : null}
      </div>

      {/* Running summary */}
      <aside className="border border-hairline bg-paper-bright p-6 lg:sticky lg:top-28">
        <p className="label text-clay">Your visit</p>
        <dl className="mt-5 space-y-4 text-[0.9rem]">
          <div>
            <dt className="text-ink-mute">Service</dt>
            <dd className="mt-0.5 font-semibold text-ink">
              {service
                ? `${fmtDayLong(service.starts_at)}, ${fmtTime(service.starts_at)}`
                : "Not chosen yet"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-mute">Coming</dt>
            <dd className="mt-0.5 font-semibold text-ink">
              {total} {total === 1 ? "person" : "people"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-mute">Where</dt>
            <dd className="mt-0.5 text-ink">
              {SITE.addressLines.slice(0, 2).join(", ")}
            </dd>
          </div>
          {accessibility.length ? (
            <div>
              <dt className="text-ink-mute">Prepared for</dt>
              <dd className="mt-0.5 text-ink">{accessibility.join(", ")}</dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-6 border-t border-hairline pt-5 text-[0.82rem] leading-relaxed text-ink-mute">
          You never need to register to attend. This just helps our team be
          ready for you.
        </p>
        <Link
          href="/visit/faqs"
          className="label mt-4 inline-block text-clay underline underline-offset-4"
        >
          Read the FAQs
        </Link>
      </aside>
    </div>
  );
}

function Steps({ step }: { step: Step }) {
  const labels = ["Service", "Who's coming", "Getting here", "Save"];
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2 border-b border-hairline pb-5">
      {labels.map((l, i) => {
        const n = (i + 1) as Step;
        const state = n === step ? "current" : n < step ? "done" : "todo";
        return (
          <li key={l} className="flex items-center gap-2">
            <span
              className={cx(
                "label flex h-6 w-6 items-center justify-center border",
                state === "current" && "border-clay bg-clay text-paper-bright",
                state === "done" && "border-ink bg-ink text-paper-bright",
                state === "todo" && "border-hairline text-ink-mute",
              )}
              aria-hidden
            >
              {n}
            </span>
            <span
              className={cx(
                "label",
                state === "todo" ? "text-ink-mute" : "text-ink",
              )}
              aria-current={state === "current" ? "step" : undefined}
            >
              {l}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function Panel({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rise pt-10">
      <h2 className="display-md">{title}</h2>
      <p className="mt-3 max-w-xl leading-relaxed text-ink-soft">{body}</p>
      {children}
    </div>
  );
}

function Counter({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        aria-label={`One fewer ${label.toLowerCase()}`}
        onClick={() => onChange(Math.max(0, value - 1))}
        className="flex h-9 w-9 items-center justify-center border border-ink/25 text-lg transition-colors hover:border-ink"
      >
        −
      </button>
      <span className="font-display w-6 text-center text-2xl tabular-nums">
        {value}
      </span>
      <button
        type="button"
        aria-label={`One more ${label.toLowerCase()}`}
        onClick={() => onChange(Math.min(20, value + 1))}
        className="flex h-9 w-9 items-center justify-center border border-ink/25 text-lg transition-colors hover:border-ink"
      >
        +
      </button>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label text-ink-mute">{label}</span>
      {hint ? (
        <span className="mt-1 block text-[0.82rem] text-ink-mute">{hint}</span>
      ) : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
