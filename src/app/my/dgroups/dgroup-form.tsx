"use client";

import { useActionState, useState } from "react";
import { saveMyDgroup, type DgroupResult } from "@/app/actions/dgroups";
import { cx } from "@/components/ui";
import { AUDIENCES, DAYS, FREQUENCIES, WHERE } from "@/lib/dgroup-registry";
import { keepForm } from "@/lib/keep-form";

/**
 * Register a Dgroup, or edit one (2026-10-08). Short on purpose: who it's
 * for, when and where it meets, how big it is, and how the team can reach
 * the leader. Never an address: groups away from Centris give an area.
 */

export interface DgroupInitial {
  id?: string;
  name?: string;
  audience?: string;
  dayOfWeek?: number | null;
  startTime?: string | null;
  frequency?: string;
  meetsWhere?: string;
  generalArea?: string | null;
  currentSize?: number;
  isOpen?: boolean;
  leaderName?: string | null;
  leaderMobile?: string | null;
  coLeaderName?: string | null;
  uplineName?: string | null;
  uplineMobile?: string | null;
  description?: string | null;
  status?: string;
}

const INPUT = "calm-input min-h-12 w-full px-4 text-[1rem] text-ink placeholder:text-ink-mute";
const LABEL = "block text-[0.98rem] font-semibold text-ink";

function Err({ text }: { text?: string }) {
  return text ? (
    <p role="alert" className="mt-2 text-[0.92rem] font-semibold text-sky">
      {text}
    </p>
  ) : null;
}

export function DgroupForm({ initial }: { initial: DgroupInitial }) {
  const [state, action, pending] = useActionState<DgroupResult | null, FormData>(saveMyDgroup, null);
  const [audience, setAudience] = useState(initial.audience ?? "");
  const [frequency, setFrequency] = useState(initial.frequency ?? "weekly");
  const [where, setWhere] = useState(initial.meetsWhere ?? "centris");
  const [open, setOpen] = useState(initial.isOpen ?? true);
  const e = state?.errors ?? {};

  const chip = (on: boolean) =>
    cx(
      "inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-4 text-[0.98rem] font-medium transition-colors",
      on ? "border-clay bg-clay text-paper-bright" : "border-edge bg-paper-bright text-ink hover:border-clay/50",
    );

  return (
    <form action={action} onSubmit={keepForm(action)} className="calm-card space-y-8 px-5 py-8 sm:px-9 sm:py-10">
      {initial.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <input type="hidden" name="audience" value={audience} />
      <input type="hidden" name="frequency" value={frequency} />
      <input type="hidden" name="meets_where" value={where} />
      <input type="hidden" name="is_open" value={open ? "1" : "0"} />

      <div>
        <label className="block">
          <span className={LABEL}>Dgroup name</span>
          <input name="name" defaultValue={initial.name ?? ""} maxLength={80} placeholder="e.g. Ralph's men's Dgroup" className={cx(INPUT, "mt-1.5")} />
        </label>
        <Err text={e.name} />
      </div>

      <div>
        <p className={LABEL}>Who it&rsquo;s for</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <button key={a.value} type="button" aria-pressed={audience === a.value} onClick={() => setAudience(a.value)} className={chip(audience === a.value)}>
              {a.label}
            </button>
          ))}
        </div>
        <Err text={e.audience} />
      </div>

      <div className="grid gap-5 sm:grid-cols-3">
        <label className="block">
          <span className={LABEL}>Day</span>
          <select name="day" defaultValue={initial.dayOfWeek == null ? "" : String(initial.dayOfWeek)} className={cx(INPUT, "mt-1.5")}>
            <option value="">Pick a day</option>
            {[1, 2, 3, 4, 5, 6, 0].map((d) => (
              <option key={d} value={d}>
                {DAYS[d]}
              </option>
            ))}
          </select>
          <Err text={e.day} />
        </label>
        <label className="block">
          <span className={LABEL}>Starts at</span>
          <input type="time" name="start_time" step={900} defaultValue={initial.startTime?.slice(0, 5) ?? ""} className={cx(INPUT, "mt-1.5 px-3")} />
          <Err text={e.time} />
        </label>
        <div>
          <span className={LABEL}>How often</span>
          <select value={frequency} onChange={(ev) => setFrequency(ev.target.value)} className={cx(INPUT, "mt-1.5")} aria-label="How often">
            {FREQUENCIES.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className={LABEL}>Where you meet</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {WHERE.map((w) => (
            <button key={w.value} type="button" aria-pressed={where === w.value} onClick={() => setWhere(w.value)} className={chip(where === w.value)}>
              {w.label}
            </button>
          ))}
        </div>
        {where === "elsewhere" ? (
          <label className="mt-3 block max-w-md">
            <span className="sr-only">General area</span>
            <input name="general_area" defaultValue={initial.generalArea ?? ""} maxLength={60} placeholder="General area, e.g. Katipunan (not an address)" className={INPUT} />
          </label>
        ) : null}
        <Err text={e.where ?? e.area} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>How many are in the group now?</span>
          <input type="number" name="current_size" min={1} max={30} inputMode="numeric" defaultValue={initial.currentSize ?? ""} placeholder="Including you" className={cx(INPUT, "mt-1.5")} />
          <Err text={e.size} />
        </label>
        <div>
          <p className={LABEL}>Open to new members?</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <button type="button" aria-pressed={open} onClick={() => setOpen(true)} className={chip(open)}>
              Yes, we have room
            </button>
            <button type="button" aria-pressed={!open} onClick={() => setOpen(false)} className={chip(!open)}>
              Not right now
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Your name (leader)</span>
          <input name="leader_name" defaultValue={initial.leaderName ?? ""} maxLength={120} autoComplete="name" className={cx(INPUT, "mt-1.5")} />
          <Err text={e.leader} />
        </label>
        <label className="block">
          <span className={LABEL}>Your mobile</span>
          <input name="leader_mobile" defaultValue={initial.leaderMobile ?? ""} inputMode="tel" autoComplete="tel" placeholder="0917 123 4567" className={cx(INPUT, "mt-1.5")} />
          <Err text={e.mobile} />
        </label>
        <label className="block sm:col-span-2">
          <span className={LABEL}>
            Co-leader <span className="font-normal text-ink-mute">(optional)</span>
          </span>
          <input name="co_leader_name" defaultValue={initial.coLeaderName ?? ""} maxLength={120} className={cx(INPUT, "mt-1.5 max-w-md")} />
        </label>
        {/* Every leader is in a Dgroup too; the team checks with their
            leader before approving (Ralph, 2026-10-10). */}
        <div className="sm:col-span-2">
          <p className={LABEL}>Your own Dgroup leader</p>
          <p className="mt-0.5 text-[0.92rem] text-ink-mute">
            The person who leads you. The Centris team may contact them before approving your group.
          </p>
        </div>
        <label className="block">
          <span className={LABEL}>Their name</span>
          <input name="upline_name" defaultValue={initial.uplineName ?? ""} maxLength={120} className={cx(INPUT, "mt-1.5")} />
          <Err text={e.upline} />
        </label>
        <label className="block">
          <span className={LABEL}>Their mobile</span>
          <input name="upline_mobile" defaultValue={initial.uplineMobile ?? ""} maxLength={30} inputMode="tel" placeholder="0917 123 4567" className={cx(INPUT, "mt-1.5")} />
          <Err text={e.uplineMobile} />
        </label>
        <label className="block sm:col-span-2">
          <span className={LABEL}>
            Anything the team should know? <span className="font-normal text-ink-mute">(optional)</span>
          </span>
          <textarea name="description" defaultValue={initial.description ?? ""} maxLength={500} rows={3} className={cx(INPUT, "mt-1.5 py-3")} />
          <Err text={e.description} />
        </label>
      </div>

      {state?.formError ? (
        <p role="alert" className="rounded-xl bg-sky-wash px-5 py-4 font-semibold text-sky">
          {state.formError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-6">
        <p className="text-[0.92rem] text-ink-mute">
          {!initial.id
            ? "The Centris team reviews it and emails you, usually within a few days."
            : initial.status === "changes_requested" || initial.status === "declined"
              ? "Saving sends it back to the team for another look."
              : "Your changes save straight away."}
        </p>
        <button
          type="submit"
          disabled={pending}
          className="btn-press min-h-12 rounded-lg bg-clay px-7 text-[1rem] font-semibold text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50"
        >
          {pending ? "Saving…" : initial.id ? "Save changes" : "Register Dgroup"}
        </button>
      </div>
    </form>
  );
}
