import "server-only";
import { cacheLife, cacheTag } from "next/cache";

/**
 * Headlines from Khabar Darjeeling (khabardarjeeling.in), PAHAD's news partner, read from its RSS
 * feed. Each one links back to the full article on khabardarjeeling.in. Refreshed about once an hour.
 */
export const KHABAR_URL = "https://khabardarjeeling.in";
const FEED = `${KHABAR_URL}/rss.xml`;

export type KhabarItem = { title: string; link: string; date: string; category: string; excerpt: string; image: string };

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&")
    .trim();

/** Plain text for card excerpts: drops markdown marks (**, ##, *, links) the feed includes. */
const plain = (s: string) =>
  decode(s)
    .replace(/<[^>]+>/g, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[#*_`>]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? "";

/** Only links and photos from Khabar Darjeeling's own addresses are used. */
const isKhabarLink = (u: string) => /^https:\/\/khabardarjeeling\.in\/[\w\-/.?=&%]*$/.test(u);
const isKhabarImage = (u: string) => /^https:\/\/(khabardarjeeling\.in|khabar-worker\.limbunowan1234\.workers\.dev)\/[\w\-/.%]+\.(jpe?g|png|webp|gif|avif)$/i.test(u);

async function articleImage(link: string): Promise<string> {
  try {
    const html = await (await fetch(link, { signal: AbortSignal.timeout(6000), headers: { "User-Agent": "PAHAD website (pahad.org)" } })).text();
    const og = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)?.[1] ?? "";
    return isKhabarImage(og) ? og : "";
  } catch {
    return "";
  }
}

/** The latest headlines (newest first), with photos for the first few. Empty if the feed can't be read. */
export async function getKhabarHeadlines(limit = 24, withImages = 12): Promise<KhabarItem[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("khabar");
  try {
    const res = await fetch(FEED, { signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "PAHAD website (pahad.org)" } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
      .map(([, it]) => {
        const link = decode(tag(it, "link"));
        const excerpt = plain(tag(it, "description"));
        const pub = new Date(decode(tag(it, "pubDate")));
        return {
          title: plain(tag(it, "title")).slice(0, 200),
          link,
          date: Number.isNaN(pub.getTime()) ? "" : pub.toISOString(),
          category: plain(tag(it, "category")).slice(0, 40),
          excerpt: excerpt.length > 180 ? `${excerpt.slice(0, 179).replace(/\s+\S*$/, "")}…` : excerpt,
          image: "",
        };
      })
      .filter((i) => i.title && isKhabarLink(i.link))
      .slice(0, limit);
    const images = await Promise.all(items.slice(0, withImages).map((i) => articleImage(i.link)));
    images.forEach((img, n) => (items[n].image = img));
    return items;
  } catch (error) {
    console.error("Khabar Darjeeling feed could not be read", error);
    return [];
  }
}
