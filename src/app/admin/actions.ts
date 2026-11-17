"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db, newId } from "@/lib/db";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import { clearSessionCookie, getCurrentUser, setSessionCookie } from "@/lib/auth/session";
import { fileFrom, guarded, log, notify, now, str, type ActionState } from "@/lib/admin-helpers";
import { can, canEditPost, canPublish, FINANCE_ACCESS, FINANCE_APPROVERS, inScope, roleInfo, roleLabel, ROLES, type FinanceAccess } from "@/lib/permissions";
import { assertRoleScope, assertSeat, loadStructure, recordScope, scopeFromForm } from "@/lib/structure";
import { appendToSheet } from "@/lib/google";
import { storeUpload } from "@/lib/storage";
import { safeUrl, toFileUrl, toImageUrl } from "@/lib/drive";
import { HERO_PAGES, heroSettingId, type HeroKey } from "@/lib/heroes";
import { TEAM_SECTIONS, type MemberStatus, type Post, type PostStatus, type PostType, type PublicUser, type Role, type TaskStatus, type TeamSection } from "@/lib/types";
import { slugify } from "@/lib/utils";

export type { ActionState };


/** Tell the author when someone else changes or removes their content. */
async function notifyAuthor(actor: PublicUser, post: Post, what: string) {
  if (post.author_id && post.author_id !== actor.id) {
    await notify(post.author_id, `${actor.name} (${roleLabel(actor.role)}) ${what} your ${post.type}: “${post.title}”.`, `/admin/content/${post.id}`);
  }
}

// ------------------------------------------------------------------ auth
const failures = new Map<string, { count: number; until: number }>();

export async function login(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const email = str(fd, "email", 160).toLowerCase();
  const password = String(fd.get("password") ?? "");
  const lock = failures.get(email);
  if (lock && lock.until > Date.now()) return { ok: false, message: "Too many attempts. Please wait 10 minutes and try again." };

  const user = (await db.all("users")).find((u) => u.email.toLowerCase() === email);
  if (!user || !user.active || !verifyPassword(password, user.password_hash)) {
    const count = (lock?.count ?? 0) + 1;
    failures.set(email, { count, until: count >= 5 ? Date.now() + 10 * 60_000 : 0 });
    return { ok: false, message: "Email or password is incorrect." };
  }
  failures.delete(email);
  await db.update("users", user.id, { last_login: now() });
  await setSessionCookie(user.id);
  redirect(safeNextPath(str(fd, "next", 300)));
}

/** Where to go after signing in: a path on this site only (never another domain), else the dashboard. */
function safeNextPath(next: string) {
  return /^\/(?![\/\\])[\w\-./?=&%#]*$/.test(next) ? next : "/admin";
}

export async function logout() {
  await clearSessionCookie();
  redirect("/admin/login");
}

// ------------------------------------------------------------------ content
const POST_TYPES: PostType[] = ["news", "event", "programme", "resource", "document"];

export async function savePost(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const result = await guarded("content.create", async (user) => {
    const id = str(fd, "id", 60);
    const type = str(fd, "type", 20) as PostType;
    const title = str(fd, "title", 200);
    if (!POST_TYPES.includes(type)) throw new Error("Choose a content type.");
    if (title.length < 3) throw new Error("Please add a title.");

    const existing = id ? await db.get("posts", id) : null;
    if (id && !existing) throw new Error("This item no longer exists.");
    const s = await loadStructure();
    if (existing && !canEditPost(s, user, existing)) {
      throw new Error("You can't edit this item. Ask the Chief Executive Director, General Secretary or President.");
    }

    // Scoped people always file inside their own Directorate / Department / Programme.
    const { directorate, unit } = recordScope(s, user, fd);
    let status = (str(fd, "status", 20) || "draft") as PostStatus;
    const draft = { author_id: existing?.author_id ?? user.id, directorate, unit };
    if (status === "published" && !canPublish(s, user, draft)) status = "pending";

    let slug = slugify(str(fd, "slug", 100) || title) || newId().slice(0, 8);
    const clash = (await db.findBy("posts", "slug", slug)).find((p) => p.id !== id);
    if (clash) slug = `${slug}-${newId().slice(0, 4)}`;

    // Each file can be uploaded, or given as a link (Google Drive share links are converted automatically).
    const coverLink = safeUrl(str(fd, "cover_link", 500));
    const cover = (await fileFrom(fd, "cover_file", "images")) ?? (coverLink ? toImageUrl(coverLink) : str(fd, "cover", 500));
    const fileLink = safeUrl(str(fd, "file_link", 500));
    const file_url = (await fileFrom(fd, "attachment", "documents")) ?? (fileLink ? toFileUrl(fileLink) : str(fd, "file_url", 500));
    const form_url = safeUrl(str(fd, "form_url", 500));

    // Privacy: Public by default. Documents are plain file links on /transparency, so they are always public.
    const visibility = type !== "document" && str(fd, "visibility", 10) === "members" ? "members" : "public";

    const data: Partial<Post> = {
      type, title, slug, cover, file_url, form_url, status, visibility, directorate, unit,
      excerpt: str(fd, "excerpt", 400),
      body: str(fd, "body", 50_000),
      category: str(fd, "category", 60),
      event_date: str(fd, "event_date", 10),
      location: str(fd, "location", 160),
      updated_at: now(),
    };
    if (status === "published" && existing?.status !== "published") data.published_at = now();

    if (existing) {
      await db.update("posts", existing.id, data);
      await log(user, "updated", "content", existing.id, `${title} (${status})`, {
        before: { title: existing.title, status: existing.status, visibility: existing.visibility || "public", excerpt: existing.excerpt },
        after: { title, status, visibility, excerpt: data.excerpt },
      });
      await notifyAuthor(user, existing, "edited");
    } else {
      const row = { ...data, id: newId(), author_id: user.id, author_name: user.name, created_at: now(), published_at: data.published_at ?? "" } as Post;
      await db.insert("posts", row);
      await log(user, "created", "content", row.id, `${title} (${status}${visibility === "members" ? ", members only" : ""})`);
    }
    updateTag("posts");
    return status === "pending" ? "Saved and sent for review. It will appear on the website once it is approved." : status === "published" ? "Published." : "Draft saved.";
  });
  if (result?.ok) redirect(`/admin/content?saved=${encodeURIComponent(result.message)}`);
  return result;
}

export async function setPostStatus(id: string, status: PostStatus) {
  return guarded("content.create", async (user) => {
    const post = await db.get("posts", id);
    if (!post) throw new Error("Not found.");
    if (!canPublish(await loadStructure(), user, post)) throw new Error("You can't publish or unpublish this item.");
    await db.update("posts", id, { status, published_at: status === "published" ? post.published_at || now() : post.published_at, updated_at: now() });
    await log(user, status === "published" ? "published" : "unpublished", "content", id, post.title, { before: { status: post.status }, after: { status } });
    await notifyAuthor(user, post, status === "published" ? "published" : "unpublished");
    updateTag("posts");
    return status === "published" ? "Published." : "Moved back to drafts.";
  });
}

export async function deletePost(id: string) {
  return guarded("content.delete", async (user) => {
    const post = await db.get("posts", id);
    if (!post) throw new Error("Not found.");
    await db.remove("posts", id);
    await log(user, "deleted", "content", id, post.title, { before: { title: post.title, type: post.type, status: post.status, author: post.author_name } });
    await notifyAuthor(user, post, "removed");
    updateTag("posts");
    return "Deleted.";
  });
}

// ------------------------------------------------------------------ members
async function nextMemberNo() {
  const year = new Date().getFullYear();
  const nums = (await db.all("members"))
    .map((m) => m.member_no)
    .filter((n) => n.startsWith(`PAHAD-${year}-`))
    .map((n) => Number(n.split("-")[2]) || 0);
  return `PAHAD-${year}-${String((nums.length ? Math.max(...nums) : 0) + 1).padStart(4, "0")}`;
}

export async function createMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("members.create", async (user) => {
    const name = str(fd, "name", 120);
    const email = str(fd, "email", 160).toLowerCase();
    if (name.length < 2) throw new Error("Please enter the member's name.");
    if (email && (await db.findBy("members", "email", email)).length) throw new Error("A member with this email already exists.");
    const { directorate, unit, geo } = recordScope(await loadStructure(), user, fd);
    const id = newId();
    await db.insert("members", {
      id, member_no: await nextMemberNo(), name, email,
      phone: str(fd, "phone", 30), area: str(fd, "area", 120), address: str(fd, "address", 300),
      occupation: str(fd, "occupation", 160), category: str(fd, "category", 60) || "General",
      interests: str(fd, "interests", 400), status: "active", source: "admin",
      notes: str(fd, "notes", 2000), added_by: user.name, directorate, unit, geo, created_at: now(),
    });
    await log(user, "added", "member", id, name);
    return `${name} added as a member.`;
  });
}

export async function updateMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("members.edit", async (user) => {
    const id = str(fd, "id", 60);
    const m = await db.get("members", id);
    if (!m) throw new Error("Member not found.");
    const s = await loadStructure();
    if (!inScope(s, user, m)) throw new Error("This member is not in your unit.");
    await db.update("members", id, {
      ...recordScope(s, user, fd),
      name: str(fd, "name", 120) || m.name, email: str(fd, "email", 160).toLowerCase(), phone: str(fd, "phone", 30),
      area: str(fd, "area", 120), address: str(fd, "address", 300), occupation: str(fd, "occupation", 160),
      category: str(fd, "category", 60), interests: str(fd, "interests", 400), notes: str(fd, "notes", 2000),
    });
    await log(user, "updated", "member", id, m.name);
    return "Member updated.";
  });
}

export async function setMemberStatus(id: string, status: MemberStatus) {
  return guarded("members.approve", async (user) => {
    const m = await db.get("members", id);
    if (!m) throw new Error("Member not found.");
    if (!inScope(await loadStructure(), user, m)) throw new Error("This member is not in your unit.");
    const patch: { status: MemberStatus; member_no?: string } = { status };
    if (status === "active" && !m.member_no) patch.member_no = await nextMemberNo();
    await db.update("members", id, patch);
    await log(user, status === "active" ? "approved" : status, "member", id, m.name);
    return status === "active" ? `${m.name} is now an active member.` : `Status set to ${status}.`;
  });
}

export async function deleteMember(id: string) {
  return guarded("members.delete", async (user) => {
    const m = await db.get("members", id);
    if (!m) throw new Error("Member not found.");
    await db.remove("members", id);
    await log(user, "deleted", "member", id, m.name, { before: { name: m.name, email: m.email, phone: m.phone, member_no: m.member_no, status: m.status } });
    return `${m.name} was deleted.`;
  });
}

// ------------------------------------------------------------------ tasks
export async function createTask(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("tasks.assign", async (user) => {
    const title = str(fd, "title", 200);
    const assigned_to = str(fd, "assigned_to", 60);
    if (title.length < 3) throw new Error("Please describe the task.");
    const assignee = await db.get("users", assigned_to);
    if (!assignee || !assignee.active) throw new Error("Choose who this task is for.");
    if (!inScope(await loadStructure(), user, assignee)) throw new Error("You can only assign tasks within your unit.");
    const id = newId();
    await db.insert("tasks", {
      id, title, description: str(fd, "description", 2000), assigned_to, assigned_by: user.id,
      due_date: str(fd, "due_date", 10), priority: (str(fd, "priority", 10) || "normal") as "normal",
      status: "todo", meeting_id: "", created_at: now(), updated_at: now(),
    });
    await log(user, "assigned", "task", id, `${title} → ${assignee.name}`);
    await notify(assignee.id, `${user.name} assigned you a task: “${title}”.`, "/admin/tasks");
    return `Task assigned to ${assignee.name}.`;
  });
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  return guarded("tasks.view_own", async (user) => {
    const task = await db.get("tasks", id);
    if (!task) throw new Error("Task not found.");
    if (task.assigned_to !== user.id && !can(user.role, "tasks.view_all")) throw new Error("This task is not assigned to you.");
    await db.update("tasks", id, { status, updated_at: now() });
    await log(user, `marked ${status.replace("_", " ")}`, "task", id, task.title);
    return "Task updated.";
  });
}

export async function deleteTask(id: string) {
  return guarded("tasks.delete", async (user) => {
    const task = await db.get("tasks", id);
    if (!task) throw new Error("Task not found.");
    await db.remove("tasks", id);
    await log(user, "deleted", "task", id, task.title);
    return "Task deleted.";
  });
}

// ------------------------------------------------------------------ submissions
export async function setSubmissionStatus(id: string, status: "new" | "in_progress" | "closed") {
  return guarded("submissions.manage", async (user) => {
    const s = await db.get("submissions", id);
    if (!s) throw new Error("Not found.");
    await db.update("submissions", id, { status });
    await log(user, `marked ${status.replace("_", " ")}`, "message", id, `${s.kind} from ${s.name}`);
    return "Updated.";
  });
}

export async function deleteSubmission(id: string) {
  return guarded("submissions.delete", async (user) => {
    const s = await db.get("submissions", id);
    if (!s) throw new Error("Not found.");
    await db.remove("submissions", id);
    await log(user, "deleted", "message", id, `${s.kind} from ${s.name}`);
    return "Deleted.";
  });
}

// ------------------------------------------------------------------ gallery
export async function uploadMedia(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("media.upload", async (user) => {
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    const links = str(fd, "links", 20_000).split(/\s+/).map(safeUrl).filter(Boolean);
    if (!files.length && !links.length) throw new Error("Choose photos to upload or paste Google Drive photo links.");
    const album = str(fd, "album", 80) || "General";
    const caption = str(fd, "caption", 200);
    for (const f of files) {
      if (!f.type.startsWith("image/")) throw new Error(`${f.name} is not an image.`);
      const url = await storeUpload(f, "images");
      const id = newId();
      await db.insert("media", { id, url, caption: caption || f.name.replace(/\.[^.]+$/, ""), album, uploaded_by: user.name, created_at: now() });
    }
    for (const [i, link] of links.entries()) {
      await db.insert("media", {
        id: newId(), url: toImageUrl(link), caption: caption || `${album} ${i + 1}`, album, uploaded_by: user.name, created_at: now(),
      });
    }
    const count = files.length + links.length;
    await log(user, "added", "gallery", "", `${count} photo(s) to ${album}`);
    updateTag("media");
    return `${count} photo(s) added.`;
  });
}

export async function deleteMedia(id: string) {
  return guarded("media.delete", async (user) => {
    const m = await db.get("media", id);
    if (!m) throw new Error("Not found.");
    await db.remove("media", id);
    await log(user, "deleted", "gallery", id, m.caption);
    updateTag("media");
    return "Photo removed from the gallery.";
  });
}

// ------------------------------------------------------------------ partners
export async function savePartner(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("partners.manage", async (user) => {
    const id = str(fd, "id", 60);
    const name = str(fd, "name", 120);
    const url = str(fd, "url", 300);
    if (name.length < 2) throw new Error("Partner name is required.");
    if (url && !/^https?:\/\//.test(url)) throw new Error("Website must start with http:// or https://");
    const logoLink = safeUrl(str(fd, "logo_link", 500));
    const logo = (await fileFrom(fd, "logo_file", "images")) ?? (logoLink ? toImageUrl(logoLink, 600) : str(fd, "logo", 500));
    const data = {
      name, url, logo, role: str(fd, "role", 60) || "Partner", description: str(fd, "description", 400),
      dark_logo: fd.get("dark_logo") === "on", sort: Number(str(fd, "sort", 5)) || 0,
    };
    if (id) await db.update("partners", id, data);
    else await db.insert("partners", { ...data, id: newId(), created_at: now() });
    await log(user, id ? "updated" : "added", "partner", id, name);
    updateTag("partners");
    return id ? "Partner updated." : "Partner added.";
  });
}

export async function deletePartner(id: string) {
  return guarded("partners.manage", async (user) => {
    const p = await db.get("partners", id);
    if (!p) throw new Error("Not found.");
    await db.remove("partners", id);
    await log(user, "removed", "partner", id, p.name);
    updateTag("partners");
    return "Partner removed.";
  });
}

// ------------------------------------------------------------------ page banner images
export async function saveHeroImage(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("site.images", async (user) => {
    const key = str(fd, "page", 40) as HeroKey;
    if (!(key in HERO_PAGES)) throw new Error("Unknown page.");
    const link = safeUrl(str(fd, "link", 500));
    const url = (await fileFrom(fd, "file", "images")) ?? (link ? toImageUrl(link, 2400) : "");
    if (!url) throw new Error("Choose a photo to upload or paste a Google Drive link.");
    const id = heroSettingId(key);
    if (await db.get("settings", id)) await db.update("settings", id, { value: url, updated_by: user.name });
    else await db.insert("settings", { id, value: url, updated_by: user.name, created_at: now() });
    await log(user, "changed banner", "page", key, HERO_PAGES[key].label);
    updateTag("settings");
    return `${HERO_PAGES[key].label} banner updated.`;
  });
}

export async function resetHeroImage(key: HeroKey) {
  return guarded("site.images", async (user) => {
    if (!(key in HERO_PAGES)) throw new Error("Unknown page.");
    await db.remove("settings", heroSettingId(key));
    await log(user, "reset banner", "page", key, HERO_PAGES[key].label);
    updateTag("settings");
    return `${HERO_PAGES[key].label} banner reset to the default.`;
  });
}

// ------------------------------------------------------------------ our team (public people list)
export async function saveTeamMember(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("people.manage", async (user) => {
    const id = str(fd, "id", 60);
    const name = str(fd, "name", 120);
    const section = str(fd, "section", 40) as TeamSection;
    if (name.length < 2) throw new Error("Name is required.");
    if (!TEAM_SECTIONS.includes(section)) throw new Error("Choose a section.");
    const photoLink = safeUrl(str(fd, "photo_link", 500));
    const photo_url = (await fileFrom(fd, "photo_file", "images")) ?? (photoLink ? toImageUrl(photoLink, 600) : str(fd, "photo_url", 500));
    const data = {
      name, section, photo_url,
      designation: str(fd, "designation", 120),
      department: str(fd, "department", 160),
      additional_charge: str(fd, "additional_charge", 200),
      sort: Number(str(fd, "sort", 5)) || 0,
    };
    if (id) await db.update("team", id, data);
    else await db.insert("team", { ...data, id: newId(), created_at: now() });
    await log(user, id ? "updated" : "added", "team member", id, `${name} (${section})`);
    updateTag("team");
    return id ? "Updated." : `${name} added to Our Team.`;
  });
}

export async function deleteTeamMember(id: string) {
  return guarded("people.manage", async (user) => {
    const m = await db.get("team", id);
    if (!m) throw new Error("Not found.");
    await db.remove("team", id);
    await log(user, "removed", "team member", id, m.name);
    updateTag("team");
    return `${m.name} removed from Our Team.`;
  });
}

// ------------------------------------------------------------------ team (admin accounts)
const ROLE_IDS = ROLES.map((r) => r.id);

/** Nobody can give anyone a higher level than their own. */
function assertCanGrant(actor: PublicUser, role: Role) {
  if (!ROLE_IDS.includes(role)) throw new Error("Choose an access level.");
  if (roleInfo(role).level < roleInfo(actor.role).level) throw new Error("You can't give someone a higher level than your own.");
}

/** Shared by "Add an admin" and "Make admin" on a member. */
async function createAdminAccount(
  user: PublicUser,
  input: { name: string; email: string; role: Role; designation: string; scope: { directorate: string; unit: string; geo: string }; password: string },
  source = "",
) {
  const { name, role, designation, password } = input;
  const email = input.email.toLowerCase();
  if (name.length < 2) throw new Error("Name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("A valid email is needed to sign in.");
  assertCanGrant(user, role);
  const { directorate, unit, geo } = assertRoleScope(await loadStructure(), role, input.scope);
  await assertSeat(role, true);
  const weak = validatePasswordStrength(password);
  if (weak) throw new Error(weak);
  if ((await db.all("users")).some((u) => u.email.toLowerCase() === email)) throw new Error("An admin with this email already exists.");
  const id = newId();
  await db.insert("users", {
    id, email, name, role, designation, directorate, unit, geo, owner: false, finance: role === "sysadmin" ? "none" : "", active: true,
    password_hash: hashPassword(password), created_at: now(), last_login: null,
  });
  await log(user, "created admin", "team", id, `${name} as ${roleLabel(role)}${source}`, { after: { name, email, role, directorate, unit, geo } });
  return `${name} can now sign in as ${roleLabel(role)} with ${email}. Share the temporary password privately and ask them to change it.`;
}

export async function createAdmin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("team.manage", async (user) =>
    createAdminAccount(user, {
      name: str(fd, "name", 120), email: str(fd, "email", 160), role: str(fd, "role", 30) as Role,
      designation: str(fd, "designation", 120), scope: scopeFromForm(await loadStructure(), fd), password: String(fd.get("password") ?? ""),
    }),
  );
}

/** Give an existing member an admin account, reusing their name and email. */
export async function makeMemberAdmin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("portal.invite", async (user) => {
    const m = await db.get("members", str(fd, "member_id", 60));
    if (!m) throw new Error("Member not found.");
    const s = await loadStructure();
    if (m.status !== "active") throw new Error("Only active members can be made admins. Approve the member first.");
    if (!m.email) throw new Error("Add an email address to this member first: it is what they sign in with.");
    return createAdminAccount(
      user,
      {
        // Only the President appoints admins; the General Secretary can give portal (L6) access.
        name: m.name, email: m.email, role: can(user.role, "team.manage") ? (str(fd, "role", 30) as Role) : "editor", designation: str(fd, "designation", 120),
        scope: (() => {
          const picked = scopeFromForm(s, fd);
          return { directorate: picked.directorate || m.directorate, unit: picked.unit || m.unit, geo: picked.geo || m.geo };
        })(),
        password: String(fd.get("password") ?? ""),
      },
      ` (member ${m.member_no || m.name})`,
    );
  });
}

async function presidentCount() {
  return (await db.all("users")).filter((u) => u.role === "super_admin" && u.active).length;
}

export async function updateAdmin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("team.manage", async (user) => {
    const id = str(fd, "id", 60);
    const target = await db.get("users", id);
    if (!target) throw new Error("Admin not found.");
    const role = str(fd, "role", 30) as Role;
    const active = fd.get("active") === "on";
    assertCanGrant(user, role);
    if (target.owner && (role !== "super_admin" || !active)) {
      throw new Error("The Founder-Owner account (LA) always stays President and active.");
    }
    const losingPresident = target.role === "super_admin" && target.active && (role !== "super_admin" || !active);
    if (losingPresident && (await presidentCount()) <= 1) throw new Error("There must always be an active President.");
    const { directorate, unit, geo } = assertRoleScope(await loadStructure(), role, scopeFromForm(await loadStructure(), fd));
    await assertSeat(role, active, target.id);
    const after = {
      role, active, designation: str(fd, "designation", 120), directorate, unit, geo, name: str(fd, "name", 120) || target.name,
      ...(role === "sysadmin" ? { finance: "none" } : {}),
    };
    await db.update("users", id, after);
    const newPassword = String(fd.get("password") ?? "");
    if (newPassword) {
      const weak = validatePasswordStrength(newPassword);
      if (weak) throw new Error(weak);
      await db.update("users", id, { password_hash: hashPassword(newPassword) });
    }
    await log(user, "updated admin", "team", id, `${target.name}: ${roleLabel(role)}${active ? "" : " (deactivated)"}`, {
      before: { role: target.role, active: target.active, designation: target.designation, directorate: target.directorate, unit: target.unit, geo: target.geo },
      after,
    });
    if (target.role !== role) await notify(id, `Your access level was changed to ${roleLabel(role)} by ${user.name}.`, "/admin");
    return "Admin updated.";
  });
}

export async function deleteAdmin(id: string) {
  return guarded("team.manage", async (user) => {
    if (id === user.id) throw new Error("You cannot delete your own account.");
    const target = await db.get("users", id);
    if (!target) throw new Error("Admin not found.");
    if (target.owner) throw new Error("The Founder-Owner account (LA) cannot be removed.");
    if (target.role === "super_admin" && (await presidentCount()) <= 1) throw new Error("There must always be an active President.");
    await db.remove("users", id);
    await log(user, "deleted admin", "team", id, target.name, { before: { name: target.name, email: target.email, role: target.role } });
    return `${target.name}'s admin access was removed.`;
  });
}

/** Finance access is granted, changed or removed only by the Governing Body, and recorded in the Sheet. */
export async function setFinanceAccess(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("finance.access.manage", async (user) => {
    const id = str(fd, "id", 60);
    const access = str(fd, "finance", 20) as FinanceAccess | "";
    const target = await db.get("users", id);
    if (!target) throw new Error("Admin not found.");
    if (access && !FINANCE_ACCESS.some((f) => f.id === access)) throw new Error("Choose a finance access level.");
    if (access === "approve" && !FINANCE_APPROVERS.includes(target.role)) throw new Error("Only the President (or General Secretary) can be given finance approval.");
    if (target.role === "sysadmin" && access && access !== "none") throw new Error("The System account has no finance access.");
    if (target.id === user.id) throw new Error("You can't change your own finance access.");
    await db.update("users", id, { finance: access });
    const label = access ? FINANCE_ACCESS.find((f) => f.id === access)!.label : "Default for their role";
    await log(user, "changed finance access", "team", id, `${target.name}: ${label}`, { before: { finance: target.finance }, after: { finance: access } });
    await appendToSheet("Access changes", [now(), user.name, roleLabel(user.role), target.name, roleLabel(target.role), target.finance || "default", access || "default"]);
    await notify(id, `Your finance access was set to “${label}” by ${user.name}.`, "/admin/finance");
    return `Finance access for ${target.name}: ${label}.`;
  });
}

// ------------------------------------------------------------------ notifications
export async function markNotificationsRead(): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  for (const n of (await db.findBy("notifications", "user_id", user.id)).filter((x) => !x.read)) {
    await db.update("notifications", n.id, { read: true });
  }
  return { ok: true, message: "All caught up." };
}

// ------------------------------------------------------------------ own account
export async function updateAccount(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const full = await db.get("users", user.id);
  if (!full) return { ok: false, message: "Account not found." };
  const name = str(fd, "name", 120);
  const current = String(fd.get("current_password") ?? "");
  const next = String(fd.get("new_password") ?? "");
  if (name.length >= 2) await db.update("users", user.id, { name });
  if (next) {
    if (!verifyPassword(current, full.password_hash)) return { ok: false, message: "Your current password is incorrect." };
    const weak = validatePasswordStrength(next);
    if (weak) return { ok: false, message: weak };
    await db.update("users", user.id, { password_hash: hashPassword(next) });
    await log(user, "changed password", "account", user.id, user.name);
  }
  return { ok: true, message: next ? "Name and password updated." : "Profile updated." };
}
