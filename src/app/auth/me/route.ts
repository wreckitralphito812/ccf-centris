import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth/session";

/**
 * Who is signed in, for the header's account menu. The session cookie is
 * httpOnly, so the browser asks here rather than reading it; asking from the
 * client keeps the pages that show the header statically rendered.
 */
export async function GET() {
  const user = await currentUser();
  return NextResponse.json(
    { email: user?.email ?? null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
