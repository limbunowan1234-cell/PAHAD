"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { updateTag } from "next/cache";
import { db, newId } from "@/lib/db";
import { fileFrom, now, str, type ActionState } from "@/lib/admin-helpers";
import { parseYouTubeId } from "@/lib/youtube";
import type { PlusPost } from "@/lib/types";
import { HUB_KEYS, PLUS_REGIONS, PLUS_RULES, ROAM_STAGES, USER_BRIEF_TYPES, type BriefType, type PlusHub } from "./config";
import { canApprovePublic, canGrantFlagProof } from "./access";
import { appAdmin } from "./app-admin";
import { imageLink, videoFileLink } from "./media";
import { getPlusUser } from "./session";
import { notifyPlus } from "./notify";
import { AUTHENTIC_SUPPORTS } from "./posts";
import { isApprovedOrganiser } from "./payments";
import { paymentsConfigured } from "./razorpay";

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
  // Video: a YouTube link / id, or a direct https .mp4 / .webm file.
  const vid = str(fd, "youtube", 600);
  let youtube_id = "", video_url = "";
  if (vid) {
    youtube_id = parseYouTubeId(vid) ?? "";
    if (!youtube_id) {
      const file = videoFileLink(vid);
      if (!file) return { ok: false, message: "Use a YouTube link, or a direct video link ending in .mp4 or .webm." };
      video_url = file;
    }
  }
  const imageUrl = imageLink(str(fd, "image_url", 500));
  if (imageUrl === null) return { ok: false, message: "The image link must start with https://." };

  // Contacts: WhatsApp or phone is needed to post (except quick alerts and tips); "Show publicly" lets them show before verification.
  const whatsapp = str(fd, "contact_whatsapp", 30), phone = str(fd, "contact_phone", 30);
  const briefType = str(fd, "brief_type", 20);
  const contactOptional = hub === "briefs" && (briefType === "alert" || briefType === "tip");
  if (!contactOptional && !whatsapp && !phone) return { ok: false, message: "Add a contact or WhatsApp number (it's needed to post)." };
  const admin = fd.get("official") === "on" ? await appAdmin() : null;
  if (fd.get("official") === "on" && (!admin || !canApprovePublic(admin))) return { ok: false, message: "Only PAHAD admins with approval rights can publish a regulated circular." };

  const p: Omit<PlusPost, "id" | "image"> = {
    hub, brief_type: "", kind: "", stage: "", region, locality: str(fd, "locality", 80), title, summary, body: str(fd, "body", 4000),
    youtube_id, starts_at: "", ends_at: "",
    venue: str(fd, "venue", 160), organiser: str(fd, "organiser", 120), contact_phone: phone,
    contact_whatsapp: whatsapp, contact_email: str(fd, "contact_email", 160), contact_instagram: str(fd, "contact_instagram", 60).replace(/^@?/, "@").replace(/^@$/, ""),
    address: str(fd, "address", 240),
    website: links.website, link: links.link, map_link: links.map_link, reg_id: "",
    show_contacts: fd.get("show_contacts") === "on", video_url, pass_mode: "", official: false, spotlight: false,
    best_season: str(fd, "best_season", 80), hours: str(fd, "hours", 120), valid_until: "", deadline: "",
    status: "unverified", flags: 0, verified_by_name: "", verified_at: "", reject_reason: "",
    author_id: u.id, author_name: u.name, author_type: u.account_type, author_member: Boolean(u.member_id),
    pass_enabled: false, pass_capacity: 0, price: 0, likes: 0, supports: 0, created_at: now(), updated_at: now(),
  };

  if (hub === "events") {
    const starts = str(fd, "starts_at", 20);
    const ends = str(fd, "ends_at", 20);
    if (!DATETIME.test(starts)) return { ok: false, message: "Please add when the event starts." };
    if (starts.slice(0, 10) < today()) return { ok: false, message: "The event date has already passed." };
    if (ends && (!DATETIME.test(ends) || ends < starts)) return { ok: false, message: "The end time must be after the start." };
    p.starts_at = starts;
    p.ends_at = ends;
    // Free E-Passes: open once the event is verified (registration is locked until then).
    p.pass_enabled = fd.get("pass_enabled") === "on";
    p.pass_capacity = p.pass_enabled ? Math.min(Math.max(Math.round(Number(str(fd, "pass_capacity", 7)) || 0), 0), 100_000) : 0;
    // The organiser chooses: E-Passes issued instantly, or Pending until they (or PAHAD) approve each one.
    p.pass_mode = p.pass_enabled && fd.get("pass_mode") === "approval" ? "approval" : "";
    // Paid E-Passes: approved paid organisers only, when payments are switched on. Price fixed once posted.
    const rupeesAsked = Number(str(fd, "price", 8) || 0);
    if (p.pass_enabled && rupeesAsked > 0) {
      if (!paymentsConfigured || !(await isApprovedOrganiser(u.id))) return { ok: false, message: "Only organisers PAHAD has approved can sell E-Passes. Leave the price empty for free passes." };
      if (!Number.isFinite(rupeesAsked) || rupeesAsked < 10 || rupeesAsked > 50_000) return { ok: false, message: "Set a price between ₹10 and ₹50,000." };
      p.price = Math.round(rupeesAsked * 100);
    }
  } else if (hub === "roam") {
    const stage = str(fd, "stage", 20) || "open";
    if (!Object.hasOwn(ROAM_STAGES, stage)) return { ok: false, message: "Is it open to visitors, or being developed?" };
    p.stage = stage;
  } else if (hub === "business") {
    p.reg_id = str(fd, "reg_id", 40); // shown only once verified, like the address
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

  // Subcategory for every hub (e.g. Folk Music, Eco-Trail, Café, Cold-Chain).
  p.kind = str(fd, "kind", 60);
  // Events can carry an end; other hubs may give optional dates too.
  if (hub !== "events") {
    const st = str(fd, "starts_at", 20), en = str(fd, "ends_at", 20);
    if (st && DATETIME.test(st)) p.starts_at = st;
    if (en && DATETIME.test(en) && (!p.starts_at || en >= p.starts_at)) p.ends_at = en;
  }
  // Regulated admin circular: PAHAD's own post, published verified.
  if (admin) {
    p.official = true;
    p.author_name = "PAHAD";
    p.author_type = "organisation";
    p.status = canGrantFlagProof(admin) ? "flag_proof" : "verified";
    p.verified_by_name = admin.name;
    p.verified_at = now();
    p.show_contacts = true;
  }

  let image = imageUrl;
  try {
    image = (await fileFrom(fd, "image", "images")) ?? imageUrl;
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

// ------------------------------------------------------------------ likes and saves (user posts that are live)
export type ToggleState = { ok: boolean; message: string; on?: boolean; count?: number };

async function livePostFor(postId: string) {
  const p = await db.get("plus_posts", postId);
  return p && ["unverified", "verified", "flag_proof"].includes(p.status) ? p : null;
}

export async function toggleLike(postId: string): Promise<ToggleState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Sign in to like posts." };
  const p = await livePostFor(postId);
  if (!p) return { ok: false, message: "This post is no longer available." };
  const id = `${postId}:${u.id}`;
  const had = Boolean(await db.get("plus_likes", id));
  if (had) await db.remove("plus_likes", id);
  else await db.insert("plus_likes", { id, post_id: postId, user_id: u.id, created_at: now() }).catch(() => null); // a double tap
  const count = (await db.findBy("plus_likes", "post_id", postId)).length;
  await db.update("plus_posts", postId, { likes: count });
  updateTag("plus");
  return { ok: true, message: had ? "Like removed." : "Liked.", on: !had, count };
}

export async function toggleSave(postId: string): Promise<ToggleState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Sign in to save posts." };
  if (!(await livePostFor(postId))) return { ok: false, message: "This post is no longer available." };
  const id = `${postId}:${u.id}`;
  const had = Boolean(await db.get("plus_saves", id));
  if (had) await db.remove("plus_saves", id);
  else await db.insert("plus_saves", { id, post_id: postId, user_id: u.id, created_at: now() }).catch(() => null);
  return { ok: true, message: had ? "Removed from Saved." : "Saved. Find it on Me → Saved.", on: !had };
}

/** "Support": vouch that a post is genuine. One per person per post; the count helps PAHAD's verifiers. */
export async function toggleSupport(postId: string): Promise<ToggleState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Sign in to support posts." };
  const p = await livePostFor(postId);
  if (!p) return { ok: false, message: "This post is no longer available." };
  if (p.author_id === u.id) return { ok: false, message: "You can't support your own post." };
  const id = `${postId}:${u.id}`;
  const had = Boolean(await db.get("plus_supports", id));
  if (had) await db.remove("plus_supports", id);
  else await db.insert("plus_supports", { id, post_id: postId, user_id: u.id, created_at: now() }).catch(() => null);
  const count = (await db.findBy("plus_supports", "post_id", postId)).length;
  await db.update("plus_posts", postId, { supports: count });
  // Tell the poster about their first support, and when the post becomes Authentic (more than 5 supports).
  if (!had && (count === 1 || count === AUTHENTIC_SUPPORTS + 1)) {
    after(() => notifyPlus(p.author_id, count === 1
      ? { kind: "support", title: "Someone supported your post", body: `${u.name} vouched that “${p.title}” is genuine.`, url: `/plus/${postId}` }
      : { kind: "support", title: "Your post is now Authentic ✓", body: `More than ${AUTHENTIC_SUPPORTS} people support “${p.title}”.`, url: `/plus/${postId}` }));
  }
  updateTag("plus");
  return { ok: true, message: had ? "Support removed." : "Thanks for vouching for this post.", on: !had, count };
}

/** Follow an account: its posts appear in your Following tab. */
export async function toggleFollow(authorId: string): Promise<ToggleState> {
  const u = await getPlusUser();
  if (!u) return { ok: false, message: "Sign in to follow accounts." };
  if (!authorId || authorId === u.id) return { ok: false, message: "You can't follow this account." };
  if (!(await db.get("plus_users", authorId))) return { ok: false, message: "This account no longer exists." };
  const id = `${u.id}:${authorId}`;
  const had = Boolean(await db.get("plus_follows", id));
  if (had) await db.remove("plus_follows", id);
  else {
    await db.insert("plus_follows", { id, follower_id: u.id, followee_id: authorId, created_at: now() }).catch(() => null);
    after(() => notifyPlus(authorId, { kind: "support", title: "New follower", body: `${u.name} started following you on PAHAD+.`, url: `/plus/u/${u.id}` }));
  }
  return { ok: true, message: had ? "Unfollowed." : "Following. Their posts appear in your Following tab.", on: !had };
}
