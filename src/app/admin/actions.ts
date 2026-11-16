"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db, newId } from "@/lib/db";
import { hashPassword, validatePasswordStrength, verifyPassword } from "@/lib/auth/password";
import {
  clearSessionCookie,
  getCurrentUser,
  PermissionError,
  requirePermission,
  setSessionCookie,
} from "@/lib/auth/session";
import { can, roleLabel, type Permission } from "@/lib/permissions";
import { storeUpload } from "@/lib/storage";
import { safeUrl, toFileUrl, toImageUrl } from "@/lib/drive";
import { TEAM_SECTIONS, type MemberStatus, type Post, type PostStatus, type PostType, type PublicUser, type Role, type TaskStatus, type TeamSection } from "@/lib/types";
import { slugify } from "@/lib/utils";

export type ActionState = { ok: boolean; message: string } | null;

const now = () => new Date().toISOString();
const str = (fd: FormData, k: string, max = 500) => String(fd.get(k) ?? "").trim().slice(0, max);

async function log(actor: PublicUser, action: string, entity: string, entityId: string, summary: string) {
  await db.insert("activity", {
    id: newId(), actor_id: actor.id, actor_name: actor.name, action, entity, entity_id: entityId, summary, created_at: now(),
  });
}

/** Wraps an action so permission and validation errors come back as friendly messages. */
async function guarded(permission: Permission, fn: (user: PublicUser) => Promise<string>): Promise<ActionState> {
  try {
    const user = await requirePermission(permission);
    return { ok: true, message: await fn(user) };
  } catch (e) {
    if (e instanceof PermissionError || e instanceof Error) return { ok: false, message: e.message };
    throw e;
  }
}

async function fileFrom(fd: FormData, key: string, folder: "images" | "documents") {
  const f = fd.get(key);
  return f instanceof File && f.size > 0 ? storeUpload(f, folder) : null;
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
  redirect("/admin");
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
    if (existing && !can(user.role, "content.edit_any")) {
      if (existing.author_id !== user.id) throw new Error("General-level admins can only edit their own items.");
      if (existing.status === "published") throw new Error("This item is published. Ask an Executive Admin or Super Admin to change it.");
    }

    let status = (str(fd, "status", 20) || "draft") as PostStatus;
    if (!can(user.role, "content.publish") && status === "published") status = "pending";

    let slug = slugify(str(fd, "slug", 100) || title) || newId().slice(0, 8);
    const clash = (await db.findBy("posts", "slug", slug)).find((p) => p.id !== id);
    if (clash) slug = `${slug}-${newId().slice(0, 4)}`;

    // Each file can be uploaded, or given as a link (Google Drive share links are converted automatically).
    const coverLink = safeUrl(str(fd, "cover_link", 500));
    const cover = (await fileFrom(fd, "cover_file", "images")) ?? (coverLink ? toImageUrl(coverLink) : str(fd, "cover", 500));
    const fileLink = safeUrl(str(fd, "file_link", 500));
    const file_url = (await fileFrom(fd, "attachment", "documents")) ?? (fileLink ? toFileUrl(fileLink) : str(fd, "file_url", 500));
    const form_url = safeUrl(str(fd, "form_url", 500));

    const data: Partial<Post> = {
      type, title, slug, cover, file_url, form_url, status,
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
      await log(user, "updated", "content", existing.id, `${title} (${status})`);
    } else {
      const row = { ...data, id: newId(), author_id: user.id, author_name: user.name, created_at: now(), published_at: data.published_at ?? "" } as Post;
      await db.insert("posts", row);
      await log(user, "created", "content", row.id, `${title} (${status})`);
    }
    updateTag("posts");
    return status === "pending" ? "Saved and sent for review. An Executive Admin or Super Admin will publish it." : status === "published" ? "Published." : "Draft saved.";
  });
  if (result?.ok) redirect(`/admin/content?saved=${encodeURIComponent(result.message)}`);
  return result;
}

export async function setPostStatus(id: string, status: PostStatus) {
  return guarded("content.publish", async (user) => {
    const post = await db.get("posts", id);
    if (!post) throw new Error("Not found.");
    await db.update("posts", id, { status, published_at: status === "published" ? post.published_at || now() : post.published_at, updated_at: now() });
    await log(user, status === "published" ? "published" : "unpublished", "content", id, post.title);
    updateTag("posts");
    return status === "published" ? "Published." : "Moved back to drafts.";
  });
}

export async function deletePost(id: string) {
  return guarded("content.delete", async (user) => {
    const post = await db.get("posts", id);
    if (!post) throw new Error("Not found.");
    await db.remove("posts", id);
    await log(user, "deleted", "content", id, post.title);
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
    const id = newId();
    await db.insert("members", {
      id, member_no: await nextMemberNo(), name, email,
      phone: str(fd, "phone", 30), area: str(fd, "area", 120), address: str(fd, "address", 300),
      occupation: str(fd, "occupation", 160), category: str(fd, "category", 60) || "General",
      interests: str(fd, "interests", 400), status: "active", source: "admin",
      notes: str(fd, "notes", 2000), added_by: user.name, created_at: now(),
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
    await db.update("members", id, {
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
    await log(user, "deleted", "member", id, m.name);
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
    const id = newId();
    await db.insert("tasks", {
      id, title, description: str(fd, "description", 2000), assigned_to, assigned_by: user.id,
      due_date: str(fd, "due_date", 10), priority: (str(fd, "priority", 10) || "normal") as "normal",
      status: "todo", created_at: now(), updated_at: now(),
    });
    await log(user, "assigned", "task", id, `${title} → ${assignee.name}`);
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
const ROLE_IDS: Role[] = ["super_admin", "admin", "editor"];

export async function createAdmin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("team.manage", async (user) => {
    const name = str(fd, "name", 120);
    const email = str(fd, "email", 160).toLowerCase();
    const role = str(fd, "role", 20) as Role;
    const password = String(fd.get("password") ?? "");
    if (name.length < 2) throw new Error("Name is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a valid email.");
    if (!ROLE_IDS.includes(role)) throw new Error("Choose a role.");
    const weak = validatePasswordStrength(password);
    if (weak) throw new Error(weak);
    if ((await db.all("users")).some((u) => u.email.toLowerCase() === email)) throw new Error("An admin with this email already exists.");
    const id = newId();
    await db.insert("users", {
      id, email, name, role, designation: str(fd, "designation", 120), active: true,
      password_hash: hashPassword(password), created_at: now(), last_login: null,
    });
    await log(user, "created admin", "team", id, `${name} as ${roleLabel(role)}`);
    return `${name} can now sign in as ${roleLabel(role)}. Share the temporary password privately and ask them to change it.`;
  });
}

async function superAdminCount() {
  return (await db.all("users")).filter((u) => u.role === "super_admin" && u.active).length;
}

export async function updateAdmin(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return guarded("team.manage", async (user) => {
    const id = str(fd, "id", 60);
    const target = await db.get("users", id);
    if (!target) throw new Error("Admin not found.");
    const role = str(fd, "role", 20) as Role;
    const active = fd.get("active") === "on";
    if (!ROLE_IDS.includes(role)) throw new Error("Choose a role.");
    const losingSuper = target.role === "super_admin" && target.active && (role !== "super_admin" || !active);
    if (losingSuper && (await superAdminCount()) <= 1) throw new Error("There must always be at least one active Super Admin.");
    await db.update("users", id, { role, active, designation: str(fd, "designation", 120), name: str(fd, "name", 120) || target.name });
    const newPassword = String(fd.get("password") ?? "");
    if (newPassword) {
      const weak = validatePasswordStrength(newPassword);
      if (weak) throw new Error(weak);
      await db.update("users", id, { password_hash: hashPassword(newPassword) });
    }
    await log(user, "updated admin", "team", id, `${target.name}: ${roleLabel(role)}${active ? "" : " (deactivated)"}`);
    return "Admin updated.";
  });
}

export async function deleteAdmin(id: string) {
  return guarded("team.manage", async (user) => {
    if (id === user.id) throw new Error("You cannot delete your own account.");
    const target = await db.get("users", id);
    if (!target) throw new Error("Admin not found.");
    if (target.role === "super_admin" && (await superAdminCount()) <= 1) throw new Error("There must always be at least one active Super Admin.");
    await db.remove("users", id);
    await log(user, "deleted admin", "team", id, target.name);
    return `${target.name}'s admin access was removed.`;
  });
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
