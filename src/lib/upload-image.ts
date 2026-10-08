"use client";

import { upload } from "@vercel/blob/client";
import { MAX_UPLOAD_MB } from "@/lib/announcements";

/**
 * Upload one picture from the browser straight to the Blob store
 * (2026-10-08), after checking it's a JPG, PNG or WebP under the size cap
 * and reading its size. Throws an Error with a message fit to show.
 */
export async function readImage(file: File): Promise<{ w: number; h: number }> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Use a JPG, PNG or WebP picture. PDFs and HEIC photos need saving as JPG first.");
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`That file is over ${MAX_UPLOAD_MB} MB. Export a smaller JPG.`);
  try {
    const bmp = await createImageBitmap(file);
    const size = { w: bmp.width, h: bmp.height };
    bmp.close();
    return size;
  } catch {
    throw new Error("That file couldn't be opened as a picture.");
  }
}

export async function uploadImage(file: File, prefix: string): Promise<string> {
  const safe = file.name.replace(/[^a-zA-Z0-9.]+/g, "-").slice(-60);
  try {
    const blob = await upload(`announcements/${prefix}-${safe}`, file, {
      access: "public",
      handleUploadUrl: "/api/announce/upload",
    });
    return blob.url;
  } catch (e) {
    const msg = (e as Error).message || "";
    console.error("upload failed", e);
    // The upload route refuses with a 400, which the client reports as a
    // failure to get a token: almost always an expired sign-in.
    if (/client token/i.test(msg)) throw new Error("Couldn't start the upload. Your sign-in may have expired: refresh the page and try again.");
    throw new Error("The upload didn't go through. Check your connection and try again.");
  }
}
