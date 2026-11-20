import "server-only";
import { db, newId } from "../db";
import type { PlusNotification } from "../types";
import { pushToUser } from "./push";

/**
 * Tell a PAHAD+ account something: saved to its Profile notifications, and pushed to its phones when it has
 * notifications on. "support" and "events" kinds respect the person's switches in Settings.
 */
export async function notifyPlus(userId: string, n: { kind: PlusNotification["kind"]; title: string; body: string; url: string }) {
  if (!userId) return;
  const u = await db.get("plus_users", userId);
  if (!u) return;
  if ((n.kind === "support" && u.mute_support) || (n.kind === "events" && u.mute_events)) return;
  await db.insert("plus_notifications", { id: newId(), user_id: userId, ...n, read: false, created_at: new Date().toISOString() });
  await pushToUser(userId, { title: n.title, body: n.body, url: n.url }).catch(() => 0);
}
