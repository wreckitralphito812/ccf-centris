"use server";

import { revalidatePath } from "next/cache";

import { hasSupabase, supabaseAdmin, SATELLITE_ID } from "@/lib/supabase/server";
import {
  parseDgroupInquiry,
  parseVolunteerApplication,
  type FieldErrors,
} from "@/lib/validation";
import { referenceFor } from "@/lib/reference";

export interface InquiryResult {
  ok: boolean;
  reference?: string;
  fieldErrors?: FieldErrors;
  formError?: string;
}

const NOT_WIRED = "Submissions aren't wired up in this environment yet.";
const GENERIC = "Something went wrong on our end. Try again in a moment.";

/** Dgroup interest → `dgroup_inquiries`, status `new`, anonymous. */
export async function submitDgroupInquiry(
  _prev: InquiryResult | null,
  formData: FormData,
): Promise<InquiryResult> {
  const parsed = parseDgroupInquiry(formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  if (!hasSupabase()) return { ok: false, formError: NOT_WIRED };

  const v = parsed.value;
  const { data, error } = await supabaseAdmin()
    .from("dgroup_inquiries")
    .insert({
      satellite_id: SATELLITE_ID,
      dgroup_id: v.dgroup_id,
      user_id: null,
      full_name: v.full_name,
      email: v.email,
      mobile: v.mobile,
      age_bracket: v.age_bracket,
      message: v.message,
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    console.error("submitDgroupInquiry: insert failed", error);
    return { ok: false, formError: GENERIC };
  }

  revalidatePath("/admin/dgroups");
  return { ok: true, reference: referenceFor("dgroup", data.id) };
}

/** Volunteer application → `volunteer_applications`, status `submitted`, anonymous. */
export async function submitVolunteerApplication(
  _prev: InquiryResult | null,
  formData: FormData,
): Promise<InquiryResult> {
  const parsed = parseVolunteerApplication(formData);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  if (!hasSupabase()) return { ok: false, formError: NOT_WIRED };

  const v = parsed.value;
  const { data, error } = await supabaseAdmin()
    .from("volunteer_applications")
    .insert({
      role_id: v.role_id,
      user_id: null,
      full_name: v.full_name,
      email: v.email,
      mobile: v.mobile,
      message: v.message,
      status: "submitted",
    })
    .select("id")
    .single();

  if (error) {
    console.error("submitVolunteerApplication: insert failed", error);
    return { ok: false, formError: GENERIC };
  }

  revalidatePath("/admin/volunteers");
  return { ok: true, reference: referenceFor("volunteer", data.id) };
}
