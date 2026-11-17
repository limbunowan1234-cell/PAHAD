"use client";

import { useMemo, useState } from "react";
import { roleInfo, type RoleInfo } from "@/lib/permissions";
import type { Role, Unit } from "@/lib/types";

/**
 * Cascading scope dropdowns (Master Instruction Chart):
 *   L3 → Directorate · L4 → Directorate → Department · L5-1 → … → Programme
 *   Geo tag: District → Subdivision → Block → GP/Ward (G1–G4)
 * Posts hidden fields: role (optional), directorate, unit, geo.
 */
export function ScopePicker({
  units,
  roles,
  defaultRole,
  lockRole,
  value,
  mode = "person",
  showGeo = true,
}: {
  units: Unit[];
  /** Pass to include the access-level dropdown (admin accounts). */
  roles?: RoleInfo[];
  defaultRole?: Role;
  /** Show the level but don't let it change (e.g. the owner account). */
  lockRole?: boolean;
  value?: { directorate?: string; unit?: string; geo?: string };
  /** "person": units follow the role; "record": units are optional (members, content). */
  mode?: "person" | "record";
  showGeo?: boolean;
}) {
  const byId = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const chain = (id?: string) => {
    const out: Record<string, string> = {};
    let cur = id ? byId.get(id) : undefined;
    for (let g = 0; cur && g < 10; g++) {
      out[cur.kind] = cur.id;
      cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
    }
    return out;
  };
  const start = { ...chain(value?.directorate), ...chain(value?.unit) };
  const geoStart = chain(value?.geo);

  const [role, setRole] = useState<Role>(defaultRole ?? "editor");
  const [dir, setDir] = useState(start.directorate ?? "");
  const [dept, setDept] = useState(start.department ?? "");
  const [prog, setProg] = useState(start.programme ?? "");
  const [district, setDistrict] = useState(geoStart.district ?? "");
  const [sub, setSub] = useState(geoStart.subdivision ?? "");
  const [block, setBlock] = useState(geoStart.block ?? "");
  const [gp, setGp] = useState(geoStart.gp ?? "");

  const kids = (kind: Unit["kind"], parent = "") =>
    units.filter((u) => u.kind === kind && (u.parent_id ?? "") === parent && (u.active || [dir, dept, prog, district, sub, block, gp].includes(u.id)));

  const scope = roles ? roleInfo(role).scope : undefined;
  const showDir = mode === "record" || Boolean(scope);
  const showDept = mode === "record" ? Boolean(dir) : scope === "department" || scope === "programme";
  const showProg = mode === "record" ? Boolean(dept) : scope === "programme";

  const unit = scope === "directorate" ? "" : showProg && prog ? prog : showDept && dept ? dept : "";
  const geo = gp || block || sub || district;

  const select = (label: string, val: string, onChange: (v: string) => void, options: Unit[], placeholder: string, required = false) => (
    <label className="block">
      <span className="label">{label}{required && " *"}</span>
      <select className="field" value={val} required={required} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}{o.active ? "" : " (off)"}</option>)}
      </select>
    </label>
  );

  return (
    <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
      {roles && (
        lockRole ? (
          <label className="block">
            <span className="label">Access level</span>
            <input type="hidden" name="role" value={role} />
            <span className="block rounded-xl bg-sand px-3 py-2 text-sm text-teal">LA / {roleInfo(role).code} · Founder-Owner &amp; {roleInfo(role).label}</span>
          </label>
        ) : (
          <label className="block">
            <span className="label">Access level *</span>
            <select name="role" className="field" value={role} onChange={(e) => setRole(e.target.value as Role)}>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.label} ({r.tier}){r.seats ? ` · ${r.seats === 1 ? "1 seat" : `max ${r.seats}`}` : ""}</option>)}
            </select>
          </label>
        )
      )}
      <input type="hidden" name="directorate" value={showDir ? dir : ""} />
      <input type="hidden" name="unit" value={unit} />
      <input type="hidden" name="geo" value={showGeo ? geo : ""} />
      {showDir && select("Directorate", dir, (v) => { setDir(v); setDept(""); setProg(""); }, kids("directorate"), mode === "record" ? "Whole organisation" : "Choose a Directorate", Boolean(scope))}
      {showDept && select("Department", dept, (v) => { setDept(v); setProg(""); }, kids("department", dir), mode === "record" ? "Any department" : "Choose a Department", scope === "department" || scope === "programme")}
      {showProg && select("Programme", prog, setProg, kids("programme", dept), mode === "record" ? "Any programme" : "Choose a Programme", scope === "programme")}
      {showGeo && (
        <fieldset className="grid gap-4 sm:col-span-2 sm:grid-cols-4">
          <legend className="label mb-1">Geographical tag (optional)</legend>
          {select("G1 District", district, (v) => { setDistrict(v); setSub(""); setBlock(""); setGp(""); }, kids("district"), "—")}
          {district && select("G2 Subdivision", sub, (v) => { setSub(v); setBlock(""); setGp(""); }, kids("subdivision", district), "Whole district")}
          {sub && select("G3 Block", block, (v) => { setBlock(v); setGp(""); }, kids("block", sub), "Whole subdivision")}
          {block && select("G4 GP / Ward", gp, setGp, kids("gp", block), "Whole block")}
        </fieldset>
      )}
    </div>
  );
}
