import { workAreas } from "./content";

/**
 * "Areas you'd like to contribute to" on the membership form. Editable from Admin → Members
 * and stored in the settings table as a JSON array of strings; these defaults apply until then.
 * No "server-only": the public form and admin pages share these values.
 */
export const MEMBERSHIP_INTERESTS_SETTING = "membership:interests";

export const DEFAULT_MEMBERSHIP_INTERESTS: string[] = [
  ...workAreas.map((a) => a.title),
  "Media & communications",
  "Events & volunteering",
  "Local Films & Documentaries",
];

export const MAX_INTERESTS = 20;
/** How many areas one applicant may tick on the membership form. */
export const MAX_INTEREST_CHOICES = 3;
export const MAX_INTEREST_LENGTH = 80;

/** The stored list, or null when the value is missing, not JSON, or not a non-empty list of strings. */
export function parseInterests(value: string | undefined | null): string[] | null {
  if (!value) return null;
  try {
    const list = JSON.parse(value);
    if (!Array.isArray(list)) return null;
    const clean = list.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim());
    return clean.length ? clean : null;
  } catch {
    return null;
  }
}

/** Admin textarea → list: one area per line, trimmed, no empty lines, no case-insensitive duplicates. */
export function interestsFromText(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of text.split(/\r?\n/)) {
    const item = line.trim();
    const key = item.toLowerCase();
    if (!item || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

// ------------------------------------------------------------------ membership categories
/** "I am applying as" on the public form and Category in Admin → Members. One list for both. */
export const MEMBER_CATEGORIES = [
  "General Member",
  "Student / Youth",
  "Working Professional",
  "Academic / Researcher",
  "Entrepreneur / Local Business",
  "Institution / Community Representative",
  "Diaspora / Outside the Region",
] as const;

export const DEFAULT_MEMBER_CATEGORY = "General Member";

/**
 * Categories used before this list. "Former DSSCOLONY member" is now a separate checkbox.
 * The database is migrated once (see createTableSQL); this also covers rows read before that.
 */
export const LEGACY_MEMBER_CATEGORIES: Record<string, { category: string; formerDsscolony?: boolean }> = {
  "General": { category: "General Member" },
  "Professional": { category: "Working Professional" },
  "Institution representative": { category: "Institution / Community Representative" },
  "Former DSSCOLONY member": { category: "General Member", formerDsscolony: true },
};

export const isMemberCategory = (value: string) => (MEMBER_CATEGORIES as readonly string[]).includes(value);

/** A stored category as it should be shown or edited: old names mapped, other unknown values kept as they are. */
export function normalizeMemberCategory(stored: string, formerDsscolony = false): { category: string; formerDsscolony: boolean } {
  const legacy = LEGACY_MEMBER_CATEGORIES[stored];
  if (legacy) return { category: legacy.category, formerDsscolony: formerDsscolony || Boolean(legacy.formerDsscolony) };
  return { category: stored || DEFAULT_MEMBER_CATEGORY, formerDsscolony };
}

/** A submitted category: one of MEMBER_CATEGORIES (or `keep`, e.g. a member's existing unknown value), else the default. */
export function memberCategoryFromForm(value: string, keep?: string): string {
  if (isMemberCategory(value)) return value;
  if (keep && value === keep) return value;
  return DEFAULT_MEMBER_CATEGORY;
}
