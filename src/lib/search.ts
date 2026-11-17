import "server-only";
import { getMembersOnlyPosts, getPublishedPosts, getPublishedVideos } from "./data";
import { PLACEMENT_PAGES, pageList } from "./placements";
import type { Post } from "./types";
import { POST_TYPE_LABEL, POST_TYPE_PATH } from "./utils";
import { youTubeWatchUrl } from "./youtube";

export type SearchResult = {
  title: string;
  href: string;
  /** e.g. "Page", "News", "Event" */
  kind: string;
  snippet: string;
  membersOnly: boolean;
  /** Opens in a new tab (documents are direct file links). */
  external?: boolean;
};

/** The site's main pages, so "membership" or "governance" finds them too. */
const PAGES: { title: string; href: string; text: string }[] = [
  { title: "Home", href: "/", text: "PAHAD community development institution Darjeeling Kalimpong Terai Dooars Himalaya people knowledge action" },
  { title: "About PAHAD", href: "/about", text: "Who we are, why PAHAD exists and how it works. Rooted in our communities." },
  { title: "Our Team", href: "/team", text: "The people of PAHAD: Governing Body, Executive Body, Secretariat, Directorates." },
  { title: "Vision & Mission", href: "/vision-mission", text: "The future we work towards: vision, mission and goals." },
  { title: "Values & Principles", href: "/values", text: "How we decide and act: values and guiding principles." },
  { title: "Our Story", href: "/our-story", text: "PAHAD and DSSCOLONY shared history since 24 June 2018." },
  { title: "Governance", href: "/governance", text: "General Assembly, Governing Body, Chief Executive Director, Central Secretariat and Directorates." },
  { title: "Transparency & Documents", href: "/transparency", text: "Constitution, policies, reports and official documents." },
  { title: "Voting Results", href: "/results", text: "Official voting results: Governing Body, Executive Body, General Assembly elections and polls." },
  { title: "Our Work", href: "/our-work", text: "Human development, livelihoods, community development, research, Himalayan sustainability and heritage." },
  { title: "Programmes", href: "/programmes", text: "Turning priorities into practical work: community programmes and projects." },
  { title: "Knowledge & Research", href: "/knowledge", text: "Local knowledge, research, publications and learning resources." },
  { title: "News & Stories", href: "/news", text: "Announcements, programme updates and community stories." },
  { title: "Live Events", href: "/events", text: "Community conversations, workshops, meetings and upcoming events." },
  { title: "Gallery", href: "/gallery", text: "Photographs and moments from PAHAD's journey." },
  { title: "Partners", href: "/partners", text: "Media and news partners Gorkha TV and Khabar Darjeeling; collaborate with PAHAD." },
  { title: "Get Involved", href: "/get-involved", text: "Volunteer, collaborate, share an idea or contribute knowledge." },
  { title: "Membership", href: "/membership", text: "Become a member of PAHAD: apply for membership, join." },
  { title: "Contact", href: "/contact", text: "Contact PAHAD: email, enquiries, media requests and collaboration proposals." },
  { title: "Privacy Notice", href: "/privacy", text: "How PAHAD handles personal information and privacy." },
  { title: "Terms & Conditions", href: "/terms", text: "Terms of use for the PAHAD website." },
];

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

function score(words: string[], fields: [text: string, weight: number][]) {
  let total = 0;
  for (const w of words) {
    let best = 0;
    for (const [text, weight] of fields) if (text.includes(w)) best = Math.max(best, weight);
    if (best === 0) return 0; // every word must match somewhere
    total += best;
  }
  return total;
}

function snippet(text: string, words: string[], max = 180) {
  const clean = text.replace(/^#+\s|^-\s/gm, "").replace(/\s+/g, " ").trim();
  const lower = norm(clean);
  const at = Math.max(0, Math.min(...words.map((w) => lower.indexOf(w)).filter((i) => i >= 0), clean.length) - 40);
  const cut = clean.slice(at, at + max);
  return `${at > 0 ? "…" : ""}${cut}${at + max < clean.length ? "…" : ""}`;
}

function postResult(p: Post, words: string[], membersOnly: boolean): SearchResult & { score: number } {
  const isDoc = p.type === "document";
  return {
    title: p.title,
    href: isDoc ? p.file_url || "/transparency" : `${POST_TYPE_PATH[p.type]}/${p.slug}`,
    external: isDoc && Boolean(p.file_url),
    kind: POST_TYPE_LABEL[p.type],
    snippet: p.excerpt || snippet(p.body, words),
    membersOnly,
    score: score(words, [
      [norm(p.title), 6],
      [norm(`${p.category} ${p.excerpt} ${p.location}`), 3],
      [norm(p.body), 1],
    ]),
  };
}

/**
 * Searches pages and published posts. Members Only posts are included only when
 * `signedIn` is true; the caller must take that from the server-side session.
 */
export async function searchSite(query: string, { signedIn }: { signedIn: boolean }): Promise<SearchResult[]> {
  const words = norm(query).split(/\s+/).filter((w) => w.length > 1).slice(0, 8);
  if (words.length === 0) return [];
  const [publicPosts, privatePosts, videos] = await Promise.all([
    getPublishedPosts(),
    signedIn ? getMembersOnlyPosts() : Promise.resolve([]),
    getPublishedVideos(),
  ]);
  const results = [
    ...PAGES.map((pg) => ({ title: pg.title, href: pg.href, kind: "Page", snippet: pg.text, membersOnly: false, score: score(words, [[norm(pg.title), 6], [norm(pg.text), 2]]) })),
    ...publicPosts.map((p) => postResult(p, words, false)),
    ...privatePosts.map((p) => postResult(p, words, true)),
    ...videos.map((v) => {
      // Open the first page the video is on; a video not placed on any page opens on YouTube.
      const page = PLACEMENT_PAGES.find((pg) => pg.key === pageList(v.pages)[0]);
      return {
        title: v.title,
        href: page ? `${page.path}#videos-${page.key}` : youTubeWatchUrl(v.youtube_id),
        external: !page,
        kind: "Video",
        snippet: v.description,
        membersOnly: false,
        score: score(words, [[norm(v.title), 6], [norm(v.description), 2]]),
      };
    }),
  ];
  return results
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 40)
    .map(({ score: _score, ...r }) => r); // eslint-disable-line @typescript-eslint/no-unused-vars
}
