import type { PageKey, PagePlacementKey } from "./types";

/** Pages that can show YouTube videos and featured content, managed centrally in the dashboard. */
export const PLACEMENT_PAGES: { key: PageKey; label: string; path: string }[] = [
  { key: "home", label: "Home", path: "/" },
  { key: "about", label: "About", path: "/about" },
  { key: "our-work", label: "Our Work", path: "/our-work" },
  { key: "programmes", label: "Programmes", path: "/programmes" },
  { key: "knowledge", label: "Knowledge & Research", path: "/knowledge" },
  { key: "news", label: "News & Stories", path: "/news" },
  { key: "events", label: "Live Events", path: "/events" },
  { key: "gallery", label: "Gallery", path: "/gallery" },
  { key: "get-involved", label: "Get Involved", path: "/get-involved" },
  { key: "membership", label: "Membership", path: "/membership" },
  { key: "partners", label: "Partners", path: "/partners" },
];

const KEYS = new Set<string>(PLACEMENT_PAGES.map((p) => p.key));
const CUSTOM_KEY = /^custom:([a-z0-9_-]{1,60})$/i;

export const customPagePlacementKey = (id: string) => `custom:${id}` as const;
export const customPageIdFromPlacement = (key: string) => CUSTOM_KEY.exec(key)?.[1] ?? "";
const validKey = (key: string) => KEYS.has(key) || CUSTOM_KEY.test(key);

/** Comma-separated page keys from checkboxes named "pages". Custom keys are checked against the database on save. */
export const pagesFromForm = (fd: FormData) => [...new Set(fd.getAll("pages").map(String).filter(validKey))].join(",");
export const pageList = (pages: string) => pages.split(",").filter(validKey) as PagePlacementKey[];
export const onPage = (pages: string, page: PagePlacementKey) => pageList(pages).includes(page);
export const pageLabel = (key: string, customPages: ReadonlyMap<string, string> = new Map()) => {
  const id = customPageIdFromPlacement(key);
  return id ? customPages.get(id) ?? "Custom page" : PLACEMENT_PAGES.find((p) => p.key === key)?.label ?? key;
};

/** Today's date in India, YYYY-MM-DD, for featured start / end dates. */
export const todayInIndia = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
