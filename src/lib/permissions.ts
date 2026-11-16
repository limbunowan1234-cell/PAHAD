import type { Role } from "./types";

/**
 * The single source of truth for what each admin level may do.
 * Every server action checks this table; the admin UI uses it only to hide
 * controls a person cannot use.
 *
 * Levels follow PAHAD's governance structure. The internal ids stay
 * "super_admin" / "admin" / "editor" so existing accounts keep working.
 *
 *  Level 1  Super Admin      Governing Body (e.g. Chairman): controls everything.
 *  Level 2  Executive Admin  Executive Body (e.g. Chief Executive Director): assigns
 *                            work, uploads, manages almost everything, but cannot
 *                            delete members or manage admin accounts.
 *  Level 3  General          General Assembly members: upload content (sent for
 *                            review) and add members.
 */
export const ROLES: { id: Role; label: string; level: number; body: string; example: string; summary: string }[] = [
  {
    id: "super_admin", label: "Super Admin", level: 1, body: "Governing Body", example: "Chairman",
    summary: "Full control of the website, members, admin accounts and settings.",
  },
  {
    id: "admin", label: "Executive Admin", level: 2, body: "Executive Body", example: "Chief Executive Director",
    summary: "Assigns work, publishes and manages everything except deleting members and admin accounts.",
  },
  {
    id: "editor", label: "General", level: 3, body: "General Assembly", example: "Member",
    summary: "Uploads content for review and adds new members.",
  },
];

const S: Role = "super_admin";
const A: Role = "admin";
const E: Role = "editor";

export const PERMISSIONS = {
  "dashboard.view": [S, A, E],

  "content.create": [S, A, E], // editors' items go to "pending review"
  "content.edit_own": [S, A, E], // editors: own items until published
  "content.edit_any": [S, A],
  "content.publish": [S, A],
  "content.delete": [S, A],

  "media.upload": [S, A, E],
  "media.delete": [S, A],

  "members.view": [S, A, E],
  "members.create": [S, A, E],
  "members.edit": [S, A],
  "members.approve": [S, A],
  "members.delete": [S],
  "members.export": [S, A],

  "tasks.view_own": [S, A, E],
  "tasks.view_all": [S, A],
  "tasks.assign": [S, A],
  "tasks.delete": [S, A],

  "submissions.view": [S, A],
  "submissions.manage": [S, A],
  "submissions.delete": [S],

  "partners.manage": [S, A],

  "people.manage": [S, A], // the public "Our Team" page

  "site.images": [S], // banner photos on every page

  "team.view": [S, A],
  "team.manage": [S],

  "activity.view": [S, A],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/** Plain-language summary of a role's abilities, for the dashboard. */
export function abilities(role: Role): string[] {
  const list: [Permission, string][] = [
    ["content.publish", "Publish and approve content"],
    ["content.create", can(role, "content.publish") ? "Create content" : "Upload content for review"],
    ["media.upload", "Upload gallery photos"],
    ["members.create", "Add members"],
    ["members.edit", "Edit, approve and export members"],
    ["members.delete", "Delete members"],
    ["tasks.assign", "Assign tasks to the team"],
    ["tasks.view_own", "Work on tasks assigned to you"],
    ["submissions.view", "Read and handle messages"],
    ["partners.manage", "Manage partners"],
    ["people.manage", "Manage the Our Team page"],
    ["site.images", "Change the banner photo on any page"],
    ["team.manage", "Create admins and change access levels"],
  ];
  return list.filter(([p]) => can(role, p)).map(([, label]) => label);
}

export function roleLabel(role: Role) {
  return ROLES.find((r) => r.id === role)?.label ?? role;
}
