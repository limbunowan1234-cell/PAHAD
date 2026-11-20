/** Media links people can paste (shared by server and client checks). */
const HTTPS = /^https:\/\/[^\s"'<>]+$/i;

/** A public image link: https only. */
export function imageLink(v: string): string | null {
  const s = v.trim();
  if (!s) return "";
  return HTTPS.test(s) && s.length <= 500 ? s : null;
}

/** A direct video file: https and .mp4 / .webm. */
export function videoFileLink(v: string): string | null {
  const s = v.trim();
  return HTTPS.test(s) && s.length <= 500 && /\.(mp4|webm)(\?|#|$)/i.test(s) ? s : null;
}

/** Images stored by PAHAD or from known hosts go through Next's image optimiser; anything else is shown as-is. */
export const isOptimisable = (src: string) =>
  src.startsWith("/") || /^https:\/\/(i\.ytimg\.com|lh3\.googleusercontent\.com|[^/]+\.public\.blob\.vercel-storage\.com)\//.test(src);
