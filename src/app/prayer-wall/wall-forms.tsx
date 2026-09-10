"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  postPrayerRequest,
  replyToPrayer,
  reportPrayerItem,
  type WallResult,
} from "@/app/actions/prayer-wall";
import { PRAYER_BODY_MAX, PRAYER_LIFETIME } from "@/lib/prayer-wall";

const field =
  "w-full border border-hairline bg-paper px-4 py-3 text-[1rem] leading-relaxed text-ink placeholder:text-ink-mute focus:border-clay";
const primary =
  "btn-press label border border-clay bg-clay px-5 py-2.5 text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50";
const outline =
  "btn-press label border border-ink px-3.5 py-2 text-ink transition-colors hover:bg-ink hover:text-paper-bright";

export function PostForm({ screenName }: { screenName: string }) {
  const [state, action, pending] = useActionState<WallResult | null, FormData>(
    postPrayerRequest,
    null,
  );
  const form = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state]);

  return (
    <form ref={form} action={action} className="border border-hairline bg-paper-bright p-6">
      <label htmlFor="prayer-body" className="label text-clay">
        Share a prayer request
      </label>
      <textarea
        id="prayer-body"
        name="body"
        required
        maxLength={PRAYER_BODY_MAX}
        rows={4}
        placeholder="What can we pray with you about?"
        className={`${field} mt-3`}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.82rem] text-ink-mute">
          Posting as <strong className="text-ink">{screenName}</strong>. Members
          can see it for {PRAYER_LIFETIME}.
        </p>
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Posting…" : "Post request"}
        </button>
      </div>
      {state?.error ? (
        <p role="alert" className="mt-3 text-[0.9rem] text-sky">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="mt-3 text-[0.9rem] text-clay">
          Posted. Members can see it and pray with you now.
        </p>
      ) : null}
    </form>
  );
}

type ReplyKind = "prayer" | "message";

/** "Pray for this" / "Leave a message", each opening a fresh composer. */
export function ReplyForm({ postId }: { postId: string }) {
  const [draft, setDraft] = useState<{ kind: ReplyKind; attempt: number } | null>(null);
  const open = (kind: ReplyKind) =>
    setDraft((d) => ({ kind, attempt: (d?.attempt ?? 0) + 1 }));

  return (
    <div className="mt-5">
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => open("prayer")} className={outline}>
          Pray for this
        </button>
        <button type="button" onClick={() => open("message")} className={outline}>
          Leave a message
        </button>
      </div>
      {draft ? (
        <ReplyComposer
          key={draft.attempt}
          postId={postId}
          kind={draft.kind}
          onCancel={() => setDraft(null)}
        />
      ) : null}
    </div>
  );
}

function ReplyComposer({
  postId,
  kind,
  onCancel,
}: {
  postId: string;
  kind: ReplyKind;
  onCancel: () => void;
}) {
  const [state, action, pending] = useActionState<WallResult | null, FormData>(
    replyToPrayer,
    null,
  );
  const id = `reply-${postId}`;

  if (state?.ok) {
    return (
      <p role="status" className="mt-3 text-[0.9rem] text-clay">
        {kind === "prayer" ? "Thank you for praying." : "Message sent."}
      </p>
    );
  }

  return (
    <form action={action} className="mt-3">
      <input type="hidden" name="post_id" value={postId} />
      <input type="hidden" name="kind" value={kind} />
      <label htmlFor={id} className="sr-only">
        {kind === "prayer" ? "Your prayer" : "Your message"}
      </label>
      <textarea
        id={id}
        name="body"
        required
        autoFocus
        maxLength={PRAYER_BODY_MAX}
        rows={3}
        placeholder={kind === "prayer" ? "Write your prayer…" : "Write a word of encouragement…"}
        className={field}
      />
      <div className="mt-2 flex items-center gap-4">
        <button type="submit" disabled={pending} className={primary}>
          {pending ? "Sending…" : kind === "prayer" ? "Post prayer" : "Send message"}
        </button>
        <button type="button" onClick={onCancel} className="label text-ink-mute hover:text-ink">
          Cancel
        </button>
      </div>
      {state?.error ? (
        <p role="alert" className="mt-2 text-[0.9rem] text-sky">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

export function ReportButton({ target }: { target: string }) {
  const [state, action, pending] = useActionState<WallResult | null, FormData>(
    reportPrayerItem,
    null,
  );
  if (state?.ok) return <span className="label text-ink-mute">Reported</span>;
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="target" value={target} />
      <button
        type="submit"
        disabled={pending}
        className="label text-ink-mute transition-colors hover:text-sky"
      >
        Report
      </button>
      {state?.error ? (
        <span role="alert" className="text-[0.8rem] text-sky">
          {state.error}
        </span>
      ) : null}
    </form>
  );
}
