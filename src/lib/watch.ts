import "server-only";

import { getLatestReplay, type Replay } from "@/lib/ccf-net";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase/server";
import { replayLabelDate } from "@/lib/watch-shared";

/**
 * What the Watch page shows, and the library of past Sundays behind it.
 *
 * By default the site follows CCF Net: whatever replay ccfnet.online.church is
 * showing (see lib/ccf-net). Each one it finds is saved to watch_replays, so
 * past Sundays stay watchable after CCF Net moves on; their videos are
 * unlisted and can't be found on YouTube. An admin can pin any video to
 * override this, fix a title, or hide a replay (see /admin/watch).
 */

export interface ReplayRow {
  video_id: string;
  title: string;
  speaker: string | null;
  service_date: string | null;
  source: "ccfnet" | "manual";
  hidden: boolean;
  pinned: boolean;
  first_seen_at: string;
}

export type ReplaySource = "pinned" | "ccfnet" | "archive";

export function rowToReplay(r: ReplayRow): Replay {
  return {
    videoId: r.video_id,
    title: r.title,
    speaker: r.speaker,
    date: r.service_date,
    dateLabel: r.service_date ? replayLabelDate(r.service_date) : null,
  };
}

const COLUMNS = "video_id, title, speaker, service_date, source, hidden, pinned, first_seen_at";

/** The replay to feature, and where it came from. Never throws. */
export async function getWatchReplay(): Promise<{ replay: Replay | null; source: ReplaySource | null }> {
  const live = await getLatestReplay();
  if (!hasSupabase()) return { replay: live, source: live ? "ccfnet" : null };

  try {
    const db = supabaseAdmin();
    if (live) {
      // Save it the first time we see it. Existing rows keep any admin edits.
      await db.from("watch_replays").upsert(
        {
          video_id: live.videoId,
          title: live.title,
          speaker: live.speaker,
          service_date: live.date,
          source: "ccfnet",
        },
        { onConflict: "video_id", ignoreDuplicates: true },
      );
    }

    const { data: pinned } = await db.from("watch_replays").select(COLUMNS).eq("pinned", true).maybeSingle();
    if (pinned) return { replay: rowToReplay(pinned as ReplayRow), source: "pinned" };

    if (live) {
      const { data: row } = await db.from("watch_replays").select(COLUMNS).eq("video_id", live.videoId).maybeSingle();
      if (row && !(row as ReplayRow).hidden) return { replay: rowToReplay(row as ReplayRow), source: "ccfnet" };
    }

    const [latest] = await getPastReplays(null, 1);
    return latest ? { replay: latest, source: "archive" } : { replay: null, source: null };
  } catch (e) {
    console.error("getWatchReplay: library unavailable", e);
    return { replay: live, source: live ? "ccfnet" : null };
  }
}

/** Past Sundays, newest first, leaving out hidden ones and `exclude`. */
export async function getPastReplays(exclude: string | null, limit = 12): Promise<Replay[]> {
  if (!hasSupabase()) return [];
  let q = supabaseAdmin()
    .from("watch_replays")
    .select(COLUMNS)
    .eq("hidden", false)
    .order("service_date", { ascending: false, nullsFirst: false })
    .order("first_seen_at", { ascending: false })
    .limit(limit);
  if (exclude) q = q.neq("video_id", exclude);
  const { data, error } = await q;
  if (error) {
    console.error("getPastReplays failed", error);
    return [];
  }
  return ((data ?? []) as ReplayRow[]).map(rowToReplay);
}

/** Everything in the library, for the admin page. */
export async function getReplayLibrary(): Promise<ReplayRow[]> {
  if (!hasSupabase()) return [];
  const { data, error } = await supabaseAdmin()
    .from("watch_replays")
    .select(COLUMNS)
    .order("pinned", { ascending: false })
    .order("service_date", { ascending: false, nullsFirst: false })
    .order("first_seen_at", { ascending: false });
  if (error) {
    console.error("getReplayLibrary failed", error);
    return [];
  }
  return (data ?? []) as ReplayRow[];
}
