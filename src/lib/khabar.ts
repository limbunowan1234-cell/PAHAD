import "server-only";
import { cacheLife, cacheTag } from "next/cache";

/**
 * News from Khabar Darjeeling (khabardarjeeling.in), PAHAD's news partner. Each story links back to the full
 * article on khabardarjeeling.in. Refreshed about once an hour.
 *
 * Only local news is shown: stories whose district (or area) is Darjeeling, Kalimpong, Kurseong or Siliguri.
 * Sikkim, general West Bengal, national and world stories are left out. Khabar's Featured stories come first.
 *
 * Khabar's RSS feed gives the latest stories but not their district, so the district and the Featured flag are read
 * from the article data in Khabar's own pages (the homepage first, then each remaining article page).
 */
export const KHABAR_URL = "https://khabardarjeeling.in";
const FEED = `${KHABAR_URL}/rss.xml`;
const IMAGES = "https://khabar-worker.limbunowan1234.workers.dev/cdn/articles";
const UA = { "User-Agent": "PAHAD website (pahad.org)" };

/** The districts PAHAD shows. Matched against Khabar's locationDistrict and locationArea. */
export const KHABAR_REGIONS = ["Darjeeling", "Kalimpong", "Kurseong", "Siliguri"] as const;

export type KhabarItem = { title: string; link: string; date: string; category: string; excerpt: string; image: string; region: string; featured: boolean };

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

const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : s);
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"))?.[1] ?? "";

/** Only links and photos from Khabar Darjeeling's own addresses are used. */
const isKhabarLink = (u: string) => /^https:\/\/khabardarjeeling\.in\/[\w\-/.?=&%]*$/.test(u);
const isKhabarImage = (u: string) => /^https:\/\/(khabardarjeeling\.in|khabar-worker\.limbunowan1234\.workers\.dev)\/[\w\-/.%]+\.(jpe?g|png|webp|gif|avif)$/i.test(u);
const articleId = (link: string) => link.match(/\/article\/([0-9a-f-]{36})/i)?.[1] ?? "";

/** What Khabar's page data says about one article. */
type Meta = { district: string; area: string; featured: boolean; image: string; genre: string; sideHeader: string; title: string; publishedAt: string; status: string };

/** Reads article objects ({"$id": …, "locationDistrict": …}) from the data embedded in a Khabar page. */
function metaFromPage(html: string): Map<string, Meta> {
  const s = html.replace(/\\"/g, '"');
  const out = new Map<string, Meta>();
  for (const m of s.matchAll(/\{"\$id":"([0-9a-f-]{36})"/g)) {
    const seg = s.slice(m.index, m.index + 8000);
    const field = (k: string) => {
      const f = seg.match(new RegExp(`"${k}":("((?:[^"\\\\]|\\\\.)*)"|true|false|null)`));
      return !f ? undefined : f[2] !== undefined ? f[2] : f[1];
    };
    if (field("locationDistrict") === undefined || out.has(m[1])) continue;
    const str = (k: string) => {
      const v = field(k);
      return v && v !== "null" ? v : "";
    };
    out.set(m[1], {
      district: str("locationDistrict"),
      area: str("locationArea"),
      featured: field("isFeatured") === "true",
      image: str("imageFileId"),
      genre: str("genre"),
      sideHeader: str("sideHeader"),
      title: str("title"),
      publishedAt: str("publishedAt"),
      status: str("status"),
    });
  }
  return out;
}

async function fetchText(url: string, ms: number) {
  const res = await fetch(url, { signal: AbortSignal.timeout(ms), headers: UA });
  return res.ok ? res.text() : "";
}

/** Places outside the four districts, for stories Khabar filed under a district without a specific area. */
const ELSEWHERE = /\b(sikkim|gangtok|namchi|mangan|shillong|meghalaya|assam|guwahati|nepal|kathmandu|bhutan|thimphu|kolkata|delhi|mumbai|bangladesh|china|pakistan|world|global)\b/i;
const LOCAL = new RegExp(`\\b(${KHABAR_REGIONS.join("|")})\\b`, "i");

/** The local district a story belongs to ("" = not one PAHAD shows). */
function regionOf(m: Meta | undefined, title: string): string {
  if (!m) return "";
  const where = `${m.district} ${m.area}`.toLowerCase();
  if (/\bsikkim\b|gangtok/.test(where)) return "";
  const region = KHABAR_REGIONS.find((r) => where.includes(r.toLowerCase())) ?? "";
  // No specific area: the district may just be Khabar's default, so check the headline isn't about somewhere else.
  if (region && !m.area && ELSEWHERE.test(title) && !LOCAL.test(title)) return "";
  return region;
}

/** Runs async work a few at a time (polite to Khabar's server). */
async function inBatches<T>(items: T[], size: number, fn: (x: T) => Promise<void>) {
  for (let i = 0; i < items.length; i += size) await Promise.all(items.slice(i, i + size).map(fn));
}

/** Local news, newest first: { featured, local }. Empty lists if Khabar can't be reached. */
export async function getKhabarNews(): Promise<{ featured: KhabarItem[]; local: KhabarItem[] }> {
  "use cache";
  cacheLife("hours");
  cacheTag("khabar");
  try {
    const [xml, home] = await Promise.all([fetchText(FEED, 10_000), fetchText(KHABAR_URL, 10_000).catch(() => "")]);
    if (!xml) return { featured: [], local: [] };
    const meta = metaFromPage(home);

    const feed = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
      .map(([, it]) => {
        const link = decode(tag(it, "link"));
        const pub = new Date(decode(tag(it, "pubDate")));
        return {
          id: articleId(link),
          link,
          title: clip(plain(tag(it, "title")), 200),
          excerpt: clip(plain(tag(it, "description")), 180),
          date: Number.isNaN(pub.getTime()) ? "" : pub.toISOString(),
          category: clip(plain(tag(it, "category")), 40),
        };
      })
      .filter((i) => i.title && i.id && isKhabarLink(i.link));

    // Published stories on Khabar's homepage that the feed doesn't list yet (the feed can lag behind).
    const inFeed = new Set(feed.map((i) => i.id));
    for (const [id, m] of meta) {
      if (inFeed.has(id) || !m.title || (m.status && m.status !== "published")) continue;
      const pub = new Date(m.publishedAt);
      feed.push({
        id, link: `${KHABAR_URL}/article/${id}`, title: clip(plain(m.title), 200), excerpt: clip(plain(m.sideHeader), 180),
        date: Number.isNaN(pub.getTime()) ? "" : pub.toISOString(), category: "",
      });
    }

    // Stories the homepage didn't include: read their own page (a few at a time, 6 seconds each at most).
    const missing = feed.filter((i) => !meta.has(i.id));
    await inBatches(missing, 8, async (i) => {
      try {
        const m = metaFromPage(await fetchText(i.link, 6000)).get(i.id);
        if (m) meta.set(i.id, m);
      } catch {
        /* unknown district: the story is left out */
      }
    });

    const items: KhabarItem[] = feed.flatMap((i) => {
      const m = meta.get(i.id);
      const region = regionOf(m, i.title);
      if (!region || !m) return [];
      const image = m.image ? `${IMAGES}/${m.image}` : "";
      return [{
        title: i.title, link: i.link, date: i.date, region, featured: m.featured,
        category: m.genre || (i.category !== "News" ? i.category : ""),
        excerpt: i.excerpt || clip(plain(m.sideHeader), 180),
        image: isKhabarImage(image) ? image : "",
      }];
    });
    const newest = (a: KhabarItem, b: KhabarItem) => b.date.localeCompare(a.date);
    return { featured: items.filter((i) => i.featured).sort(newest).slice(0, 3), local: items.filter((i) => !i.featured).sort(newest) };
  } catch (error) {
    console.error("Khabar Darjeeling news could not be read", error);
    return { featured: [], local: [] };
  }
}
