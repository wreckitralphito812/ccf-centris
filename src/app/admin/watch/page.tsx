import type { Metadata } from "next";
import { connection } from "next/server";
import { AdminHeader, AdminNote, AdminPanel } from "../admin-ui";
import { YouTubeThumb } from "@/components/youtube-thumb";
import { isAdminConfigured } from "@/lib/admin-auth";
import { hasSupabase } from "@/lib/supabase/server";
import { getReplayLibrary, getWatchReplay } from "@/lib/watch";
import { replayLabelDate } from "@/lib/watch-shared";
import {
  checkCcfNetNow,
  pinExisting,
  setReplayHidden,
  unpinVideo,
  updateReplay,
} from "@/app/actions/watch-admin";
import { PinForm } from "./pin-form";

export const metadata: Metadata = { title: "Watch" };

const SOURCE_NOTE = {
  pinned: "Pinned by an admin. It stays until you unpin it.",
  ccfnet: "Followed from CCF Net automatically. Updates on its own when CCF Net posts the next replay.",
  archive: "CCF Net couldn't be read just now, so the newest saved replay is showing.",
} as const;

const input = "w-full border border-hairline bg-paper px-3 py-2 text-[0.92rem] text-ink focus:border-clay";

/**
 * What the Watch page and the home page show as "Last Sunday", and the
 * library of every replay the site has saved.
 */
export default async function AdminWatch() {
  await connection();
  const [{ replay, source }, library] = await Promise.all([getWatchReplay(), getReplayLibrary()]);
  const readOnly = !isAdminConfigured() || !hasSupabase();
  const pinned = library.find((r) => r.pinned);

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Watch"
        lead="“Last Sunday” on the Watch page and the home page follows CCF Net by itself, and every replay it finds is saved below. Pin a video to show something else, like a special service."
      />

      {!hasSupabase() ? (
        <AdminNote>Not connected to a database, so pinning and the library are off.</AdminNote>
      ) : null}

      <AdminPanel
        title="Showing now"
        action={
          readOnly ? null : (
            <form action={checkCcfNetNow}>
              <button className="label text-clay underline underline-offset-4">Check CCF Net now</button>
            </form>
          )
        }
      >
        {replay ? (
          <div className="grid gap-5 p-5 sm:grid-cols-[16rem_1fr]">
            <div className="relative aspect-video overflow-hidden border border-hairline">
              <YouTubeThumb videoId={replay.videoId} alt={replay.title} />
            </div>
            <div>
              <p className="font-display text-xl leading-tight">{replay.title}</p>
              <p className="mt-1 text-[0.9rem] text-ink-mute">
                {[replay.speaker, replay.dateLabel].filter(Boolean).join(" · ") || "No speaker or date"}
              </p>
              {source ? <p className="mt-3 text-[0.9rem] text-ink-soft">{SOURCE_NOTE[source]}</p> : null}
              <div className="mt-4 flex flex-wrap gap-4">
                <a
                  href={`https://www.youtube.com/watch?v=${replay.videoId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="label text-clay underline underline-offset-4"
                >
                  Open on YouTube
                </a>
                {pinned && !readOnly ? (
                  <form action={unpinVideo}>
                    <button className="label text-sky underline underline-offset-4">Unpin, follow CCF Net again</button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <p className="px-5 py-8 text-[0.92rem] text-ink-mute">
            Nothing to show: CCF Net couldn&rsquo;t be read and nothing is saved yet. The Watch page
            links people to CCF Net instead. Pin a video below to fill it.
          </p>
        )}
      </AdminPanel>

      <AdminPanel title="Pin a video">
        <div className="p-5">
          <p className="mb-4 max-w-2xl text-[0.9rem] leading-relaxed text-ink-soft">
            Paste any YouTube link, unlisted ones included. It replaces the CCF Net replay on the
            site until you unpin it.
          </p>
          {readOnly ? <p className="label text-ink-mute">Read-only</p> : <PinForm />}
        </div>
      </AdminPanel>

      <AdminPanel title={`Replay library (${library.length})`}>
        {library.length ? (
          <ul className="divide-y divide-hairline">
            {library.map((r) => (
              <li key={r.video_id} className="grid gap-4 p-5 md:grid-cols-[10rem_1fr]">
                <div className="relative aspect-video overflow-hidden border border-hairline">
                  <YouTubeThumb videoId={r.video_id} alt={r.title} />
                </div>
                <div>
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{r.title}</span>
                    {r.pinned ? <Tag tone="clay">Pinned</Tag> : null}
                    {r.hidden ? <Tag tone="mute">Hidden</Tag> : null}
                    <Tag tone="mute">{r.source === "ccfnet" ? "From CCF Net" : "Added by admin"}</Tag>
                  </p>
                  <p className="mt-0.5 text-[0.85rem] text-ink-mute">
                    {[r.speaker, r.service_date ? replayLabelDate(r.service_date) : null].filter(Boolean).join(" · ") ||
                      "No speaker or date"}
                  </p>
                  {readOnly ? null : (
                    <>
                      <div className="mt-3 flex flex-wrap gap-4">
                        {!r.pinned ? (
                          <form action={pinExisting}>
                            <input type="hidden" name="id" value={r.video_id} />
                            <button className="label text-clay underline underline-offset-4">Pin</button>
                          </form>
                        ) : null}
                        <form action={setReplayHidden}>
                          <input type="hidden" name="id" value={r.video_id} />
                          <input type="hidden" name="hidden" value={r.hidden ? "false" : "true"} />
                          <button className="label text-ink-mute underline underline-offset-4 hover:text-sky">
                            {r.hidden ? "Show on site" : "Hide from site"}
                          </button>
                        </form>
                      </div>
                      <details className="mt-3">
                        <summary className="label cursor-pointer text-clay">Edit details</summary>
                        <form action={updateReplay} className="mt-3 grid gap-3 sm:grid-cols-[1fr_12rem_10rem_auto] sm:items-end">
                          <input type="hidden" name="id" value={r.video_id} />
                          <label className="block">
                            <span className="label text-ink-mute">Title</span>
                            <input name="title" defaultValue={r.title} required maxLength={200} className={`mt-1 ${input}`} />
                          </label>
                          <label className="block">
                            <span className="label text-ink-mute">Speaker</span>
                            <input name="speaker" defaultValue={r.speaker ?? ""} maxLength={120} className={`mt-1 ${input}`} />
                          </label>
                          <label className="block">
                            <span className="label text-ink-mute">Sunday</span>
                            <input name="service_date" type="date" defaultValue={r.service_date ?? ""} className={`mt-1 ${input}`} />
                          </label>
                          <button className="btn-press label border border-clay bg-clay px-4 py-2.5 text-paper-bright hover:bg-clay-deep">
                            Save
                          </button>
                        </form>
                      </details>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">
            Empty so far. The first replay is saved the next time the Watch page reads CCF Net.
          </p>
        )}
      </AdminPanel>
    </div>
  );
}

function Tag({ tone, children }: { tone: "clay" | "mute"; children: string }) {
  return (
    <span
      className={
        tone === "clay"
          ? "label border border-clay/50 px-2 py-0.5 text-clay-deep"
          : "label border border-hairline px-2 py-0.5 text-ink-mute"
      }
    >
      {children}
    </span>
  );
}
