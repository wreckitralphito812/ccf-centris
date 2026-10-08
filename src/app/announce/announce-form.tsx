"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitAnnouncement, type AnnounceResult } from "@/app/actions/announcements";
import { adminSaveEvent } from "@/app/actions/admin-announcements";
import { cx } from "@/components/ui";
import { PosterImage } from "@/components/poster-image";
import { fileFromDrop, findQrLink, PICTURE_ACCEPT, prepareScreenFile, preparePoster, uploadImage } from "@/lib/upload-image";
import { DropGuard } from "@/components/drop-guard";
import {
  ANNOUNCEMENT_CATEGORIES,
  DESCRIPTION_MAX,
  MAX_DATES,
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

export interface DateRow {
  date: string;
  start: string;
  end: string;
  allDay?: boolean;
  /** Last day of an all-day date that runs over several days. */
  until?: string;
}

export interface AnnounceInitial {
  id?: string;
  title?: string;
  ministry?: string;
  category?: string;
  venue?: string;
  summary?: string;
  dates?: DateRow[];
  description?: string | null;
  calendarOnly?: boolean;
  registrationUrl?: string | null;
  /** People sign up, even if the link isn't in yet. */
  signupWanted?: boolean;
  feeNote?: string | null;
  artwork?: Artwork;
  /** The website poster, when the admin added one separately (any shape). */
  posterUrl?: string | null;
  /** The event's status, so the admin form knows if it's hidden. */
  status?: string;
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
  optional = false,
  onQr,
}: {
  p: (typeof PLACEMENTS)[number];
  slot: Slot;
  onChange: (s: Slot) => void;
  /** The admin console posts without artwork (2026-10-06). */
  optional?: boolean;
  /** Called with the sign-up link from a QR code on the picture (2026-10-08). */
  onQr?: (url: string) => void;
}) {
  async function choose(file: File | undefined) {
    if (!file) return;
    onChange({ state: "checking" });
    try {
      const prepared = await prepareScreenFile(file);
      if (onQr) findQrLink(prepared.file).then((url) => url && onQr(url));
      const { w, h } = prepared;
      const check = shapeCheck(p.key, w, h);
      if (check.level === "error") {
        return onChange({ state: "error", message: optional ? `${check.message} For a poster of any size, use the Poster box above.` : check.message });
      }
      onChange({ state: "uploading", message: "Uploading…" });
      const url = await uploadImage(prepared.file, p.key);
      onChange({ state: "done", url, message: check.message, level: check.level === "warn" ? "warn" : "ok" });
    } catch (e) {
      onChange({ state: "error", message: (e as Error).message });
    }
  }

  const ratio = `${p.w} / ${p.h}`;
  return (
    <div className={cx("rounded-xl border bg-paper-bright p-3", slot.state === "error" ? "border-sky/50" : "border-edge")}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[0.95rem] font-semibold text-ink">
          {p.label}
          {p.required && !optional ? <span className="text-sky"> *</span> : null}
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
          accept={PICTURE_ACCEPT}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            choose(file);
          }}
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
            <input
              type="file"
              accept={PICTURE_ACCEPT}
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                choose(file);
              }}
            />
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

/**
 * The website poster, any shape (2026-10-08). Ministries send posters as
 * portrait, square or 16:9; the site shows it whole. Drop a file on it or
 * tap to choose.
 */
function PosterSlot({ slot, onChange, onQr }: { slot: Slot; onChange: (s: Slot) => void; onQr?: (url: string) => void }) {
  const [over, setOver] = useState(false);
  async function choose(pick: () => File | undefined) {
    onChange({ state: "checking", message: "Checking…" });
    try {
      const file = pick();
      if (!file) return onChange(slot);
      const prepared = await preparePoster(file);
      if (onQr) findQrLink(prepared.file).then((url) => url && onQr(url));
      const { w, h } = prepared;
      onChange({ state: "uploading", message: "Uploading…" });
      const url = await uploadImage(prepared.file, "poster");
      onChange({ state: "done", url, message: `${w} × ${h}`, level: w < 800 && h < 800 ? "warn" : "ok" });
    } catch (e) {
      onChange({ state: "error", message: (e as Error).message });
    }
  }
  // Clear the input after reading it, so choosing the same file again still counts.
  const pickFrom = (el: HTMLInputElement) => {
    const file = el.files?.[0];
    el.value = "";
    if (file) choose(() => file);
  };
  const working = slot.state === "checking" || slot.state === "uploading";
  return (
    <div>
      <label
        onDragOver={(ev) => {
          ev.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(ev) => {
          ev.preventDefault();
          setOver(false);
          choose(() => fileFromDrop(ev.dataTransfer));
        }}
        className={cx(
          "relative block aspect-video cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-colors",
          over ? "border-clay bg-clay-wash" : slot.state === "error" ? "border-sky/60 bg-mist" : "border-edge bg-mist hover:border-clay",
        )}
      >
        <input type="file" accept={PICTURE_ACCEPT} className="sr-only" onChange={(ev) => pickFrom(ev.target)} />
        {slot.url ? (
          <PosterImage src={slot.url} alt="Poster" className={working ? "opacity-40" : undefined} />
        ) : null}
        {!slot.url || working ? (
          <span className="absolute inset-0 grid place-items-center p-4 text-center">
            <span>
              <span className="block text-[1.05rem] font-bold text-clay">{working ? slot.message : "Choose a poster"}</span>
              {working ? null : <span className="mt-1 block text-[0.88rem] text-ink-mute">or drop it here · JPG, PNG or WebP, any shape</span>}
            </span>
          </span>
        ) : null}
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.88rem]">
        {slot.state === "error" ? (
          <p role="alert" className="font-semibold text-sky">
            {slot.message}
          </p>
        ) : slot.url && !working ? (
          <>
            <p className={slot.level === "warn" ? "font-semibold text-sky" : "text-moss"}>
              {slot.level === "warn" ? `Small (${slot.message}): it may look blurry.` : slot.message ? `Uploaded · ${slot.message}` : "Poster added"}
            </p>
            <label className="cursor-pointer font-semibold text-clay underline underline-offset-2">
              Replace
              <input type="file" accept={PICTURE_ACCEPT} className="sr-only" onChange={(ev) => pickFrom(ev.target)} />
            </label>
            <button type="button" onClick={() => onChange({ state: "empty" })} className="font-semibold text-ink-mute hover:text-sky">
              Remove
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
}

export function AnnounceForm({
  initial,
  defaultMinistry,
  admin = false,
}: {
  initial?: AnnounceInitial;
  defaultMinistry?: string;
  /** The admin console's version (2026-10-06): publishes at once, artwork optional, calendar-only option. */
  admin?: boolean;
}) {
  const [state, action, pending] = useActionState<AnnounceResult | null, FormData>(admin ? adminSaveEvent : submitAnnouncement, null);
  const [calendarOnly, setCalendarOnly] = useState(Boolean(initial?.calendarOnly));
  const [slots, setSlots] = useState<Record<PlacementKey, Slot>>(
    () =>
      Object.fromEntries(
        PLACEMENTS.map((p) => [p.key, initial?.artwork?.[p.key] ? { state: "done", url: initial.artwork[p.key] } : { state: "empty" }]),
      ) as Record<PlacementKey, Slot>,
  );
  const [poster, setPoster] = useState<Slot>(() => (initial?.posterUrl ? { state: "done", url: initial.posterUrl } : { state: "empty" }));
  const [title, setTitle] = useState(initial?.title ?? "");
  const [summary, setSummary] = useState(initial?.summary ?? "");
  const [category, setCategory] = useState(initial?.category ?? ANNOUNCEMENT_CATEGORIES[0]);
  const knownVenue = !initial?.venue || (VENUES as readonly string[]).includes(initial.venue);
  const [venue, setVenue] = useState(initial?.venue ? (knownVenue ? initial.venue : "Other") : "Main Hall");
  const [dates, setDates] = useState<DateRow[]>(initial?.dates?.length ? initial.dates : [{ date: "", start: "", end: "" }]);
  const setRow = (i: number, patch: Partial<DateRow>) => setDates((x) => x.map((y, j) => (j === i ? { ...y, ...patch } : y)));
  const [signup, setSignup] = useState(initial?.registrationUrl || initial?.signupWanted ? "link" : initial?.id ? "none" : "link");
  const [signupUrl, setSignupUrl] = useState(initial?.registrationUrl ?? "");
  // A sign-up link read from a QR code on the artwork (2026-10-08): filled in
  // when the field is empty, offered when it holds a different link.
  const [qr, setQr] = useState<{ url: string; applied: boolean } | null>(null);
  const onQr = (url: string) => {
    if (calendarOnly) return;
    const current = signupUrl.trim();
    if (current === url) return;
    if (!current) {
      setSignupUrl(url);
      setSignup("link");
      setQr({ url, applied: true });
    } else {
      setQr({ url, applied: false });
    }
  };
  const useQr = () => {
    if (!qr) return;
    setSignupUrl(qr.url);
    setSignup("link");
    setQr({ ...qr, applied: true });
  };
  const qrNote = qr ? (
    <div role="status" className={cx("mt-4 rounded-xl px-4 py-3 text-[0.92rem]", qr.applied ? "bg-moss/10 text-ink" : "bg-sky-wash text-ink")}>
      {qr.applied ? (
        <>
          <span className="font-semibold text-moss">✓ Sign-up link found in the QR code</span> and added under Sign-up:{" "}
          <span className="break-all font-semibold">{qr.url.replace(/^https?:\/\//, "")}</span>
        </>
      ) : (
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>
            The QR code links to <span className="break-all font-semibold">{qr.url.replace(/^https?:\/\//, "")}</span>, not the sign-up link below.
          </span>
          <button type="button" onClick={useQr} className="font-semibold text-clay underline underline-offset-2 hover:text-clay-deep">
            Use the QR code&rsquo;s link
          </button>
        </span>
      )}
    </div>
  ) : null;
  const [fee, setFee] = useState(initial?.feeNote ? "paid" : "free");
  const e = state?.errors ?? {};
  // The success card replaces the long form; bring it into view instead of
  // leaving the page scrolled down at the footer (2026-10-08).
  const doneRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state?.ok) doneRef.current?.scrollIntoView({ block: "center" });
  }, [state?.ok]);
  const busy = [...Object.values(slots), poster].some((s) => s.state === "uploading" || s.state === "checking");
  const shown = poster.url ?? slots.main_tv.url;

  if (state?.ok) {
    const ev = state.event;
    const live = ev && ev.status === "published" && !ev.calendarOnly;
    return (
      <div ref={doneRef} className="calm-card scroll-mt-24 p-8 text-center sm:p-10">
        <p className="text-[1.4rem] font-bold text-ink">{admin ? "Saved" : initial?.id ? "Changes sent" : "Sent for review"}</p>
        <p className="mx-auto mt-2 max-w-md leading-relaxed text-ink-soft">{state.message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a
            href={admin ? "/admin/events" : "/announce"}
            className="btn-press inline-flex min-h-12 items-center rounded-lg bg-clay px-6 font-semibold text-paper-bright hover:bg-clay-deep"
          >
            {admin ? "Back to events" : "Back to your announcements"}
          </a>
          {admin && live ? (
            <a
              href={`/events/${ev.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 items-center rounded-lg border border-edge bg-paper-bright px-6 font-semibold text-ink hover:border-clay"
            >
              View on site ↗
            </a>
          ) : null}
          {admin && !initial?.id ? (
            // A full page load, so the form starts fresh (a Link to the same route keeps this "Saved" state).
            // eslint-disable-next-line @next/next/no-html-link-for-pages
            <a href="/admin/events/new" className="inline-flex min-h-12 items-center rounded-lg px-4 font-semibold text-clay hover:text-clay-deep">
              + Add another
            </a>
          ) : null}
        </div>
      </div>
    );
  }

  // Steps are numbered in the order they show; calendar-only skips some.
  let step = 0;
  const nextStep = () => ++step;

  const chip = (on: boolean) =>
    cx(
      "inline-flex min-h-11 cursor-pointer items-center rounded-lg border px-4 text-[0.98rem] font-medium transition-colors",
      on ? "border-clay bg-clay text-paper-bright" : "border-edge bg-paper-bright text-ink hover:border-clay/50",
    );

  return (
    <form action={action} className="calm-card px-5 py-8 sm:px-9 sm:py-10">
      <DropGuard />
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      {admin ? <input type="hidden" name="calendar_only" value={calendarOnly ? "1" : "0"} /> : null}
      {admin ? (
        <div className="mb-8 rounded-xl bg-mist p-4 sm:p-5">
          <p className="text-[0.98rem] font-semibold text-ink">What is this?</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            <button type="button" aria-pressed={!calendarOnly} onClick={() => setCalendarOnly(false)} className={chip(!calendarOnly)}>
              Promote it on What&rsquo;s Happening
            </button>
            <button type="button" aria-pressed={calendarOnly} onClick={() => setCalendarOnly(true)} className={chip(calendarOnly)}>
              Calendar only (booked, not promoted)
            </button>
          </div>
          <p className="mt-2 text-[0.88rem] text-ink-mute">
            Calendar only is for events booked at Centris by other satellites or pastors: they show on the month calendar, with no page or sign-up.
          </p>
        </div>
      ) : null}
      {PLACEMENTS.map((p) => (
        <input key={p.key} type="hidden" name={`artwork_${p.key}`} value={slots[p.key].url ?? ""} />
      ))}
      {admin ? <input type="hidden" name="poster_url" value={poster.url ?? ""} /> : null}

      <div>
      {admin && calendarOnly ? null : admin ? (
        <Section n={nextStep()} title="Poster" hint="The picture on What's Happening and the event page. Any shape works; you can add it later.">
          <div className="max-w-xl">
            <PosterSlot slot={poster} onChange={setPoster} onQr={onQr} />
          </div>
          {qrNote}
          <details className="group mt-6 rounded-xl border border-edge bg-paper-bright" open={PLACEMENTS.some((p) => initial?.artwork?.[p.key])}>
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-[0.98rem] font-semibold text-ink">
              <span>
                Files for the screens <span className="font-normal text-ink-mute">(optional · exact sizes for the TVs, LED wall and standee)</span>
              </span>
              <span aria-hidden className="text-ink-mute transition-transform group-open:rotate-180">
                ▾
              </span>
            </summary>
            <div className="border-t border-rule p-4">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <ArtworkSlot p={PLACEMENTS[0]} optional onQr={onQr} slot={slots.main_tv} onChange={(s) => setSlots((x) => ({ ...x, main_tv: s }))} />
                <ArtworkSlot p={PLACEMENTS[1]} optional onQr={onQr} slot={slots.social} onChange={(s) => setSlots((x) => ({ ...x, social: s }))} />
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                {PLACEMENTS.slice(2).map((p) => (
                  <ArtworkSlot key={p.key} p={p} optional onQr={onQr} slot={slots[p.key]} onChange={(s) => setSlots((x) => ({ ...x, [p.key]: s }))} />
                ))}
              </div>
              <p className="mt-3 text-[0.85rem] text-ink-mute">The media team downloads these from Announcements → Screens.</p>
            </div>
          </details>
          <Err text={e.artwork} />
        </Section>
      ) : (
      <Section
        n={nextStep()}
        title="Your artwork"
        hint="The same files you make for the screens. Main Hall TV is required; add the others if you have them."
      >
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <ArtworkSlot p={PLACEMENTS[0]} onQr={onQr} slot={slots.main_tv} onChange={(s) => setSlots((x) => ({ ...x, main_tv: s }))} />
          <ArtworkSlot p={PLACEMENTS[1]} onQr={onQr} slot={slots.social} onChange={(s) => setSlots((x) => ({ ...x, social: s }))} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {PLACEMENTS.slice(2).map((p) => (
            <ArtworkSlot key={p.key} p={p} onQr={onQr} slot={slots[p.key]} onChange={(s) => setSlots((x) => ({ ...x, [p.key]: s }))} />
          ))}
        </div>
        {qrNote}
        <Err text={e.artwork} />
      </Section>
      )}

      <Section n={nextStep()} title="What it is">
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
          <label className="block sm:col-span-2">
            <span className={LABEL}>
              More details <span className="font-normal text-ink-mute">(optional)</span>
            </span>
            <textarea
              name="description"
              defaultValue={initial?.description ?? ""}
              maxLength={DESCRIPTION_MAX}
              rows={4}
              placeholder="Who it's for, what to expect, what to bring."
              className={cx(INPUT, "mt-1.5 py-3")}
            />
            <Err text={e.description} />
          </label>
        </div>
      </Section>

      <Section n={nextStep()} title="When and where" hint="For a series, add every date.">
        <div className="space-y-4">
          {dates.map((d, i) => (
            <div key={i} className="rounded-xl border border-edge bg-paper-bright p-3 sm:p-4">
              <input type="hidden" name="allday" value={d.allDay ? "1" : "0"} />
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:gap-3">
                <label className="block">
                  <span className={LABEL}>{d.allDay ? "From" : "Date"}</span>
                  <input type="date" name="date" value={d.date} onChange={(ev) => setRow(i, { date: ev.target.value })} className={cx(INPUT, "mt-1.5 px-3")} />
                </label>
                <button
                  type="button"
                  aria-label="Remove this date"
                  disabled={dates.length === 1}
                  onClick={() => setDates((x) => x.filter((_, j) => j !== i))}
                  className="grid h-12 w-12 place-items-center rounded-lg text-ink-mute hover:bg-mist hover:text-sky disabled:opacity-30 sm:order-last"
                >
                  ×
                </button>
                {d.allDay ? (
                  <label className="col-span-2 block sm:col-span-2">
                    <span className={LABEL}>
                      Until <span className="font-normal text-ink-mute">(for more than one day)</span>
                    </span>
                    <input type="date" name="until" min={d.date || undefined} value={d.until ?? ""} onChange={(ev) => setRow(i, { until: ev.target.value })} className={cx(INPUT, "mt-1.5 px-3")} />
                    <input type="hidden" name="start" value="" />
                    <input type="hidden" name="end" value="" />
                  </label>
                ) : (
                  <>
                    <label className="block">
                      <span className={LABEL}>Starts</span>
                      <input type="time" name="start" step={900} value={d.start} onChange={(ev) => setRow(i, { start: ev.target.value })} className={cx(INPUT, "mt-1.5 px-3")} />
                    </label>
                    <label className="block">
                      <span className={LABEL}>
                        Ends <span className="font-normal text-ink-mute">(optional)</span>
                      </span>
                      <input type="time" name="end" step={900} value={d.end} onChange={(ev) => setRow(i, { end: ev.target.value })} className={cx(INPUT, "mt-1.5 px-3")} />
                      <input type="hidden" name="until" value="" />
                    </label>
                  </>
                )}
              </div>
              <label className="mt-3 inline-flex cursor-pointer items-center gap-2 text-[0.95rem] text-ink">
                <input type="checkbox" checked={Boolean(d.allDay)} onChange={(ev) => setRow(i, { allDay: ev.target.checked })} className="h-5 w-5 accent-clay" />
                All day, or times not set yet
              </label>
            </div>
          ))}
        </div>
        {dates.length < MAX_DATES ? (
          <button
            type="button"
            onClick={() => setDates((x) => [...x, { ...x[x.length - 1], date: "", until: "" }])}
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

      {calendarOnly ? null : (
      <Section n={nextStep()} title="Sign-up and fee" hint="Type these even if they're on the picture: phones can't scan a QR code on their own screen.">
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
            <input
              name="registration_url"
              value={signupUrl}
              onChange={(ev) => setSignupUrl(ev.target.value)}
              inputMode="url"
              placeholder="https://forms.gle/…"
              className={INPUT}
            />
            <p className={HINT}>
              {qr?.applied && signupUrl === qr.url
                ? "Read from the QR code on the poster. Check it opens the right form."
                : admin
                  ? "A QR code on the poster fills this in by itself. No link yet? Leave it empty: the event page says sign-up opens soon."
                  : "The same link your QR code opens. A QR code on the poster fills this in by itself."}
            </p>
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
      )}

      {calendarOnly ? null : (
      <Section n={nextStep()} title="How it will look" hint="The card on What's Happening. Tap it there to see the full details.">
        <div className="max-w-sm">
          <div className="aspect-video overflow-hidden rounded-xl bg-mist">
            {shown ? (
              <PosterImage src={shown} alt="" />
            ) : (
              <span className="grid h-full place-items-center text-[0.9rem] text-ink-mute">{admin ? "The poster" : "Your Main Hall TV picture"}</span>
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
      )}
      </div>

      {state?.formError ? (
        <p role="alert" className="mb-5 rounded-xl bg-sky-wash px-5 py-4 font-semibold text-sky">
          {state.formError}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-6">
        <p className="text-[0.92rem] text-ink-mute">
          {admin
            ? initial?.id
              ? initial.status === "published"
                ? "It's live: changes show on the site as soon as you save."
                : "It's hidden: saving keeps it hidden. Show it from the events list."
              : "Publish puts it on the site now. Save hidden keeps it off the site until you're ready."
            : "The team reviews it within 2 working days and emails you."}
        </p>
        <div className="flex flex-wrap gap-2">
          {admin && !initial?.id ? (
            <button
              type="submit"
              name="publish"
              value="0"
              disabled={pending || busy}
              className="min-h-12 rounded-lg border border-edge bg-paper-bright px-5 text-[1rem] font-semibold text-ink transition-colors hover:border-clay disabled:opacity-50"
            >
              Save hidden
            </button>
          ) : null}
          <button
            type="submit"
            name={admin && !initial?.id ? "publish" : undefined}
            value={admin && !initial?.id ? "1" : undefined}
            disabled={pending || busy}
            className="btn-press min-h-12 rounded-lg bg-clay px-7 text-[1rem] font-semibold text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50"
          >
            {pending ? "Saving…" : busy ? "Waiting for uploads…" : admin ? (initial?.id ? "Save changes" : "Publish") : initial?.id ? "Send changes" : "Send for review"}
          </button>
        </div>
      </div>
    </form>
  );
}
