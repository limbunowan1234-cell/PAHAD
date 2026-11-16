import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import type { Post, PostType } from "./types";

// Public, cached reads. Admin actions call updateTag(...) so changes show at once.

export async function getPublishedPosts(type?: PostType, limit?: number): Promise<Post[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  const all = await db.all("posts");
  const rows = all
    .filter((p) => p.status === "published" && (!type || p.type === type))
    .sort((a, b) => (b.published_at || b.created_at).localeCompare(a.published_at || a.created_at));
  return limit ? rows.slice(0, limit) : rows;
}

export async function getUpcomingEvents(limit?: number): Promise<{ today: Post[]; upcoming: Post[]; past: Post[] }> {
  "use cache";
  cacheLife("minutes");
  cacheTag("posts");
  const events = (await db.all("posts")).filter((p) => p.type === "event" && p.status === "published");
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }); // YYYY-MM-DD in India
  const upcoming = events.filter((e) => (e.event_date || "") >= today).sort((a, b) => a.event_date.localeCompare(b.event_date));
  const past = events.filter((e) => (e.event_date || "") < today).sort((a, b) => b.event_date.localeCompare(a.event_date));
  return { today: upcoming.filter((e) => e.event_date === today), upcoming: limit ? upcoming.slice(0, limit) : upcoming, past };
}

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
