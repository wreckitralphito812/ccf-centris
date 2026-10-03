import type { Metadata } from "next";
import { TodayBoard } from "./board";
import { getDgroupTableBookings, getReservations } from "@/lib/queries";
import { hasSupabase } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin-auth";
import { manilaDateKey } from "@/lib/format";
import { isDateKey } from "@/lib/admin-day";

export const metadata: Metadata = { title: "Today" };
export const dynamic = "force-dynamic";

/**
 * The Today board (2026-10-03): one day of bookings for the facilities team.
 * Dgroup tables on each room's floor plan, slot by slot, and room requests as
 * blocks on each room's timeline. Printable as a day sheet for the front desk.
 * Ralph asked for the reservations admin to be genuinely useful on the day.
 */
export default async function AdminToday({ searchParams }: PageProps<"/admin/today">) {
  const { readOnly } = await requireAdmin();
  const sp = await searchParams;
  const today = manilaDateKey();
  const date = isDateKey(sp.d) ? sp.d : today;
  const [tables, rooms] = await Promise.all([getDgroupTableBookings(), getReservations()]);
  return (
    <TodayBoard
      date={date}
      today={today}
      tables={tables}
      rooms={rooms}
      readOnly={readOnly || !hasSupabase()}
      connected={hasSupabase()}
    />
  );
}
