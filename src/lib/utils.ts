export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function formatDate(value: string | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }) {
  if (!value) return "";
  const d = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-IN", opts).format(d);
}

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export const POST_TYPE_LABEL = {
  news: "News & Story",
  event: "Event",
  programme: "Programme",
  resource: "Knowledge Resource",
  document: "Document",
  training: "Training Material",
} as const;

export const POST_TYPE_PATH = {
  news: "/news",
  event: "/events",
  programme: "/programmes",
  resource: "/knowledge",
  document: "/transparency",
  training: "/training",
} as const;
