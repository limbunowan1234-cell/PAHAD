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

/** Save a file (e.g. a receipt) into a Drive folder path. Returns the Drive link, or null if not connected. */
export async function uploadToDrive(file: File, path: string[], name: string): Promise<string | null> {
  if (!googleConfigured) return null;
  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const res = await callScript("upload", { path, name, mimeType: file.type, base64 });
  return res.ok && typeof res.url === "string" ? res.url : null;
}

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
