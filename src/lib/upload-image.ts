"use client";

import { upload } from "@vercel/blob/client";
import { MAX_UPLOAD_MB, signupUrlFrom } from "@/lib/announcements";

/**
 * Pictures from the browser to the Blob store (2026-10-08): pick the file out
 * of a drop, get it into a shape the site can use, upload it, and read any
 * QR code on it. Every failure throws an Error whose message is fit to show.
 */

/** What the file pickers offer: any picture, including iPhone photos. */
export const PICTURE_ACCEPT = "image/*,.heic,.heif";

const OK_TYPES = /^image\/(jpeg|png|webp)$/;
const MB = 1024 * 1024;

/** The biggest poster side worth keeping; larger ones are scaled down. */
const POSTER_MAX_SIDE = 4096;
/** Posters heavier than this are re-saved as JPG so they load quickly. */
const POSTER_MAX_BYTES = 8 * MB;

const looksHeic = (f: File) => /hei[cf]/i.test(f.type) || /\.hei[cf]$/i.test(f.name);
const looksPdf = (f: File) => f.type === "application/pdf" || /\.pdf$/i.test(f.name);

/**
 * The picture in a drop. Pictures dragged out of a web page (Google Drive,
 * Messenger, another site) arrive as a link, not a file, and can't be read,
 * so say how to get the file instead of doing nothing.
 */
export function fileFromDrop(dt: DataTransfer | null): File {
  const files = Array.from(dt?.files ?? []);
  const file = files.find((f) => f.type.startsWith("image/") || looksHeic(f)) ?? files[0];
  if (file) return file;
  if (dt && (dt.types.includes("text/uri-list") || dt.types.includes("text/html"))) {
    throw new Error("That picture came from a web page, so it can't be used directly. Download it to your computer first, then drop or choose the file.");
  }
  throw new Error("Nothing to upload there. Drop a JPG or PNG file, or tap to choose one.");
}

async function decode(file: File): Promise<ImageBitmap> {
  if (looksPdf(file)) throw new Error("PDFs can't be used. Export the poster as a JPG or PNG and try again.");
  try {
    return await createImageBitmap(file);
  } catch {
    if (looksHeic(file)) throw new Error("This is an iPhone (HEIC) photo, which this browser can't open. Export it as a JPG and try again.");
    throw new Error("That file couldn't be opened as a picture. Use a JPG or PNG.");
  }
}

/** Re-save a picture as a JPG, scaled so its longest side is at most `maxSide`. */
async function toJpeg(bmp: ImageBitmap, name: string, maxSide: number, quality: number): Promise<File> {
  const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser couldn't prepare the picture. Try another browser.");
  ctx.fillStyle = "#ffffff"; // see-through parts of a PNG get a white background
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bmp, 0, 0, w, h);
  const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", quality));
  if (!blob) throw new Error("This browser couldn't prepare the picture. Try another browser.");
  return new File([blob], name.replace(/\.[a-z0-9]+$/i, "") + ".jpg", { type: "image/jpeg" });
}

/**
 * A poster for the website, any shape. Very large, very heavy or unusual
 * formats (HEIC in Safari, GIF, BMP) are re-saved as a JPG instead of being
 * turned away.
 */
export async function preparePoster(file: File): Promise<{ file: File; w: number; h: number }> {
  const bmp = await decode(file);
  try {
    if (!OK_TYPES.test(file.type) || file.size > POSTER_MAX_BYTES || Math.max(bmp.width, bmp.height) > POSTER_MAX_SIDE) {
      const scale = Math.min(1, POSTER_MAX_SIDE / Math.max(bmp.width, bmp.height));
      return { file: await toJpeg(bmp, file.name, POSTER_MAX_SIDE, 0.9), w: Math.round(bmp.width * scale), h: Math.round(bmp.height * scale) };
    }
    return { file, w: bmp.width, h: bmp.height };
  } finally {
    bmp.close();
  }
}

/**
 * A file for one of the screens, which must keep its exact size: only the
 * format changes, or the quality for files over the size cap.
 */
export async function prepareScreenFile(file: File): Promise<{ file: File; w: number; h: number }> {
  const bmp = await decode(file);
  try {
    if (!OK_TYPES.test(file.type) || file.size > MAX_UPLOAD_MB * MB) {
      const out = await toJpeg(bmp, file.name, Number.MAX_SAFE_INTEGER, 0.88);
      if (out.size > MAX_UPLOAD_MB * MB) throw new Error(`That file is over ${MAX_UPLOAD_MB} MB even as a JPG. Export a smaller one.`);
      return { file: out, w: bmp.width, h: bmp.height };
    }
    return { file, w: bmp.width, h: bmp.height };
  } finally {
    bmp.close();
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
