import { connection } from "next/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { deletePrayerPost, setPrayerItemHidden } from "@/app/actions/prayer-wall";
import { openRequests } from "@/lib/prayer-wall";
import { hasSupabase, SATELLITE_ID } from "@/lib/supabase/server";
import { createSupabaseServer } from "@/lib/supabase/ssr";
import { PostForm, ReplyForm, ReportButton } from "./wall-forms";

export const metadata: Metadata = {
  title: "Prayer Wall",
  description:
    "Post a prayer request and pray for others in the CCF Centris community. For signed-in members.",
};

interface Reply {
  id: string;
  author_id: string;
  author_name: string;
  kind: "prayer" | "message";
  body: string;
  created_at: string;
  hidden_at: string | null;
}

interface Post {
  id: string;
  author_id: string;
  author_name: string;
  body: string;
  created_at: string;
  expires_at: string;
  hidden_at: string | null;
  prayer_wall_replies: Reply[];
}

const day = new Intl.DateTimeFormat("en-PH", {
  month: "short",
  day: "numeric",
  timeZone: "Asia/Manila",
});

/**
 * The Prayer Wall. Members only: signed-out visitors see an explanation and a
 * sign-in button, never the requests. Reads run under the member's session, so
 * the database's row-level security decides what appears.
 */
export default function PrayerWallPage() {
  return (
    <>
      <PageHeader
        eyebrow="Prayer Wall"
        title="Pray for one another."
        lead="Post a prayer request and pray for others. The wall is for signed-in CCF Centris members."
      />
      <Section>
        <Container>
          <Wall />
        </Container>
      </Section>
    </>
  );
}

async function Wall() {
  // Always render per visitor: this section shows members their own data.
  await connection();
  if (!hasSupabase()) {
    return (
      <Notice label="Opening soon">
        <p>The Prayer Wall opens when member accounts go live.</p>
      </Notice>
    );
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Notice label="Members only">
        <p>
          Prayer requests often share personal things, so the wall is visible
          only to signed-in members.
        </p>
        <ButtonLink href="/sign-in?next=/prayer-wall">Sign in to see the wall</ButtonLink>
      </Notice>
    );
  }

  const { data: screenName } = await supabase.rpc("my_screen_name");
  if (typeof screenName !== "string" || !screenName) {
    return (
      <Notice label="One step first">
        <p>
          Choose the screen name other members will see beside your requests
          and prayers. It doesn&rsquo;t need to be your real name.
        </p>
        <ButtonLink href="/my/screen-name?next=/prayer-wall">Choose a screen name</ButtonLink>
      </Notice>
    );
  }

  const [{ data, error }, { data: moderator }] = await Promise.all([
    supabase
      .from("prayer_wall_posts")
      .select(
        "id, author_id, author_name, body, created_at, expires_at, hidden_at, prayer_wall_replies(id, author_id, author_name, kind, body, created_at, hidden_at)",
      )
      .eq("satellite_id", SATELLITE_ID)
      .order("created_at", { ascending: false })
      .order("created_at", { referencedTable: "prayer_wall_replies", ascending: true })
      .limit(60),
    supabase.rpc("has_role", {
      target_satellite: SATELLITE_ID,
      wanted: ["prayer_team", "satellite_admin"],
    }),
  ]);

  if (error) {
    console.error("prayer wall read failed", error);
    return (
      <Notice label="Couldn’t load the wall">
        <p>Try again in a moment.</p>
      </Notice>
    );
  }

  const posts = openRequests((data ?? []) as Post[]);
  const isModerator = moderator === true;

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="space-y-6">
        <PostForm screenName={screenName} />

        {posts.length === 0 ? (
          <p className="border border-dashed border-hairline p-8 text-center text-ink-mute">
            No prayer requests yet. Yours can be the first.
          </p>
        ) : (
          posts.map((p) => (
            <PostCard key={p.id} post={p} mine={p.author_id === user.id} isModerator={isModerator} userId={user.id} />
          ))
        )}
      </div>

      <aside className="space-y-5 border-l-2 border-clay bg-paper-bright p-6 text-[0.92rem] leading-relaxed text-ink-soft lg:sticky lg:top-28">
        <p className="label text-clay">How the wall works</p>
        <p>Only signed-in members can see it. Everyone appears by screen name.</p>
        <p>Requests stay up for two months, then leave the wall on their own.</p>
        <p>
          If something doesn&rsquo;t belong here, tap Report. Three reports hide
          it until a moderator takes a look.
        </p>
        <p>
          You&rsquo;re posting as <strong className="text-ink">{screenName}</strong>.{" "}
          <a href="/my/screen-name?next=/prayer-wall" className="text-clay underline underline-offset-4">
            Change
          </a>
        </p>
      </aside>
    </div>
  );
}

function PostCard({
  post,
  mine,
  isModerator,
  userId,
}: {
  post: Post;
  mine: boolean;
  isModerator: boolean;
  userId: string;
}) {
  return (
    <article className="border border-hairline bg-paper-bright p-6">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <p className="font-display text-lg text-ink">{post.author_name}</p>
        <p className="text-[0.8rem] text-ink-mute">
          {day.format(new Date(post.created_at))} &middot; up until{" "}
          {day.format(new Date(post.expires_at))}
        </p>
      </header>

      {post.hidden_at ? (
        <p className="label mt-3 text-sky">
          {isModerator ? "Hidden from members" : "Hidden by a moderator"}
        </p>
      ) : null}

      <p className="mt-3 whitespace-pre-line text-[1rem] leading-relaxed text-ink-soft">
        {post.body}
      </p>

      {post.prayer_wall_replies.length ? (
        <ul className="mt-5 space-y-3 border-t border-hairline pt-4">
          {post.prayer_wall_replies.map((r) => (
            <li key={r.id} className="border-l-2 border-hairline pl-4">
              <p className="text-[0.8rem] text-ink-mute">
                <span className="label mr-2 text-clay">
                  {r.kind === "prayer" ? "Prayed" : "Message"}
                </span>
                <span className="text-ink">{r.author_name}</span> &middot;{" "}
                {day.format(new Date(r.created_at))}
                {r.hidden_at ? <span className="label ml-2 text-sky">Hidden</span> : null}
              </p>
              <p className="mt-1 whitespace-pre-line text-[0.95rem] leading-relaxed text-ink-soft">
                {r.body}
              </p>
              <div className="mt-1.5 flex gap-4">
                {r.author_id !== userId ? <ReportButton target={`reply:${r.id}`} /> : null}
                {isModerator ? <HideButton target={`reply:${r.id}`} hidden={Boolean(r.hidden_at)} /> : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {!post.hidden_at ? <ReplyForm postId={post.id} /> : null}

      <footer className="mt-4 flex flex-wrap gap-5 border-t border-hairline pt-3">
        {mine ? (
          <form action={deletePrayerPost}>
            <input type="hidden" name="id" value={post.id} />
            <button type="submit" className="label text-ink-mute transition-colors hover:text-sky">
              Delete my request
            </button>
          </form>
        ) : (
          <ReportButton target={`post:${post.id}`} />
        )}
        {isModerator ? <HideButton target={`post:${post.id}`} hidden={Boolean(post.hidden_at)} /> : null}
      </footer>
    </article>
  );
}

function HideButton({ target, hidden }: { target: string; hidden: boolean }) {
  return (
    <form action={setPrayerItemHidden}>
      <input type="hidden" name="target" value={target} />
      <input type="hidden" name="hide" value={hidden ? "0" : "1"} />
      <button type="submit" className="label text-ink-mute transition-colors hover:text-sky">
        {hidden ? "Unhide" : "Hide"}
      </button>
    </form>
  );
}

function Notice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="max-w-2xl border-l-2 border-clay bg-paper-bright p-6">
      <p className="label text-clay">{label}</p>
      <div className="mt-3 space-y-5 text-[1.02rem] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}
