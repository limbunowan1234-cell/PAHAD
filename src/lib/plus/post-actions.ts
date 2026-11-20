"use server";

import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { db, newId } from "@/lib/db";
import { fileFrom, now, str, type ActionState } from "@/lib/admin-helpers";
import { parseYouTubeId } from "@/lib/youtube";
import type { PlusPost } from "@/lib/types";
import { HUB_KEYS, PLUS_REGIONS, PLUS_RULES, ROAM_KINDS, ROAM_STAGES, USER_BRIEF_TYPES, type BriefType, type PlusHub } from "./config";
import { getPlusUser } from "./session";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
const today = () => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10); // IST

/** Only http(s) links, so nobody can post a javascript: link. */
function url(fd: FormData, key: string): string | null {
  const v = str(fd, key, 500);
  if (!v) return "";
  try {
    const u = new URL(/^https?:\/\//i.test(v) ? v : `https://${v}`);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export async function createPlusPost(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in to post." };
  if (!u.email_verified) return { ok: false, message: "Please confirm your email address first. Open Me → Resend confirmation link." };

  // Daily limit: lower for new accounts.
  const age = Date.now() - Date.parse(u.created_at);
  const limit = age < PLUS_RULES.newAccountDays * 86_400_000 ? PLUS_RULES.newAccountDailyPosts : PLUS_RULES.dailyPosts;
  const mine = await db.findBy("plus_posts", "author_id", u.id);
  if (mine.filter((p) => Date.now() - Date.parse(p.created_at) < 86_400_000).length >= limit) {
    return { ok: false, message: `You can post ${limit} times a day. Please try again tomorrow.` };
  }

  const hub = str(fd, "hub", 20) as PlusHub;
  if (!HUB_KEYS.includes(hub)) return { ok: false, message: "Choose a hub." };
  const region = str(fd, "region", 40);
  if (!(PLUS_REGIONS as readonly string[]).includes(region)) return { ok: false, message: "Choose a region." };
  const title = str(fd, "title", 120);
  const summary = str(fd, "summary", 280);
  if (title.length < 4) return { ok: false, message: "Please add a title." };
  if (summary.length < 10) return { ok: false, message: "Please add a short summary (at least 10 characters)." };

  const links: Record<string, string> = {};
  for (const k of ["website", "link", "map_link"]) {
    const v = url(fd, k);
    if (v === null) return { ok: false, message: "One of the links isn't a valid web address." };
    links[k] = v;
  }
  const yt = str(fd, "youtube", 600);
  const youtube_id = yt ? parseYouTubeId(yt) : "";
  if (youtube_id === null) return { ok: false, message: "That doesn't look like a YouTube link." };

  const p: Omit<PlusPost, "id" | "image"> = {
    hub, brief_type: "", kind: "", stage: "", region, locality: str(fd, "locality", 80), title, summary, body: str(fd, "body", 4000),
    youtube_id, starts_at: "", ends_at: "",
    venue: str(fd, "venue", 160), organiser: str(fd, "organiser", 120), contact_phone: str(fd, "contact_phone", 30),
    contact_whatsapp: str(fd, "contact_whatsapp", 30), contact_email: str(fd, "contact_email", 160), address: str(fd, "address", 240),
    website: links.website, link: links.link, map_link: links.map_link,
    best_season: str(fd, "best_season", 80), hours: str(fd, "hours", 120), valid_until: "", deadline: "",
    status: "unverified", flags: 0, verified_by_name: "", verified_at: "", reject_reason: "",
    author_id: u.id, author_name: u.name, author_type: u.account_type, created_at: now(), updated_at: now(),
  };

  if (hub === "events") {
    const starts = str(fd, "starts_at", 20);
    const ends = str(fd, "ends_at", 20);
    if (!DATETIME.test(starts)) return { ok: false, message: "Please add when the event starts." };
    if (starts.slice(0, 10) < today()) return { ok: false, message: "The event date has already passed." };
    if (ends && (!DATETIME.test(ends) || ends < starts)) return { ok: false, message: "The end time must be after the start." };
    p.starts_at = starts;
    p.ends_at = ends;
  } else if (hub === "roam") {
    const kind = str(fd, "kind", 60);
    const stage = str(fd, "stage", 20);
    if (!(ROAM_KINDS as readonly string[]).includes(kind)) return { ok: false, message: "Choose what kind of place it is." };
    if (!Object.hasOwn(ROAM_STAGES, stage)) return { ok: false, message: "Is it open to visitors, or being developed?" };
    p.kind = kind;
    p.stage = stage;
  } else if (hub === "business") {
    p.kind = str(fd, "kind", 60);
  } else {
    const type = str(fd, "brief_type", 20) as BriefType;
    // Policy & Assembly Summaries come only from PAHAD circulars approved as public.
    if (!USER_BRIEF_TYPES.includes(type)) return { ok: false, message: "Choose the type of brief." };
    p.brief_type = type;
    if (type === "alert") {
      const hours = Math.round(Number(str(fd, "alert_hours", 4)) || PLUS_RULES.alertDefaultHours);
      const h = Math.min(Math.max(hours, 1), PLUS_RULES.alertMaxDays * 24);
      p.valid_until = new Date(Date.now() + h * 3_600_000).toISOString();
    }
    if (type === "opportunity" || type === "job") {
      const deadline = str(fd, "deadline", 10);
      if (!DATE.test(deadline)) return { ok: false, message: "Please add the last date to apply." };
      if (deadline < today()) return { ok: false, message: "The last date to apply has already passed." };
      p.deadline = deadline;
    }
  }

  let image = "";
  try {
    image = (await fileFrom(fd, "image", "images")) ?? "";
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "The photo could not be uploaded." };
  }

  const id = newId();
  await db.insert("plus_posts", { id, image, ...p });
  updateTag("plus");
  redirect(`/plus/${id}?posted=1`);
}

/** The poster takes their own post down. */
export async function deleteOwnPlusPost(id: string): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  const p = await db.get("plus_posts", id);
  if (!p || p.author_id !== u.id) return { ok: false, message: "Not found." };
  await db.update("plus_posts", id, { status: "removed", updated_at: now() });
  updateTag("plus");
  return { ok: true, message: "Your post was removed." };
}

const FLAG_REASONS = ["Wrong or misleading", "Spam or scam", "Offensive or unsafe", "Not in the hills region", "Other"];

/** One report per PP user per post. Enough reports put a post on hold, unless the President made it Flag-Proof. */
export async function reportPlusPost(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in to report a post." };
  const postId = str(fd, "post_id", 64);
  const reason = str(fd, "reason", 60);
  if (!FLAG_REASONS.includes(reason)) return { ok: false, message: "Choose a reason." };
  const p = await db.get("plus_posts", postId);
  if (!p || !["unverified", "verified", "flag_proof"].includes(p.status)) return { ok: false, message: "This post is no longer available." };
  if (p.author_id === u.id) return { ok: false, message: "You can't report your own post." };
  const flagId = `${postId}:${u.id}`;
  if (await db.get("plus_flags", flagId)) return { ok: true, message: "You've already reported this post. Thank you." };
  await db.insert("plus_flags", { id: flagId, post_id: postId, user_id: u.id, reason: [reason, str(fd, "note", 300)].filter(Boolean).join(": "), created_at: now() });
  const flags = (await db.findBy("plus_flags", "post_id", postId)).length;
  const hold = flags >= PLUS_RULES.flagsToHold && p.status !== "flag_proof";
  await db.update("plus_posts", postId, { flags, ...(hold ? { status: "hold" } : {}), updated_at: now() });
  updateTag("plus");
  return { ok: true, message: hold ? "Thank you. The post is hidden while PAHAD reviews it." : "Thank you. PAHAD's verifiers will look at it." };
}

export async function blockPlusUser(authorId: string): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in to block someone." };
  if (!authorId || authorId === u.id) return { ok: false, message: "You can't block this account." };
  const id = `${u.id}:${authorId}`;
  if (!(await db.get("plus_blocks", id))) await db.insert("plus_blocks", { id, blocker_id: u.id, blocked_id: authorId, created_at: now() });
  return { ok: true, message: "Blocked. You won't see their posts any more." };
}

export async function unblockPlusUser(authorId: string): Promise<ActionState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Please sign in again." };
  const id = `${u.id}:${authorId}`;
  if (await db.get("plus_blocks", id)) await db.remove("plus_blocks", id);
  return { ok: true, message: "Unblocked." };
}
