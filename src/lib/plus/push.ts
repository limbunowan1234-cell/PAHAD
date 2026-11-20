import "server-only";
import webpush from "web-push";
import { db } from "../db";
import { site } from "../site";
import type { PlusPushSub } from "../types";

/**
 * PAHAD+ phone notifications (Web Push; inside the Play Store app too, through Chrome's notification delegation).
 * Needs VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY on the server; without them nothing is sent and the app hides the option.
 * Call these inside after() so a slow push service never delays a page.
 */
const PUBLIC = process.env.VAPID_PUBLIC_KEY ?? "";
const PRIVATE = process.env.VAPID_PRIVATE_KEY ?? "";
export const pushConfigured = Boolean(PUBLIC && PRIVATE);
export const vapidPublicKey = PUBLIC;

export type PushMessage = { title: string; body: string; url: string; tag?: string };

let ready = false;
async function send(subs: PlusPushSub[], msg: PushMessage) {
  if (!pushConfigured || subs.length === 0) return 0;
  if (!ready) {
    webpush.setVapidDetails(`mailto:${site.email.toLowerCase()}`, PUBLIC, PRIVATE);
    ready = true;
  }
  let sent = 0;
  for (const s of subs) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(msg), { TTL: 6 * 3600 });
      sent++;
    } catch (e) {
      // Gone or never valid: the phone unsubscribed or the app was removed.
      const code = (e as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await db.remove("plus_push", s.id);
      else console.error("PAHAD+ push failed", code ?? e);
    }
  }
  return sent;
}

export async function pushToUser(userId: string, msg: PushMessage) {
  return send(await db.findBy("plus_push", "user_id", userId), msg);
}

/** Everyone who asked for alerts in this region (except, optionally, one user). */
export async function pushToRegion(region: string, msg: PushMessage, exceptUserId = "") {
  const subs = (await db.all("plus_push")).filter((s) => s.user_id !== exceptUserId && s.regions.split(",").includes(region));
  return send(subs, msg);
}
