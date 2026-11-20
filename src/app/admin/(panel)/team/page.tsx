import { redirect } from "next/navigation";
import { createAdmin, deleteAdmin, setFinanceAccess, updateAdmin } from "../../actions";
import { setVideoPermission } from "../../video-actions";
import { setPlusVerifier, setPublicApprover } from "../../plus-actions";
import { PLUS_REGIONS } from "@/lib/plus/config";
import { setMenuPermission } from "../../menu-actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { ScopePicker } from "@/components/admin/ScopePicker";
import { Badge, Card, Field, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, FINANCE_ACCESS, FINANCE_APPROVERS, financeAccess, roleInfo, ROLES, roleTitle, type Permission, type Structure } from "@/lib/permissions";
import { loadStructure } from "@/lib/structure";
import type { Role } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Admin Team" };

/** Rows of the access matrix. "Own" = only their own items or their own unit. */
const MATRIX: [string, Permission, Partial<Record<Role, "own">>?][] = [
  ["Upload content", "content.create"],
  ["Publish and approve anyone's content", "content.publish"],
  ["Publish own / unit content directly", "content.publish_own", { executive_secretary: "own", record_officer: "own", directorate_head: "own", department_head: "own", project_coordinator: "own" }],
  ["Edit or remove others' content", "content.edit_any"],
  ["Add members", "members.create", { directorate_head: "own", department_head: "own", project_coordinator: "own" }],
  ["Edit and approve members", "members.approve", { directorate_head: "own", department_head: "own" }],
  ["Export members", "members.export"],
  ["Delete members", "members.delete"],
  ["Assign tasks", "tasks.assign", { directorate_head: "own", department_head: "own", project_coordinator: "own" }],
  ["Read and handle messages", "submissions.view"],
  ["Partners and Our Team page", "people.manage"],
  ["Change page banner photos", "site.images"],
  ["View structure", "structure.view"],
  ["Manage the whole structure", "structure.manage"],
  ["Manage structure inside own unit", "structure.manage_own", { directorate_head: "own", department_head: "own", project_coordinator: "own" }],
  ["View activity log", "activity.view", { directorate_head: "own", department_head: "own" }],
  ["View admin roster", "team.view"],
  ["Create admins and change roles", "team.manage"],
  ["Grant or change finance access", "finance.access.manage"],
];

const FIN_SHORT = { approve: "Approve", view: "View", record: "Record", none: "—" } as const;

function placeName(s: Structure, ids: string[]) {
  return ids.map((id) => s.byId.get(id)?.name).filter(Boolean).join(" › ");
}
function geoPath(s: Structure, id: string) {
  const parts: string[] = [];
  let cur = s.byId.get(id);
  for (let g = 0; cur && g < 6; g++) {
    parts.unshift(cur.name);
    cur = cur.parent_id ? s.byId.get(cur.parent_id) : undefined;
  }
  return parts.join(" › ");
}

export default async function TeamPage() {
  const user = await requireUser();
  if (!can(user.role, "team.view")) redirect("/admin");
  const manage = can(user.role, "team.manage");
  const financeManage = can(user.role, "finance.access.manage");
  const videoPermission = can(user.role, "videos.permission");
  const plusPermission = can(user.role, "plus.permission");
  const menuPermission = can(user.role, "menu.permission");
  const s = await loadStructure();
  const pickable = s.units.filter((u) => u.kind !== "designation" && u.kind !== "project");
  const designations = s.units.filter((u) => u.kind === "designation" && u.active).map((u) => u.name);
  const myLevel = roleInfo(user.role).level;
  const grantable = ROLES.filter((r) => r.level >= myLevel);
  const order = (r: Role) => ROLES.findIndex((x) => x.id === r);
  const users = (await db.all("users")).sort((a, b) => Number(b.owner) - Number(a.owner) || order(a.role) - order(b.role));

  return (
    <>
      <PageHeader title="Admin Team" description="Who can sign in to manage PAHAD, and what each level can do. The level decides access; the title is only a label." />
      <datalist id="designations">{designations.map((d) => <option key={d} value={d} />)}</datalist>

      <Card title="Access levels (LA – L6 + SYS)" className="mb-8 overflow-x-auto">
        <table className="w-full min-w-[1250px] text-sm">
          <thead>
            <tr className="text-left align-bottom text-xs text-muted">
              <th className="pb-3 uppercase tracking-wider">Permission</th>
              {ROLES.map((r) => (
                <th key={r.id} className="px-1 pb-3 text-center font-semibold">
                  {r.code}
                  <span className="block font-normal">{r.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {MATRIX.map(([label, perm, scoped]) => (
              <tr key={perm}>
                <td className="py-2 pr-3 text-ink">{label}</td>
                {ROLES.map((r) => (
                  <td key={r.id} className="py-2 text-center">
                    {!can(r.id, perm) ? <span className="text-line">—</span> : scoped?.[r.id] ? <span className="text-xs font-semibold text-coral-700">Own</span> : <span className="font-bold text-teal">✓</span>}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="py-2 pr-3 text-ink">Finance (default)</td>
              {ROLES.map((r) => <td key={r.id} className="py-2 text-center text-xs text-muted">{FIN_SHORT[financeAccess({ role: r.id, finance: "" })]}</td>)}
            </tr>
            <tr>
              <td className="py-2 pr-3 text-ink">Seats</td>
              {ROLES.map((r) => <td key={r.id} className="py-2 text-center text-xs text-muted">{r.seats ? (r.seats === 1 ? "1" : `max ${r.seats}`) : "open"}</td>)}
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">
          LA Founder-Owner is held together with L1 A President on one account and cannot be removed. SYS Website Administrator is part of the Executive Body: it can see everything (finance and voting included) and vote in polls it is eligible for, but approves and changes nothing; all decisions are made by the President.
          Geographical tags (G1 District → G4 GP / Ward) limit what scoped leaders see.
        </p>
      </Card>

      {manage ? (
        <div className="mb-8">
          <Disclosure summary="Add an admin">
            <AdminForm action={createAdmin} submitLabel="Create admin account" resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name *"><input name="name" required className="field" /></Field>
                <Field label="Email *"><input name="email" type="email" required className="field" /></Field>
                <ScopePicker units={pickable} roles={grantable} defaultRole="editor" />
                <Field label="Title" hint="Only a label. Official designations are suggested."><input name="designation" list="designations" className="field" /></Field>
                <Field label="Temporary password *" hint="At least 10 characters with letters and numbers. Share it privately.">
                  <input name="password" type="text" required minLength={10} autoComplete="new-password" className="field" />
                </Field>
              </div>
            </AdminForm>
          </Disclosure>
        </div>
      ) : (
        <Notice>View only. Appointments and access changes are made by the President (LA / L1 A).</Notice>
      )}

      <ul className="space-y-3">
        {users.map((u) => {
          const role = roleInfo(u.role);
          const fin = financeAccess(u);
          const where = [placeName(s, [u.directorate, u.unit].filter(Boolean)), u.geo ? geoPath(s, u.geo) : ""].filter(Boolean).join(" · ");
          return (
            <li key={u.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{u.name}{u.id === user.id && " (you)"}</p>
                    <Badge tone={u.owner || role.level === 1 ? "teal" : role.id === "sysadmin" ? "grey" : role.level <= 3 ? "green" : "amber"}>{roleTitle(u)}</Badge>
                    {!u.active && <Badge tone="red">Deactivated</Badge>}
                    {fin !== "none" && <Badge>Finance: {fin}</Badge>}
                    {u.can_submit_videos && !can(u.role, "videos.manage") && <Badge tone="green">YouTube submission: ON</Badge>}
                    {u.can_verify_plus && u.role !== "super_admin" && <Badge tone="green">PAHAD+ verifier{u.plus_region ? `: ${u.plus_region}` : ""}</Badge>}
                    {u.can_approve_public && u.role !== "super_admin" && <Badge tone="green">Approves public / PAHAD+</Badge>}
                    {u.can_manage_menu && !can(u.role, "menu.manage") && <Badge tone="green">Menu &amp; pages: ON</Badge>}
                  </div>
                  <p className="text-sm text-muted">{[u.email, u.designation, where].filter(Boolean).join(" · ")}</p>
                  <p className="text-xs text-muted">Last sign-in: {u.last_login ? formatDate(u.last_login, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "never"}</p>
                </div>
                {videoPermission && !can(u.role, "videos.manage") && u.active && (
                  <ActionButton variant={u.can_submit_videos ? "ghost" : "primary"} action={setVideoPermission.bind(null, u.id, !u.can_submit_videos)}>
                    {u.can_submit_videos ? "YouTube submission: turn OFF" : "YouTube submission: turn ON"}
                  </ActionButton>
                )}
                {menuPermission && !can(u.role, "menu.manage") && u.active && (
                  <ActionButton variant={u.can_manage_menu ? "ghost" : "primary"} action={setMenuPermission.bind(null, u.id, !u.can_manage_menu)}>
                    {u.can_manage_menu ? "Menu & pages: turn OFF" : "Menu & pages: turn ON"}
                  </ActionButton>
                )}
                {manage && u.id !== user.id && !u.owner && (
                  <ActionButton variant="danger" confirm={`Remove ${u.name}'s admin access permanently?`} action={deleteAdmin.bind(null, u.id)}>Remove access</ActionButton>
                )}
              </div>
              {plusPermission && u.role !== "super_admin" && u.role !== "sysadmin" && u.active && (
                <div className="mt-4 flex flex-wrap items-end gap-3 rounded-xl bg-sand/60 p-3">
                  <AdminForm action={setPlusVerifier} submitLabel={u.can_verify_plus ? "Save PAHAD+ verifier" : "Make PAHAD+ verifier"}>
                    <input type="hidden" name="user_id" value={u.id} />
                    <div className="flex flex-wrap items-end gap-3">
                      <label className="flex items-center gap-2 pb-3 text-sm">
                        <input type="checkbox" name="on" defaultChecked className="h-4 w-4 accent-teal" /> {u.can_verify_plus ? "PAHAD+ verifier (untick and save to turn off)" : "PAHAD+ verifier"}
                      </label>
                      <Field label="Region (optional)" hint="Leave as All for any region.">
                        <select name="region" defaultValue={u.plus_region} className="field">
                          <option value="">All regions</option>
                          {PLUS_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </Field>
                    </div>
                  </AdminForm>
                  <ActionButton variant={u.can_approve_public ? "ghost" : "primary"} action={setPublicApprover.bind(null, u.id, !u.can_approve_public)}>
                    {u.can_approve_public ? "Approve for public / PAHAD+: turn OFF" : "Approve for public / PAHAD+: turn ON"}
                  </ActionButton>
                </div>
              )}
              {(manage || (financeManage && u.id !== user.id)) && (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {manage && (
                    <Disclosure summary="Edit access">
                      <AdminForm action={updateAdmin}>
                        <input type="hidden" name="id" value={u.id} />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Name"><input name="name" defaultValue={u.name} className="field" /></Field>
                          <Field label="Title"><input name="designation" defaultValue={u.designation} list="designations" className="field" /></Field>
                          <ScopePicker units={pickable} roles={grantable} defaultRole={u.role} lockRole={u.owner} value={u} />
                          <Field label="Reset password" hint="Leave empty to keep the current password.">
                            <input name="password" type="text" autoComplete="new-password" className="field" />
                          </Field>
                          {u.owner ? (
                            <input type="hidden" name="active" value="on" />
                          ) : (
                            <label className="flex items-center gap-2 self-end pb-3 text-sm">
                              <input type="checkbox" name="active" defaultChecked={u.active} className="h-4 w-4 accent-teal" /> Active (toggle access on / off)
                            </label>
                          )}
                        </div>
                      </AdminForm>
                    </Disclosure>
                  )}
                  {financeManage && u.id !== user.id && u.role !== "sysadmin" && (
                    <Disclosure summary="Finance access">
                      <AdminForm action={setFinanceAccess} submitLabel="Save finance access">
                        <input type="hidden" name="id" value={u.id} />
                        <Field label="Finance access" hint="Changed only by the President. Every change is logged and written to the finance Sheet.">
                          <select name="finance" defaultValue={u.finance} className="field">
                            <option value="">Default for {role.label} ({FIN_SHORT[financeAccess({ role: u.role, finance: "" })]})</option>
                            {FINANCE_ACCESS.filter((f) => f.id !== "approve" || FINANCE_APPROVERS.includes(u.role)).map((f) => (
                              <option key={f.id} value={f.id}>{f.label}</option>
                            ))}
                          </select>
                        </Field>
                      </AdminForm>
                    </Disclosure>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
