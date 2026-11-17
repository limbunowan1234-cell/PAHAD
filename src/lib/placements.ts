import type { PageKey } from "./types";

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

/** Comma-separated page list from checkboxes named "pages", keeping only known pages. */
export const pagesFromForm = (fd: FormData) => [...new Set(fd.getAll("pages").map(String).filter((k) => KEYS.has(k)))].join(",");
export const pageList = (pages: string) => pages.split(",").filter((k) => KEYS.has(k)) as PageKey[];
export const onPage = (pages: string, page: PageKey) => pageList(pages).includes(page);
export const pageLabel = (key: string) => PLACEMENT_PAGES.find((p) => p.key === key)?.label ?? key;

/** Today's date in India, YYYY-MM-DD, for featured start / end dates. */
export const todayInIndia = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
