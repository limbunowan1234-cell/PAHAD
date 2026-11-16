import "server-only";
import { db, newId } from "./db";
import { PermissionError, requirePermission } from "./auth/session";
import type { Permission } from "./permissions";
import { storeUpload } from "./storage";
import type { PublicUser } from "./types";

export type ActionState = { ok: boolean; message: string } | null;

export const now = () => new Date().toISOString();
export const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);

/** Record who did what, when. Pass before/after for sensitive actions. */
export async function log(
  actor: PublicUser,
  action: string,
  entity: string,
  entityId: string,
  summary: string,
  details?: { before?: unknown; after?: unknown },
) {
  await db.insert("activity", {
    id: newId(), actor_id: actor.id, actor_name: actor.name, action, entity, entity_id: entityId, summary,
    details: details ? JSON.stringify(details) : "", directorate: actor.directorate ?? "", created_at: now(),
  });
}

/** Leave a message in someone's admin notifications. */
export async function notify(userId: string, message: string, link = "") {
  if (!userId) return;
  await db.insert("notifications", { id: newId(), user_id: userId, message, link, read: false, created_at: now() });
}

/** Wraps an action so permission and validation errors come back as friendly messages. */
export async function guarded(permission: Permission, fn: (user: PublicUser) => Promise<string>): Promise<ActionState> {
  try {
    const user = await requirePermission(permission);
    return { ok: true, message: await fn(user) };
  } catch (e) {
    if (e instanceof PermissionError || e instanceof Error) return { ok: false, message: e.message };
    throw e;
  }
}

export async function fileFrom(fd: FormData, key: string, folder: "images" | "documents") {
  const f = fd.get(key);
  return f instanceof File && f.size > 0 ? storeUpload(f, folder) : null;
}
