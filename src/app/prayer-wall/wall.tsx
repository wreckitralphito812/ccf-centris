"use client";

import { useActionState, useEffect, useOptimistic, useRef, useState, useTransition, type ReactNode } from "react";
import {
  deletePrayerPost,
  markAnswered,
  postPrayerRequest,
  replyToPrayer,
  reportPrayerItem,
  setPrayerItemHidden,
  setScreenName,
  togglePrayed,
  type WallResult,
} from "@/app/actions/prayer-wall";
import { cx } from "@/components/ui";
import { SectionIcon } from "@/components/icons";
import {
  initials,
  PRAYER_BODY_MAX,
  PRAYER_LIFETIME,
  SCREEN_NAME_RULE,
  TOPICS,
  topicLabel,
  type Topic,
} from "@/lib/prayer-wall";

/**
 * The Prayer Wall as cards (2026-10-01). Ralph found the old list of text
 * boxes boring, and picked a card grid with one-tap "I prayed", topics,
 * filters, answered prayers and threads that open in place. The page reads
 * the data on the server and passes it in already shaped; this file only
 * handles what members do with it.
 */

export interface WallReply {
  id: string;
  authorName: string;
  mine: boolean;
  kind: "prayer" | "message";
  body: string;
  when: string;
  hidden: boolean;
}

export interface WallPost {
  id: string;
  authorName: string;
  mine: boolean;
  body: string;
  topic: Topic | null;
  answered: boolean;
  when: string;
  hidden: boolean;
  prayed: number;
  prayedByMe: boolean;
  replies: WallReply[];
}

type Filter = "all" | "needs" | "answered" | "mine";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "needs", label: "Needs prayer" },
  { id: "answered", label: "Answered" },
  { id: "mine", label: "Mine" },
];

export function PrayerWall({
  posts,
  screenName,
  suggestion,
  isModerator,
}: {
  posts: WallPost[];
  /** Null until the member chooses one; the wall then asks for it first. */
  screenName: string | null;
  suggestion: string;
  isModerator: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [topic, setTopic] = useState<Topic | null>(null);

  const topicsHere = TOPICS.filter((t) => posts.some((p) => p.topic === t.id));
  let shown = posts.filter((p) => !topic || p.topic === topic);
  if (filter === "needs") {
    // Fewest prayers first, so quiet requests get prayed for.
    shown = shown.filter((p) => !p.answered && !p.hidden).sort((a, b) => a.prayed - b.prayed);
  } else if (filter === "answered") {
    shown = shown.filter((p) => p.answered);
  } else if (filter === "mine") {
    shown = shown.filter((p) => p.mine);
  }
  const prayers = posts.reduce((n, p) => n + p.prayed, 0);

  return (
    <div>
      <div className="mx-auto max-w-3xl">
        {screenName ? <Composer screenName={screenName} /> : <NameStart suggestion={suggestion} />}
      </div>

      <div className="mt-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div role="tablist" aria-label="Show" className="flex w-full gap-1 rounded-lg border border-edge bg-paper-bright p-1 sm:w-fit">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cx(
                "min-h-10 flex-1 whitespace-nowrap rounded-md px-2 text-[0.9rem] font-semibold transition-colors sm:flex-none sm:px-4 sm:text-[0.95rem]",
                filter === f.id ? "bg-clay text-paper-bright" : "text-ink-soft hover:bg-mist",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="text-[0.95rem] text-ink-mute">
          <span className="font-semibold text-ink tabular-nums">{posts.length}</span>{" "}
          {posts.length === 1 ? "request" : "requests"} ·{" "}
          <span className="font-semibold text-ink tabular-nums">{prayers}</span>{" "}
          {prayers === 1 ? "prayer" : "prayers"} prayed
        </p>
      </div>

      {topicsHere.length > 1 ? (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="Topics">
          {topicsHere.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={topic === t.id}
              onClick={() => setTopic((cur) => (cur === t.id ? null : t.id))}
              className={cx(
                "min-h-9 rounded-full border px-3.5 text-[0.9rem] font-medium transition-colors",
                topic === t.id ? "border-clay bg-clay-wash text-clay-deep" : "border-edge bg-paper-bright text-ink-soft hover:border-clay/50",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      ) : null}

      {shown.length ? (
        <div className="mt-6 grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <PrayerCard key={p.id} post={p} canWrite={Boolean(screenName)} isModerator={isModerator} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-edge bg-paper-bright px-6 py-12 text-center text-[1.02rem] text-ink-mute">
          {posts.length === 0
            ? "No prayer requests yet. Yours can be the first."
            : filter === "mine"
              ? "You haven’t posted a request yet."
              : filter === "answered"
                ? "No answered prayers yet. When one is, its author can mark it here."
                : "Nothing here right now."}
        </p>
      )}

      <div className="mt-12 grid gap-4 rounded-2xl bg-mist p-6 text-[0.95rem] leading-relaxed text-ink-soft sm:grid-cols-3 sm:p-7">
        <HowItem icon="people">Only signed-in members can see the wall, and everyone appears by screen name.</HowItem>
        <HowItem icon="heart">Requests stay up for {PRAYER_LIFETIME}, then leave the wall on their own.</HowItem>
        <HowItem icon="hands">If something doesn&rsquo;t belong here, report it. Three reports hide it until a moderator looks.</HowItem>
      </div>
    </div>
  );
}

function HowItem({ icon, children }: { icon: "people" | "heart" | "hands"; children: ReactNode }) {
  return (
    <p className="flex gap-3">
      <SectionIcon name={icon} className="mt-1 h-[18px] w-[18px] shrink-0 text-clay" />
      <span>{children}</span>
    </p>
  );
}

/* ---------------------------------------------------------------------------
   Avatar
   --------------------------------------------------------------------------- */

const TINTS = [
  "bg-clay-wash text-clay-deep",
  "bg-sky-wash text-sky",
  "bg-ink/[0.07] text-ink",
  "bg-moss/15 text-moss",
  "bg-brand-teal/15 text-clay-deep",
];

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span
      aria-hidden
      className={cx(
        "grid shrink-0 place-items-center rounded-full font-bold",
        size === "sm" ? "h-8 w-8 text-[0.72rem]" : "h-10 w-10 text-[0.85rem]",
        TINTS[h % TINTS.length],
      )}
    >
      {initials(name)}
    </span>
  );
}

/* ---------------------------------------------------------------------------
   Screen name: asked on the wall itself, with a suggestion ready to accept
   --------------------------------------------------------------------------- */

function NameStart({ suggestion }: { suggestion: string }) {
  return (
    <div className="calm-card p-6 sm:p-8">
      <p className="text-[0.95rem] font-semibold text-clay">One step first</p>
      <h2 className="mt-1.5 text-[1.4rem] font-bold leading-tight text-ink">Choose the name the wall shows</h2>
      <p className="mt-2 max-w-xl leading-relaxed text-ink-soft">
        Other members see it beside your requests and prayers. It doesn&rsquo;t need to be your real name. You can
        read and pray for requests already.
      </p>
      <NameForm current={suggestion} cta="Use this name" className="mt-6" />
    </div>
  );
}

function NameForm({
  current,
  cta,
  className,
  onCancel,
}: {
  current: string;
  cta: string;
  className?: string;
  onCancel?: () => void;
}) {
  const [state, action, pending] = useActionState<WallResult | null, FormData>(setScreenName, null);
  return (
    <form action={action} className={className}>
      <input type="hidden" name="next" value="/prayer-wall" />
      <label htmlFor="screen_name" className="block text-[0.95rem] font-semibold text-ink">
        Screen name
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="screen_name"
          name="screen_name"
          defaultValue={current}
          required
          minLength={3}
          maxLength={24}
          autoComplete="nickname"
          aria-describedby="screen-name-rule"
          className="calm-input min-h-12 w-full px-4 text-[1.05rem] text-ink sm:max-w-xs"
        />
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="btn-press min-h-12 rounded-lg bg-clay px-6 text-[1rem] font-semibold text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50"
          >
            {pending ? "Saving…" : cta}
          </button>
          {onCancel ? (
            <button type="button" onClick={onCancel} className="min-h-12 px-2 text-[0.98rem] font-semibold text-ink-mute hover:text-ink">
              Cancel
            </button>
          ) : null}
        </div>
      </div>
      <p id="screen-name-rule" className="mt-2 text-[0.88rem] leading-relaxed text-ink-mute">
        {SCREEN_NAME_RULE}
      </p>
      {state?.error ? (
        <p role="alert" className="mt-2 text-[0.95rem] font-semibold text-sky">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

/* ---------------------------------------------------------------------------
   Composer: one line until tapped, then the full form
   --------------------------------------------------------------------------- */

function Composer({ screenName }: { screenName: string }) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [body, setBody] = useState("");
  const [topic, setTopic] = useState<Topic | null>(null);
  const [posted, setPosted] = useState(false);
  const [state, action, pending] = useActionState<WallResult | null, FormData>(async (prev, fd) => {
    const r = await postPrayerRequest(prev, fd);
    if (r.ok) {
      setOpen(false);
      setBody("");
      setTopic(null);
      setPosted(true);
    }
    return r;
  }, null);

  if (renaming) {
    return (
      <div className="calm-card p-6 sm:p-7">
        <p className="text-[1.05rem] font-bold text-ink">Change your screen name</p>
        <p className="mt-1 text-[0.95rem] text-ink-mute">Your past requests and prayers update too.</p>
        <NameForm current={screenName} cta="Save" className="mt-4" onCancel={() => setRenaming(false)} />
      </div>
    );
  }

  if (!open) {
    return (
      <div>
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setPosted(false);
          }}
          className="calm-card flex w-full items-center gap-4 px-5 py-4 text-left transition-shadow hover:shadow-lg"
        >
          <Avatar name={screenName} />
          <span className="flex-1 text-[1.05rem] text-ink-mute">What can we pray with you about?</span>
          <span className="hidden rounded-lg bg-clay px-4 py-2.5 text-[0.95rem] font-semibold text-paper-bright sm:inline">
            Share a request
          </span>
        </button>
        {posted ? (
          <p role="status" className="mt-3 text-center text-[0.98rem] font-semibold text-clay">
            Posted. Members can see it and pray with you now.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form action={action} className="calm-card p-5 sm:p-7">
      <input type="hidden" name="topic" value={topic ?? ""} />
      <div className="flex items-center gap-3">
        <Avatar name={screenName} />
        <div className="leading-tight">
          <p className="font-semibold text-ink">{screenName}</p>
          <p className="text-[0.88rem] text-ink-mute">
            Members see it for {PRAYER_LIFETIME} ·{" "}
            <button type="button" onClick={() => setRenaming(true)} className="font-semibold text-clay hover:text-clay-deep">
              Change name
            </button>
          </p>
        </div>
      </div>
      <label htmlFor="prayer-body" className="sr-only">
        Your prayer request
      </label>
      <textarea
        id="prayer-body"
        name="body"
        required
        autoFocus
        maxLength={PRAYER_BODY_MAX}
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What can we pray with you about?"
        className="calm-input mt-4 w-full resize-y px-4 py-3 text-[1.05rem] leading-relaxed text-ink placeholder:text-ink-mute"
      />
      <p className="mt-1 text-right text-[0.82rem] tabular-nums text-ink-mute">
        {body.length} / {PRAYER_BODY_MAX}
      </p>
      <p className="mt-2 text-[0.95rem] font-semibold text-ink">
        Topic <span className="font-normal text-ink-mute">(optional)</span>
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-pressed={topic === t.id}
            onClick={() => setTopic((cur) => (cur === t.id ? null : t.id))}
            className={cx(
              "min-h-10 rounded-full border px-4 text-[0.92rem] font-medium transition-colors",
              topic === t.id ? "border-clay bg-clay text-paper-bright" : "border-edge bg-paper-bright text-ink-soft hover:border-clay/50",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {state?.error ? (
        <p role="alert" className="mt-4 text-[0.95rem] font-semibold text-sky">
          {state.error}
        </p>
      ) : null}
      <div className="mt-6 flex items-center justify-end gap-3">
        <button type="button" onClick={() => setOpen(false)} className="min-h-11 px-3 text-[0.98rem] font-semibold text-ink-mute hover:text-ink">
          Cancel
        </button>
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="btn-press min-h-11 rounded-lg bg-clay px-6 text-[1rem] font-semibold text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50"
        >
          {pending ? "Posting…" : "Post request"}
        </button>
      </div>
    </form>
  );
}

/* ---------------------------------------------------------------------------
   A prayer card
   --------------------------------------------------------------------------- */

const LONG = 280;

function PrayerCard({ post, canWrite, isModerator }: { post: WallPost; canWrite: boolean; isModerator: boolean }) {
  const [more, setMore] = useState(false);
  const [thread, setThread] = useState(false);
  const long = post.body.length > LONG;

  return (
    <article
      className={cx(
        "surface flex flex-col p-5 sm:p-6",
        post.answered && "ring-2 ring-moss/40",
        post.hidden && "opacity-75",
      )}
    >
      <header className="flex items-start gap-3">
        <Avatar name={post.authorName} />
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-semibold text-ink">
            {post.authorName}
            {post.mine ? <span className="font-normal text-ink-mute"> · you</span> : null}
          </p>
          <p className="mt-0.5 text-[0.85rem] text-ink-mute">
            {post.when}
            {post.topic ? <> · {topicLabel(post.topic)}</> : null}
          </p>
        </div>
        <CardMenu post={post} isModerator={isModerator} />
      </header>

      {post.answered || post.hidden ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {post.answered ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-moss/15 px-3 py-1 text-[0.82rem] font-semibold text-moss">
              <SectionIcon name="sparkle" className="h-3.5 w-3.5" />
              Answered
            </span>
          ) : null}
          {post.hidden ? (
            <span className="rounded-full bg-sky-wash px-3 py-1 text-[0.82rem] font-semibold text-sky">
              {isModerator ? "Hidden from members" : "Hidden by a moderator"}
            </span>
          ) : null}
        </div>
      ) : null}

      <p className={cx("mt-3 whitespace-pre-line text-[1.02rem] leading-relaxed text-ink-soft", long && !more && "line-clamp-6")}>
        {post.body}
      </p>
      {long ? (
        <button type="button" onClick={() => setMore((m) => !m)} className="mt-1 self-start text-[0.92rem] font-semibold text-clay hover:text-clay-deep">
          {more ? "Show less" : "Read more"}
        </button>
      ) : null}

      <footer className="mt-5 flex items-center justify-between gap-3 border-t border-rule pt-4">
        <PrayButton post={post} />
        <button
          type="button"
          aria-expanded={thread}
          onClick={() => setThread((t) => !t)}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2.5 text-[0.92rem] font-semibold text-ink-soft transition-colors hover:bg-mist"
        >
          <SectionIcon name="message" className="h-4 w-4" />
          {post.replies.length ? post.replies.length : null}
          <span className="sr-only sm:not-sr-only">{post.replies.length === 1 ? "message" : "messages"}</span>
        </button>
      </footer>

      {thread ? <Thread post={post} canWrite={canWrite} isModerator={isModerator} /> : null}
    </article>
  );
}

/** One tap to say "I prayed", shown at once and then confirmed by the server. */
function PrayButton({ post }: { post: WallPost }) {
  const [now, setNow] = useOptimistic(
    { mine: post.prayedByMe, count: post.prayed },
    (s, mine: boolean) => ({ mine, count: Math.max(0, s.count + (mine ? 1 : -1)) }),
  );
  const [, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const closed = post.hidden;

  return (
    <div className="flex min-w-0 items-center gap-3">
      <button
        type="button"
        disabled={closed}
        aria-pressed={now.mine}
        onClick={() =>
          start(async () => {
            setError(null);
            setNow(!now.mine);
            const r = await togglePrayed(post.id);
            if (!r.ok) setError(r.error ?? "Try again.");
          })
        }
        className={cx(
          "btn-press inline-flex min-h-10 items-center gap-2 rounded-lg border px-3.5 text-[0.95rem] font-semibold transition-colors disabled:opacity-50",
          now.mine ? "border-clay bg-clay text-paper-bright" : "border-edge bg-paper-bright text-ink hover:border-clay hover:text-clay",
        )}
      >
        <SectionIcon name="hands" className={cx("h-4 w-4", now.mine && "pray-pop")} key={String(now.mine)} />
        {now.mine ? "Prayed" : "I prayed"}
      </button>
      <span className="truncate text-[0.88rem] text-ink-mute" aria-live="polite">
        {error ? (
          <span className="text-sky">{error}</span>
        ) : now.count ? (
          <>
            <span className="font-semibold tabular-nums text-ink">{now.count}</span> praying
          </>
        ) : (
          "Be the first"
        )}
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
   The thread: messages and written prayers, opened in place
   --------------------------------------------------------------------------- */

function Thread({ post, canWrite, isModerator }: { post: WallPost; canWrite: boolean; isModerator: boolean }) {
  return (
    <div className="mt-4 space-y-4 rounded-xl bg-mist p-4">
      {post.replies.length ? (
        <ul className="space-y-4">
          {post.replies.map((r) => (
            <li key={r.id} className="flex gap-3">
              <Avatar name={r.authorName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-[0.85rem] text-ink-mute">
                  <span className="font-semibold text-ink">{r.authorName}</span> · {r.when}
                  {r.kind === "prayer" ? <span className="ml-1.5 font-semibold text-clay">Prayer</span> : null}
                  {r.hidden ? <span className="ml-1.5 font-semibold text-sky">Hidden</span> : null}
                </p>
                <p className="mt-0.5 whitespace-pre-line text-[0.95rem] leading-relaxed text-ink-soft">{r.body}</p>
                <div className="mt-1 flex gap-4 text-[0.82rem]">
                  {!r.mine ? <ReportLink target={`reply:${r.id}`} /> : null}
                  {isModerator ? <HideLink target={`reply:${r.id}`} hidden={r.hidden} /> : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[0.92rem] text-ink-mute">No messages yet. Send a word of encouragement.</p>
      )}
      {post.hidden ? null : canWrite ? (
        <ReplyComposer postId={post.id} />
      ) : (
        <p className="text-[0.92rem] text-ink-mute">Choose a screen name above to leave a message.</p>
      )}
    </div>
  );
}

function ReplyComposer({ postId }: { postId: string }) {
  const [kind, setKind] = useState<"message" | "prayer">("message");
  const [body, setBody] = useState("");
  const [state, action, pending] = useActionState<WallResult | null, FormData>(async (prev, fd) => {
    const r = await replyToPrayer(prev, fd);
    if (r.ok) setBody("");
    return r;
  }, null);
  const id = `reply-${postId}`;

  return (
    <form action={action} className="border-t border-rule pt-4">
      <input type="hidden" name="post_id" value={postId} />
      <input type="hidden" name="kind" value={kind} />
      <div className="flex gap-1.5" role="radiogroup" aria-label="Kind of reply">
        {(
          [
            ["message", "Encouragement"],
            ["prayer", "Written prayer"],
          ] as const
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={cx(
              "min-h-8 rounded-full px-3 text-[0.85rem] font-semibold transition-colors",
              kind === k ? "bg-ink text-paper-bright" : "text-ink-soft hover:bg-paper-bright",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      <label htmlFor={id} className="sr-only">
        {kind === "prayer" ? "Your prayer" : "Your message"}
      </label>
      <div className="mt-2 flex items-end gap-2">
        <textarea
          id={id}
          name="body"
          required
          maxLength={PRAYER_BODY_MAX}
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={kind === "prayer" ? "Write your prayer…" : "Write a word of encouragement…"}
          className="min-h-11 w-full resize-y rounded-lg border border-edge bg-paper-bright px-3.5 py-2.5 text-[0.95rem] leading-relaxed text-ink placeholder:text-ink-mute focus:border-clay focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending || !body.trim()}
          className="btn-press min-h-11 shrink-0 rounded-lg bg-clay px-4 text-[0.95rem] font-semibold text-paper-bright transition-colors hover:bg-clay-deep disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {state?.error ? (
        <p role="alert" className="mt-2 text-[0.9rem] font-semibold text-sky">
          {state.error}
        </p>
      ) : state?.ok ? (
        <p role="status" className="mt-2 text-[0.9rem] font-semibold text-clay">
          {kind === "prayer" ? "Thank you for praying." : "Sent."}
        </p>
      ) : null}
    </form>
  );
}

/* ---------------------------------------------------------------------------
   The card's "more" menu: answered, delete, report, hide
   --------------------------------------------------------------------------- */

function CardMenu({ post, isModerator }: { post: WallPost; isModerator: boolean }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const item = "flex min-h-10 w-full items-center px-4 text-left text-[0.95rem] text-ink hover:bg-mist";

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-label="More"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="grid h-9 w-9 place-items-center rounded-lg text-ink-mute transition-colors hover:bg-mist hover:text-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {open ? (
        <div className="absolute right-0 top-10 z-20 w-56 overflow-hidden rounded-xl border border-edge bg-paper-bright py-1.5 shadow-lg">
          {post.mine ? (
            <>
              <form action={markAnswered}>
                <input type="hidden" name="id" value={post.id} />
                <input type="hidden" name="answered" value={post.answered ? "0" : "1"} />
                <button type="submit" className={item}>
                  {post.answered ? "Mark as not answered" : "Mark as answered"}
                </button>
              </form>
              <form
                action={deletePrayerPost}
                onSubmit={(e) => {
                  if (!window.confirm("Delete this prayer request? Its prayers and messages go too.")) e.preventDefault();
                }}
              >
                <input type="hidden" name="id" value={post.id} />
                <button type="submit" className={cx(item, "text-sky")}>
                  Delete my request
                </button>
              </form>
            </>
          ) : (
            <ReportItem target={`post:${post.id}`} className={item} />
          )}
          {isModerator ? (
            <form action={setPrayerItemHidden}>
              <input type="hidden" name="target" value={`post:${post.id}`} />
              <input type="hidden" name="hide" value={post.hidden ? "0" : "1"} />
              <button type="submit" className={item}>
                {post.hidden ? "Unhide" : "Hide from members"}
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function ReportItem({ target, className }: { target: string; className: string }) {
  const [state, action, pending] = useActionState<WallResult | null, FormData>(reportPrayerItem, null);
  if (state?.ok) return <p className={cx(className, "text-ink-mute")}>Reported. Thank you.</p>;
  return (
    <form action={action}>
      <input type="hidden" name="target" value={target} />
      <button type="submit" disabled={pending} className={className}>
        Report
      </button>
      {state?.error ? <p className="px-4 pb-2 text-[0.85rem] text-sky">{state.error}</p> : null}
    </form>
  );
}

function ReportLink({ target }: { target: string }) {
  const [state, action, pending] = useActionState<WallResult | null, FormData>(reportPrayerItem, null);
  if (state?.ok) return <span className="text-ink-mute">Reported</span>;
  return (
    <form action={action}>
      <input type="hidden" name="target" value={target} />
      <button type="submit" disabled={pending} className="font-semibold text-ink-mute hover:text-sky">
        Report
      </button>
    </form>
  );
}

function HideLink({ target, hidden }: { target: string; hidden: boolean }) {
  return (
    <form action={setPrayerItemHidden}>
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="hide" value={hidden ? "0" : "1"} />
      <button type="submit" className="font-semibold text-ink-mute hover:text-sky">
        {hidden ? "Unhide" : "Hide"}
      </button>
    </form>
  );
}
