import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

import { currentUser } from "@/lib/auth/session";
import { MAX_UPLOAD_MB } from "@/lib/announcements";
import { getRepStatus } from "@/lib/queries";

/**
 * Artwork uploads for announcements (2026-10-05). The browser uploads straight
 * to the Vercel Blob store; this route only hands out a short-lived token,
 * and only to approved ministry reps, for images under the size cap.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        const user = await currentUser();
        if (!user?.email) throw new Error("Sign in first.");
        if ((await getRepStatus(user.email)) !== "approved") throw new Error("Only approved ministry reps can upload.");
        if (!pathname.startsWith("announcements/")) throw new Error("Unexpected file name.");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: MAX_UPLOAD_MB * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      // Nothing to do here: the form keeps the file's address and sends it
      // with the submission.
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
