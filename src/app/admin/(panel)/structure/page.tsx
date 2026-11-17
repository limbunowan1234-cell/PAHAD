import { redirect } from "next/navigation";
import { removeUnit, saveUnit, setProjectStatus, setUnitActive } from "../../structure-actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { Badge, Card, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { can, canManageUnit, UNIT_LABEL, type Structure } from "@/lib/permissions";
import { loadStructure } from "@/lib/structure";
import type { PublicUser, Unit, UnitKind } from "@/lib/types";
import { cn } from "@/lib/utils";

export const metadata = { title: "Structure" };

const CHILD: Partial<Record<UnitKind, UnitKind>> = { directorate: "department", department: "programme", programme: "project", district: "subdivision", subdivision: "block", block: "gp" };

function AddForm({ kind, parent, label }: { kind: UnitKind; parent: string; label?: string }) {
  return (
    <AdminForm action={saveUnit} submitLabel={label ?? `Add ${UNIT_LABEL[kind]}`} resetOnSuccess className="flex flex-wrap items-end gap-2 !space-y-0">
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="parent_id" value={parent} />
      <label className="min-w-48 flex-1">
        <span className="sr-only">Name</span>
        <input name="name" required placeholder={`New ${UNIT_LABEL[kind].replace(/ \(G\d\)/, "")} name`} className="field !py-2 text-sm" />
      </label>
    </AdminForm>
  );
}

function UnitRow({ s, unit, user, depth }: { s: Structure; unit: Unit; user: PublicUser; depth: number }) {
  const children = s.units.filter((u) => u.parent_id === unit.id).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  const manage = canManageUnit(s, user, unit.kind, unit.parent_id);
  const childKind = CHILD[unit.kind];
  const addChild = childKind && canManageUnit(s, user, childKind, unit.id);
  return (
    <li className={cn("rounded-xl border border-line bg-white", depth > 0 && "ml-4 sm:ml-8", !unit.active && "opacity-60")}>
      <div className="flex flex-wrap items-center gap-2 p-3">
        <Badge tone={unit.kind === "directorate" || unit.kind === "district" ? "teal" : "grey"}>{UNIT_LABEL[unit.kind]}</Badge>
        <span className="font-medium text-ink">{unit.name}</span>
        {!unit.active && <Badge tone="amber">OFF</Badge>}
        {unit.kind === "project" && unit.status !== "active" && <Badge tone={unit.status === "completed" ? "green" : "grey"}>{unit.status}</Badge>}
        <span className="flex-1" />
        {manage && (
          <>
            <ActionButton action={setUnitActive.bind(null, unit.id, !unit.active)}>{unit.active ? "Turn OFF" : "Turn ON"}</ActionButton>
            {unit.kind === "project" && unit.status !== "completed" && <ActionButton action={setProjectStatus.bind(null, unit.id, "completed")}>Mark completed</ActionButton>}
            {unit.kind === "project" && unit.status !== "archived" && <ActionButton action={setProjectStatus.bind(null, unit.id, "archived")}>Archive</ActionButton>}
            {unit.kind === "project" && unit.status !== "active" && <ActionButton action={setProjectStatus.bind(null, unit.id, "active")}>Reopen</ActionButton>}
            <ActionButton variant="danger" confirm={`Remove ${unit.name}? (Units in use can only be turned OFF.)`} action={removeUnit.bind(null, unit.id)}>Remove</ActionButton>
          </>
        )}
      </div>
      {(manage || addChild) && (
        <div className="border-t border-line px-3 pb-3">
          <Disclosure summary="Rename / add inside">
            <div className="space-y-3">
              {manage && (
                <AdminForm action={saveUnit} submitLabel="Rename" className="flex flex-wrap items-end gap-2 !space-y-0">
                  <input type="hidden" name="id" value={unit.id} />
                  <label className="min-w-48 flex-1">
                    <span className="sr-only">Name</span>
                    <input name="name" defaultValue={unit.name} required className="field !py-2 text-sm" />
                  </label>
                </AdminForm>
              )}
              {addChild && <AddForm kind={childKind} parent={unit.id} />}
            </div>
          </Disclosure>
        </div>
      )}
      {children.length > 0 && (
        <ul className="space-y-2 pb-3 pr-3">
          {children.map((c) => <UnitRow key={c.id} s={s} unit={c} user={user} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  );
}

export default async function StructurePage() {
  const user = await requireUser();
  const viewAll = can(user.role, "structure.view") || can(user.role, "structure.manage");
  if (!viewAll) redirect("/admin");
  const s = await loadStructure();
  const full = can(user.role, "structure.manage");
  const roots = (kind: UnitKind) => s.units.filter((u) => u.kind === kind && !u.parent_id).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  const designations = s.units.filter((u) => u.kind === "designation").sort((a, b) => a.name.localeCompare(b.name));
  const directorates = roots("directorate");

  return (
    <>
      <PageHeader
        title="Structure"
        description="Directorates, Departments, Programmes, Projects, official Designations and geographical units (G1–G4)."
      />
      {!full && (
        <Notice>
          {can(user.role, "structure.manage_own")
            ? "You can manage the part of the structure inside your own unit. Everything else is shown read-only."
            : "Read-only view. Structural changes are made by the President (LA / L1 A); you can prepare proposals for them."}
        </Notice>
      )}

      <Card title="Directorates" className="mb-8">
        {full && (
          <div className="mb-4 rounded-xl bg-sand p-4">
            <p className="mb-2 text-sm text-muted">Directorate activation: turn a Directorate OFF to hide it everywhere without deleting its data.</p>
            <div className="flex flex-wrap gap-2">
              {directorates.map((d) => (
                <ActionButton key={d.id} variant={d.active ? "primary" : "ghost"} action={setUnitActive.bind(null, d.id, !d.active)}>
                  {d.active ? "☑" : "☐"} {d.name}
                </ActionButton>
              ))}
            </div>
          </div>
        )}
        <ul className="space-y-2">{directorates.map((u) => <UnitRow key={u.id} s={s} unit={u} user={user} depth={0} />)}</ul>
        {full && <div className="mt-4"><AddForm kind="directorate" parent="" /></div>}
      </Card>

      <Card title="Geographical units (G1 District → G2 Subdivision → G3 Block → G4 GP / Ward)" className="mb-8">
        {roots("district").length === 0 && <p className="mb-3 text-sm text-muted">No geographical units yet. Start by adding a District.</p>}
        <ul className="space-y-2">{roots("district").map((u) => <UnitRow key={u.id} s={s} unit={u} user={user} depth={0} />)}</ul>
        {full && <div className="mt-4"><AddForm kind="district" parent="" /></div>}
      </Card>

      <Card title="Official designations">
        <p className="mb-3 text-sm text-muted">Titles offered when creating admins and Our Team entries, e.g. Managing Director, Block Coordinator.</p>
        <ul className="flex flex-wrap gap-2">
          {designations.map((d) => (
            <li key={d.id} className="flex items-center gap-1 rounded-full bg-sand py-1 pl-3 pr-1 text-sm text-teal">
              {d.name}
              {full && <ActionButton variant="danger" action={removeUnit.bind(null, d.id)}>×</ActionButton>}
            </li>
          ))}
          {designations.length === 0 && <li className="text-sm text-muted">None yet.</li>}
        </ul>
        {full && <div className="mt-4"><AddForm kind="designation" parent="" /></div>}
      </Card>
    </>
  );
}
