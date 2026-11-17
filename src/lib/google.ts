import "server-only";
import { db, newId } from "./db";

/**
 * Connection to the organisation's Google account (pahad.org@gmail.com) through a
 * small Apps Script web app (see google-apps-script/README.md). The script runs as
 * that account, so the Sheet and the Drive files are owned by the organisation.
 *
 * Every write is attempted straight away. If Google is not reachable (or not set up
 * yet), it is stored in the outbox and retried later, so nothing is lost.
 */
const URL_ = process.env.GOOGLE_SCRIPT_URL;
const SECRET = process.env.GOOGLE_SCRIPT_SECRET;
export const googleConfigured = Boolean(URL_ && SECRET);

type ScriptResult = { ok: boolean; error?: string; [k: string]: unknown };

async function callScript(action: string, payload: Record<string, unknown>): Promise<ScriptResult> {
  if (!googleConfigured) return { ok: false, error: "Google Sheets is not connected yet." };
  try {
    const res = await fetch(URL_!, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script reads the raw body
      body: JSON.stringify({ secret: SECRET, action, ...payload }),
      redirect: "follow",
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json().catch(() => null)) as ScriptResult | null;
    return json ?? { ok: false, error: `Unexpected response (${res.status}).` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Network error" };
  }
}

/** Add a row to a tab of the finance Sheet. Rows are only ever appended, never changed. */
export async function appendToSheet(sheet: string, row: (string | number)[]): Promise<boolean> {
  const res = await callScript("append", { sheet, row });
  if (res.ok) return true;
  await db.insert("outbox", {
    id: newId(), action: "append", payload: JSON.stringify({ sheet, row }), attempts: 1,
    last_error: res.error ?? "", created_at: new Date().toISOString(),
  });
  return false;
}

/**
 * Save a file into a Drive folder path of the organisation account.
 * Private by default (finance receipts); `isPublic` makes it viewable by anyone with
 * the link, for photos and documents shown on the website.
 * Returns { id, url } or null if Google is not connected or the upload failed.
 */
export async function uploadToDrive(file: File, path: string[], name: string, isPublic = false): Promise<{ id: string; url: string } | null> {
  if (!googleConfigured) return null;
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const res = await callScript("upload", { path, name, mimeType: file.type, base64, public: isPublic });
  return res.ok && typeof res.url === "string" && typeof res.id === "string" ? { id: res.id, url: res.url } : null;
}

/**
 * Send a plain-text email from the organisation's Gmail (pahad.org@gmail.com).
 * Not queued: used for time-limited messages such as password reset links.
 * Needs the "email" action in google-apps-script/Code.gs (see the README).
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  const res = await callScript("email", { to, subject, body });
  return res.ok;
}

/** Website uploads go to Drive unless UPLOADS_TO_DRIVE=0. */
export const uploadsToDrive = googleConfigured && process.env.UPLOADS_TO_DRIVE !== "0";

/** Retry queued writes. Returns how many are still waiting. */
export async function flushOutbox(limit = 25): Promise<number> {
  const items = (await db.all("outbox")).sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (!googleConfigured) return items.length;
  for (const item of items.slice(0, limit)) {
    const res = await callScript(item.action, JSON.parse(item.payload));
    if (res.ok) await db.remove("outbox", item.id);
    else {
      await db.update("outbox", item.id, { attempts: item.attempts + 1, last_error: res.error ?? "" });
      break; // keep the order: stop at the first failure and try again later
    }
  }
  return (await db.all("outbox")).length;
}
