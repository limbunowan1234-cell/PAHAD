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
