"use server";

import { updateTag } from "next/cache";
import { db, newId } from "@/lib/db";
import { FEATURED_SWITCH, getFilmsPage } from "@/lib/data";
import { fileFrom, guarded, log, notify, now, str, type ActionState } from "@/lib/admin-helpers";
import { safeUrl, toImageUrl } from "@/lib/drive";
import { FILMS_DEFAULTS, FILMS_INTRO_SETTING, FILMS_TITLE_SETTING } from "@/lib/films";
import { can, canSubmitVideos as canSubmit } from "@/lib/permissions";
import { customPageIdFromPlacement, pageList, pagesFromForm } from "@/lib/placements";
import type { Featured, FeaturedKind, PublicUser, Video } from "@/lib/types";
import { parseYouTubeId } from "@/lib/youtube";

/** Every check below runs on the server; hidden buttons are only a convenience. */
const canSubmitVideos = (u: PublicUser) => canSubmit(u);

async function pagePlacementsFromForm(fd: FormData) {
  const pages = pagesFromForm(fd);
  const customIds = pageList(pages).map(customPageIdFromPlacement).filter(Boolean);
  const customPages = await Promise.all(customIds.map((id) => db.get("pages", id)));
  if (customPages.some((page) => !page || page.format === "html")) {
    throw new Error("Choose existing standard pages for video and Featured placements.");
  }
  return pages;
}

function videoFields(fd: FormData) {
  const youtube_id = parseYouTubeId(str(fd, "url", 2000));
  if (!youtube_id) throw new Error("Please paste a YouTube link (youtube.com or youtu.be) or a YouTube embed code. Video files can't be uploaded.");
  const title = str(fd, "title", 160);
  if (title.length < 3) throw new Error("Please add a title.");
  return { youtube_id, title, description: str(fd, "description", 600) };
}

async function presidents() {
  return (await db.all("users")).filter((u) => u.active && can(u.role, "videos.manage"));
}

// ------------------------------------------------------------------ member submissions
export async function submitVideo(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    // getCurrentUser re-reads the account from the database, so a revoked permission applies at once.
    if (!canSubmitVideos(user)) throw new Error("You don't have permission to submit YouTube videos. Only the President can grant it.");
    const fields = videoFields(fd);
    const row: Video = {
      id: newId(), ...fields, pages: "", status: "pending", visible: true, sort: 10,
      submitted_by: user.id, submitted_by_name: user.name, reviewed_by_name: "", review_note: "", created_at: now(), updated_at: now(),
    };
    await db.insert("videos", row);
    await log(user, "submitted", "video", row.id, `${row.title} (pending approval)`);
    for (const p of await presidents()) if (p.id !== user.id) await notify(p.id, `${user.name} submitted a YouTube video for approval: “${row.title}”.`, "/admin/videos");
    return "Submitted. Its status is Pending Approval until the President reviews it.";
  });
}

/** A member may withdraw their own submission while it is still pending. */
export async function withdrawVideo(id: string): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    const v = await db.get("videos", id);
    if (!v) throw new Error("Not found.");
    if (v.submitted_by !== user.id || v.status !== "pending") throw new Error("Only your own pending submissions can be withdrawn.");
    await db.remove("videos", id);
    await log(user, "withdrew", "video", id, v.title);
    return "Withdrawn.";
  });
}

// ------------------------------------------------------------------ President's controls
export async function saveVideo(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("videos.manage", async (user) => {
    const id = str(fd, "id", 60);
    const existing = id ? await db.get("videos", id) : null;
    if (id && !existing) throw new Error("This video no longer exists.");
    const pages = fd.get("also_other") === "on" ? await pagePlacementsFromForm(fd) : "";
    const data = {
      ...videoFields(fd),
      // Approved + ON videos always show on the films page; other pages only when "Also show on other pages" is ticked.
      pages,
      visible: fd.get("visible") === "on",
      sort: Number(str(fd, "sort", 6)) || 10,
      updated_at: now(),
    };
    if (existing) {
      await db.update("videos", existing.id, data);
      await log(user, "updated", "video", existing.id, data.title, {
        before: { title: existing.title, youtube_id: existing.youtube_id, pages: existing.pages, visible: existing.visible },
        after: { title: data.title, youtube_id: data.youtube_id, pages: data.pages, visible: data.visible },
      });
    } else {
      const row: Video = { id: newId(), ...data, status: "approved", submitted_by: user.id, submitted_by_name: user.name, reviewed_by_name: user.name, review_note: "", created_at: now() };
      await db.insert("videos", row);
      await log(user, "added", "video", row.id, `${row.title} on the films page${row.pages ? ` and ${row.pages}` : ""}`);
    }
    updateTag("videos");
    return existing ? "Saved." : "Video added.";
  });
}

export async function reviewVideo(id: string, decision: "approved" | "rejected"): Promise<ActionState> {
  return guarded("videos.manage", async (user) => {
    const v = await db.get("videos", id);
    if (!v) throw new Error("Not found.");
    await db.update("videos", id, { status: decision, reviewed_by_name: user.name, updated_at: now() });
    await log(user, decision === "approved" ? "approved" : "rejected", "video", id, v.title, { before: { status: v.status }, after: { status: decision } });
    if (v.submitted_by && v.submitted_by !== user.id) {
      await notify(v.submitted_by, `The President ${decision} your YouTube video “${v.title}”.`, "/admin/videos");
    }
    updateTag("videos");
    if (decision === "rejected") return "Rejected.";
    const { title } = await getFilmsPage();
    return `Approved. It now shows on ${title}. Edit it to also show it on other pages.`;
  });
}

export async function setVideoVisible(id: string, visible: boolean): Promise<ActionState> {
  return guarded("videos.manage", async (user) => {
    const v = await db.get("videos", id);
    if (!v) throw new Error("Not found.");
    await db.update("videos", id, { visible, updated_at: now() });
    await log(user, visible ? "switched on" : "switched off", "video", id, v.title);
    updateTag("videos");
    return visible ? "Video is ON." : "Video is OFF on every page.";
  });
}

export async function deleteVideo(id: string): Promise<ActionState> {
  return guarded("videos.manage", async (user) => {
    const v = await db.get("videos", id);
    if (!v) throw new Error("Not found.");
    await db.remove("videos", id);
    for (const f of (await db.all("featured")).filter((x) => x.kind === "video" && x.ref_id === id)) await db.remove("featured", f.id);
    await log(user, "deleted", "video", id, v.title, { before: { title: v.title, youtube_id: v.youtube_id, status: v.status, submitted_by: v.submitted_by_name } });
    updateTag("videos");
    updateTag("featured");
    return "Deleted.";
  });
}

/** YouTube Embed Submission Permission: President only. */
export async function setVideoPermission(userId: string, allowed: boolean): Promise<ActionState> {
  return guarded("videos.permission", async (user) => {
    const target = await db.get("users", userId);
    if (!target) throw new Error("Account not found.");
    await db.update("users", userId, { can_submit_videos: allowed });
    await log(user, allowed ? "granted" : "revoked", "video permission", userId, `YouTube submission ${allowed ? "ON" : "OFF"} for ${target.name}`, {
      before: { can_submit_videos: target.can_submit_videos }, after: { can_submit_videos: allowed },
    });
    if (target.id !== user.id) {
      await notify(target.id, allowed ? "The President allowed you to submit YouTube videos. Open Videos in your dashboard." : "Your permission to submit YouTube videos was switched off.", allowed ? "/admin/videos" : "");
    }
    return allowed ? `${target.name} can now submit YouTube videos.` : `${target.name} can no longer submit YouTube videos.`;
  });
}

// ------------------------------------------------------------------ featured content
const KINDS: FeaturedKind[] = ["post", "video", "person", "announcement"];

export async function saveFeatured(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("featured.manage", async (user) => {
    const id = str(fd, "id", 60);
    const existing = id ? await db.get("featured", id) : null;
    if (id && !existing) throw new Error("This item no longer exists.");
    const kind = (existing?.kind ?? str(fd, "kind", 20)) as FeaturedKind;
    if (!KINDS.includes(kind)) throw new Error("Choose what to feature.");
    const ref_id = existing?.ref_id ?? str(fd, `ref_${kind}`, 60);

    // Only approved and published content can be featured.
    if (kind === "post") {
      const p = await db.get("posts", ref_id);
      if (!p || p.status !== "published" || p.type === "document") throw new Error("Choose a published post.");
    } else if (kind === "video") {
      const v = await db.get("videos", ref_id);
      if (!v || v.status !== "approved") throw new Error("Choose an approved video.");
    } else if (kind === "person") {
      if (!(await db.get("team", ref_id))) throw new Error("Choose a person from Our Team.");
    }

    const title = str(fd, "title", 160);
    if (kind === "announcement" && title.length < 3) throw new Error("Give the announcement a title.");
    const link = str(fd, "link", 500);
    const safeLink = link.startsWith("/") && !link.startsWith("//") ? link : safeUrl(link);
    const imageLink = safeUrl(str(fd, "image_link", 500));
    const image = (await fileFrom(fd, "image_file", "images")) ?? (imageLink ? toImageUrl(imageLink) : existing?.image ?? "");
    const starts_on = str(fd, "starts_on", 10);
    const ends_on = str(fd, "ends_on", 10);
    if (starts_on && ends_on && ends_on < starts_on) throw new Error("The end date is before the start date.");

    const pages = await pagePlacementsFromForm(fd);
    const data = {
      kind, ref_id: kind === "announcement" ? "" : ref_id, title, text: str(fd, "text", 400), link: safeLink, image,
      pages, active: fd.get("active") === "on", sort: Number(str(fd, "sort", 6)) || 10, starts_on, ends_on, updated_at: now(),
    };
    if (!data.pages) throw new Error("Choose at least one page to show it on.");
    if (existing) {
      await db.update("featured", existing.id, data);
      await log(user, "updated", "featured", existing.id, `${kind}: ${title || ref_id}`, { before: { pages: existing.pages, active: existing.active, sort: existing.sort }, after: { pages: data.pages, active: data.active, sort: data.sort } });
    } else {
      const row: Featured = { id: newId(), ...data, created_by_name: user.name, created_at: now() };
      await db.insert("featured", row);
      await log(user, "featured", "featured", row.id, `${kind}: ${title || ref_id} on ${data.pages}`);
    }
    updateTag("featured");
    return existing ? "Saved." : "Added to featured.";
  });
}

export async function setFeaturedActive(id: string, active: boolean): Promise<ActionState> {
  return guarded("featured.manage", async (user) => {
    const f = await db.get("featured", id);
    if (!f) throw new Error("Not found.");
    await db.update("featured", id, { active, updated_at: now() });
    await log(user, active ? "activated" : "deactivated", "featured", id, f.title || f.kind);
    updateTag("featured");
    return active ? "Active." : "Inactive.";
  });
}

/** Swap display order with the neighbouring item. */
export async function moveFeatured(id: string, direction: -1 | 1): Promise<ActionState> {
  return guarded("featured.manage", async (user) => {
    const all = (await db.all("featured")).sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at));
    // Normalise to 10, 20, 30… so a swap always changes the order.
    all.forEach((f, i) => (f.sort = (i + 1) * 10));
    const i = all.findIndex((f) => f.id === id);
    const j = i + direction;
    if (i < 0) throw new Error("Not found.");
    if (j >= 0 && j < all.length) [all[i].sort, all[j].sort] = [all[j].sort, all[i].sort];
    for (const f of all) await db.update("featured", f.id, { sort: f.sort });
    await log(user, "reordered", "featured", id, all[i].title || all[i].kind);
    updateTag("featured");
    return "Order changed.";
  });
}

export async function deleteFeatured(id: string): Promise<ActionState> {
  return guarded("featured.manage", async (user) => {
    const f = await db.get("featured", id);
    if (!f) throw new Error("Not found.");
    await db.remove("featured", id);
    await log(user, "removed", "featured", id, f.title || f.kind);
    updateTag("featured");
    return "Removed from featured.";
  });
}

/** Turn the whole Featured section on or off across the website. */
export async function setFeaturedSection(on: boolean): Promise<ActionState> {
  return guarded("featured.manage", async (user) => {
    const row = await db.get("settings", FEATURED_SWITCH);
    const value = on ? "on" : "off";
    if (row) await db.update("settings", FEATURED_SWITCH, { value, updated_by: user.id });
    else await db.insert("settings", { id: FEATURED_SWITCH, value, updated_by: user.id, created_at: now() });
    await log(user, on ? "enabled" : "disabled", "featured", FEATURED_SWITCH, `Featured section ${value.toUpperCase()}`);
    updateTag("featured");
    updateTag("settings");
    return on ? "Featured section is ON." : "Featured section is OFF across the website.";
  });
}

// ------------------------------------------------------------------ films page
/** Rename the films page and change its intro. Empty fields go back to the defaults. */
export async function saveFilmsPage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("videos.manage", async (user) => {
    const title = str(fd, "title", 80);
    const intro = str(fd, "intro", 400);
    if (title && title.length < 3) throw new Error("The title is too short.");
    const before = await getFilmsPage();
    for (const [id, value] of [[FILMS_TITLE_SETTING, title], [FILMS_INTRO_SETTING, intro]] as const) {
      if (await db.get("settings", id)) await db.update("settings", id, { value, updated_by: user.id });
      else await db.insert("settings", { id, value, updated_by: user.id, created_at: now() });
    }
    await log(user, "updated", "films page", FILMS_TITLE_SETTING, title || FILMS_DEFAULTS.title, {
      before, after: { title: title || FILMS_DEFAULTS.title, intro: intro || FILMS_DEFAULTS.intro },
    });
    updateTag("settings");
    return "Films page saved. The menu, footer and page now use the new title.";
  });
}
