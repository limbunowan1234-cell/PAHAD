import { nav, type NavGroup, type NavItem } from "./site";
import { FILMS_PATH } from "./films";
import type { CustomPageFormat } from "./types";

/** Settings row holding the website menu as JSON (Admin → Pages). */
export const MENU_SETTING = "site:menu";

export type MenuItem = NavItem & { hidden?: boolean };
export type MenuGroup = Omit<NavGroup, "items"> & { hidden?: boolean; items?: MenuItem[] };

const LIMITS = { groups: 10, items: 20, label: 60, description: 120, href: 300 };

/** Internal paths ("/news") or https links only. */
export function cleanHref(href: unknown): string {
  const h = String(href ?? "").trim().slice(0, LIMITS.href);
  if (/^\/(?!\/)[\w\-./#?=&%]*$/.test(h)) return h;
  if (/^https:\/\/[^\s]+$/i.test(h)) return h;
  return "";
}

const text = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/** Validates menu JSON from the editor or the database. Returns null if nothing usable is left. */
export function sanitizeMenu(input: unknown): MenuGroup[] | null {
  if (!Array.isArray(input)) return null;
  const groups: MenuGroup[] = [];
  for (const g of input.slice(0, LIMITS.groups)) {
    if (!g || typeof g !== "object") continue;
    const raw = g as Record<string, unknown>;
    const label = text(raw.label, LIMITS.label);
    const items: MenuItem[] = [];
    for (const it of Array.isArray(raw.items) ? raw.items.slice(0, LIMITS.items) : []) {
      if (!it || typeof it !== "object") continue;
      const r = it as Record<string, unknown>;
      const itemLabel = text(r.label, LIMITS.label);
      const href = cleanHref(r.href);
      if (!itemLabel || !href) continue;
      const item: MenuItem = { label: itemLabel, href };
      const description = text(r.description, LIMITS.description);
      if (description) item.description = description;
      if (r.hidden === true) item.hidden = true;
      items.push(item);
    }
    const href = cleanHref(raw.href) || items[0]?.href || "";
    if (!label || !href) continue;
    const group: MenuGroup = { label, href };
    if (items.length) group.items = items;
    if (raw.hidden === true) group.hidden = true;
    groups.push(group);
  }
  return groups.length ? groups : null;
}

/** The built-in menu, used until someone saves their own. */
export const DEFAULT_MENU: MenuGroup[] = nav;

/** Hidden groups and links removed; the films link shows the films page's current title. */
export function visibleMenu(menu: MenuGroup[], filmsLabel?: string): NavGroup[] {
  return menu
    .filter((g) => !g.hidden)
    .map(({ hidden: _h, items, ...g }) => { // eslint-disable-line @typescript-eslint/no-unused-vars
      const shown = (items ?? [])
        .filter((i) => !i.hidden)
        .map(({ hidden: _ih, ...i }) => (filmsLabel && i.href === FILMS_PATH ? { ...i, label: filmsLabel } : i)); // eslint-disable-line @typescript-eslint/no-unused-vars
      return shown.length ? { ...g, items: shown } : g;
    });
}

/** Website pages that can be added to the menu (custom pages are added separately). */
export const BUILT_IN_PAGES: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "About PAHAD", href: "/about" },
  { label: "Our Team", href: "/team" },
  { label: "Vision & Mission", href: "/vision-mission" },
  { label: "Values & Principles", href: "/values" },
  { label: "Our Story", href: "/our-story" },
  { label: "Governance", href: "/governance" },
  { label: "Transparency", href: "/transparency" },
  { label: "Voting results", href: "/results" },
  { label: "Areas of Work", href: "/our-work" },
  { label: "Programmes", href: "/programmes" },
  { label: "Knowledge & Research", href: "/knowledge" },
  { label: "News & Stories", href: "/news" },
  { label: "Live Events", href: "/events" },
  { label: "Gallery", href: "/gallery" },
  { label: "Local Films & Documentaries", href: FILMS_PATH },
  { label: "Partners", href: "/partners" },
  { label: "Ways to Get Involved", href: "/get-involved" },
  { label: "Membership", href: "/membership" },
  { label: "Training (members)", href: "/training" },
  { label: "Contact", href: "/contact" },
  { label: "Search", href: "/search" },
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
];

export const customPagePath = (slug: string, format: CustomPageFormat = "standard") =>
  format === "html" ? `/pages/${slug}` : `/${slug}`;

const RESERVED_PAGE_SLUGS = new Set([
  ...BUILT_IN_PAGES.map((page) => page.href.slice(1)),
  "admin",
  "api",
  "pages",
  "plus",
]);

export const isReservedPageSlug = (slug: string) => RESERVED_PAGE_SLUGS.has(slug);
