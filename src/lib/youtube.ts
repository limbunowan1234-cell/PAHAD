/**
 * YouTube links → video id. Only YouTube sources are accepted, and only the 11-character id is
 * stored: the embed address is always rebuilt from it, so a pasted link or iframe can never
 * inject anything else into the page.
 */
const ID = /^[A-Za-z0-9_-]{11}$/;
const HOSTS = new Set([
  "youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com",
  "youtu.be", "www.youtu.be",
  "youtube-nocookie.com", "www.youtube-nocookie.com",
]);

export function parseYouTubeId(input: string): string | null {
  let raw = input.trim();
  if (!raw) return null;
  // An iframe embed code: use its src.
  const src = raw.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (src) raw = src[1];
  if (ID.test(raw)) return raw; // a bare id
  if (raw.startsWith("//")) raw = `https:${raw}`;
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname.toLowerCase();
  if (!HOSTS.has(host)) return null;

  const parts = url.pathname.split("/").filter(Boolean);
  let id: string | null | undefined = null;
  if (host.endsWith("youtu.be")) id = parts[0];
  else if (parts[0] === "watch") id = url.searchParams.get("v");
  else if (["embed", "shorts", "live", "v", "e"].includes(parts[0])) id = parts[1];
  return id && ID.test(id) ? id : null;
}

/** Privacy-enhanced embed: YouTube sets no cookies until the visitor presses play. */
export const youTubeEmbedUrl = (id: string) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
export const youTubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const youTubeThumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
