// Banner ("hero") images for each public page. Super Admins can replace any of
// these from Admin → Page Images; the image here is used until they do.

export type HeroKey = keyof typeof HERO_PAGES;

export const HERO_PAGES = {
  home: { label: "Home", path: "/", fallback: "/images/hero.jpg" },
  about: { label: "About PAHAD", path: "/about", fallback: "/images/hills-mural.jpg" },
  team: { label: "Our Team", path: "/team", fallback: "/images/general-meeting.jpg" },
  "vision-mission": { label: "Vision & Mission", path: "/vision-mission", fallback: "/images/hero.jpg" },
  values: { label: "Values & Principles", path: "/values", fallback: "/images/general-meeting.jpg" },
  "our-story": { label: "Our Story", path: "/our-story", fallback: "/images/first-meet-gdns.jpg" },
  governance: { label: "Governance", path: "/governance", fallback: "/images/general-meeting.jpg" },
  transparency: { label: "Transparency", path: "/transparency", fallback: "" },
  "our-work": { label: "Our Work", path: "/our-work", fallback: "/images/cloth-donation.jpg" },
  programmes: { label: "Programmes", path: "/programmes", fallback: "/images/drawing-svda-1.jpg" },
  knowledge: { label: "Knowledge & Research", path: "/knowledge", fallback: "/images/general-meeting.jpg" },
  news: { label: "News & Stories", path: "/news", fallback: "" },
  events: { label: "Live Events", path: "/events", fallback: "/images/naksha-2.jpg" },
  gallery: { label: "Gallery", path: "/gallery", fallback: "/images/naksha-3.jpg" },
  films: { label: "Local Films & Documentaries", path: "/films", fallback: "/images/kanchenjunga-gaurav.jpg" },
  partners: { label: "Partners", path: "/partners", fallback: "" },
  "get-involved": { label: "Get Involved", path: "/get-involved", fallback: "/images/busking-old-age-home.jpg" },
  membership: { label: "Membership", path: "/membership", fallback: "/images/naksha-4.jpg" },
  contact: { label: "Contact", path: "/contact", fallback: "" },
} as const satisfies Record<string, { label: string; path: string; fallback: string }>;

export const heroSettingId = (key: HeroKey) => `hero:${key}`;

/** Banner wording override (JSON: eyebrow, title, intro). Blank fields keep the page's own wording. */
export const heroTextId = (key: HeroKey) => `herotext:${key}`;
/** Banner video (JSON: id, on). When on, a muted, looping YouTube video plays behind the heading. */
export const heroVideoId = (key: HeroKey) => `herovideo:${key}`;

export type HeroText = { eyebrow?: string; title?: string; intro?: string };
export type HeroVideo = { id: string; on: boolean };
export type HeroOverride = HeroText & { video?: string };

export function parseHeroText(value: string | undefined): HeroText {
  try {
    const v = JSON.parse(value || "{}") as Record<string, unknown>;
    const pick = (k: string) => (typeof v[k] === "string" && (v[k] as string).trim() ? (v[k] as string).trim() : undefined);
    return { eyebrow: pick("eyebrow"), title: pick("title"), intro: pick("intro") };
  } catch {
    return {};
  }
}

export function parseHeroVideo(value: string | undefined): HeroVideo | null {
  try {
    const v = JSON.parse(value || "null") as { id?: unknown; on?: unknown } | null;
    return v && typeof v.id === "string" && /^[\w-]{11}$/.test(v.id) ? { id: v.id, on: v.on === true } : null;
  } catch {
    return null;
  }
}
