"use server";

import { revalidatePath } from "next/cache";

import {
  candidateTables,
  DGROUP_SLOTS,
  manilaMinutes,
  nightLabel,
  parseDgroupBooking,
  tableKey,
  type DgroupFieldErrors,
} from "@/lib/dgroup-tables";
import { manilaDateKey } from "@/lib/format";
import { hasSupabase, SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";
import { currentUser } from "@/lib/supabase/ssr";

export interface DgroupBookingResult {
  ok: boolean;
  fieldErrors?: DgroupFieldErrors;
  formError?: string;
  needsAuth?: boolean;
  booking?: { roomName: string; table: string; seats: number; night: string; slot: string };
}

const GENERIC = "Something went wrong on our end — try again in a moment.";

/**
 * Book a table for a Dgroup. The site assigns the table; the member never
 * picks one: it's the smallest free table that seats the group (see
 * candidateTables). The database allows one confirmed group per table per
 * slot, so if another leader takes a table between our read and our insert,
 * the insert fails and we move on to the next best table.
 *
 * The confirmation is shown on screen. It isn't emailed yet: there's no mail
 * service until the site has its own domain.
 */
export async function reserveDgroupTable(
  _prev: DgroupBookingResult | null,
  formData: FormData,
): Promise<DgroupBookingResult> {
  if (!hasSupabase()) {
    return { ok: false, formError: "Table reservations aren't switched on yet." };
  }
  const user = await currentUser();
  if (!user) return { ok: false, needsAuth: true, formError: "Sign in to reserve a table." };

  const parsed = parseDgroupBooking(formData, manilaDateKey(), manilaMinutes());
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };
  const b = parsed.value;
  const slot = DGROUP_SLOTS.find((s) => s.id === b.slotId)?.label ?? b.slotId;
  const db = supabaseAdmin();

  const { data: booked, error: readError } = await db
    .from("dgroup_table_bookings")
    .select("room_slug, table_label")
    .eq("satellite_id", SATELLITE_ID)
    .eq("booked_on", b.date)
    .eq("slot_id", b.slotId)
    .eq("status", "confirmed");
  if (readError) {
    console.error("reserveDgroupTable: read failed", readError);
    return { ok: false, formError: GENERIC };
  }

  const taken = new Set(
    ((booked ?? []) as { room_slug: string; table_label: string }[]).map((r) =>
      tableKey(r.room_slug, r.table_label),
    ),
  );

  for (const table of candidateTables(b.groupSize, b.room, taken)) {
    const { error } = await db.from("dgroup_table_bookings").insert({
      satellite_id: SATELLITE_ID,
      user_id: user.id,
      room_slug: table.roomSlug,
      table_label: table.label,
      table_seats: table.seats,
      booked_on: b.date,
      slot_id: b.slotId,
      leader_name: b.leaderName,
      contact_mobile: b.contactMobile,
      group_size: b.groupSize,
      agreed_rules_at: new Date().toISOString(),
    });

    if (!error) {
      revalidatePath("/reserve/dgroup");
      return {
        ok: true,
        booking: {
          roomName: table.roomName,
          table: table.label,
          seats: table.seats,
          night: nightLabel(b.date),
          slot,
        },
      };
    }
    if (error.code === "23505" && `${error.message} ${error.details ?? ""}`.includes("one_per_member")) {
      return {
        ok: false,
        formError:
          "You already have a table for that night and time. Cancel it below to book a different one.",
      };
    }
    if (error.code !== "23505") {
      console.error("reserveDgroupTable: insert failed", error);
      return { ok: false, formError: GENERIC };
    }
    // Another leader took this table a moment ago. Try the next best one.
  }

  return {
    ok: false,
    formError: `No free table seats ${b.groupSize} for that night and time. Try another night or slot${
      b.room === "either" ? "" : ", or choose either room"
    }.`,
  };
}

export async function cancelDgroupBooking(formData: FormData): Promise<void> {
  if (!hasSupabase()) return;
  const user = await currentUser();
  if (!user) return;
  const { error } = await supabaseAdmin()
    .from("dgroup_table_bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", String(formData.get("id") ?? ""))
    .eq("user_id", user.id)
    .eq("status", "confirmed");
  if (error) console.error("cancelDgroupBooking failed", error);
  revalidatePath("/reserve/dgroup");
}
