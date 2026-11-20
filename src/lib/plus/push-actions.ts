"use server";

import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { now, type ActionState } from "@/lib/admin-helpers";
import { PLUS_REGIONS } from "./config";
import { pushConfigured } from "./push";
import { getPlusUser } from "./session";

type Sub = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

function validEndpoint(v: unknown): v is string {
  if (typeof v !== "string" || v.length > 1000) return false;
  try {
    return new URL(v).protocol === "https:"; // push services are always https
  } catch {
    return false;
  }
}

/** Save this phone's subscription and which regions' alerts it wants. Replies are only about this device. */
export async function savePushSubscription(sub: Sub, regions: string[]): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  if (!pushConfigured) return { ok: false, message: "Notifications aren't switched on for PAHAD+ yet." };
  const p256dh = sub?.keys?.p256dh, auth = sub?.keys?.auth;
  if (!validEndpoint(sub?.endpoint) || typeof p256dh !== "string" || typeof auth !== "string" || p256dh.length > 200 || auth.length > 100) {
    return { ok: false, message: "This browser gave an invalid subscription. Please try again." };
  }
  const chosen = (Array.isArray(regions) ? regions : []).filter((r): r is string => (PLUS_REGIONS as readonly string[]).includes(r));
  const id = createHash("sha256").update(sub.endpoint as string).digest("hex");
  const row = { user_id: u.id, endpoint: sub.endpoint as string, p256dh, auth, regions: chosen.join(",") };
  if (await db.get("plus_push", id)) await db.update("plus_push", id, row);
  else await db.insert("plus_push", { id, ...row, created_at: now() });
  return { ok: true, message: chosen.length ? `Notifications on. Alerts for: ${chosen.join(", ")}.` : "Notifications on for your posts and E-Passes." };
}

export async function removePushSubscription(endpoint: string): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  const id = createHash("sha256").update(String(endpoint)).digest("hex");
  const row = await db.get("plus_push", id);
  if (row && row.user_id === u.id) await db.remove("plus_push", id);
  return { ok: true, message: "Notifications are off on this device." };
}
