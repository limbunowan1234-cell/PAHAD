import "server-only";
import { db } from "./db";
import { directorateOf, GEO_KINDS, inScope, makeStructure, roleInfo, within, type Structure } from "./permissions";
import type { PublicUser, Role } from "./types";

/** Fresh structure for admin pages and actions (never cached). */
export async function loadStructure(): Promise<Structure> {
  return makeStructure(await db.all("units"));
}

/**
 * Reads the cascading scope fields posted by <ScopePicker>: directorate, unit
 * (department or programme) and geo. Unknown ids are dropped; the directorate
 * is always derived from the unit so the two can never disagree.
 */
export function scopeFromForm(s: Structure, fd: FormData) {
  const get = (k: string) => String(fd.get(k) ?? "").trim();
  const unitRow = s.byId.get(get("unit"));
  const unit = unitRow && (unitRow.kind === "department" || unitRow.kind === "programme") ? unitRow.id : "";
  const dirRow = s.byId.get(get("directorate"));
  const directorate = unit ? directorateOf(s, unit) : dirRow?.kind === "directorate" ? dirRow.id : "";
  const geoRow = s.byId.get(get("geo"));
  const geo = geoRow && GEO_KINDS.includes(geoRow.kind) ? geoRow.id : "";
  return { directorate, unit, geo };
}

/** Admin accounts: scoped roles must be given the unit they are scoped to. */
export function assertRoleScope(s: Structure, role: Role, scope: { directorate: string; unit: string; geo: string }) {
  const need = roleInfo(role).scope;
  if (need === "directorate" && !scope.directorate) throw new Error("Choose the Directorate this Managing Director leads.");
  if (need === "department" && s.byId.get(scope.unit)?.kind !== "department") throw new Error("Choose the Department this Department Head leads.");
  if (need === "programme" && s.byId.get(scope.unit)?.kind !== "programme") throw new Error("Choose the Programme this Project Coordinator runs.");
  // A Managing Director is scoped by Directorate only; unscoped roles keep no unit, so nothing limits them by accident.
  return need === "directorate" || !need ? { ...scope, unit: "" } : scope;
}

/** Records (content, members): scoped people always file inside their own unit. */
export function recordScope(s: Structure, user: PublicUser, fd: FormData) {
  const picked = scopeFromForm(s, fd);
  if (inScope(s, user, picked)) return picked;
  return { directorate: user.directorate, unit: roleInfo(user.role).scope === "directorate" ? "" : user.unit, geo: picked.geo };
}

/** Units a person may pick for records: everything for unscoped roles, otherwise their own branch (and the path to it). */
export function pickableUnits(s: Structure, user: PublicUser) {
  const scope = roleInfo(user.role).scope ? (roleInfo(user.role).scope === "directorate" ? user.directorate : user.unit) : "";
  const org = s.units.filter((u) => ["directorate", "department", "programme"].includes(u.kind));
  if (!roleInfo(user.role).scope) return org;
  const path = new Set<string>();
  for (let cur = s.byId.get(scope); cur; cur = cur.parent_id ? s.byId.get(cur.parent_id) : undefined) path.add(cur.id);
  return org.filter((u) => path.has(u.id) || within(s, u.id, scope));
}

/** Single-seat roles (President, General Secretary, Treasury…) and the 5-seat Governing Body limit. */
export async function assertSeat(role: Role, active: boolean, excludeUserId = "") {
  const seats = roleInfo(role).seats;
  if (!seats || !active) return;
  const taken = (await db.all("users")).filter((u) => u.role === role && u.active && u.id !== excludeUserId).length;
  if (taken >= seats) {
    throw new Error(
      seats === 1
        ? `${roleInfo(role).label} has one seat and it is already held. Change or deactivate the current holder first.`
        : `${roleInfo(role).label} allows at most ${seats} active seats, and all are taken.`,
    );
  }
}
