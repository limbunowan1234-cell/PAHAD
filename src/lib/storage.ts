import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { put } from "@vercel/blob";
import { AwsClient } from "aws4fetch";

/**
 * Where uploads go, in order of preference:
 *  1. Cloudflare R2, when the R2_* variables are set.
 *  2. Vercel Blob, when a Blob store is connected to the project
 *     (Vercel adds BLOB_READ_WRITE_TOKEN and/or BLOB_STORE_ID automatically).
 *  3. /public/uploads, for local development only.
 */
export const usingR2 = Boolean(
  process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET && process.env.R2_PUBLIC_URL,
);
export const usingBlob = !usingR2 && Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
/** True when uploads are stored somewhere permanent (not the local disk). */
export const usingCloudStorage = usingR2 || usingBlob;

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
  const key = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
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
