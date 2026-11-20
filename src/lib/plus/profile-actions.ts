"use server";

import { updateTag } from "next/cache";
import { db } from "@/lib/db";
import { fileFrom, log, str, type ActionState } from "@/lib/admin-helpers";
import { getCurrentUser } from "@/lib/auth/session";
import { parseYouTubeId } from "@/lib/youtube";
import { canApprovePublic, canVerifyPlusPost } from "./access";
import { appAdmin } from "./app-admin";
import { ACCOUNT_TYPES, type PlusAccountType, type PlusStatus } from "./config";
import { imageLink, videoFileLink } from "./media";
import { moderateOne } from "./moderation";
import { getPlusUser } from "./session";

const SETTINGS = ["hide_contacts", "private_mode", "hide_saved", "mute_support", "mute_events", "admin_mode"] as const;
type Setting = (typeof SETTINGS)[number];

/** One switch in Settings, Privacy & QR (or Admin mode). */
export async function setPlusSetting(key: Setting, on: boolean): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  if (!SETTINGS.includes(key)) return { ok: false, message: "Unknown setting." };
  if (key === "admin_mode" && !u.admin_user_id) return { ok: false, message: "Link your PAHAD admin account first." };
  await db.update("plus_users", u.id, { [key]: Boolean(on) });
  updateTag("plus");
  return { ok: true, message: "Saved." };
}

export async function setPlusAccountType(type: PlusAccountType): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  if (!Object.hasOwn(ACCOUNT_TYPES, type)) return { ok: false, message: "Choose an account type." };
  await db.update("plus_users", u.id, { account_type: type });
  for (const p of await db.findBy("plus_posts", "author_id", u.id)) if (!p.official) await db.update("plus_posts", p.id, { author_type: type });
  updateTag("plus");
  return { ok: true, message: "Account type saved." };
}

/** Collaboration contacts: they prefill new posts (each post still decides whether to show them). */
export async function updateCollabContacts(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  const email = str(fd, "contact_email", 160);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, message: "That email doesn't look right." };
  const ig = str(fd, "instagram", 60).replace(/^@?/, "@").replace(/^@$/, "");
  await db.update("plus_users", u.id, { phone: str(fd, "phone", 30), instagram: ig, contact_email: email });
  return { ok: true, message: "Contacts saved." };
}

/**
 * Access type Admin: link this PAHAD+ account to the PAHAD dashboard account signed in on this device. From then on,
 * Admin mode in the app uses that dashboard account's permissions (Desk, gate, circulars), and nothing more.
 */
export async function linkAdminAccess(): Promise<ActionState> {
  const [u, admin] = await Promise.all([getPlusUser(), getCurrentUser()]);
  if (!u) return { ok: false, message: "Please sign in to PAHAD+ again." };
  if (!admin) return { ok: false, message: "Sign in to your PAHAD dashboard account on this device first." };
  const taken = (await db.all("plus_users")).find((x) => x.admin_user_id === admin.id && x.id !== u.id);
  if (taken) return { ok: false, message: "That dashboard account is already linked to another PAHAD+ account." };
  await db.update("plus_users", u.id, { admin_user_id: admin.id, admin_mode: true });
  await log(admin, "linked", "plus account", u.id, `PAHAD+ account ${u.email} linked to ${admin.name}'s dashboard account`);
  updateTag("plus");
  return { ok: true, message: `Linked to ${admin.name}'s PAHAD account. Admin mode is on.` };
}

export async function unlinkAdminAccess(): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  await db.update("plus_users", u.id, { admin_user_id: "", admin_mode: false });
  updateTag("plus");
  return { ok: true, message: "Admin access unlinked. This is now an app user account." };
}

export async function markPlusNotificationsRead(): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  for (const n of await db.findBy("plus_notifications", "user_id", u.id)) if (!n.read) await db.update("plus_notifications", n.id, { read: true });
  return { ok: true, message: "All read." };
}

/**
 * Add or change a post's photo or video. The poster may do it within 24 hours of posting; PAHAD verifiers for that
 * post may do it any time ("Fill Media URL" in the Desk).
 */
export async function updatePlusMedia(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const p = await db.get("plus_posts", str(fd, "post_id", 64));
  if (!p || p.status === "removed") return { ok: false, message: "Post not found." };
  const [u, admin] = await Promise.all([getPlusUser(), appAdmin()]);
  const owner = u && u.id === p.author_id && Date.now() - Date.parse(p.created_at) < 24 * 3_600_000;
  const curator = admin && canVerifyPlusPost(admin, p);
  if (!owner && !curator) return { ok: false, message: u && u.id === p.author_id ? "Photos and videos can be changed within 24 hours of posting." : "You can't change this post's media." };
  const img = imageLink(str(fd, "image_url", 500));
  if (img === null) return { ok: false, message: "The image link must start with https://." };
  const vid = str(fd, "video", 600);
  let youtube_id = p.youtube_id, video_url = p.video_url;
  if (vid) {
    const yt = parseYouTubeId(vid);
    const file = yt ? null : videoFileLink(vid);
    if (!yt && !file) return { ok: false, message: "Use a YouTube link, or a direct video link ending in .mp4 or .webm." };
    youtube_id = yt ?? "";
    video_url = file ?? "";
  }
  let image = img || p.image;
  try {
    image = (await fileFrom(fd, "image", "images")) ?? image;
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "The photo could not be uploaded." };
  }
  if (fd.get("clear_video") === "on") { youtube_id = ""; video_url = ""; }
  await db.update("plus_posts", p.id, { image, youtube_id, video_url, updated_at: new Date().toISOString() });
  if (curator && !owner) await log(admin, "updated", "plus media", p.id, `${p.title}: media changed from the Desk`);
  updateTag("plus");
  return { ok: true, message: "Media saved." };
}

/** Desk moderation inside the app, for PAHAD admins (dashboard sign-in or a linked account in Admin mode). */
export async function deskModerate(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const admin = await appAdmin();
  if (!admin) return { ok: false, message: "Admin mode is off. Sign in to your PAHAD dashboard account or switch Admin mode on." };
  try {
    const title = await moderateOne(admin, str(fd, "id", 64), str(fd, "status", 20) as PlusStatus, str(fd, "reason", 300));
    updateTag("plus");
    return { ok: true, message: `Saved: “${title}”.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Not allowed." };
  }
}

/** Executive Spotlight on Discover: picked by the President or an approver. */
export async function setPlusSpotlight(postId: string, on: boolean): Promise<ActionState> {
  const admin = await appAdmin();
  if (!admin || !canApprovePublic(admin)) return { ok: false, message: "Only the President or an approver can choose the spotlight." };
  const p = await db.get("plus_posts", postId);
  if (!p) return { ok: false, message: "Post not found." };
  await db.update("plus_posts", postId, { spotlight: on });
  await log(admin, on ? "spotlighted" : "unspotlighted", "plus post", postId, p.title);
  updateTag("plus");
  return { ok: true, message: on ? "Added to the Executive Spotlight." : "Removed from the spotlight." };
}

/** Switches worded the way the design shows them ("Public contacts ON" means hide_contacts is off). */
const PREFS = {
  private_mode: ["private_mode", false], public_contacts: ["hide_contacts", true], show_saved: ["hide_saved", true],
  notify_support: ["mute_support", true], notify_events: ["mute_events", true], admin_mode: ["admin_mode", false],
} as const satisfies Record<string, readonly [Setting, boolean]>;
export type PlusPreference = keyof typeof PREFS;

export async function setPlusPreference(name: PlusPreference, on: boolean): Promise<ActionState> {
  const p = PREFS[name];
  if (!p) return { ok: false, message: "Unknown setting." };
  return setPlusSetting(p[0], p[1] ? !on : on);
}

/** Block an account picked from the list in Settings. */
export async function blockFromPicker(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  const id = str(fd, "account", 64);
  const other = id && id !== u.id ? await db.get("plus_users", id) : null;
  if (!other) return { ok: false, message: "Choose an account to block." };
  const key = `${u.id}:${id}`;
  if (!(await db.get("plus_blocks", key))) await db.insert("plus_blocks", { id: key, blocker_id: u.id, blocked_id: id, created_at: new Date().toISOString() });
  updateTag("plus");
  return { ok: true, message: `Blocked ${other.name}. You won't see their posts any more.` };
}
