import "server-only";
import { getCurrentUser } from "../auth/session";
import { db } from "../db";
import type { PublicUser, User } from "../types";
import { getPlusUser } from "./session";

/**
 * The PAHAD dashboard account acting inside the app ("access type: Admin"): the dashboard account signed in on this
 * device, or the one linked to the signed-in PAHAD+ account with Admin mode on. Permissions always come from that
 * dashboard account, so the app never grants anything the dashboard wouldn't.
 */
export async function appAdmin(): Promise<PublicUser | null> {
  const direct = await getCurrentUser();
  if (direct) return direct;
  const pp = await getPlusUser();
  if (!pp?.admin_user_id || !pp.admin_mode) return null;
  const u = await db.get("users", pp.admin_user_id);
  if (!u || !u.active) return null;
  return publicUser(u);
}

export function publicUser(u: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { password_hash, ...rest } = u;
  return rest;
}
