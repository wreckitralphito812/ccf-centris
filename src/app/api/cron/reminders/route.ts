import { NextResponse } from "next/server";
import { hasSupabase, SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";
import { sendEmail, siteOrigin } from "@/lib/email";
import { bookingEmail } from "@/lib/emails/dgroup-booking";
import { roomRequestEmail } from "@/lib/emails/room-request";
import { manilaDayRange, manilaTomorrow } from "@/lib/reminders";
import { referenceFor } from "@/lib/reference";
import { fmtDayLong, fmtTime } from "@/lib/format";

/**
 * Day-before reminders (2026-09-30). Vercel Cron calls this once a day (see
 * vercel.json) with `Authorization: Bearer $CRON_SECRET`. It emails every
 * confirmed Dgroup table and approved room booked for tomorrow in Manila, and
 * stamps reminder_sent_at after each successful send, so a rerun never sends
 * the same reminder twice. With CRON_SECRET unset it refuses every call.
 */
export const dynamic = "force-dynamic";

const facilityName = (f: unknown) =>
  (Array.isArray(f) ? f[0]?.name : (f as { name?: string } | null)?.name) ?? "Room";

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  }
  if (!hasSupabase()) return NextResponse.json({ tables: 0, rooms: 0 });

  const db = supabaseAdmin();
  const date = manilaTomorrow();
  const origin = siteOrigin();
  const stamp = () => new Date().toISOString();
  let tables = 0;
  let rooms = 0;

  // Dgroup tables.
  const { data: due, error: tablesError } = await db
    .from("dgroup_table_bookings")
    .select("id, leader_name, leader_email, room_slug, table_labels, booked_on, slot_id, group_size")
    .eq("satellite_id", SATELLITE_ID)
    .eq("booked_on", date)
    .eq("status", "confirmed")
    .is("reminder_sent_at", null);
  if (tablesError) console.error("reminders: tables read failed", tablesError);
  for (const b of due ?? []) {
    if (!b.leader_email) continue;
    const mail = bookingEmail({
      kind: "reminder",
      origin,
      leaderName: b.leader_name as string,
      roomSlug: b.room_slug as string,
      labels: b.table_labels as string[],
      date: b.booked_on as string,
      slotId: b.slot_id as string,
      groupSize: b.group_size as number,
    });
    if ((await sendEmail({ to: b.leader_email as string, ...mail })).ok) {
      await db.from("dgroup_table_bookings").update({ reminder_sent_at: stamp() }).eq("id", b.id);
      tables++;
    }
  }

  // Rooms: one email per request, listing all its rooms.
  const { from, to } = manilaDayRange(date);
  const { data: held, error: roomsError } = await db
    .from("reservations")
    .select(
      "id, request_group, contact_name, contact_email, contact_mobile, organization, activity_name, participants, during, layout, equipment, food, purpose, facilities(name)",
    )
    .eq("satellite_id", SATELLITE_ID)
    .eq("status", "approved")
    .is("court_id", null)
    .is("reminder_sent_at", null)
    .overlaps("during", `[${from},${to})`);
  if (roomsError) console.error("reminders: rooms read failed", roomsError);
  const groups = new Map<string, NonNullable<typeof held>>();
  for (const r of held ?? []) {
    const key = (r.request_group as string | null) ?? (r.id as string);
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  for (const [key, rows] of groups) {
    const first = rows[0];
    const m = /[[(]"?([^",]+)"?,\s*"?([^")]+)"?[)\]]/.exec(first.during as string);
    if (!m || !first.contact_email) continue;
    const startsAt = new Date(m[1]).toISOString();
    const endsAt = new Date(m[2]).toISOString();
    // Only bookings that start tomorrow, not ones running over from today.
    if (startsAt < from || startsAt >= to) continue;
    const mail = roomRequestEmail({
      kind: "reminder",
      origin,
      reference: referenceFor("reservation", key),
      requester: first.contact_name as string,
      requesterEmail: first.contact_email as string,
      mobile: (first.contact_mobile as string | null) ?? null,
      activity: (first.activity_name as string | null) ?? "Your event",
      ministry: (first.organization as string | null) ?? "",
      rooms: rows.map((r) => facilityName(r.facilities)),
      when: `${fmtDayLong(startsAt)}, ${fmtTime(startsAt)} to ${fmtTime(endsAt)}`,
      participants: first.participants as number,
      setup: (first.layout as string | null) ?? null,
      equipment: (first.equipment as Record<string, number> | null) ?? null,
      food: (first.food as string | null) ?? null,
      notes: (first.purpose as string | null) ?? null,
      span: { startsAt, endsAt },
    });
    if ((await sendEmail({ to: first.contact_email as string, ...mail })).ok) {
      await db
        .from("reservations")
        .update({ reminder_sent_at: stamp() })
        .in(
          "id",
          rows.map((r) => r.id as string),
        );
      rooms++;
    }
  }

  return NextResponse.json({ date, tables, rooms });
}
