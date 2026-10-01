import { connection } from "next/server";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { ButtonLink, Container, Section } from "@/components/ui";
import { currentUser, hasAccounts, memberHasRole } from "@/lib/auth/session";
import { getMemberProfile } from "@/lib/auth/profile";
import {
  isTopic,
  MODERATOR_ROLES,
  openRequests,
  suggestScreenName,
  timeAgo,
  visibleReplies,
} from "@/lib/prayer-wall";
import { SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";
import { PrayerWall, type WallPost } from "./wall";

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
  topic: string | null;
  answered_at: string | null;
  prayer_wall_replies: Reply[];
  prayer_wall_prayers: { count: number }[];
}

/**
 * The Prayer Wall. Members only: signed-out visitors see an explanation and a
 * sign-in button, never the requests. Reads run with the service role, so the
 * visibility rules below (the same ones as the database policies in
 * 0005_screen_names_and_prayer_wall.sql) are what decide what appears.
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
  if (!hasAccounts()) {
    return (
      <Notice label="Opening soon">
        <p>The Prayer Wall opens when member accounts go live.</p>
      </Notice>
    );
  }

  const user = await currentUser();

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

  const profile = await getMemberProfile(user.id);
  const screenName = profile?.screen_name ?? null;
  const isModerator = await memberHasRole(user.id, SATELLITE_ID, MODERATOR_ROLES);

  let query = supabaseAdmin()
    .from("prayer_wall_posts")
    .select(
      "id, author_id, author_name, body, created_at, expires_at, hidden_at, topic, answered_at, prayer_wall_replies(id, author_id, author_name, kind, body, created_at, hidden_at), prayer_wall_prayers(count)",
    )
    .eq("satellite_id", SATELLITE_ID);
  // Members see open requests plus their own; moderators see everything.
  if (!isModerator) {
    query = query.or(
      `and(hidden_at.is.null,expires_at.gt."${new Date().toISOString()}"),author_id.eq.${user.id}`,
    );
  }
  const [{ data, error }, { data: prayedRows }] = await Promise.all([
    query
      .order("created_at", { ascending: false })
      .order("created_at", { referencedTable: "prayer_wall_replies", ascending: true })
      .limit(60),
    supabaseAdmin().from("prayer_wall_prayers").select("post_id").eq("member_id", user.id),
  ]);

  if (error) {
    console.error("prayer wall read failed", error);
    return (
      <Notice label="Couldn’t load the wall">
        <p>Try again in a moment.</p>
      </Notice>
    );
  }

  const prayed = new Set((prayedRows ?? []).map((r) => r.post_id as string));
  const now = new Date();
  const posts: WallPost[] = openRequests((data ?? []) as Post[], now).map((p) => ({
    id: p.id,
    authorName: p.author_name,
    mine: p.author_id === user.id,
    body: p.body,
    topic: isTopic(p.topic) ? p.topic : null,
    answered: Boolean(p.answered_at),
    when: timeAgo(p.created_at, now),
    hidden: Boolean(p.hidden_at),
    prayed: p.prayer_wall_prayers?.[0]?.count ?? 0,
    prayedByMe: prayed.has(p.id),
    replies: visibleReplies(p.prayer_wall_replies ?? [], user.id, isModerator).map((r) => ({
      id: r.id,
      authorName: r.author_name,
      mine: r.author_id === user.id,
      kind: r.kind,
      body: r.body,
      when: timeAgo(r.created_at, now),
      hidden: Boolean(r.hidden_at),
    })),
  }));

  return (
    <PrayerWall
      posts={posts}
      screenName={screenName}
      suggestion={screenName ?? suggestScreenName(profile?.first_name ?? null, profile?.last_name ?? null)}
      isModerator={isModerator}
    />
  );
}

function Notice({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="calm-card mx-auto max-w-2xl p-7 sm:p-9">
      <p className="text-[0.95rem] font-semibold text-clay">{label}</p>
      <div className="mt-3 space-y-5 text-[1.02rem] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}
