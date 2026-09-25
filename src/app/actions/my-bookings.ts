"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServer } from "@/lib/supabase/ssr";
import { hasSupabase } from "@/lib/supabase/server";

export interface CancelResult {
  ok: boolean;
  formError?: string;
}

/**
 * Cancel one of the caller's own reservations. Runs under their session, so
 * RLS (`reservations_self_cancel`) is what actually enforces ownership — this
 * cannot touch anyone else's booking even if the id is guessed.
 */
export async function cancelMyBooking(id: string): Promise<CancelResult> {
  if (!hasSupabase()) {
    return { ok: false, formError: "Not available in this environment." };
  }

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, formError: "Please sign in again." };

  // Only pending or approved bookings can be cancelled by the member.
  const { data, error } = await supabase
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
