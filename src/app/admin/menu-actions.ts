"use server";

import { updateTag } from "next/cache";
import { db, newId } from "@/lib/db";
import { getMenu } from "@/lib/data";
import { fileFrom, guarded, log, notify, now, str, type ActionState } from "@/lib/admin-helpers";
import { safeUrl, toImageUrl } from "@/lib/drive";
import { customPagePath, DEFAULT_MENU, isReservedPageSlug, MENU_SETTING, sanitizeMenu } from "@/lib/menu";
import { canManageMenu } from "@/lib/permissions";
import type { CustomPage, CustomPageFormat, PublicUser } from "@/lib/types";
import { slugify } from "@/lib/utils";

/** L1 always; anyone else only if the President switched it on. Checked on the server for every action. */
function assertMenuAccess(user: PublicUser) {
  if (!canManageMenu(user)) throw new Error("Only the Governing Body (L1), or people the President allows, can change the menu and pages.");
}

async function writeMenu(user: PublicUser, value: string) {
  const existing = await db.get("settings", MENU_SETTING);
  if (existing) await db.update("settings", MENU_SETTING, { value, updated_by: user.id });
  else await db.insert("settings", { id: MENU_SETTING, value, updated_by: user.id, created_at: now() });
  updateTag("settings");
}

export async function saveMenu(json: string): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    assertMenuAccess(user);
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error("The menu could not be read. Reload the page and try again.");
    }
    const menu = sanitizeMenu(parsed);
    if (!menu) throw new Error("The menu needs at least one section with a name and a link.");
    if (!menu.some((g) => !g.hidden)) throw new Error("Keep at least one menu section visible.");
    await writeMenu(user, JSON.stringify(menu));
    await log(user, "updated", "menu", MENU_SETTING, `Website menu: ${menu.filter((g) => !g.hidden).map((g) => g.label).join(", ")}`);
    return "Menu saved. The website shows it now.";
  });
}

export async function resetMenu(): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    assertMenuAccess(user);
    await db.remove("settings", MENU_SETTING);
    updateTag("settings");
    await log(user, "reset", "menu", MENU_SETTING, "Website menu reset to the original layout");
    return "Menu reset to the original layout.";
  });
}

export async function saveCustomPage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    assertMenuAccess(user);
    const id = str(fd, "id", 60);
    const existing = id ? await db.get("pages", id) : null;
    if (id && !existing) throw new Error("This page no longer exists.");
    const title = str(fd, "title", 120);
    if (title.length < 2) throw new Error("Please give the page a title.");
    const rawFormat = str(fd, "format", 20);
    if (rawFormat && rawFormat !== "standard" && rawFormat !== "html") throw new Error("Choose a page format.");
    const format: CustomPageFormat = rawFormat === "html" ? "html" : "standard";

    let slug = slugify(str(fd, "slug", 80) || title);
    if (!slug) throw new Error("Please give the page a web address.");
    if (format === "standard" && isReservedPageSlug(slug)) throw new Error("That address is reserved for a built-in website page.");
    const clash = (await db.findBy("pages", "slug", slug)).find((p) => p.id !== id);
    if (clash) slug = `${slug}-${newId().slice(0, 4)}`;

    const coverLink = safeUrl(str(fd, "cover_link", 500));
    const cover = (await fileFrom(fd, "cover_file", "images")) ?? (coverLink ? toImageUrl(coverLink) : str(fd, "cover", 500));
    const status: CustomPage["status"] = str(fd, "status", 20) === "draft" ? "draft" : "published";
    const body = format === "html" ? String(fd.get("body") ?? "") : str(fd, "body", 50_000);
    if (format === "html" && body.length > 250_000) throw new Error("Custom HTML is limited to 250,000 characters.");
    const data = {
      slug, format, title, cover, status,
      eyebrow: str(fd, "eyebrow", 40),
      intro: str(fd, "intro", 400),
      body,
      collect: str(fd, "collect", 60),
      updated_by: user.id,
      updated_at: now(),
    };

    if (existing) {
      // Keep menu links pointing at the page if its address changed.
      const previousFormat: CustomPageFormat = existing.format === "html" ? "html" : "standard";
      if (existing.slug !== slug || previousFormat !== format) {
        const menu = await getMenu();
        const from = customPagePath(existing.slug, previousFormat), to = customPagePath(slug, format);
        if (JSON.stringify(menu).includes(`"${from}"`)) {
          const moved = menu.map((g) => ({ ...g, href: g.href === from ? to : g.href, items: g.items?.map((i) => (i.href === from ? { ...i, href: to } : i)) }));
          await writeMenu(user, JSON.stringify(moved));
        }
      }
      await db.update("pages", existing.id, data);
      await log(user, "updated", "page", existing.id, `${title} (${format}, ${status})`);
    } else {
      const row: CustomPage = { ...data, id: newId(), created_at: now() };
      await db.insert("pages", row);
      await log(user, "created", "page", row.id, `${title} (${format}, ${status})`);
      // Optionally add the new page to a menu section straight away.
      const group = str(fd, "add_to", 60);
      if (group) {
        const menu = await getMenu();
        const next = menu.map((g) => (g.label === group ? { ...g, items: [...(g.items ?? []), { label: title, href: customPagePath(slug, format), description: data.intro.slice(0, 120) || undefined }] } : g));
        await writeMenu(user, JSON.stringify(sanitizeMenu(next) ?? DEFAULT_MENU));
      }
    }
    updateTag("pages");
    return existing ? "Page saved." : `Page created at ${customPagePath(slug, format)}.`;
  });
}

export async function deleteCustomPage(id: string): Promise<ActionState> {
  return guarded("dashboard.view", async (user) => {
    assertMenuAccess(user);
    const page = await db.get("pages", id);
    if (!page) throw new Error("This page no longer exists.");
    // Remove its links from the menu too.
    const href = customPagePath(page.slug, page.format === "html" ? "html" : "standard");
    const menu = await getMenu();
    if (JSON.stringify(menu).includes(`"${href}"`)) {
      const next = menu.flatMap((group) => {
        const items = group.items?.filter((item) => item.href !== href);
        if (group.href === href) {
          return items?.length ? [{ ...group, href: items[0].href, items }] : [];
        }
        return [{ ...group, items }];
      });
      await writeMenu(user, JSON.stringify(sanitizeMenu(next) ?? DEFAULT_MENU));
    }
    await db.remove("pages", id);
    updateTag("pages");
    await log(user, "deleted", "page", id, page.title);
    return `“${page.title}” deleted.`;
  });
}

/** The President switches menu editing on or off for someone outside the Governing Body. */
export async function setMenuPermission(userId: string, allowed: boolean): Promise<ActionState> {
  return guarded("menu.permission", async (user) => {
    const target = await db.get("users", userId);
    if (!target) throw new Error("Account not found.");
    await db.update("users", userId, { can_manage_menu: allowed });
    await log(user, allowed ? "granted" : "revoked", "menu permission", userId, `Menu & pages editing ${allowed ? "ON" : "OFF"} for ${target.name}`, {
      before: { can_manage_menu: target.can_manage_menu }, after: { can_manage_menu: allowed },
    });
    if (target.id !== user.id) {
      await notify(target.id, allowed ? "The President allowed you to edit Pages and the website menu. Open Pages in your dashboard." : "Your permission to edit Pages and the website menu was switched off.", allowed ? "/admin/menu" : "");
    }
    return allowed ? `${target.name} can now edit the menu and pages.` : `${target.name} can no longer edit the menu and pages.`;
  });
}
