import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "../db";
import type { Circular, PlusPost, Post } from "../types";
import { POST_TYPE_PATH } from "../utils";
import { BRIEF_TYPES, PLUS_HUBS, PLUS_RULES, type BriefType, type PlusHub } from "./config";

/** The current time for a request-time render (pages call this after reading the request, so it is per request). */
export const requestTime = () => Date.now();

export const isVerifiedPlus = (p: Pick<PlusPost, "status">) => p.status === "verified" || p.status === "flag_proof";
const LIVE = new Set(["unverified", "verified", "flag_proof"]);
const endOfDayIst = (date: string) => Date.parse(`${date}T23:59:59+05:30`);

/** Is the post in the public feed right now? Covers status, the 14-day unverified limit, alert expiry and deadlines. */
export function isLivePlus(p: PlusPost, at = Date.now()): boolean {
  if (!LIVE.has(p.status)) return false;
  if (p.status === "unverified" && at - Date.parse(p.created_at) > PLUS_RULES.unverifiedDays * 86_400_000) return false;
  if (p.valid_until && Date.parse(p.valid_until) <= at) return false;
  if (p.deadline && endOfDayIst(p.deadline) < at) return false;
  if (p.hub === "events") {
    const last = (p.ends_at || p.starts_at).slice(0, 10);
    if (last && endOfDayIst(last) < at) return false;
  }
  return true;
}

/**
 * What anyone may see of a post. Unverified posts carry only the basics: the fields that let people contact,
 * book, register or apply are left out entirely, so they never reach the browser. Alerts are time-critical,
 * so their text is shown in full.
 */
export type PlusCard = {
  id: string;
  source: "user" | "pahad";
  hub: PlusHub;
  briefType: BriefType | "";
  kind: string;
  stage: string;
  region: string;
  locality: string;
  title: string;
  summary: string;
  body: string;
  image: string;
  youtubeId: string;
  startsAt: string;
  endsAt: string;
  validUntil: string;
  deadline: string;
  bestSeason: string;
  hours: string;
  verified: boolean;
  flagProof: boolean;
  authorName: string;
  authorType: string;
  authorId: string;
  /** The poster linked their PAHAD membership. */
  authorMember: boolean;
  /** C1 Creator / H1 Honorary Member: the poster's PAHAD+ account is linked to such a PAHAD dashboard account. */
  authorBadge: AuthorBadge;
  /** PAHAD has confirmed who the poster is: a linked PAHAD member or an approved paid organiser. */
  authentic: boolean;
  likes: number;
  supports: number;
  /** Community reports so far (a post is held at PLUS_RULES.flagsToHold unless Flag-Proof). */
  flags: number;
  /** Events offering E-Passes; price in paise (0 = free). */
  passEnabled: boolean;
  price: number;
  createdAt: string;
  href: string;
  /** Only when verified. */
  /**
   * Contact and booking details, or null when none may be shown. Contacts (phone, WhatsApp, email, Instagram, venue,
   * address) show once verified, or before that if the poster switched on "Show publicly". Links and the registration ID
   * (website, booking / registration / apply link, map) always wait for verification.
   */
  locked: null | {
    venue: string; organiser: string; phone: string; whatsapp: string; email: string; instagram: string; address: string; website: string; link: string; mapLink: string; regId: string;
  };
  /** Contacts shown before PAHAD verified the post (the app warns people to check first). */
  contactsUnverified: boolean;
  videoUrl: string;
  official: boolean;
  spotlight: boolean;
  /** Events: E-Passes need approval. */
  passApproval: boolean;
};

/** Authentic: more than 5 people support the post, or PAHAD confirmed who the poster is. */
export const AUTHENTIC_SUPPORTS = 5;

export function toCard(p: PlusPost): PlusCard {
  const verified = isVerifiedPlus(p);
  const isAlert = p.hub === "briefs" && p.brief_type === "alert";
  const contacts = verified || p.show_contacts;
  return {
    id: p.id, source: "user", hub: p.hub as PlusHub, briefType: (p.brief_type as BriefType) || "", kind: p.kind, stage: p.stage,
    region: p.region, locality: p.locality, title: p.title, summary: p.summary,
    body: verified || isAlert || p.show_contacts ? p.body : "",
    image: p.image, youtubeId: p.youtube_id, startsAt: p.starts_at, endsAt: p.ends_at, validUntil: p.valid_until, deadline: p.deadline,
    bestSeason: p.best_season, hours: p.hours, verified, flagProof: p.status === "flag_proof",
    authorName: p.author_name, authorType: p.author_type, authorId: p.author_id, authorMember: p.author_member, authorBadge: "", authentic: p.author_member || p.supports > AUTHENTIC_SUPPORTS || p.official, likes: p.likes, supports: p.supports, flags: p.flags,
    passEnabled: p.hub === "events" && p.pass_enabled, price: p.price, createdAt: p.created_at, href: `/plus/${p.id}`,
    locked: contacts
      ? {
          venue: p.venue, organiser: p.organiser, phone: p.contact_phone, whatsapp: p.contact_whatsapp, email: p.contact_email, instagram: p.contact_instagram, address: p.address,
          website: verified ? p.website : "", link: verified ? p.link : "", mapLink: verified ? p.map_link : "", regId: verified ? p.reg_id : "",
        }
      : null,
    contactsUnverified: !verified && p.show_contacts,
    videoUrl: p.video_url, official: p.official, spotlight: p.spotlight, passApproval: p.pass_mode === "approval",
  };
}

/** PAHAD's own content in PAHAD+: published public posts the President (or an approver) approved for PAHAD+. */
function pahadPostCard(p: Post): PlusCard {
  const hub: PlusHub = p.type === "event" || p.type === "programme" ? "events" : "briefs";
  return {
    id: `pahad-${p.id}`, source: "pahad", hub, briefType: hub === "briefs" ? "tip" : "", kind: "", stage: "", region: "Darjeeling", locality: p.location || "PAHAD",
    title: p.title, summary: p.excerpt, body: "", image: p.cover, youtubeId: "", startsAt: p.event_date, endsAt: "", validUntil: "", deadline: "",
    bestSeason: "", hours: "", verified: true, flagProof: true, authorName: "PAHAD", authorType: "organisation", authorId: "", authorMember: false, authorBadge: "", authentic: true, likes: 0, supports: 0, flags: 0, passEnabled: false, price: 0, contactsUnverified: false, videoUrl: "", official: true, spotlight: false, passApproval: false, createdAt: p.published_at || p.created_at,
    href: `${POST_TYPE_PATH[p.type]}/${p.slug}`, locked: null,
  };
}

/** Circulars approved as public become "Policy & Assembly Summaries". */
function circularCard(c: Circular): PlusCard {
  const text = c.body.replace(/^#+\s|^-\s/gm, "").replace(/\s+/g, " ").trim();
  return {
    id: `circular-${c.id}`, source: "pahad", hub: "briefs", briefType: "policy", kind: "", stage: "", region: "Darjeeling", locality: "PAHAD",
    title: c.title, summary: text.length > 220 ? `${text.slice(0, 219).replace(/\s+\S*$/, "")}…` : text, body: "", image: "", youtubeId: "",
    startsAt: "", endsAt: "", validUntil: "", deadline: "", bestSeason: "", hours: "", verified: true, flagProof: true,
    authorName: "PAHAD", authorType: "organisation", authorId: "", authorMember: false, authorBadge: "", authentic: true, likes: 0, supports: 0, flags: 0, passEnabled: false, price: 0, contactsUnverified: false, videoUrl: "", official: true, spotlight: false, passApproval: false, createdAt: c.created_at, href: `/plus/c/${c.id}`, locked: null,
  };
}

// ------------------------------------------------------------------ cached reads (tag "plus"; admin actions call updateTag)
export async function getLivePlusPosts(): Promise<PlusPost[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("plus");
  const at = Date.now();
  return (await db.all("plus_posts")).filter((p) => isLivePlus(p, at));
}

export async function getPahadPlusCards(): Promise<PlusCard[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("plus");
  cacheTag("posts");
  const [posts, circulars] = await Promise.all([db.all("posts"), db.all("circulars")]);
  return [
    ...posts.filter((p) => p.status === "published" && p.plus_approved && (p.visibility === "public" || !p.visibility) && p.type !== "document" && p.type !== "training").map(pahadPostCard),
    ...circulars.filter((c) => c.visibility === "public").map(circularCard),
  ];
}

export async function getPublicCircular(id: string): Promise<Circular | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("plus");
  const c = await db.get("circulars", id);
  return c && c.visibility === "public" ? c : null;
}

export type PlusTab = "community" | "following" | "foryou" | "pahad";
export type PlusFilters = { tab: PlusTab; hub?: PlusHub | "jobs"; region?: string; type?: BriefType; q?: string };

/** Approved paid organisers (their posts count as Authentic). */
async function approvedOrganisers(): Promise<Set<string>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("plus");
  return new Set((await db.all("plus_organisers")).filter((o) => o.status === "approved").map((o) => o.id));
}

export type AuthorBadge = "" | "creator" | "honorary";
export const AUTHOR_BADGE: Record<Exclude<AuthorBadge, "">, string> = { creator: "🎨 Creator", honorary: "H1 Honorary" };

/** PAHAD+ accounts linked to an active C1 Creator or H1 Honorary Member dashboard account. */
export async function associateBadges(): Promise<Map<string, Exclude<AuthorBadge, "">>> {
  "use cache";
  cacheLife("minutes");
  cacheTag("plus");
  const users = new Map((await db.all("users")).filter((u) => u.active && (u.role === "creator" || u.role === "honorary")).map((u) => [u.id, u.role as "creator" | "honorary"]));
  const out = new Map<string, "creator" | "honorary">();
  for (const pu of await db.all("plus_users")) { const r = pu.admin_user_id && users.get(pu.admin_user_id); if (r) out.set(pu.id, r); }
  return out;
}

/** Marks posts from confirmed people as Authentic (approved organisers, C1 Creators and H1 Honorary Members), with their badge. */
export async function withAuthentic(cards: PlusCard[]): Promise<PlusCard[]> {
  const [orgs, badges] = await Promise.all([approvedOrganisers(), associateBadges()]);
  return cards.map((c) => {
    if (c.source !== "user") return c;
    const badge = badges.get(c.authorId) ?? "";
    return { ...c, authorBadge: badge, authentic: c.authentic || orgs.has(c.authorId) || Boolean(badge) };
  });
}

/** For You: what the community is backing (likes, support, verification), favouring recent posts. */
function forYouScore(c: PlusCard, at: number) {
  const hours = Math.max(0, (at - Date.parse(c.createdAt)) / 3_600_000);
  const weight = 1 + c.likes + 2 * c.supports + (c.verified ? 3 : 0) + (c.source === "pahad" ? 2 : 0);
  return weight / Math.pow(hours + 6, 0.8);
}

/**
 * The feed: live user posts (minus authors the viewer blocked) plus PAHAD's approved content.
 * Community: everything, newest first. Following: accounts the viewer follows. For You: ranked. PAHAD (⭐): official posts.
 * Alerts always come first.
 */
export async function plusFeed(f: PlusFilters, blocked: Set<string> = new Set(), following: Set<string> = new Set()): Promise<PlusCard[]> {
  const [all, pahad] = await Promise.all([getLivePlusPosts(), f.tab === "following" ? Promise.resolve([]) : getPahadPlusCards()]);
  // ⭐ PAHAD's picks: PAHAD's own content, including circulars admins published from the app.
  const posts = f.tab === "pahad" ? all.filter((p) => p.official) : all;
  const q = f.q?.toLowerCase().trim();
  const cards = await withAuthentic([...posts.filter((p) => !blocked.has(p.author_id) && (f.tab !== "following" || following.has(p.author_id))).map(toCard), ...pahad].filter(
    (c) =>
      (!f.hub || (f.hub === "jobs" ? c.briefType === "job" : c.hub === f.hub)) &&
      (!f.region || c.source === "pahad" || c.region === f.region) &&
      (!f.type || c.briefType === f.type) &&
      (!q || `${c.title} ${c.summary} ${c.locality} ${c.region} ${c.kind} ${PLUS_HUBS[c.hub].label} ${c.briefType ? BRIEF_TYPES[c.briefType].label : ""}`.toLowerCase().includes(q)),
  ));
  const alertFirst = (c: PlusCard) => (c.briefType === "alert" ? 0 : 1);
  // Only For You needs the clock (other feeds can be prerendered).
  const at = f.tab === "foryou" ? Date.now() : 0;
  return cards.sort((a, b) => alertFirst(a) - alertFirst(b) || (f.tab === "foryou" ? forYouScore(b, at) - forYouScore(a, at) : b.createdAt.localeCompare(a.createdAt)));
}

/** One user post, whatever its status (callers decide what to show). */
export async function getPlusPost(id: string): Promise<PlusPost | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("plus");
  return (await db.get("plus_posts", id)) ?? null;
}
