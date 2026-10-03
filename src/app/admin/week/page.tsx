import type { Metadata } from "next";
import { WeekGrid } from "./grid";
import { getDgroupTableBookings, getReservations, getRoomBlocks } from "@/lib/queries";
import { requireAdmin } from "@/lib/admin-auth";
import { hasSupabase } from "@/lib/supabase/server";
import { manilaDateKey } from "@/lib/format";
import { isDateKey, weekOf } from "@/lib/admin-day";

export const metadata: Metadata = { title: "Week" };
export const dynamic = "force-dynamic";

/**
 * The week at a glance (2026-10-03): every room down the side, Monday to
 * Saturday across, with confirmed bookings, requests awaiting approval and
 * blocks; Dgroup tables summarised per slot on top. A day opens on the Today
 * board, where requests are approved and tables shown on the floor plans.
 */
export default async function AdminWeek({ searchParams }: PageProps<"/admin/week">) {
  await requireAdmin();
  const sp = await searchParams;
  const today = manilaDateKey();
  const days = weekOf(isDateKey(sp.d) ? sp.d : today);
  const from = new Date(`${days[0]}T00:00:00+08:00`);
  const to = new Date(from.getTime() + 7 * 86_400_000);
  const [tables, rooms, blocks] = await Promise.all([
    getDgroupTableBookings(),
    getReservations(),
    getRoomBlocks(from.toISOString(), to.toISOString()),
  ]);
  return <WeekGrid days={days} today={today} tables={tables} rooms={rooms} blocks={blocks} connected={hasSupabase()} />;
}
