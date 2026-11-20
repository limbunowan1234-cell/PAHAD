import type { Post, PublicUser, Role, Unit, UnitKind } from "./types";

/**
 * PAHAD access model, per the Admin Panel Master Instruction Chart (17 Nov 2026).
 * Every server action checks these rules; the admin UI only uses them to hide
 * controls a person cannot use.
 *
 * LA Founder-Owner is not a separate role: it is the President (L1 A) account
 * marked as permanent owner. The access level decides what someone can do;
 * the title is only a label.
 */
export type RoleInfo = {
  id: Role; code: string; label: string; tier: string; level: number;
  /** Seats: how many active accounts may hold the role (undefined = open). */
  seats?: number;
  /** Which structure unit the role is scoped to, if any. */
  scope?: "directorate" | "department" | "programme";
  summary: string;
};

export const ROLES: RoleInfo[] = [
  { id: "super_admin", code: "L1 A", label: "President", tier: "Governing Body", level: 1, seats: 1,
    summary: "Full control: dashboards, access for all levels, directorates and the whole structure. Approves finance." },
  { id: "general_secretary", code: "L1 B", label: "General Secretary", tier: "Governing Body", level: 1, seats: 1,
    summary: "Governing Body agendas, minutes, notices and official institutional records." },
  { id: "joint_secretary", code: "L1 C", label: "Joint / Additional Secretary", tier: "Governing Body", level: 1,
    summary: "Assists the General Secretary with documentation and secretariat duties." },
  { id: "treasurer", code: "L1 D", label: "Treasury", tier: "Governing Body", level: 1, seats: 1,
    summary: "Records and verifies finance entries and reviews the ledger." },
  { id: "gb_member", code: "L1 E", label: "Additional Member of GB", tier: "Governing Body", level: 1, seats: 5,
    summary: "Governing Body meeting and resolution access." },
  { id: "admin", code: "L2 E1", label: "Chief Executive Director", tier: "Executive Body", level: 2, seats: 1,
    summary: "Runs active Directorates and inter-directorate coordination." },
  { id: "executive_secretary", code: "L2 E2", label: "Executive Secretary", tier: "Executive Body", level: 2, seats: 1,
    summary: "Executive Secretariat administration and scheduling." },
  { id: "record_officer", code: "L2 E3", label: "Record Officer", tier: "Executive Body", level: 2, seats: 1,
    summary: "System-wide archives, records and audit log." },
  { id: "directorate_head", code: "L3 D0", label: "Managing Director", tier: "Directorate", level: 3, scope: "directorate",
    summary: "Departments, content, members and tasks within their Directorate." },
  { id: "department_head", code: "L4 D1", label: "Department Head", tier: "Department", level: 4, scope: "department",
    summary: "Programmes, content, members and tasks within their Department." },
  { id: "project_coordinator", code: "L5-1", label: "Project Coordinator", tier: "Programme", level: 5, scope: "programme",
    summary: "Projects within their Programme: add, edit, archive and mark complete." },
  { id: "editor", code: "L6", label: "Member of General Assembly", tier: "General Assembly", level: 6,
    summary: "Uploads content for review and adds members." },
  { id: "creator", code: "C1", label: "Creator", tier: "Associates", level: 7,
    summary: "An artist (music, film, photography, any art form). Submits videos and media to PAHAD; the President approves what is published. No voting rights." },
  { id: "honorary", code: "H1", label: "Honorary Member", tier: "Associates", level: 7,
    summary: "Respected for a speciality in any field, or holds a senior position in another organisation or business. Advises and trains members and admins; advice is non-binding. No voting rights." },
  { id: "sysadmin", code: "SYS", label: "Website Administrator", tier: "Executive Body", level: 9,
    summary: "Builds and maintains the website. Part of the Executive Body: sees every part of the panel, including finance and voting, and votes in polls it is eligible for, but cannot approve, publish or change anything (except page banner photos). All decisions are made by the President." },
];

const P: Role = "super_admin";
const GS: Role = "general_secretary";
const JS: Role = "joint_secretary";
const TR: Role = "treasurer";
const GB: Role = "gb_member";
const C: Role = "admin";
const ES: Role = "executive_secretary";
const RO: Role = "record_officer";
const MD: Role = "directorate_head";
const DH: Role = "department_head";
const PC: Role = "project_coordinator";
const E: Role = "editor";
const SYS: Role = "sysadmin";
const CR: Role = "creator";
const HN: Role = "honorary";
const EXEC = [P, GS, JS, TR, GB, C, ES, RO, MD, DH, PC, E]; // everyone with organisational duties
/** C1 Creator and H1 Honorary Member: associates with a dashboard account but no organisational duties and no vote. */
export const NON_VOTING: readonly Role[] = [CR, HN];

export const PERMISSIONS = {
  "dashboard.view": [...EXEC, SYS, CR, HN],

  "content.view": [...EXEC, SYS], // SYS: read-only
  "content.create": [...EXEC, HN], // L6 / L1 E / H1: always "Awaiting review" (H1: advice and training notes)
  "content.publish": [P, GS, JS, C], // publish / approve anyone's content
  "content.publish_own": [ES, RO, MD, DH, PC], // own items, or within own unit for scoped roles
  "content.edit_any": [P, GS, C],
  "content.delete": [P, GS, C],

  "media.upload": [...EXEC, CR, HN],
  "media.delete": [P, GS, C],

  "members.view": [P, GS, JS, GB, C, ES, RO, MD, DH, PC, E, SYS, HN], // H1: read-only, to know who they advise and train
  "members.create": [P, GS, JS, C, ES, MD, DH, PC, E], // scoped roles: own unit
  "members.edit": [P, GS, JS, C, MD, DH],
  "members.approve": [P, GS, JS, C, MD, DH],
  "members.delete": [P, GS],
  "members.export": [P, GS, C, RO],

  "tasks.view_own": [...EXEC, SYS, CR, HN], // H1 can be given advisory / training sessions
  "tasks.view_all": [P, GS, C, ES, SYS],
  "tasks.assign": [P, GS, JS, C, ES, MD, DH, PC], // scoped roles: own unit
  "tasks.delete": [P, GS, C],

  "submissions.view": [P, GS, JS, C, ES, SYS],
  "submissions.manage": [P, GS, JS, C, ES],
  "submissions.delete": [P, GS],

  "partners.manage": [P, GS, C],
  "people.manage": [P, GS, C], // the public "Our Team" page
  "site.images": [P, SYS], // banner photos: website appearance
  "settings.manage": [P], // finance thresholds and rules

  "structure.view": [P, GS, JS, C, ES, RO, MD, DH, PC, SYS], // General Secretary: read and draft proposals only
  "structure.manage": [P], // the whole structure, directorate toggles, designations, geo units
  "structure.manage_own": [MD, DH, PC], // departments / programmes / projects inside own unit

  "team.view": [P, GS, C, RO, SYS],
  "team.manage": [P], // create admins and change roles
  "finance.access.manage": [P], // grant, change or remove finance access

  "activity.view": [P, GS, C, RO, TR, MD, DH, SYS], // scoped roles: own unit

  // Governing Body meetings (GBM)
  "gbm.view": [P, GS, JS, TR, GB, ES, RO, SYS], // Executive Secretary / Record Officer: coordination and archives
  "gbm.draft": [GS, JS], // prepare meetings, agendas, notices, minutes, resolutions, follow-ups
  "gbm.approve": [P], // approve agendas and minutes, ratify resolutions
  "gbm.vote": [P, GS, JS, TR, GB],

  // Circulars and the General Assembly member portal
  "circulars.issue": [P, GS, JS],
  "circulars.view": [...EXEC, SYS, CR, HN],
  "portal.invite": [P, GS], // give verified members an L6 portal account

  // YouTube videos and featured content: managed by the President only.
  // Members submit videos only when the President has switched on users.can_submit_videos.
  "videos.manage": [P], // add, approve, reject, edit, delete, publish, pages and ON/OFF
  "videos.permission": [P], // grant or revoke YouTube Embed Submission Permission
  "featured.manage": [P],

  // Website menu (top navigation, dropdowns, footer) and dashboard-made pages. The Governing Body (L1)
  // always can; the President can switch it on for anyone else (users.can_manage_menu).
  "menu.manage": [P, GS, JS, TR, GB],
  "menu.permission": [P],

  // Voting (GB, EB and General Assembly). The General Secretary is the authorised administrator.
  // Every signed-in account can open Voting; only eligible members (per poll) can vote.
  "polls.manage": [P, GS], // create, edit, open, pause, close, archive, results, export
  "polls.publish_results": [P], // authorise public results on the website

  // PAHAD+ (public app). Verifiers and approvers are per-member switches the President sets on Admin Team.
  "plus.permission": [P], // grant / revoke "PAHAD+ verifier" and "Approve for public / PAHAD+"
  "plus.flagproof": [P], // mark a PAHAD+ post Flag-Proof
  "plus.payments": [P], // PAHAD+ fee, paid organisers, refunds and payouts
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

/** Can this account submit YouTube videos? The President, C1 Creators always, others when switched on. */
export function canSubmitVideos(u: Pick<PublicUser, "role" | "can_submit_videos">): boolean {
  return can(u.role, "videos.manage") || u.role === "creator" || Boolean(u.can_submit_videos);
}

/** C1 Creators and H1 Honorary Members have no voting rights in any poll. */
export const canVote = (role: Role | null | undefined) => Boolean(role) && !NON_VOTING.includes(role as Role);

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/**
 * Can this person OPEN a page? The SYS Website Administrator can see every page read-only while
 * building the website. Changing anything still needs can(), which every server action checks.
 */
export function canView(role: Role | null | undefined, permission: Permission): boolean {
  return role === "sysadmin" || can(role, permission);
}

/** Can this account change page banners (photo, video, title)? The President, L1, or people allowed menu editing. */
export function canEditBanners(u: Pick<PublicUser, "role" | "can_manage_menu">): boolean {
  return can(u.role, "site.images") || canManageMenu(u);
}

/** Can this account edit the website menu and pages? */
export function canManageMenu(u: Pick<PublicUser, "role" | "can_manage_menu">): boolean {
  return can(u.role, "menu.manage") || Boolean(u.can_manage_menu);
}

export function roleInfo(role: Role): RoleInfo {
  return ROLES.find((r) => r.id === role) ?? ROLES.find((r) => r.id === "editor")!;
}
export const roleLabel = (role: Role) => roleInfo(role).label;
export const roleCode = (role: Role) => roleInfo(role).code;

/** Display name, e.g. "LA / L1 A · Founder-Owner & President" for the owner account. */
export function roleTitle(u: Pick<PublicUser, "role" | "owner">) {
  const r = roleInfo(u.role);
  return u.owner ? `LA / ${r.code} · Founder-Owner & ${r.label}` : `${r.code} · ${r.label}`;
}

// ---------------------------------------------------------------- structure scope
export type Structure = { byId: Map<string, Unit>; units: Unit[] };
export const makeStructure = (units: Unit[]): Structure => ({ units, byId: new Map(units.map((u) => [u.id, u])) });

/** True when `id` is `ancestorId` or lies underneath it. */
export function within(s: Structure, id: string | null | undefined, ancestorId: string | null | undefined): boolean {
  if (!id || !ancestorId) return false;
  let cur = s.byId.get(id);
  for (let guard = 0; cur && guard < 10; guard++) {
    if (cur.id === ancestorId) return true;
    cur = cur.parent_id ? s.byId.get(cur.parent_id) : undefined;
  }
  return false;
}

/** The directorate a unit (department, programme, project) belongs to. */
export function directorateOf(s: Structure, id: string | null | undefined): string {
  let cur = id ? s.byId.get(id) : undefined;
  for (let guard = 0; cur && guard < 10; guard++) {
    if (cur.kind === "directorate") return cur.id;
    cur = cur.parent_id ? s.byId.get(cur.parent_id) : undefined;
  }
  return "";
}

/** The unit a scoped person is limited to, or "" for unscoped (organisation-wide) roles. */
export function scopeUnit(user: Pick<PublicUser, "role" | "directorate" | "unit">): string | null {
  const r = roleInfo(user.role);
  if (r.scope === "directorate") return user.directorate || "∅";
  if (r.scope === "department" || r.scope === "programme") return user.unit || "∅";
  return null;
}

/** Can this person act on a record that belongs to this directorate / unit? */
export function inScope(s: Structure, user: Pick<PublicUser, "role" | "directorate" | "unit">, rec: { directorate?: string; unit?: string }) {
  const scope = scopeUnit(user);
  if (scope === null) return true;
  if (scope === "∅") return false;
  return rec.directorate === scope || within(s, rec.unit, scope);
}

/** Geographical supervision: a person tagged to a District/Subdivision/Block sees records inside it. */
const GLOBAL_GEO: Role[] = [P, GS, JS, TR, GB, C, ES, RO];
export function inGeoScope(s: Structure, user: Pick<PublicUser, "role" | "geo">, recGeo: string | null | undefined) {
  if (GLOBAL_GEO.includes(user.role) || !user.geo) return true;
  return within(s, recGeo, user.geo);
}

/** Can this person publish (or approve) this item? Without an item: can they publish anything at all? */
export function canPublish(s: Structure, user: Pick<PublicUser, "id" | "role" | "directorate" | "unit">, post?: Pick<Post, "author_id" | "directorate" | "unit">) {
  if (can(user.role, "content.publish")) return true;
  if (!can(user.role, "content.publish_own")) return false;
  if (!post || post.author_id === user.id) return true;
  return scopeUnit(user) !== null && inScope(s, user, post);
}

export function canEditPost(s: Structure, user: Pick<PublicUser, "id" | "role" | "directorate" | "unit">, post: Pick<Post, "author_id" | "directorate" | "unit" | "status">) {
  if (can(user.role, "content.edit_any")) return true;
  if (canPublish(s, user, post) && (post.author_id === user.id || scopeUnit(user) !== null)) return true;
  return post.author_id === user.id && post.status !== "published";
}

/** Which structure kinds a person may add/edit/remove, and under which parent. */
export function canManageUnit(s: Structure, user: Pick<PublicUser, "role" | "directorate" | "unit">, kind: UnitKind, parentId: string): boolean {
  if (can(user.role, "structure.manage")) return true;
  if (!can(user.role, "structure.manage_own")) return false;
  const r = roleInfo(user.role);
  if (r.scope === "directorate") return kind === "department" && parentId === user.directorate;
  if (r.scope === "department") return kind === "programme" && parentId === user.unit;
  if (r.scope === "programme") return kind === "project" && parentId === user.unit;
  return false;
}

// ---------------------------------------------------------------- finance
export type FinanceAccess = "none" | "view" | "record" | "approve";
export const FINANCE_ACCESS: { id: FinanceAccess; label: string }[] = [
  { id: "none", label: "No finance access" },
  { id: "view", label: "View reports (read-only)" },
  { id: "record", label: "Record and verify entries (Treasury)" },
  { id: "approve", label: "Approve entries" },
];
/** Roles that may ever be given finance approval. */
export const FINANCE_APPROVERS: Role[] = [P, GS];

const FINANCE_DEFAULT: Partial<Record<Role, FinanceAccess>> = { super_admin: "approve", treasurer: "record", general_secretary: "view", admin: "view" };

export function financeAccess(user: Pick<PublicUser, "role" | "finance">): FinanceAccess {
  if (user.role === "sysadmin") return "view"; // Website Administrator: read-only reports, never records or approves
  const explicit = user.finance as FinanceAccess;
  if (explicit === "approve" && !FINANCE_APPROVERS.includes(user.role)) return "view";
  return explicit && FINANCE_ACCESS.some((f) => f.id === explicit) ? explicit : FINANCE_DEFAULT[user.role] ?? "none";
}

/** Plain-language summary of a role's abilities, for the dashboard. */
export function abilities(role: Role): string[] {
  const list: [Permission, string][] = [
    ["content.publish", "Publish and approve anyone's content"],
    ["content.publish_own", roleInfo(role).scope ? "Publish content within your unit" : "Publish your own content directly"],
    ["content.create", "Upload content"],
    ["members.create", "Add members"],
    ["members.approve", "Edit and approve members"],
    ["members.delete", "Delete members"],
    ["tasks.assign", "Assign tasks"],
    ["submissions.view", "Read and handle messages"],
    ["structure.manage", "Manage the whole structure and directorate toggles"],
    ["structure.manage_own", "Manage the structure inside your unit"],
    ["site.images", "Change page banner photos"],
    ["team.manage", "Create admins and change roles"],
    ["finance.access.manage", "Grant or change finance access"],
  ];
  const out = list.filter(([p]) => can(role, p)).map(([, label]) => label);
  if (role === "creator") out.unshift("Submit YouTube videos for the President's approval");
  if (NON_VOTING.includes(role)) out.push("No voting rights");
  return out;
}

export const UNIT_LABEL: Record<UnitKind, string> = {
  directorate: "Directorate", department: "Department", programme: "Programme", project: "Project", designation: "Designation",
  district: "District (G1)", subdivision: "Subdivision (G2)", block: "Block / Municipality (G3)", gp: "GP / Ward (G4)",
};
/** What may sit under what. */
export const UNIT_PARENT: Partial<Record<UnitKind, UnitKind>> = {
  department: "directorate", programme: "department", project: "programme", subdivision: "district", block: "subdivision", gp: "block",
};
export const GEO_KINDS: UnitKind[] = ["district", "subdivision", "block", "gp"];
