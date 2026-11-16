import type { Post, PublicUser, Role } from "./types";

/**
 * PAHAD admin access model. The single source of truth for what each level may do.
 * Every server action checks these rules; the admin UI only uses them to hide
 * controls a person cannot use.
 *
 * The access level decides what someone can do. The title (Founder, President,
 * Website Head…) is only a label stored on the account.
 *
 * Internal ids are kept stable so existing accounts keep working:
 *   super_admin = L1 President, admin = L2 Chief Executive Director, editor = L3 General.
 */
export const ROLES: { id: Role; code: string; label: string; level: number; body: string; summary: string }[] = [
  { id: "super_admin", code: "L1", label: "President", level: 1, body: "Governing Body",
    summary: "Full control. The only level that can create admins and change roles." },
  { id: "general_secretary", code: "L1G", label: "General Secretary", level: 1, body: "Governing Body",
    summary: "Runs day-to-day work, deletes members and approves finance. Cannot change roles." },
  { id: "admin", code: "L2", label: "Chief Executive Director", level: 2, body: "Secretariat",
    summary: "Runs the Secretariat: content, members, tasks, partners and messages. Read-only finance." },
  { id: "treasurer", code: "L2F", label: "Treasurer", level: 2, body: "Secretariat",
    summary: "Records finance entries with receipts. Cannot approve." },
  { id: "program_director", code: "L2P", label: "Program Director", level: 2, body: "Secretariat",
    summary: "Events, programmes, partners, tasks and messages." },
  { id: "directorate_head", code: "L2D", label: "Directorate Head", level: 2, body: "Secretariat, own directorate",
    summary: "Publishing, members and tasks within their own directorate only." },
  { id: "editor", code: "L3", label: "General", level: 3, body: "General Assembly",
    summary: "Uploads content for review and adds new members." },
];

const P: Role = "super_admin";
const G: Role = "general_secretary";
const C: Role = "admin";
const T: Role = "treasurer";
const R: Role = "program_director"; // pRogram director
const D: Role = "directorate_head";
const E: Role = "editor";
const ALL = [P, G, C, T, R, D, E];

export const PERMISSIONS = {
  "dashboard.view": ALL,

  "content.create": ALL, // General: always "Awaiting review"
  "content.publish": [P, G, C], // publish / approve anyone's content
  "content.publish_own": [T, R, D], // publish own items directly (Directorate Head: own directorate)
  "content.edit_any": [P, G, C], // edit or remove others' content (author is notified)
  "content.delete": [P, G, C],

  "media.upload": ALL,
  "media.delete": [P, G, C],

  "members.view": [P, G, C, D, E],
  "members.create": [P, G, C, D, E], // Directorate Head: own directorate
  "members.edit": [P, G, C, D],
  "members.approve": [P, G, C, D],
  "members.delete": [P, G],
  "members.export": [P, G, C],

  "tasks.view_own": ALL,
  "tasks.view_all": [P, G, C, R],
  "tasks.assign": [P, G, C, R, D], // Directorate Head: own directorate's admins
  "tasks.delete": [P, G, C],

  "submissions.view": [P, G, C, R],
  "submissions.manage": [P, G, C, R],
  "submissions.delete": [P, G],

  "partners.manage": [P, G, C, R],
  "people.manage": [P, G, C], // the public "Our Team" page
  "site.images": [P, G], // banner photos on every page
  "settings.manage": [P], // finance thresholds and rules

  "team.view": [P, G, C],
  "team.manage": [P], // create admins and change roles
  "finance.access.manage": [P, G], // grant, change or remove finance access

  "activity.view": [P, G, C, T, D], // Directorate Head: own directorate only
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Directorate Heads are limited to their own directorate; everyone else is not scoped. */
export function inScope(user: Pick<PublicUser, "role" | "directorate">, directorate: string | null | undefined) {
  if (user.role !== "directorate_head") return true;
  return Boolean(user.directorate) && directorate === user.directorate;
}

/** Can this person publish (or approve) this item? Without an item: can they publish anything at all? */
export function canPublish(user: Pick<PublicUser, "id" | "role" | "directorate">, post?: Pick<Post, "author_id" | "directorate">) {
  if (can(user.role, "content.publish")) return true;
  if (!can(user.role, "content.publish_own")) return false;
  if (!post) return true;
  if (post.author_id === user.id) return true;
  return user.role === "directorate_head" && inScope(user, post.directorate);
}

/** Can this person edit this item? */
export function canEditPost(user: Pick<PublicUser, "id" | "role" | "directorate">, post: Pick<Post, "author_id" | "directorate" | "status">) {
  if (can(user.role, "content.edit_any")) return true;
  if (canPublish(user, post) && (post.author_id === user.id || user.role === "directorate_head")) return true;
  return post.author_id === user.id && post.status !== "published";
}

// ---------------------------------------------------------------- finance
export type FinanceAccess = "none" | "view" | "record" | "approve";
export const FINANCE_ACCESS: { id: FinanceAccess; label: string }[] = [
  { id: "none", label: "No finance access" },
  { id: "view", label: "View reports (read-only)" },
  { id: "record", label: "Record entries (Treasurer)" },
  { id: "approve", label: "Approve entries (Governing Body)" },
];

const FINANCE_DEFAULT: Record<Role, FinanceAccess> = {
  super_admin: "approve", general_secretary: "approve", admin: "view", treasurer: "record",
  program_director: "none", directorate_head: "none", editor: "none",
};

/** Finance access is its own permission group: role default unless the Governing Body set it explicitly. */
export function financeAccess(user: Pick<PublicUser, "role" | "finance">): FinanceAccess {
  const explicit = user.finance as FinanceAccess;
  // Approval always stays with the Governing Body, whatever is stored on the account.
  if (explicit === "approve" && user.role !== "super_admin" && user.role !== "general_secretary") return "view";
  return explicit && FINANCE_ACCESS.some((f) => f.id === explicit) ? explicit : FINANCE_DEFAULT[user.role];
}

// ---------------------------------------------------------------- labels
export function roleInfo(role: Role) {
  return ROLES.find((r) => r.id === role) ?? ROLES[ROLES.length - 1];
}

export function roleLabel(role: Role) {
  return roleInfo(role).label;
}

/** Plain-language summary of a role's abilities, for the dashboard. */
export function abilities(role: Role): string[] {
  const list: [Permission, string][] = [
    ["content.publish", "Publish and approve anyone's content"],
    ["content.publish_own", role === "directorate_head" ? "Publish content for your directorate" : "Publish your own content directly"],
    ["content.create", "Upload content"],
    ["media.upload", "Upload gallery photos"],
    ["members.create", role === "directorate_head" ? "Add and approve members in your directorate" : "Add members"],
    ["members.export", "Edit, approve and export members"],
    ["members.delete", "Delete members"],
    ["tasks.assign", role === "directorate_head" ? "Assign tasks within your directorate" : "Assign tasks"],
    ["tasks.view_own", "Work on tasks assigned to you"],
    ["submissions.view", "Read and handle messages"],
    ["partners.manage", "Manage partners"],
    ["people.manage", "Manage the Our Team page"],
    ["site.images", "Change the banner photo on any page"],
    ["team.manage", "Create admins and change roles"],
    ["finance.access.manage", "Grant or change finance access"],
  ];
  return list.filter(([p]) => can(role, p)).map(([, label]) => label);
}

/** Directorates, from PAHAD's governance structure. */
export const DIRECTORATES = [
  "Research, Knowledge and Innovation",
  "Civic and Community Development",
  "Economic Development and Enterprise",
  "Media, Communications and Cultural Documentation",
  "Policy, Governance and Public Affairs",
  "Administration, Finance and Institutional Development",
] as const;
