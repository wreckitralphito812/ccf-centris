"use client";

import { useActionState, useState } from "react";
import { upload } from "@vercel/blob/client";
import { submitAnnouncement, type AnnounceResult } from "@/app/actions/announcements";
import { cx } from "@/components/ui";
import {
  ANNOUNCEMENT_CATEGORIES,
  MAX_DATES,
  MAX_UPLOAD_MB,
  PLACEMENTS,
  shapeCheck,
  SUMMARY_MAX,
  VENUES,
  type Artwork,
  type PlacementKey,
} from "@/lib/announcements";

/**
 * The one form ministries use to post an announcement (2026-10-05): their
 * artwork in the five screen sizes they already make, and the key facts typed
 * out so the site can show Register and Add to calendar. Each picture uploads
 * as soon as it's chosen, after its shape is checked.
 */

export interface AnnounceInitial {
  id?: string;
  title?: string;
  ministry?: string;
  category?: string;
  venue?: string;
  summary?: string;
  dates?: { date: string; start: string; end: string }[];
  registrationUrl?: string | null;
  feeNote?: string | null;
  artwork?: Artwork;
}

const INPUT = "calm-input min-h-12 w-full px-4 text-[1rem] text-ink placeholder:text-ink-mute";
const LABEL = "block text-[0.98rem] font-semibold text-ink";
const HINT = "mt-1 text-[0.88rem] text-ink-mute";

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-rule py-8 first:border-t-0 first:pt-0">
      <h2 className="flex items-center gap-3 text-[1.2rem] font-bold text-ink">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-clay-wash text-[0.95rem] text-clay-deep">{n}</span>
        {title}
      </h2>
      {hint ? <p className="mt-1.5 pl-11 text-[0.95rem] text-ink-mute">{hint}</p> : null}
      <div className="mt-5 sm:pl-11">{children}</div>
    </section>
  );
}

function Err({ text }: { text?: string }) {
  return text ? (
    <p role="alert" className="mt-2 text-[0.92rem] font-semibold text-sky">
      {text}
    </p>
  ) : null;
}

type Slot = { url?: string; state: "empty" | "checking" | "uploading" | "done" | "error"; message?: string; level?: "ok" | "warn" };

/** One artwork slot: choose a file, check its shape, upload it. */
function ArtworkSlot({
  p,
  slot,
  onChange,
}: {
  p: (typeof PLACEMENTS)[number];
  slot: Slot;
  onChange: (s: Slot) => void;
}) {
  async function choose(file: File | undefined) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return onChange({ state: "error", message: "Use a JPG or PNG picture." });
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) return onChange({ state: "error", message: `That file is over ${MAX_UPLOAD_MB} MB. Export a smaller JPG.` });
    onChange({ state: "checking" });
    let w = 0;
    let h = 0;
    try {
      const bmp = await createImageBitmap(file);
      w = bmp.width;
      h = bmp.height;
      bmp.close();
    } catch {
      return onChange({ state: "error", message: "That file couldn't be opened as a picture." });
    }
    const check = shapeCheck(p.key, w, h);
    if (check.level === "error") return onChange({ state: "error", message: check.message });
    onChange({ state: "uploading", message: "Uploading…" });
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9.]+/g, "-").slice(-60);
      const blob = await upload(`announcements/${p.key}-${safe}`, file, {
        access: "public",
        handleUploadUrl: "/api/announce/upload",
      });
      onChange({ state: "done", url: blob.url, message: check.message, level: check.level === "warn" ? "warn" : "ok" });
    } catch (e) {
      onChange({ state: "error", message: (e as Error).message || "The upload didn't go through. Try again." });
    }
  }

  const ratio = `${p.w} / ${p.h}`;
  return (
    <div className={cx("rounded-xl border bg-paper-bright p-3", slot.state === "error" ? "border-sky/50" : "border-edge")}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[0.95rem] font-semibold text-ink">
          {p.label}
          {p.required ? <span className="text-sky"> *</span> : null}
        </p>
        <p className="text-[0.8rem] tabular-nums text-ink-mute">
          {p.w} × {p.h}
        </p>
      </div>
      <p className="text-[0.82rem] text-ink-mute">{p.use}</p>
      <label
        className="mt-2.5 grid cursor-pointer place-items-center overflow-hidden rounded-lg border border-dashed border-edge bg-mist text-center transition-colors hover:border-clay"
        // Tall shapes keep their proportions but stop at a sensible height.
        style={{ aspectRatio: ratio, maxHeight: p.w < p.h ? "15rem" : undefined }}
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => choose(e.target.files?.[0])}
        />
        {slot.url ? (
          // The upload's own address; next/image can't know the store's host ahead of time.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={slot.url} alt={`${p.label} artwork`} className="h-full w-full object-contain" />
        ) : (
          <span className="px-3 text-[0.88rem] font-semibold text-clay">
            {slot.state === "checking" || slot.state === "uploading" ? slot.message ?? "…" : "Choose file"}
          </span>
        )}
      </label>
      {slot.url ? (
        <p className={cx("mt-2 text-[0.82rem]", slot.level === "warn" ? "font-semibold text-sky" : "text-moss")}>
          {slot.level === "warn" ? slot.message : "Uploaded"} ·{" "}
          <label className="cursor-pointer font-semibold text-clay underline underline-offset-2">
            Replace
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
          </label>
        </p>
      ) : slot.state === "error" ? (
        <p role="alert" className="mt-2 text-[0.82rem] font-semibold text-sky">
          {slot.message}
        </p>
      ) : null}
    </div>
  );
}

export function AnnounceForm({ initial, defaultMinistry }: { initial?: AnnounceInitial; defaultMinistry?: string }) {
  const [state, action, pending] = useActionState<AnnounceResult | null, FormData>(submitAnnouncement, null);
  const [slots, setSlots] = useState<Record<PlacementKey, Slot>>(
    () =>
      Object.fromEntries(
        PLACEMENTS.map((p) => [p.key, initial?.artwork?.[p.key] ? { state: "done", url: initial.artwork[p.key] } : { state: "empty" }]),
      ) as Record<PlacementKey, Slot>,
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [category, setCategory] = useState(initial?.category ?? ANNOUNCEMENT_CATEGORIES[0]);
  const knownVenue = !initial?.venue || (VENUES as readonly string[]).includes(initial.venue);
  const [venue, setVenue] = useState(initial?.venue ? (knownVenue ? initial.venue : "Other") : "Main Hall");
  const [dates, setDates] = useState(initial?.dates?.length ? initial.dates : [{ date: "", start: "", end: "" }]);
  const [signup, setSignup] = useState(initial?.registrationUrl ? "link" : initial?.id ? "none" : "link");
  const [fee, setFee] = useState(initial?.feeNote ? "paid" : "free");
  const e = state?.errors ?? {};
  const busy = Object.values(slots).some((s) => s.state === "uploading" || s.state === "checking");

  if (state?.ok) {
    return (
      <div className="calm-card p-8 text-center sm:p-10">
        <p className="text-[1.4rem] font-bold text-ink">{initial?.id ? "Changes sent" : "Sent for review"}</p>
        <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-soft">{state.message}</p>
        <a href="/announce" className="btn-press mt-6 inline-flex min-h-12 items-center rounded-lg bg-clay px-6 font-semibold text-paper-bright hover:bg-clay-deep">
          Back to your announcements
        </a>
      </div>
    );
  }

  const chip = (on: boolean) =>
    cx(
      "inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-4 text-[0.98rem] font-medium transition-colors",
      on ? "border-clay bg-clay text-paper-bright" : "border-edge bg-paper-bright text-ink hover:border-clay/50",
    );

  return (
    <form action={action} className="calm-card px-5 py-8 sm:px-9 sm:py-10">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {PLACEMENTS.map((p) => (
        <input key={p.key} type="hidden" name={`artwork_${p.key}`} value={slots[p.key].url ?? ""} />
      ))}

      <div>
      <Section n={1} title="Your artwork" hint="The same files you make for the screens. Main Hall TV is required; add the others if you have them.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <ArtworkSlot p={PLACEMENTS[0]} slot={slots.main_tv} onChange={(s) => setSlots((x) => ({ ...x, main_tv: s }))} />
          <ArtworkSlot p={PLACEMENTS[1]} slot={slots.social} onChange={(s) => setSlots((x) => ({ ...x, social: s }))} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {PLACEMENTS.slice(2).map((p) => (
            <ArtworkSlot key={p.key} p={p} slot={slots[p.key]} onChange={(s) => setSlots((x) => ({ ...x, [p.key]: s }))} />
          ))}
        </div>
        <Err text={e.artwork} />
      </Section>

      <Section n={2} title="What it is">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className={LABEL}>Title</span>
            <input name="title" value={title} onChange={(ev) => setTitle(ev.target.value)} maxLength={80} placeholder="e.g. Family Camp Lite" className={cx(INPUT, "mt-1.5")} />
            <Err text={e.title} />
          </label>
          <label className="block">
            <span className={LABEL}>Ministry</span>
            <input name="ministry" defaultValue={initial?.ministry ?? defaultMinistry ?? ""} maxLength={80} placeholder="e.g. Elevate" className={cx(INPUT, "mt-1.5")} />
            <Err text={e.ministry} />
          </label>
          <div>
            <span className={LABEL}>Category</span>
            <input type="hidden" name="category" value={category} />
            <div className="mt-1.5 flex flex-wrap gap-2">
              {ANNOUNCEMENT_CATEGORIES.map((c) => (
                <button key={c} type="button" aria-pressed={category === c} onClick={() => setCategory(c)} className={chip(category === c)}>
                  {c}
                </button>
              ))}
            </div>
            <Err text={e.category} />
          </div>
          <label className="block sm:col-span-2">
            <span className={LABEL}>In one sentence</span>
            <textarea
              name="summary"
              value={summary}
              onChange={(ev) => setSummary(ev.target.value)}
              maxLength={SUMMARY_MAX}
              rows={2}
              placeholder="e.g. A day for the whole family: worship, talks, games and meals."
              className={cx(INPUT, "mt-1.5 py-3")}
            />
            <p className={cx(HINT, "text-right tabular-nums")}>
              {summary.length} / {SUMMARY_MAX}
            </p>
            <Err text={e.summary} />
          </label>
        </div>
      </Section>

      <Section n={3} title="When and where" hint="For a series, add every date.">
        <div className="space-y-3">
          {dates.map((d, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 sm:gap-3">
              <label className="block">
                <span className={cx(LABEL, i > 0 && "sr-only")}>Date</span>
                <input type="date" name="date" value={d.date} onChange={(ev) => setDates((x) => x.map((y, j) => (j === i ? { ...y, date: ev.target.value } : y)))} className={cx(INPUT, "mt-1.5 px-3")} />
              </label>
              <label className="block">
                <span className={cx(LABEL, i > 0 && "sr-only")}>Starts</span>
                <input type="time" name="start" step={900} value={d.start} onChange={(ev) => setDates((x) => x.map((y, j) => (j === i ? { ...y, start: ev.target.value } : y)))} className={cx(INPUT, "mt-1.5 px-3")} />
              </label>
              <label className="block">
                <span className={cx(LABEL, i > 0 && "sr-only")}>Ends</span>
                <input type="time" name="end" step={900} value={d.end} onChange={(ev) => setDates((x) => x.map((y, j) => (j === i ? { ...y, end: ev.target.value } : y)))} className={cx(INPUT, "mt-1.5 px-3")} />
              </label>
              <button
                type="button"
                aria-label="Remove this date"
                disabled={dates.length === 1}
                onClick={() => setDates((x) => x.filter((_, j) => j !== i))}
                className="grid h-12 w-12 place-items-center rounded-lg text-ink-mute hover:bg-mist hover:text-sky disabled:opacity-30"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        {dates.length < MAX_DATES ? (
          <button
            type="button"
            onClick={() => setDates((x) => [...x, { ...x[x.length - 1], date: "" }])}
            className="mt-3 text-[0.95rem] font-semibold text-clay hover:text-clay-deep"
          >
            + Add another date
          </button>
        ) : null}
        <Err text={e.dates} />

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Where</span>
            <select name="venue" value={venue} onChange={(ev) => setVenue(ev.target.value)} className={cx(INPUT, "mt-1.5")}>
              {VENUES.map((v) => (
                <option key={v}>{v}</option>
              ))}
              <option value="Other">Somewhere else</option>
            </select>
          </label>
          {venue === "Other" ? (
            <label className="block">
              <span className={LABEL}>Place</span>
              <input name="venue_other" defaultValue={knownVenue ? "" : initial?.venue} maxLength={80} placeholder="e.g. Eton Centris Piazza" className={cx(INPUT, "mt-1.5")} />
            </label>
          ) : null}
        </div>
        <Err text={e.venue} />
      </Section>

      <Section n={4} title="Sign-up and fee" hint="Type these even if they're on the picture: phones can't scan a QR code on their own screen.">
        <input type="hidden" name="signup" value={signup} />
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={signup === "link"} onClick={() => setSignup("link")} className={chip(signup === "link")}>
            People sign up with a link
          </button>
          <button type="button" aria-pressed={signup === "none"} onClick={() => setSignup("none")} className={chip(signup === "none")}>
            No sign-up needed
          </button>
        </div>
        {signup === "link" ? (
          <label className="mt-3 block">
            <span className="sr-only">Sign-up link</span>
            <input name="registration_url" defaultValue={initial?.registrationUrl ?? ""} inputMode="url" placeholder="https://forms.gle/…" className={INPUT} />
            <p className={HINT}>The same link your QR code opens.</p>
          </label>
        ) : null}
        <Err text={e.registration} />

        <input type="hidden" name="fee" value={fee} />
        <div className="mt-6 flex flex-wrap gap-2">
          <button type="button" aria-pressed={fee === "free"} onClick={() => setFee("free")} className={chip(fee === "free")}>
            Free
          </button>
          <button type="button" aria-pressed={fee === "paid"} onClick={() => setFee("paid")} className={chip(fee === "paid")}>
            There&rsquo;s a fee
          </button>
        </div>
        {fee === "paid" ? (
          <label className="mt-3 block">
            <span className="sr-only">Fee</span>
            <input name="fee_note" defaultValue={initial?.feeNote ?? ""} maxLength={120} placeholder="e.g. ₱600 adults and teens, ₱400 kids, free for 6 and below" className={INPUT} />
          </label>
        ) : null}
        <Err text={e.fee} />
      </Section>

      <Section n={5} title="How it will look" hint="The card on What's Happening. Tap it there to see the full details.">
        <div className="max-w-sm">
          <div className="aspect-video overflow-hidden rounded-xl bg-mist">
            {slots.main_tv.url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={slots.main_tv.url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="grid h-full place-items-center text-[0.9rem] text-ink-mute">Your Main Hall TV picture</span>
            )}
          </div>
          <p className="mt-3 text-[0.85rem] font-semibold text-clay">
            {dates[0]?.date ? new Date(`${dates[0].date}T00:00:00Z`).toLocaleDateString("en-PH", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" }) : "Date"}
            {dates.length > 1 ? ` + ${dates.length - 1} more` : ""}
          </p>
          <p className="mt-1 text-[1.15rem] font-bold leading-snug text-ink">{title || "Your title"}</p>
          <p className="mt-0.5 text-[0.9rem] text-ink-mute">{venue === "Other" ? "Your venue" : venue}</p>
        </div>
      </Section>
      </div>

      {state?.formError ? (
        <p role="alert" className="mb-5 rounded-xl bg-sky-wash px-5 py-4 font-semibold text-sky">
          {state.formError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-6">
        <p className="text-[0.92rem] text-ink-mute">The team reviews it within 2 working days and emails you.</p>
        <button
          type="submit"
          disabled={pending || busy}
          className="btn-press min-h-12 rounded-lg bg-clay px-7 text-[1rem] font-semibold text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50"
        >
          {pending ? "Sending…" : busy ? "Waiting for uploads…" : initial?.id ? "Send changes" : "Send for review"}
        </button>
      </div>
    </form>
  );
}
