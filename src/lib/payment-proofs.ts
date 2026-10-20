import "server-only";

import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * Screenshots of court rental payments (2026-10-20). They can show a
 * renter's name, bank and reference numbers, so they go to a private Supabase
 * Storage bucket, not the public Blob store the posters use. Only the server
 * reads them, and the admin page shows each through a link that expires.
 *
 * The bucket is made on the first upload, so there is nothing to set up by
 * hand. The browser shrinks a screenshot to a JPG well under MAX_BYTES before
 * sending it (lib/upload-image.ts), which also keeps it under the 1 MB a
 * server action accepts.
 */

const BUCKET = "court-payments";
export const MAX_BYTES = 900 * 1024;

/** JPG, PNG or WebP, by the file's first bytes rather than what the browser says it is. */
function pictureType(b: Uint8Array): string | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...b.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

/** Why a screenshot won't do, or null when it's fine. */
export function proofProblem(file: unknown): string | null {
  if (!(file instanceof File) || file.size === 0) return "Upload the screenshot of your payment.";
  if (file.size > MAX_BYTES) return "That picture is too big. Take a screenshot of the payment and upload that.";
  return null;
}

/** Save a renter's screenshot. Returns its path in the bucket, or null when it couldn't be saved. */
export async function saveProof(userId: string, file: File): Promise<string | null> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = pictureType(bytes);
  if (!type) return null;
  const path = `${userId}/${Date.now()}-${crypto.randomUUID()}.${type.split("/")[1].replace("jpeg", "jpg")}`;
  const storage = supabaseAdmin().storage;
  const put = () => storage.from(BUCKET).upload(path, bytes, { contentType: type, upsert: false });
  let { error } = await put();
  if (error && /bucket not found/i.test(error.message)) {
    const made = await storage.createBucket(BUCKET, { public: false, fileSizeLimit: MAX_BYTES });
    if (made.error && !/already exists/i.test(made.error.message)) console.error("saveProof: createBucket failed", made.error);
    ({ error } = await put());
  }
  if (error) {
    console.error("saveProof failed", error);
    return null;
  }
  return path;
}

/** A link to one screenshot that works for ten minutes, for the admin page. */
export async function proofUrl(path: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin().storage.from(BUCKET).createSignedUrl(path, 600);
  if (error) console.error("proofUrl failed", error);
  return data?.signedUrl ?? null;
}

/** Remove a screenshot whose booking didn't go through. */
export async function deleteProof(path: string): Promise<void> {
  const { error } = await supabaseAdmin().storage.from(BUCKET).remove([path]);
  if (error) console.error("deleteProof failed", error);
}
