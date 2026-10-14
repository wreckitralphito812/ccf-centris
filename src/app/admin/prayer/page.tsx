import type { Metadata } from "next";
import { AdminHeader, AdminNote } from "../admin-ui";
import { adminDismissPrayerReports, adminSetPrayerHidden } from "@/app/actions/admin-tools";
import { cx } from "@/components/ui";
import { requireAdmin } from "@/lib/admin-auth";
import { fmtDayShort } from "@/lib/format";
import { isTopic, topicLabel } from "@/lib/prayer-wall";
import { getAdminPrayerWall, type AdminPrayerPost, type AdminPrayerReply } from "@/lib/queries";
import { hasSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Prayer Wall" };
export const dynamic = "force-dynamic";

/**
 * The Prayer Wall for staff (2026-10-14). The template's "Prayer requests"
 * and "Pastoral requests" pages showed invented requests; this is the real
 * wall members post to. Staff can hide anything unkind or unsafe, and clear
 * reports that turn out fine. Reported items come first.
 */
export default async function AdminPrayer() {
  const { readOnly: noCode } = await requireAdmin();
  const readOnly = noCode || !hasSupabase();
  const posts = await getAdminPrayerWall();
  const reported = (p: AdminPrayerPost) => p.reports > 0 || p.replies.some((r) => r.reports > 0);
  const sorted = [...posts.filter(reported), ...posts.filter((p) => !reported(p))];
  const nReported = posts.filter(reported).length;

  return (
    <div className="space-y-6">
      <AdminHeader
        title="Prayer Wall"
        lead="What members have posted on the Prayer Wall. If something is unkind or shares too much, hide it: it disappears from the wall, and you can show it again. Reported posts are at the top."
      />
      {!hasSupabase() ? <AdminNote>Not connected to a database.</AdminNote> : null}
      {nReported ? (
        <p className="rounded-xl border border-clay/40 bg-clay/5 px-5 py-3.5 text-[0.95rem] font-semibold text-clay-deep">
          {nReported} {nReported === 1 ? "post was" : "posts were"} reported by members. Read it, then hide it or choose &ldquo;Looks fine&rdquo;.
        </p>
      ) : null}

      {sorted.length ? (
        <ul className="space-y-4">
          {sorted.map((p) => (
            <li key={p.id} className={cx("rounded-xl border bg-paper-bright p-5", p.reports ? "border-clay" : "border-hairline", p.hidden_at && "bg-mist/60")}>
              <Item kind="post" item={p} readOnly={readOnly}>
                <p className="text-[0.85rem] text-ink-mute">
                  <span className="font-semibold text-ink">{p.author_name}</span> · {fmtDayShort(p.created_at)}
                  {p.topic && isTopic(p.topic) ? ` · ${topicLabel(p.topic)}` : ""}
                  {` · prayed for ${p.prayed} ${p.prayed === 1 ? "time" : "times"}`}
                  {p.answered_at ? " · marked answered" : ""}
                </p>
                <p className="mt-2 whitespace-pre-line text-[1rem] leading-relaxed text-ink">{p.body}</p>
              </Item>
              {p.replies.length ? (
                <ul className="mt-4 space-y-3 border-l-2 border-hairline pl-4">
                  {p.replies.map((r) => (
                    <li key={r.id} className={cx(r.hidden_at && "opacity-70")}>
                      <Item kind="reply" item={r} readOnly={readOnly}>
                        <p className="text-[0.82rem] text-ink-mute">
                          <span className="font-semibold text-ink">{r.author_name}</span> · {r.kind === "prayer" ? "prayer" : "message"} ·{" "}
                          {fmtDayShort(r.created_at)}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-[0.95rem] leading-relaxed text-ink-soft">{r.body}</p>
                      </Item>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-xl border border-hairline bg-paper-bright px-5 py-8 text-center text-ink-mute">Nothing on the Prayer Wall right now.</p>
      )}
    </div>
  );
}

/** A post or reply with its hide/show and "Looks fine" buttons. */
function Item({
  kind,
  item,
  readOnly,
  children,
}: {
  kind: "post" | "reply";
  item: AdminPrayerPost | AdminPrayerReply;
  readOnly: boolean;
  children: React.ReactNode;
}) {
  const btn = "btn-press inline-flex min-h-9 items-center rounded-lg border px-3 text-[0.85rem] font-semibold transition-colors";
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        {item.hidden_at || item.reports ? (
          <p className="mb-1.5 flex flex-wrap gap-1.5">
            {item.hidden_at ? (
              <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-[0.78rem] font-semibold text-ink-soft">Hidden from the wall</span>
            ) : null}
            {item.reports ? (
              <span className="rounded-full bg-clay px-2.5 py-0.5 text-[0.78rem] font-semibold text-paper-bright">
                Reported {item.reports === 1 ? "once" : `${item.reports} times`}
              </span>
            ) : null}
          </p>
        ) : null}
        {children}
      </div>
      {readOnly ? null : (
        <div className="flex shrink-0 gap-2">
          {item.reports && !item.hidden_at ? (
            <form action={adminDismissPrayerReports}>
              <input type="hidden" name="kind" value={kind} />
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className={cx(btn, "border-moss text-moss hover:bg-moss hover:text-paper-bright")}>
                Looks fine
              </button>
            </form>
          ) : null}
          <form action={adminSetPrayerHidden}>
            <input type="hidden" name="kind" value={kind} />
            <input type="hidden" name="id" value={item.id} />
            <input type="hidden" name="hide" value={item.hidden_at ? "0" : "1"} />
            <button
              type="submit"
              className={cx(btn, item.hidden_at ? "border-edge text-ink hover:border-clay" : "border-clay/60 text-clay-deep hover:bg-clay hover:text-paper-bright")}
            >
              {item.hidden_at ? "Show again" : "Hide"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
