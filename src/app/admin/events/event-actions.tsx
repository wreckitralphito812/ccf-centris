"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteEvent, setEventPoster, setEventVisibility } from "@/app/actions/admin-events";
import { PosterImage } from "@/components/poster-image";
import { cx } from "@/components/ui";
import { findQrLink, readImage, uploadImage } from "@/lib/upload-image";

/* The working parts of the admin events list (2026-10-08): the poster you
   can drop a file on, and the hide / show / delete buttons. Each calls a
   server action and refreshes the list; errors show beside the button. */

const BTN =
  "inline-flex min-h-10 items-center justify-center rounded-lg border px-3.5 text-[0.9rem] font-semibold transition-colors disabled:opacity-50";

/** The event's poster thumbnail. Tap or drop a file to add or change it. */
export function PosterDrop({ id, title, src, readOnly }: { id: string; title: string; src: string | null; readOnly: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<{ busy?: string; error?: string; note?: string }>({});
  const [over, setOver] = useState(false);
  const [, start] = useTransition();

  async function choose(file: File | undefined) {
    if (!file) return;
    setState({ busy: "Checking…" });
    try {
      await readImage(file);
      const qr = findQrLink(file);
      setState({ busy: "Uploading…" });
      const url = await uploadImage(file, "poster");
      setState({ busy: "Saving…" });
      const res = await setEventPoster(id, url, await qr);
      if (!res.ok) return setState({ error: res.error });
      setState(res.signupAdded ? { note: `Sign-up link added from the QR code: ${res.signupAdded.replace(/^https?:\/\//, "")}` } : {});
      start(() => router.refresh());
    } catch (e) {
      setState({ error: (e as Error).message });
    }
  }

  const frame = "relative block aspect-video w-full overflow-hidden rounded-lg";
  if (readOnly) {
    return (
      <div className={cx(frame, "bg-mist")}>
        {src ? <PosterImage src={src} alt={`${title} poster`} /> : <span className="grid h-full place-items-center text-[0.85rem] text-ink-mute">No poster</span>}
      </div>
    );
  }

  return (
    <div>
      <label
        title={src ? "Change the poster" : "Add a poster"}
        onDragOver={(ev) => {
          ev.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(ev) => {
          ev.preventDefault();
          setOver(false);
          choose(ev.dataTransfer.files?.[0]);
        }}
        className={cx(
          frame,
          "group cursor-pointer",
          src ? "bg-mist" : "border-2 border-dashed bg-mist",
          over ? "border-clay ring-2 ring-clay" : src ? "" : "border-edge hover:border-clay",
        )}
      >
        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={Boolean(state.busy)} onChange={(ev) => choose(ev.target.files?.[0])} />
        {src ? <PosterImage src={src} alt={`${title} poster`} /> : null}
        {state.busy ? (
          <span className="absolute inset-0 grid place-items-center bg-paper-bright/80 text-[0.9rem] font-semibold text-clay">{state.busy}</span>
        ) : src ? (
          <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-1.5 text-center text-[0.8rem] font-semibold text-paper-bright opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            Change poster
          </span>
        ) : (
          <span className="absolute inset-0 grid place-items-center p-2 text-center">
            <span>
              <span className="block text-[0.95rem] font-bold text-clay">+ Add poster</span>
              <span className="block text-[0.78rem] text-ink-mute">tap or drop a file</span>
            </span>
          </span>
        )}
      </label>
      {state.error ? (
        <p role="alert" className="mt-1.5 text-[0.82rem] font-semibold text-sky">
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
