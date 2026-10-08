"use client";

import { upload } from "@vercel/blob/client";
import { MAX_UPLOAD_MB, signupUrlFrom } from "@/lib/announcements";

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

/**
 * Read a QR code on a poster and return it as a sign-up link (2026-10-08),
 * so the admin doesn't have to type the link the QR already holds. Tries a
 * quick, smaller copy first, then full size for small codes. Never throws:
 * a poster without a readable QR code just returns null.
 */
export async function findQrLink(file: File): Promise<string | null> {
  try {
    const [{ default: jsQR }, bmp] = await Promise.all([import("jsqr"), createImageBitmap(file)]);
    try {
      for (const max of [1600, 4000]) {
        const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
        const w = Math.round(bmp.width * scale);
        const h = Math.round(bmp.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return null;
        ctx.drawImage(bmp, 0, 0, w, h);
        const code = jsQR(ctx.getImageData(0, 0, w, h).data, w, h);
        if (code?.data) return signupUrlFrom(code.data);
        if (scale === 1) break;
      }
    } finally {
      bmp.close();
    }
  } catch (e) {
    console.warn("QR check skipped", e);
  }
  return null;
}
