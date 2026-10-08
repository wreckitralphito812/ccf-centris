"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { deleteEvent, setEventPoster, setEventVisibility } from "@/app/actions/admin-events";
import { PosterImage } from "@/components/poster-image";
import { cx } from "@/components/ui";
import { fileFromDrop, findQrLink, PICTURE_ACCEPT, preparePoster, uploadImage } from "@/lib/upload-image";

/* The working parts of the admin events list (2026-10-08): the poster you
   can drop a file on, and the hide / show / delete buttons. Each calls a
   server action and refreshes the list; errors show beside the button. */

const BTN =
  "inline-flex min-h-10 items-center justify-center rounded-lg border px-3.5 text-[0.9rem] font-semibold transition-colors disabled:opacity-50";

/**
 * The event's poster. Tap it (or "Change poster") to choose a file, or drop
 * a file anywhere on the event's row. Reworked 2026-10-08 after "Change
 * poster" seemed to do nothing: picking the same file twice, drops from web
 * pages and drops that missed the small picture all failed silently.
 */
export function PosterDrop({ id, title, src, readOnly }: { id: string; title: string; src: string | null; readOnly: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<{ busy?: string; error?: string; note?: string }>({});
  const [over, setOver] = useState(false);
  const [, start] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);

  async function choose(pick: () => File) {
    setState({ busy: "Checking…" });
    try {
      const prepared = await preparePoster(pick());
      const qr = findQrLink(prepared.file);
      setState({ busy: "Uploading…" });
      const url = await uploadImage(prepared.file, "poster");
      setState({ busy: "Saving…" });
      const res = await setEventPoster(id, url, await qr);
      if (!res.ok) return setState({ error: res.error });
      setState(res.signupAdded ? { note: `Poster saved. Sign-up link added from the QR code: ${res.signupAdded.replace(/^https?:\/\//, "")}` } : { note: "Poster saved." });
      start(() => router.refresh());
    } catch (e) {
      setState({ error: (e as Error).message });
    }
  }

  async function remove() {
    if (!window.confirm(`Remove the poster from "${title}"?`)) return;
    setState({ busy: "Removing…" });
    const res = await setEventPoster(id, "");
    if (!res.ok) return setState({ error: res.error });
    setState({ note: "Poster removed." });
    start(() => router.refresh());
  }

  // The whole row takes a dropped file, not just the small picture.
  useEffect(() => {
    const row = root.current?.closest("li");
    if (!row || readOnly) return;
    let depth = 0;
    const enter = (ev: DragEvent) => {
      if (!ev.dataTransfer?.types.includes("Files") && !ev.dataTransfer?.types.includes("text/uri-list")) return;
      ev.preventDefault();
      depth += 1;
      setOver(true);
    };
    const overRow = (ev: DragEvent) => ev.preventDefault();
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (!depth) setOver(false);
    };
    const drop = (ev: DragEvent) => {
      ev.preventDefault();
      ev.stopPropagation();
      depth = 0;
      setOver(false);
      choose(() => fileFromDrop(ev.dataTransfer));
    };
    row.addEventListener("dragenter", enter);
    row.addEventListener("dragover", overRow);
    row.addEventListener("dragleave", leave);
    row.addEventListener("drop", drop);
    return () => {
      row.removeEventListener("dragenter", enter);
      row.removeEventListener("dragover", overRow);
      row.removeEventListener("dragleave", leave);
      row.removeEventListener("drop", drop);
    };
  });

  const frame = "relative block aspect-video w-full overflow-hidden rounded-lg";
  if (readOnly) {
    return (
      <div className={cx(frame, "bg-mist")}>
        {src ? <PosterImage src={src} alt={`${title} poster`} /> : <span className="grid h-full place-items-center text-[0.85rem] text-ink-mute">No poster</span>}
      </div>
    );
  }

  const busy = Boolean(state.busy);
  return (
    <div ref={root}>
      <input
        ref={input}
        type="file"
        accept={PICTURE_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(ev) => {
          const file = ev.target.files?.[0];
          // Clear it, so choosing the same file again still counts.
          ev.target.value = "";
          if (file) choose(() => file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
        aria-label={src ? `Change the poster for ${title}` : `Add a poster for ${title}`}
        className={cx(
          frame,
          "group cursor-pointer text-left disabled:cursor-wait",
          src ? "bg-mist" : "border-2 border-dashed bg-mist",
          over ? "border-clay ring-4 ring-clay/40" : src ? "" : "border-edge hover:border-clay",
        )}
      >
        {src ? <PosterImage src={src} alt={`${title} poster`} /> : null}
        {busy ? (
          <span className="absolute inset-0 grid place-items-center bg-paper-bright/85 text-[0.95rem] font-semibold text-clay">{state.busy}</span>
        ) : over ? (
          <span className="absolute inset-0 grid place-items-center bg-clay/80 text-[0.95rem] font-bold text-paper-bright">Drop to use this poster</span>
        ) : src ? null : (
          <span className="absolute inset-0 grid place-items-center p-2 text-center">
            <span>
              <span className="block text-[0.95rem] font-bold text-clay">+ Add poster</span>
              <span className="block text-[0.78rem] text-ink-mute">tap, or drop a file on this event</span>
            </span>
          </span>
        )}
      </button>
      {src ? (
        <div className="mt-1 flex gap-1 text-[0.88rem] font-semibold">
          <button
            type="button"
            disabled={busy}
            onClick={() => input.current?.click()}
            className="-ml-2 inline-flex min-h-10 items-center rounded-lg px-2 text-clay hover:bg-clay-wash hover:text-clay-deep disabled:opacity-50"
          >
            Change poster
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={remove}
            className="inline-flex min-h-10 items-center rounded-lg px-2 text-ink-mute hover:bg-sky-wash hover:text-sky disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      ) : null}
      {state.error ? (
        <p role="alert" className="mt-2 rounded-lg bg-sky-wash px-3 py-2 text-[0.85rem] font-semibold text-sky">
          {state.error}
        </p>
      ) : state.note ? (
        <p role="status" className="mt-1.5 break-all text-[0.82rem] font-semibold text-moss">
          ✓ {state.note}
        </p>
      ) : null}
    </div>
  );
}

/** Hide or show, and delete (after a confirm). */
export function EventButtons({ id, title, hidden }: { id: string; title: string; hidden: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      setError(null);
      const res = await fn();
      if (!res.ok) setError(res.error ?? "That didn't work. Try again.");
      else router.refresh();
    });

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => setEventVisibility(id, hidden))}
        className={cx(BTN, hidden ? "border-moss/40 text-moss hover:bg-moss/10" : "border-edge text-ink-soft hover:border-ink")}
      >
        {hidden ? "Show on site" : "Hide"}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (window.confirm(`Delete "${title}"? It comes off the site and the calendar, and this can't be undone. To take it down for now, use Hide instead.`)) {
            run(() => deleteEvent(id));
          }
        }}
        className={cx(BTN, "border-transparent text-ink-mute hover:border-sky/40 hover:text-sky")}
      >
        Delete
      </button>
      {pending ? <span className="text-[0.85rem] text-ink-mute">Saving…</span> : null}
      {error ? (
        <span role="alert" className="basis-full text-[0.85rem] font-semibold text-sky">
          {error}
        </span>
      ) : null}
    </>
  );
}

/** After a save, bring the saved event's row into view (2026-10-08). */
export function ScrollToSaved({ id }: { id: string }) {
  useEffect(() => {
    document.getElementById(`event-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [id]);
  return null;
}
