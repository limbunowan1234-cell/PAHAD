import { createHash } from "node:crypto";

/** Settings row: "on" shows the EN / नेपाली switch on the website. Off until PAHAD has reviewed the Nepali. */
export const LANGUAGE_SWITCH_SETTING = "i18n:switch";

/** Same normalisation as the browser side (LanguageSwitch): collapse spaces and trim. */
export const normPhrase = (s: string) => s.replace(/\s+/g, " ").trim();

export const phraseId = (en: string) => createHash("sha1").update(normPhrase(en)).digest("hex").slice(0, 20);

/** Text not worth translating: no letters, emails, links, initials like "DS", numbers. */
export function translatable(en: string): boolean {
  const t = normPhrase(en);
  if (t.length < 2 || t.length > 2000) return false;
  if (!/[A-Za-z]{2}/.test(t)) return false;
  if (/@|https?:\/\/|www\./i.test(t)) return false;
  if (/^[A-Z]{1,3}$/.test(t)) return false;
  return true;
}
