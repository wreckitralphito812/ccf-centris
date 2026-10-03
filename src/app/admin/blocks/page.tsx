import type { Metadata } from "next";
import { AdminHeader, AdminNote, AdminPanel } from "../admin-ui";
import { RoomBlockForm, TableBlockForm } from "./block-forms";
import { removeRoomBlock, removeTableBlock } from "@/app/actions/admin-tools";
import { getRoomBlocks, getTableBlocks } from "@/lib/queries";
import { describeBlock } from "@/lib/dgroup-blocks";
import { nightLabel, roomName, slotLabel } from "@/lib/dgroup-tables";
import { manilaDateKey } from "@/lib/format";
import { manilaMinutesOf, manilaDay } from "@/lib/admin-day";
import { timeLabel } from "@/lib/ministry-rooms";
import { hasSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";

export const metadata: Metadata = { title: "Blocks" };
export const dynamic = "force-dynamic";

/**
 * Take tables or rooms out of booking (2026-10-03): repairs, a church-wide
 * event, a leaders' meeting. Members see them as taken; existing bookings are
 * kept and listed when a new block overlaps them.
 */
export default async function AdminBlocks() {
  const { readOnly } = await requireAdmin();
  const today = manilaDateKey();
  const from = new Date(`${today}T00:00:00+08:00`);
  const until = new Date(from.getTime() + 180 * 86_400_000);
  const [tableBlocks, roomBlocks] = await Promise.all([
    getTableBlocks({ from: today }),
    getRoomBlocks(from.toISOString(), until.toISOString()),
  ]);

  const removeBtn = "label text-ink-mute transition-colors hover:text-sky disabled:opacity-50";

  return (
    <div className="space-y-8">
      <AdminHeader
        title="Blocks"
        lead="Take Dgroup tables or rooms out of booking. Members see them as taken. Bookings already made are kept; you'll be told if a block overlaps one."
      />

      {!hasSupabase() || readOnly ? (
        <AdminNote>
          {hasSupabase() ? "Sign in with the admin code to add or remove blocks." : "Not connected to a database."}
        </AdminNote>
      ) : null}

      <AdminPanel title="Block Dgroup tables">
        <TableBlockForm today={today} />
      </AdminPanel>

      <AdminPanel title="Block a room">
        <RoomBlockForm today={today} />
      </AdminPanel>

      <AdminPanel title="Coming up">
        {tableBlocks.length + roomBlocks.length === 0 ? (
          <p className="px-5 py-8 text-center text-[0.9rem] text-ink-mute">Nothing blocked.</p>
        ) : (
          <ul className="divide-y divide-rule">
            {tableBlocks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-[0.92rem]">
                <span>
                  <span className="font-semibold text-ink">{nightLabel(b.booked_on)}</span>
                  <span className="text-ink-soft"> · {describeBlock(b, roomName, slotLabel)}</span>
                  {b.reason ? <span className="text-ink-mute"> · {b.reason}</span> : null}
                </span>
                <form action={removeTableBlock}>
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className={removeBtn} disabled={readOnly}>
                    Remove
                  </button>
                </form>
              </li>
            ))}
            {roomBlocks.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 text-[0.92rem]">
                <span>
                  <span className="font-semibold text-ink">{nightLabel(manilaDay(b.starts_at))}</span>
                  <span className="text-ink-soft">
                    {" "}
                    · {b.facility_name} · {timeLabel(manilaMinutesOf(b.starts_at))} – {timeLabel(manilaMinutesOf(b.ends_at))}
                  </span>
                  {b.reason ? <span className="text-ink-mute"> · {b.reason}</span> : null}
                </span>
                <form action={removeRoomBlock}>
                  <input type="hidden" name="id" value={b.id} />
                  <button type="submit" className={removeBtn} disabled={readOnly}>
                    Remove
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </AdminPanel>
    </div>
  );
}
