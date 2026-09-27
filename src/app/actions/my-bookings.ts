"use server";

import { revalidatePath } from "next/cache";

import { currentUser } from "@/lib/auth/session";
import { hasSupabase, supabaseAdmin } from "@/lib/supabase/server";

export interface CancelResult {
  ok: boolean;
  formError?: string;
}

/**
 * Cancel one of the caller's own reservations. The `user_id` filter is what
 * enforces ownership (this runs with the service role): a guessed id for
 * someone else's booking matches nothing.
 */
export async function cancelMyBooking(id: string): Promise<CancelResult> {
  if (!hasSupabase()) {
    return { ok: false, formError: "Not available in this environment." };
  }

  const user = await currentUser();
  if (!user) return { ok: false, formError: "Please sign in again." };

  // Only pending or approved bookings can be cancelled by the member.
  const { data, error } = await supabaseAdmin()
    .from("reservations")
    .update({ status: "cancelled" })
    .eq("id", id)
    .eq("user_id", user.id)
    .in("status", ["pending", "approved"])
    .select("id");

  if (error) {
    console.error("cancelMyBooking failed", error);
    return { ok: false, formError: "Could not cancel. Try again in a moment." };
  }
  if (!data || data.length === 0) {
    return { ok: false, formError: "That booking can no longer be cancelled here." };
  }

  revalidatePath("/my/reservations");
  revalidatePath("/centris/reserve");
  revalidatePath("/centris/availability");
  revalidatePath("/admin/reservations");
  return { ok: true };
}
