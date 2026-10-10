import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth/session";
import { getMemberProfile } from "@/lib/auth/profile";

/**
 * Who is signed in, for the header's account menu. The session cookie is
 * httpOnly, so the browser asks here rather than reading it; asking from the
 * client keeps the pages that show the header statically rendered.
 */
export async function GET() {
  const user = await currentUser();
  // The profile name, so the header's initials match the name on the forms
  // (2026-10-10). A member who skipped their name gets the email's letter.
  const profile = user ? await getMemberProfile(user.id) : null;
  const name =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ").trim() || profile?.full_name?.trim() || null;
  return NextResponse.json(
    { email: user?.email ?? null, name },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
