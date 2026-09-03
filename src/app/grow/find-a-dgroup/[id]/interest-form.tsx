"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";

/**
 * Dgroup interest. Goes to the Dgroup team, never straight to the leader,
 * and never publishes the enquirer's details anywhere public.
 */
export function InterestForm({ dgroupName }: { dgroupName: string }) {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    age: "",
    message: "",
  });

  if (sent) {
    return (
      <div className="border border-clay bg-clay/8 p-7">
        <p className="label text-clay">Sent</p>
        <h2 className="font-display mt-3 text-2xl leading-tight">
          Thanks. Someone will be in touch.
        </h2>
        <p className="mt-3 leading-relaxed text-ink-soft">
          A member of the Dgroup team reads every note and usually replies
          within a few days. They will introduce you to {dgroupName} and answer
          anything before you go along.
        </p>
        <p className="mt-4 text-[0.88rem] text-ink-mute">
          You are never added to a group without a conversation first.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/grow/find-a-dgroup"
            className="label border border-ink px-5 py-2.5 text-ink transition-colors hover:bg-ink hover:text-paper-bright"
          >
            Browse other groups
          </Link>
          <Link
            href="/visit/plan"
            className="label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep"
          >
            Plan a Sunday visit
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        setSent(true);
      }}
    >
      <Field label="Your name" required>
        <input
          required
          type="text"
          autoComplete="name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className={inputClass}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Email" required>
          <input
            required
            type="email"
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Mobile" hint="Optional">
          <input
            type="tel"
            autoComplete="tel"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Age bracket" hint="Optional, helps us place you well">
        <select
          value={form.age}
          onChange={(e) => setForm({ ...form, age: e.target.value })}
          className={inputClass}
        >
          <option value="">Prefer not to say</option>
          {["Under 18", "18–24", "25–34", "35–44", "45–59", "60+"].map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Anything you'd like them to know" hint="Optional">
        <textarea
          rows={4}
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          className={inputClass}
          placeholder="New to CCF, work shifts, coming with my spouse, anything at all."
        />
      </Field>

      <p className="text-[0.82rem] leading-relaxed text-ink-mute">
        Your details go to the CCF Centris Dgroup team only. They are not
        published, not shared with other members, and not used for anything
        else.
      </p>

      <Button type="submit" size="lg" full>
        Send my interest
      </Button>
    </form>
  );
}

const inputClass =
  "w-full border border-hairline bg-paper-bright px-4 py-3 text-[0.95rem] outline-none focus:border-ink";

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="label text-ink-mute">
        {label}
        {required ? <span className="text-clay"> *</span> : null}
      </span>
      {hint ? (
        <span className="mt-1 block text-[0.8rem] text-ink-mute">{hint}</span>
      ) : null}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}
