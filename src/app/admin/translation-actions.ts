"use server";

import { updateTag } from "next/cache";
import { db } from "@/lib/db";
import { guarded, log, now, type ActionState } from "@/lib/admin-helpers";
import { translateTexts } from "@/lib/google";
import { LANGUAGE_SWITCH_SETTING, normPhrase, phraseId, translatable } from "@/lib/i18n";
import { canManageMenu } from "@/lib/permissions";
import type { PublicUser, Translation } from "@/lib/types";

/** Same people as Pages: the Governing Body (L1), or people the President allowed. */
function assertAccess(user: PublicUser) {
  if (!canManageMenu(user)) throw new Error("Only the Governing Body (L1), or people the President allows, can change the Nepali version.");
}

/** Phrases found by "Scan the website": adds the ones not seen before. */
export async function addPhrases(phrases: { en: string; page: string }[]): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    assertAccess(user);
    const existing = new Set((await db.all("translations")).map((t) => t.id));
    let added = 0;
    for (const p of phrases.slice(0, 5000)) {
      const en = normPhrase(String(p.en ?? ""));
      if (!translatable(en)) continue;
      const id = phraseId(en);
      if (existing.has(id)) continue;
      existing.add(id);
      await db.insert("translations", { id, en, ne: "", source: "", page: String(p.page ?? "").slice(0, 200), updated_by: "", created_at: now(), updated_at: now() });
      added++;
    }
    if (added) await log(user, "scanned", "translations", "", `${added} new phrases found`);
    return added ? `${added} new phrases found.` : "No new text found.";
  });
}

/** Fills empty Nepali boxes with Google's first draft, a batch at a time. Returns how many are left. */
export async function draftTranslations(): Promise<ActionState & { left?: number }> {
  let left = 0;
  const result = await guarded("dashboard.view", async (user) => {
    assertAccess(user);
    const todo = (await db.all("translations")).filter((t) => !t.ne.trim() && t.source !== "keep");
    const batch = todo.slice(0, 40);
    let done = 0;
    for (let i = 0; i < batch.length; i += 20) {
      const part = batch.slice(i, i + 20);
      const out = await translateTexts(part.map((t) => t.en));
      if (!out) {
        if (done === 0) throw new Error("Google translation isn't available. The PAHAD Google bridge needs its latest update (see google-apps-script/README.md).");
        break;
      }
      for (let j = 0; j < part.length; j++) {
        if (!out[j]?.trim()) continue;
        await db.update("translations", part[j].id, { ne: out[j].trim(), source: "machine", updated_by: "Google draft", updated_at: now() });
        done++;
      }
    }
    left = Math.max(0, todo.length - done);
    if (done) {
      updateTag("translations");
      await log(user, "drafted", "translations", "", `${done} Nepali drafts from Google`);
    }
    return `${done} drafted.`;
  });
  return { ok: result?.ok ?? false, message: result?.message ?? "", left };
}

/** Save a Nepali version (marks it checked), or keep a phrase in English. */
export async function saveTranslation(id: string, ne: string, mode: "save" | "keep"): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    assertAccess(user);
    const row = await db.get("translations", id);
    if (!row) throw new Error("This phrase no longer exists.");
    const patch: Partial<Translation> =
      mode === "keep" ? { source: "keep", updated_by: user.name, updated_at: now() } : { ne: ne.trim().slice(0, 4000), source: ne.trim() ? "human" : "", updated_by: user.name, updated_at: now() };
    await db.update("translations", id, patch);
    updateTag("translations");
    return mode === "keep" ? "Kept in English." : "Saved.";
  });
}

export async function deletePhrase(id: string): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    assertAccess(user);
    await db.remove("translations", id);
    updateTag("translations");
    return "Removed.";
  });
}

/** Show or hide the EN / नेपाली switch on the website. */
export async function setLanguageSwitch(on: boolean): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    assertAccess(user);
    const value = on ? "on" : "off";
    if (await db.get("settings", LANGUAGE_SWITCH_SETTING)) await db.update("settings", LANGUAGE_SWITCH_SETTING, { value, updated_by: user.name });
    else await db.insert("settings", { id: LANGUAGE_SWITCH_SETTING, value, updated_by: user.name, created_at: now() });
    updateTag("settings");
    await log(user, on ? "enabled" : "disabled", "language switch", "", `Nepali switch ${value}`);
    return on ? "The नेपाली switch is now on the website." : "The नेपाली switch is hidden from the website.";
  });
}
