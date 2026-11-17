import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { AwsClient } from "aws4fetch";
import { uploadToDrive, uploadsToDrive } from "./google";

/**
 * Where uploads go, in order of preference:
 *  1. The organisation's Google Drive (pahad.org@gmail.com), when the Apps Script
 *     bridge is connected (GOOGLE_SCRIPT_URL/SECRET) and UPLOADS_TO_DRIVE is not "0".
 *  2. Cloudflare R2, when the R2_* variables are set.
 *  3. Vercel Blob, when a Blob store is connected to the project.
 *  4. /public/uploads, for local development only.
 * A later option is used automatically if an earlier one fails.
 */
export const usingR2 = Boolean(
  process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.R2_PUBLIC_URL,
);
export const usingBlob = !usingR2 && Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
/** True when uploads are stored somewhere permanent (not the local disk). */
export const usingCloudStorage = usingR2 || usingBlob || uploadsToDrive;

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // stays under Vercel's 4.5 MB request limit
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

export async function storeUpload(file: File, folder: "images" | "documents"): Promise<string> {
  const ext = ALLOWED[file.type];
  if (!ext) throw new Error("Only JPG, PNG, WebP, GIF images or PDF documents can be uploaded.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Files must be 4 MB or smaller.");
  const month = new Date().toISOString().slice(0, 7);
  const key = `${folder}/${month}/${randomUUID()}.${ext}`;

  // 1. The organisation's Google Drive (pahad.org@gmail.com), when connected.
  if (uploadsToDrive) {
    const safeName = file.name.replace(/[^\w.\- ]+/g, "").slice(0, 80) || `upload.${ext}`;
    const saved = await uploadToDrive(file, ["PAHAD Website Uploads", folder === "images" ? "Photos" : "Documents", month], `${month} ${safeName}`, true);
    if (saved) return folder === "images" ? `https://lh3.googleusercontent.com/d/${saved.id}=w2000` : `https://drive.google.com/file/d/${saved.id}/view`;
    // If Google is unreachable, fall through to the next storage so the upload is not lost.
  }
  const bytes = Buffer.from(await file.arrayBuffer());

  if (usingR2) {
    const client = new AwsClient({
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      service: "s3",
      region: "auto",
    });
    const endpoint = `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${process.env.R2_BUCKET}/${key}`;
    const res = await client.fetch(endpoint, {
      method: "PUT",
      body: bytes,
      headers: { "Content-Type": file.type, "Cache-Control": "public, max-age=31536000, immutable" },
    });
    if (!res.ok) throw new Error(`Upload to storage failed (${res.status}).`);
    return `${process.env.R2_PUBLIC_URL!.replace(/\/$/, "")}/${key}`;
  }

  if (usingBlob) {
    const blob = await put(`pahad/${key}`, bytes, {
      access: "public",
      contentType: file.type,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    });
    return blob.url;
  }

  if (process.env.VERCEL) throw new Error("File storage is not configured yet. Connect a Vercel Blob store (or Cloudflare R2) to the project.");
  const target = path.join(process.cwd(), "public", "uploads", key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes);
  return `/uploads/${key}`;
}
