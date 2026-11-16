// Helpers for Google Drive and Google Forms links pasted into the admin panel.
// Files must be shared as "Anyone with the link can view" for visitors to see them.

const DRIVE_ID_PATTERNS = [
  /drive\.google\.com\/file\/d\/([\w-]{10,})/,
  /drive\.google\.com\/(?:open|uc|thumbnail)\?(?:.*&)?id=([\w-]{10,})/,
  /docs\.google\.com\/(?:document|presentation|spreadsheets)\/d\/([\w-]{10,})/,
  /lh3\.googleusercontent\.com\/d\/([\w-]{10,})/,
];

export function driveFileId(url: string): string | null {
  for (const re of DRIVE_ID_PATTERNS) {
    const m = url.match(re);
    if (m) return m[1];
  }
  return null;
}

/** A Drive share link becomes a direct image address; any other URL is returned unchanged. */
export function toImageUrl(url: string, width = 1600): string {
  const u = url.trim();
  if (/drive\.google\.com|lh3\.googleusercontent\.com\/d\//.test(u)) {
    const id = driveFileId(u);
    if (id) return `https://lh3.googleusercontent.com/d/${id}=w${width}`;
  }
  return u;
}

/** A Drive share link becomes the Drive viewer page (works for PDFs and Google Docs). */
export function toFileUrl(url: string): string {
  const u = url.trim();
  if (/drive\.google\.com/.test(u)) {
    const id = driveFileId(u);
    if (id) return `https://drive.google.com/file/d/${id}/view`;
  }
  return u;
}

export function isGoogleForm(url: string) {
  return /docs\.google\.com\/forms\/|forms\.gle\//.test(url);
}

/** Embeddable address for a full Google Form link; short forms.gle links can only be opened, not embedded. */
export function googleFormEmbedUrl(url: string): string | null {
  const m = url.match(/^(https:\/\/docs\.google\.com\/forms\/d\/(?:e\/)?[\w-]+)\/viewform/);
  return m ? `${m[1]}/viewform?embedded=true` : null;
}

/** Accept only http(s) links; anything else becomes empty. */
export function safeUrl(url: string): string {
  const u = url.trim();
  return /^https?:\/\//i.test(u) ? u : u.startsWith("/") ? u : "";
}
