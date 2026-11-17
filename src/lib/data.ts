import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { onPage, todayInIndia } from "./placements";
import { phaseOf, tally, type Tally } from "./polls";
import type { FeaturedKind, PageKey, Poll, Post, PostType, Video } from "./types";
import { POST_TYPE_LABEL, POST_TYPE_PATH } from "./utils";
import { youTubeThumb, youTubeWatchUrl } from "./youtube";

/** settings row: "off" turns the whole Featured section off; anything else is on. */
export const FEATURED_SWITCH = "featured:enabled";

/** Members Only posts never leave the server for signed-out visitors: every public list filters them out here. */
export const isPublicPost = (p: Pick<Post, "visibility">) => p.visibility !== "members";

// Public, cached reads. Admin actions call updateTag(...) so changes show at once.

export async function getPublishedPosts(type?: PostType, limit?: number): Promise<Post[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  const all = await db.all("posts");
  const rows = all
    .filter((p) => p.status === "published" && isPublicPost(p) && (!type || p.type === type))
    .sort((a, b) => (b.published_at || b.created_at).localeCompare(a.published_at || a.created_at));
  return limit ? rows.slice(0, limit) : rows;
}

export async function getUpcomingEvents(limit?: number): Promise<{ today: Post[]; upcoming: Post[]; past: Post[] }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  const events = (await db.all("posts")).filter((p) => p.type === "event" && p.status === "published" && isPublicPost(p));
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD in India
  const upcoming = events.filter((e) => (e.event_date || "") >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const past = events.filter((e) => (e.event_date || "") < today).sort((a, b) => b.event_date.localeCompare(a.event_date));
  return { today: upcoming.filter((e) => e.event_date === today), upcoming: limit ? upcoming.slice(0, limit) : upcoming, past };
}

/**
 * Published Members Only posts open to every signed-in account. Training Material limited to
 * certain levels is left out (see getTrainingPosts). Only call this after checking the visitor is signed in.
 */
export async function getMembersOnlyPosts(type?: PostType): Promise<Post[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  return (await db.all("posts"))
    .filter((p) => p.status === "published" && !isPublicPost(p) && (!type || p.type === type) && !p.audience)
    .sort((a, b) => (b.published_at || b.created_at).localeCompare(a.published_at || a.created_at));
}

/** All published Training Material. Callers must filter each item with canSeePost(user, post). */
export async function getTrainingPosts(): Promise<Post[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  return (await db.all("posts"))
    .filter((p) => p.status === "published" && p.type === "training")
    .sort((a, b) => (b.published_at || b.created_at).localeCompare(a.published_at || a.created_at));
}

/** A published post of any visibility. Callers must gate Members Only content (see PostDetail). */
export async function getPostBySlug(slug: string): Promise<Post | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  const rows = await db.findBy("posts", "slug", slug);
  return rows.find((p) => p.status === "published") ?? null;
}

export async function getPartners() {
  "use cache";
  cacheLife("hours");
  cacheTag("partners");
  return (await db.all("partners")).sort((a, b) => a.sort - b.sort);
}

/** Directorates that are switched ON in Admin → Structure. */
export async function getActiveDirectorates(): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("units");
  return (await db.all("units")).filter((u) => u.kind === "directorate" && u.active).sort((a, b) => a.sort - b.sort).map((u) => u.name);
}

/** Hero image chosen by a Super Admin for each page, keyed by setting id ("hero:about"). */
export async function getSiteImages(): Promise<Record<string, string>> {
  "use cache";
  cacheLife("hours");
  cacheTag("settings");
  return Object.fromEntries((await db.all("settings")).filter((s) => s.id.startsWith("hero:") && s.value).map((s) => [s.id, s.value]));
}

export async function getTeam() {
  "use cache";
  cacheLife("hours");
  cacheTag("team");
  return (await db.all("team")).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
}

export async function getMedia() {
  "use cache";
  cacheLife("minutes");
  cacheTag("media");
  return db.all("media");
}

// ------------------------------------------------------------------ videos and featured content
/** Approved videos switched ON for a page. Admin changes call updateTag("videos"). */
export async function getPageVideos(page: PageKey): Promise<Video[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("videos");
  return (await db.all("videos"))
    .filter((v) => v.status === "approved" && v.visible && onPage(v.pages, page))
    .sort((a, b) => a.sort - b.sort || b.created_at.localeCompare(a.created_at));
}

/** All approved, visible videos (for search). */
export async function getPublishedVideos(): Promise<Video[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("videos");
  return (await db.all("videos")).filter((v) => v.status === "approved" && v.visible);
}

export type FeaturedCard = { id: string; kind: FeaturedKind; label: string; title: string; text: string; image: string; href: string; external: boolean; youtubeId: string };

/**
 * Featured items for a page, resolved to cards. Only approved / published content is used.
 * Members Only posts come back in `members` and must only be rendered inside <MembersOnly>.
 */
export async function getPageFeatured(page: PageKey): Promise<{ public: FeaturedCard[]; members: FeaturedCard[] }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("featured");
  cacheTag("posts");
  cacheTag("videos");
  cacheTag("team");
  cacheTag("settings");
  const empty = { public: [], members: [] };
  if ((await db.get("settings", FEATURED_SWITCH))?.value === "off") return empty;
  const today = todayInIndia();
  const items = (await db.all("featured"))
    .filter((f) => f.active && onPage(f.pages, page) && (!f.starts_on || f.starts_on <= today) && (!f.ends_on || f.ends_on >= today))
    .sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at));
  if (items.length === 0) return empty;

  const [posts, videos, team] = await Promise.all([db.all("posts"), db.all("videos"), db.all("team")]);
  const out = { public: [] as FeaturedCard[], members: [] as FeaturedCard[] };
  for (const f of items) {
    const base = { id: f.id, kind: f.kind, external: false, youtubeId: "" };
    if (f.kind === "post") {
      const p = posts.find((x) => x.id === f.ref_id && x.status === "published");
      if (!p || p.type === "document" || p.audience) continue;
      const card = { ...base, label: POST_TYPE_LABEL[p.type], title: f.title || p.title, text: f.text || p.excerpt, image: p.cover, href: `${POST_TYPE_PATH[p.type]}/${p.slug}` };
      (isPublicPost(p) ? out.public : out.members).push(card);
    } else if (f.kind === "video") {
      const v = videos.find((x) => x.id === f.ref_id && x.status === "approved" && x.visible);
      if (!v) continue;
      out.public.push({ ...base, label: "Video", title: f.title || v.title, text: f.text || v.description, image: youTubeThumb(v.youtube_id), href: youTubeWatchUrl(v.youtube_id), external: true, youtubeId: v.youtube_id });
    } else if (f.kind === "person") {
      const t = team.find((x) => x.id === f.ref_id);
      if (!t) continue;
      out.public.push({ ...base, label: t.designation || "Our team", title: f.title || t.name, text: f.text || [t.section, t.department].filter(Boolean).join(" · "), image: t.photo_url, href: f.link || "/team" });
    } else {
      out.public.push({ ...base, label: "Announcement", title: f.title, text: f.text, image: f.image, href: f.link, external: /^https?:\/\//.test(f.link) });
    }
  }
  return out;
}

// ------------------------------------------------------------------ voting
/** Closed polls whose results the President has authorised for the website. Admin changes call updateTag("polls"). */
export async function getPublicPollResults(): Promise<{ poll: Poll; tally: Tally }[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("polls");
  const polls = (await db.all("polls")).filter(
    (p) => p.results_visibility === "public" && p.public_authorized && !p.archived && phaseOf(p) === "closed",
  );
  return Promise.all(
    polls.map(async (poll) => {
      const [voters, receipts, ballots] = await Promise.all([db.findBy("poll_voters", "poll_id", poll.id), db.findBy("poll_receipts", "poll_id", poll.id), db.findBy("ballots", "poll_id", poll.id)]);
      const t = tally(poll, voters, receipts, ballots);
      // The public page never needs names of who did or didn't vote.
      return { poll, tally: { ...t, notVoted: [] } };
    }),
  );
}
