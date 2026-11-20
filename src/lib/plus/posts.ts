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
  createdAt: string;
  href: string;
  /** Only when verified. */
  locked: null | {
    venue: string; organiser: string; phone: string; whatsapp: string; email: string; address: string; website: string; link: string; mapLink: string;
  };
};

export function toCard(p: PlusPost): PlusCard {
  const verified = isVerifiedPlus(p);
  const isAlert = p.hub === "briefs" && p.brief_type === "alert";
  return {
    id: p.id, source: "user", hub: p.hub as PlusHub, briefType: (p.brief_type as BriefType) || "", kind: p.kind, stage: p.stage,
    region: p.region, locality: p.locality, title: p.title, summary: p.summary,
    body: verified || isAlert ? p.body : "",
    image: p.image, youtubeId: p.youtube_id, startsAt: p.starts_at, endsAt: p.ends_at, validUntil: p.valid_until, deadline: p.deadline,
    bestSeason: p.best_season, hours: p.hours, verified, flagProof: p.status === "flag_proof",
    authorName: p.author_name, authorType: p.author_type, authorId: p.author_id, createdAt: p.created_at, href: `/plus/${p.id}`,
    locked: verified
      ? { venue: p.venue, organiser: p.organiser, phone: p.contact_phone, whatsapp: p.contact_whatsapp, email: p.contact_email, address: p.address, website: p.website, link: p.link, mapLink: p.map_link }
      : null,
  };
}

/** PAHAD's own content in PAHAD+: published public posts the President (or an approver) approved for PAHAD+. */
function pahadPostCard(p: Post): PlusCard {
  const hub: PlusHub = p.type === "event" || p.type === "programme" ? "events" : "briefs";
  return {
    id: `pahad-${p.id}`, source: "pahad", hub, briefType: hub === "briefs" ? "tip" : "", kind: "", stage: "", region: "Darjeeling", locality: p.location || "PAHAD",
    title: p.title, summary: p.excerpt, body: "", image: p.cover, youtubeId: "", startsAt: p.event_date, endsAt: "", validUntil: "", deadline: "",
    bestSeason: "", hours: "", verified: true, flagProof: true, authorName: "PAHAD", authorType: "organisation", authorId: "", createdAt: p.published_at || p.created_at,
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
    authorName: "PAHAD", authorType: "organisation", authorId: "", createdAt: c.created_at, href: `/plus/c/${c.id}`, locked: null,
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

export type PlusFilters = { tab: "foryou" | "pahad"; hub?: PlusHub; region?: string; type?: BriefType; q?: string };

/**
 * The feed: live user posts (minus authors the viewer blocked) plus PAHAD's approved content.
 * Alerts come first, then newest.
 */
export async function plusFeed(f: PlusFilters, blocked: Set<string> = new Set()): Promise<PlusCard[]> {
  const [posts, pahad] = await Promise.all([f.tab === "pahad" ? Promise.resolve([]) : getLivePlusPosts(), getPahadPlusCards()]);
  const q = f.q?.toLowerCase().trim();
  const cards = [...posts.filter((p) => !blocked.has(p.author_id)).map(toCard), ...pahad].filter(
    (c) =>
      (!f.hub || c.hub === f.hub) &&
      (!f.region || c.source === "pahad" || c.region === f.region) &&
      (!f.type || c.briefType === f.type) &&
      (!q || `${c.title} ${c.summary} ${c.locality} ${c.region} ${PLUS_HUBS[c.hub].label} ${c.briefType ? BRIEF_TYPES[c.briefType].label : ""}`.toLowerCase().includes(q)),
  );
  const alertFirst = (c: PlusCard) => (c.briefType === "alert" ? 0 : 1);
  return cards.sort((a, b) => alertFirst(a) - alertFirst(b) || b.createdAt.localeCompare(a.createdAt));
}

/** One user post, whatever its status (callers decide what to show). */
export async function getPlusPost(id: string): Promise<PlusPost | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("plus");
  return (await db.get("plus_posts", id)) ?? null;
}
