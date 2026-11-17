"use server";

import { updateTag } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { log, now, str, type ActionState } from "@/lib/admin-helpers";
import { db, newId } from "@/lib/db";
import { canManageUnit, UNIT_LABEL, UNIT_PARENT } from "@/lib/permissions";
import { loadStructure } from "@/lib/structure";
import type { PublicUser, Unit, UnitKind } from "@/lib/types";

const KINDS = Object.keys(UNIT_LABEL) as UnitKind[];

async function run(fn: (user: PublicUser) => Promise<string>): Promise<ActionState> {
  try {
    const message = await fn(await requireUser());
    updateTag("units");
    return { ok: true, message };
  } catch (e) {
    if (e instanceof Error && !("digest" in e)) return { ok: false, message: e.message };
    throw e;
  }
}

/** Add or rename a Directorate, Department, Programme, Project, Designation or geographical unit. */
export async function saveUnit(_prev: ActionState, fd: FormData): Promise<ActionState> {
  return run(async (user) => {
    const s = await loadStructure();
    const id = str(fd, "id", 60);
    const existing = id ? s.byId.get(id) : undefined;
    if (id && !existing) throw new Error("This unit no longer exists.");
    const kind = (existing?.kind ?? str(fd, "kind", 20)) as UnitKind;
    if (!KINDS.includes(kind)) throw new Error("Choose what to add.");
    const name = str(fd, "name", 160);
    if (name.length < 2) throw new Error("Enter a name.");
    const parent_id = existing?.parent_id ?? str(fd, "parent_id", 60);
    const parentKind = UNIT_PARENT[kind];
    if (parentKind && s.byId.get(parent_id)?.kind !== parentKind) throw new Error(`Choose the ${UNIT_LABEL[parentKind]} this belongs to.`);
    if (!parentKind && parent_id) throw new Error("This kind of unit has no parent.");
    if (!canManageUnit(s, user, kind, parent_id)) throw new Error("You can't change this part of the structure.");
    const sibling = s.units.find((u) => u.kind === kind && u.parent_id === parent_id && u.name.toLowerCase() === name.toLowerCase() && u.id !== id);
    if (sibling) throw new Error(`There is already a ${UNIT_LABEL[kind]} called “${name}” here.`);
    const sort = Number(str(fd, "sort", 6)) || existing?.sort || s.units.filter((u) => u.kind === kind).length + 1;

    if (existing) {
      await db.update("units", existing.id, { name, sort });
      await log(user, "renamed", UNIT_LABEL[kind].toLowerCase(), existing.id, `${existing.name} → ${name}`, { before: { name: existing.name }, after: { name } });
      return `${UNIT_LABEL[kind]} updated.`;
    }
    const unit: Unit = { id: newId(), kind, name, parent_id, active: true, status: kind === "project" ? "active" : "", sort, created_at: now() };
    await db.insert("units", unit);
    await log(user, "added", UNIT_LABEL[kind].toLowerCase(), unit.id, name, { after: { kind, name, parent: s.byId.get(parent_id)?.name ?? "" } });
    return `${UNIT_LABEL[kind]} “${name}” added.`;
  });
}

/** Directorate activation toggles (and the same ON/OFF for any unit): OFF hides it without deleting data. */
export async function setUnitActive(id: string, active: boolean): Promise<ActionState> {
  return run(async (user) => {
    const s = await loadStructure();
    const unit = s.byId.get(id);
    if (!unit) throw new Error("Unit not found.");
    if (!canManageUnit(s, user, unit.kind, unit.parent_id)) throw new Error("You can't change this part of the structure.");
    await db.update("units", id, { active });
    await log(user, active ? "turned on" : "turned off", UNIT_LABEL[unit.kind].toLowerCase(), id, unit.name, { before: { active: unit.active }, after: { active } });
    return `${unit.name} is now ${active ? "ON (active and visible)" : "OFF (hidden; nothing was deleted)"}.`;
  });
}

/** Project Coordinators mark projects completed or archived. */
export async function setProjectStatus(id: string, status: "active" | "completed" | "archived"): Promise<ActionState> {
  return run(async (user) => {
    const s = await loadStructure();
    const unit = s.byId.get(id);
    if (!unit || unit.kind !== "project") throw new Error("Project not found.");
    if (!canManageUnit(s, user, "project", unit.parent_id)) throw new Error("You can't change this project.");
    await db.update("units", id, { status });
    await log(user, `marked ${status}`, "project", id, unit.name, { before: { status: unit.status }, after: { status } });
    return `${unit.name} marked ${status}.`;
  });
}

/** Remove a unit. Units that still contain others, or that people and records point to, are turned OFF instead. */
export async function removeUnit(id: string): Promise<ActionState> {
  return run(async (user) => {
    const s = await loadStructure();
    const unit = s.byId.get(id);
    if (!unit) throw new Error("Unit not found.");
    if (!canManageUnit(s, user, unit.kind, unit.parent_id)) throw new Error("You can't change this part of the structure.");
    if (s.units.some((u) => u.parent_id === id)) throw new Error(`${unit.name} still contains other units. Remove those first, or turn it OFF instead.`);
    const [users, members, posts] = await Promise.all([db.all("users"), db.all("members"), db.all("posts")]);
    const refs = [...users, ...members, ...posts].filter((r) => {
      const rec = r as { directorate?: string; unit?: string; geo?: string };
      return rec.directorate === id || rec.unit === id || rec.geo === id;
    }).length;
    if (refs > 0) throw new Error(`${refs} people or records belong to ${unit.name}. Turn it OFF to hide it without losing that data.`);
    await db.remove("units", id);
    await log(user, "removed", UNIT_LABEL[unit.kind].toLowerCase(), id, unit.name, { before: unit });
    return `${unit.name} removed.`;
  });
}
