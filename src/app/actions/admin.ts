"use server";

import { bookingEmail } from "@/lib/emails/dgroup-booking";
import { roomRequestEmail } from "@/lib/emails/room-request";
import { referenceFor } from "@/lib/reference";
import { fmtDayLong, fmtTime } from "@/lib/format";
import { sendEmail, siteOrigin } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { hasSupabase, SATELLITE_ID, supabaseAdmin } from "@/lib/supabase/server";
import { describeChanges, EDIT_ROOMS, parseRoomEdit, type RoomRequestDetails } from "@/lib/room-edit";
import { ADMIN_COOKIE, hashCode, isAdmin, isAdminConfigured } from "@/lib/admin-auth";

export interface AdminActionResult {
  ok: boolean;
  formError?: string;
}

const RESERVATION_STATUSES = [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "completed",
] as const;
const INQUIRY_STATUSES = [
  "new",
  "contacted",
  "joined",
  "declined",
  "closed",
] as const;
const APPLICATION_STATUSES = [
  "submitted",
  "reviewing",
  "accepted",
  "declined",
] as const;
/** Dgroup table booking statuses; bookings confirm at once since 0008. */
type DgroupTableStatus = "pending" | "confirmed" | "declined" | "cancelled";

type Enum<T extends readonly string[]> = T[number];

async function guard(): Promise<AdminActionResult | null> {
  if (!isAdminConfigured())
    return { ok: false, formError: "Admin is read-only: no access code configured." };
  if (!(await isAdmin())) return { ok: false, formError: "Not signed in." };
  if (!hasSupabase())
    return { ok: false, formError: "Not connected to the database." };
  return null;
}

async function setStatus(
  table: string,
  id: string,
  status: string,
  allowed: readonly string[],
  path: string,
): Promise<AdminActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  if (!allowed.includes(status))
    return { ok: false, formError: "Unknown status." };

  const { error } = await supabaseAdmin()
    .from(table)
    .update({ status })
    .eq("id", id);

  if (error) {
    console.error(`setStatus(${table}) failed`, error);
    return { ok: false, formError: "Update failed — try again." };
  }
  revalidatePath(path);
  return { ok: true };
}

/**
 * Decide a room request. Every room in the request moves together, and the
 * requester is emailed when it's approved, declined or cancelled.
 */
export async function setReservationStatus(
  id: string,
  status: Enum<typeof RESERVATION_STATUSES>,
): Promise<AdminActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  if (!RESERVATION_STATUSES.includes(status)) return { ok: false, formError: "Unknown status." };

  const db = supabaseAdmin();
  const { data: row, error: readErr } = await db
    .from("reservations")
    .select("request_group")
    .eq("id", id)
    .maybeSingle();
  if (readErr || !row) return { ok: false, formError: "That request could not be found." };

  const query = db.from("reservations").update({ status });
  const { data: rows, error } = await (row.request_group ? query.eq("request_group", row.request_group) : query.eq("id", id))
    .select(
      "contact_name, contact_email, contact_mobile, organization, activity_name, participants, during, layout, tables, equipment, food, purpose, facilities(name)",
    );

  if (error) {
    if (error.code === "23P01")
      return { ok: false, formError: "Another request now holds one of these rooms at that time." };
    console.error("setReservationStatus failed", error);
    return { ok: false, formError: "Update failed. Try again." };
  }

  const first = rows?.[0];
  if (first && (status === "approved" || status === "rejected" || status === "cancelled")) {
    const m = /[[(]"?([^",]+)"?,\s*"?([^")]+)"?[)\]]/.exec(first.during as string);
    const startsAt = m ? new Date(m[1]).toISOString() : "";
    const endsAt = m ? new Date(m[2]).toISOString() : "";
    const facilityName = (f: unknown) => (Array.isArray(f) ? f[0]?.name : (f as { name?: string } | null)?.name) ?? "Room";
    await sendEmail({
      to: first.contact_email as string,
      ...roomRequestEmail({
        kind: status,
        origin: siteOrigin(),
        reference: referenceFor("reservation", (row.request_group as string | null) ?? id),
        requester: first.contact_name as string,
        requesterEmail: first.contact_email as string,
        mobile: (first.contact_mobile as string | null) ?? null,
        activity: (first.activity_name as string | null) ?? "Your event",
        ministry: (first.organization as string | null) ?? "",
        rooms: rows!.map((r) => facilityName(r.facilities)),
        when: m ? `${fmtDayLong(startsAt)}, ${fmtTime(startsAt)} to ${fmtTime(endsAt)}` : "",
        participants: first.participants as number,
        setup: (first.layout as string | null) ?? null,
        tables: (first.tables as Record<string, number> | null) ?? null,
        equipment: (first.equipment as Record<string, number> | null) ?? null,
        food: (first.food as string | null) ?? null,
        notes: (first.purpose as string | null) ?? null,
        span: m ? { startsAt, endsAt } : undefined,
      }),
    });
  }

  revalidatePath("/admin/reservations");
  revalidatePath("/admin/today");
  revalidatePath("/admin/week");
  revalidatePath("/admin/bookings");
  revalidatePath("/my/reservations");
  revalidatePath("/centris/reserve");
  return { ok: true };
}

export async function setInquiryStatus(
  id: string,
  status: Enum<typeof INQUIRY_STATUSES>,
) {
  return setStatus(
    "dgroup_inquiries",
    id,
    status,
    INQUIRY_STATUSES,
    "/admin/dgroups",
  );
}

export async function setApplicationStatus(
  id: string,
  status: Enum<typeof APPLICATION_STATUSES>,
) {
  return setStatus(
    "volunteer_applications",
    id,
    status,
    APPLICATION_STATUSES,
    "/admin/volunteers",
  );
}

/**
 * Cancel a Dgroup table booking from the admin list, e.g. a no-show or a
 * booking that breaks the policies. Its tables are released at once (a trigger
 * deletes the holds) and the leader is emailed that it was cancelled.
 */
export async function setDgroupTableStatus(
  id: string,
  status: DgroupTableStatus,
): Promise<AdminActionResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  if (status !== "cancelled") return { ok: false, formError: "Bookings can only be cancelled here." };

  const { data, error } = await supabaseAdmin()
    .from("dgroup_table_bookings")
    .update({ status, decided_at: new Date().toISOString(), cancelled_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["pending", "confirmed"])
    .select("leader_name, leader_email, room_slug, table_labels, booked_on, slot_id, group_size")
    .maybeSingle();

  if (error) {
    console.error("setDgroupTableStatus failed", error);
    return { ok: false, formError: "Update failed. Try again." };
  }
  if (data?.leader_email) {
    await sendEmail({
      to: data.leader_email as string,
      ...bookingEmail({
        kind: "cancelled",
        origin: siteOrigin(),
        leaderName: data.leader_name as string,
        roomSlug: data.room_slug as string,
        labels: data.table_labels as string[],
        date: data.booked_on as string,
        slotId: data.slot_id as string,
        groupSize: data.group_size as number,
      }),
    });
  }
  revalidatePath("/admin/dgroup-tables");
  revalidatePath("/admin/today");
  revalidatePath("/admin/week");
  revalidatePath("/admin/bookings");
  revalidatePath("/reserve/dgroup");
  return { ok: true };
}

// --- Session ------------------------------------------------------------

export async function adminLogin(
  _prev: AdminActionResult | null,
  formData: FormData,
): Promise<AdminActionResult> {
  const code = process.env.ADMIN_ACCESS_CODE;
  if (!code)
    return { ok: false, formError: "No access code is configured for this site." };

  const entered = String(formData.get("code") ?? "");
  if (entered !== code) return { ok: false, formError: "That code is not right." };

  const jar = await cookies();
  jar.set(ADMIN_COOKIE, hashCode(code), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
  redirect("/admin");
}

export async function adminLogout(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin");
}


export interface RoomEditResult {
  ok: boolean;
  formError?: string;
  /** What changed, so the page can say so; empty when nothing did. */
  changes?: string[];
  emailed?: boolean;
  /** The row the page should show now: rooms taken out of a request take their rows with them. */
  id?: string;
}

const H8 = 8 * 3_600_000;
const manilaKey = (iso: string) => new Date(new Date(iso).getTime() + H8).toISOString().slice(0, 10);
const manilaHHMM = (iso: string) => new Date(new Date(iso).getTime() + H8).toISOString().slice(11, 16);
const rangeOf = (during: string): [string, string] | null => {
  const m = /[[(]"?([^",]+)"?,\s*"?([^")]+)"?[)\]]/.exec(during);
  return m ? [new Date(m[1]).toISOString(), new Date(m[2]).toISOString()] : null;
};

/**
 * Change a room request, waiting or approved (Adrian, 2026-10-16): its rooms,
 * day and time, and every detail the ministry gave. All its rooms change
 * together. The rows are replaced in one insert, so a room that's taken then
 * fails the whole change, and the request is put back exactly as it was. The
 * requester is emailed what changed unless the admin unticks it.
 */
export async function adminUpdateRoomRequest(_prev: RoomEditResult | null, fd: FormData): Promise<RoomEditResult> {
  const blocked = await guard();
  if (blocked) return blocked;
  const id = String(fd.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, formError: "That request could not be found." };

  const parsed = parseRoomEdit(fd);
  if (!parsed.ok) return { ok: false, formError: parsed.error };
  const next = parsed.value;

  const db = supabaseAdmin();
  const { data: anchor } = await db.from("reservations").select("request_group").eq("id", id).eq("satellite_id", SATELLITE_ID).maybeSingle();
  if (!anchor) return { ok: false, formError: "That request could not be found." };
  const group = anchor.request_group as string | null;
  const sel = db.from("reservations").select("*, facilities(slug, name)").eq("satellite_id", SATELLITE_ID);
  const { data: rows, error: readErr } = await (group ? sel.eq("request_group", group) : sel.eq("id", id)).order("created_at");
  if (readErr || !rows?.length) return { ok: false, formError: "That request could not be found." };
  const status = rows[0].status as string;
  if (status !== "pending" && status !== "approved")
    return { ok: false, formError: "Only requests that are waiting or approved can be changed." };

  // The request as it was, in the edit form's terms.
  const span = rangeOf(rows[0].during as string);
  if (!span) return { ok: false, formError: "That request's time can't be read." };
  const slugOf = (f: unknown) => ((Array.isArray(f) ? f[0] : f) as { slug?: string } | null)?.slug ?? "";
  const before: RoomRequestDetails = {
    rooms: rows.map((r) => slugOf(r.facilities)).filter(Boolean),
    date: manilaKey(span[0]),
    start: manilaHHMM(span[0]),
    end: manilaHHMM(span[1]),
    activity_name: (rows[0].activity_name as string | null) ?? "",
    organization: (rows[0].organization as string | null) ?? "",
    participants: rows[0].participants as number,
    layout: (rows[0].layout as string | null) ?? "",
    tables: (rows[0].tables as RoomRequestDetails["tables"]) ?? {},
    equipment: (rows[0].equipment as Record<string, number> | null) ?? {},
    food: (rows[0].food as string | null) ?? "",
    purpose: (rows[0].purpose as string | null) ?? "",
    contact_name: rows[0].contact_name as string,
    contact_email: rows[0].contact_email as string,
    contact_mobile: (rows[0].contact_mobile as string | null) ?? "",
  };
  const changes = describeChanges(before, next);
  if (!changes.length) return { ok: true, changes: [] };

  const { data: facilities } = await db.from("facilities").select("id, slug").eq("satellite_id", SATELLITE_ID).in("slug", next.rooms);
  const facilityId = (slug: string) => facilities?.find((f) => f.slug === slug)?.id as string | undefined;
  const missing = next.rooms.find((r) => !facilityId(r));
  if (missing) return { ok: false, formError: `${EDIT_ROOMS.find((r) => r.slug === missing)?.name ?? missing} isn't set up for bookings yet.` };

  const startsAt = new Date(`${next.date}T${next.start}:00+08:00`).toISOString();
  const endsAt = new Date(`${next.date}T${next.end}:00+08:00`).toISOString();
  const during = `[${startsAt},${endsAt})`;

  // A room closed by the team (Close a room or table) can't be booked over.
  const { data: closures } = await db
    .from("facility_blackouts")
    .select("reason, facilities(slug)")
    .in("facility_id", next.rooms.map((r) => facilityId(r)!))
    .is("court_id", null)
    .overlaps("during", during);
  if (closures?.length) {
    const name = EDIT_ROOMS.find((r) => r.slug === slugOf(closures[0].facilities))?.name ?? "A room";
    return { ok: false, formError: `${name} is closed then${closures[0].reason ? ` (${closures[0].reason})` : ""}. Reopen it on "Close a room or table" first, or pick another room or time.` };
  }

  const groupKey = group ?? (next.rooms.length > 1 ? (rows[0].id as string) : null);
  const snapshot = rows.map((r) => {
    const copy = { ...r };
    delete (copy as Record<string, unknown>).facilities;
    return copy;
  });
  const replacement = next.rooms.map((slug, i) => {
    // A room added to the request gets its own row and id: one insert sends
    // every row with the same columns, so a missing id would go in as null.
    const base = { ...(snapshot[i] ?? snapshot[0]), ...(snapshot[i] ? {} : { id: crypto.randomUUID() }) } as Record<string, unknown>;
    return {
      ...base,
      facility_id: facilityId(slug),
      during,
      request_group: groupKey,
      activity_name: next.activity_name,
      organization: next.organization || null,
      participants: next.participants,
      layout: next.layout || null,
      tables: next.layout === "tables" ? next.tables : {},
      equipment: next.equipment,
      food: next.food || null,
      purpose: next.purpose || null,
      contact_name: next.contact_name,
      contact_email: next.contact_email,
      contact_mobile: next.contact_mobile || null,
    };
  });

  const ids = snapshot.map((r) => r.id as string);
  const { error: delErr } = await db.from("reservations").delete().in("id", ids);
  if (delErr) {
    console.error("adminUpdateRoomRequest delete failed", delErr);
    return { ok: false, formError: "Couldn't save the change. Nothing was changed; try again." };
  }
  const { error: insErr } = await db.from("reservations").insert(replacement);
  if (insErr) {
    const { error: restoreErr } = await db.from("reservations").insert(snapshot);
    if (restoreErr) console.error("adminUpdateRoomRequest restore FAILED", restoreErr, JSON.stringify(snapshot));
    if (insErr.code === "23P01")
      return { ok: false, formError: "One of those rooms is already booked at that time. Nothing was changed; pick another room or time." };
    console.error("adminUpdateRoomRequest insert failed", insErr);
    return { ok: false, formError: "Couldn't save the change. Nothing was changed; try again." };
  }

  let emailed = false;
  if (fd.get("notify") === "1") {
    const names = next.rooms.map((r) => EDIT_ROOMS.find((x) => x.slug === r)?.name ?? r);
    const res = await sendEmail({
      to: next.contact_email,
      ...roomRequestEmail({
        kind: "updated",
        confirmed: status === "approved",
        changes,
        origin: siteOrigin(),
        reference: referenceFor("reservation", groupKey ?? id),
        requester: next.contact_name,
        requesterEmail: next.contact_email,
        mobile: next.contact_mobile || null,
        activity: next.activity_name,
        ministry: next.organization,
        rooms: names,
        when: `${fmtDayLong(startsAt)}, ${fmtTime(startsAt)} to ${fmtTime(endsAt)}`,
        participants: next.participants,
        setup: next.layout || null,
        tables: next.tables,
        equipment: next.equipment,
        food: next.food || null,
        notes: next.purpose || null,
        span: { startsAt, endsAt },
      }),
    });
    emailed = res.ok;
  }

  for (const p of ["/admin/reservations", "/admin/today", "/admin/week", "/admin/rooms", "/admin/bookings", "/admin", "/my/reservations", "/centris/reserve"]) revalidatePath(p);
  revalidatePath(`/admin/reservations/${id}`);
  return { ok: true, changes, emailed, id: snapshot[0].id as string };
}
