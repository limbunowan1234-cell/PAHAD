import { redirect } from "next/navigation";
import { createAdmin, deleteAdmin, setFinanceAccess, updateAdmin } from "../../actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { Badge, Card, Field, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, DIRECTORATES, FINANCE_ACCESS, financeAccess, roleInfo, ROLES, type Permission } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Admin Team" };

/** Rows of the access matrix. "own" marks rights limited to the person's own items or directorate. */
const MATRIX: [string, Permission, Partial<Record<Role, "own">>?][] = [
  ["Upload content", "content.create"],
  ["Publish and approve anyone's content", "content.publish"],
  ["Publish own content directly", "content.publish_own", { treasurer: "own", program_director: "own", directorate_head: "own" }],
  ["Edit or remove others' content", "content.edit_any"],
  ["Delete content", "content.delete"],
  ["Upload gallery photos", "media.upload"],
  ["Add members", "members.create", { directorate_head: "own" }],
  ["Edit and approve members", "members.approve", { directorate_head: "own" }],
  ["Export members", "members.export"],
  ["Delete members", "members.delete"],
  ["Assign tasks", "tasks.assign", { directorate_head: "own" }],
  ["Read and handle messages", "submissions.view"],
  ["Manage partners", "partners.manage"],
  ["Manage the Our Team page", "people.manage"],
  ["Change page banner photos", "site.images"],
  ["View activity log", "activity.view", { directorate_head: "own" }],
  ["Create admins and change roles", "team.manage"],
  ["Grant or change finance access", "finance.access.manage"],
  ["Finance settings (thresholds, export rule)", "settings.manage"],
];

const FIN_SHORT = { approve: "Approve", view: "View", record: "Record", none: "—" } as const;

function RoleSelect({ value, max }: { value?: Role; max: number }) {
  return (
    <select name="role" defaultValue={value ?? "editor"} className="field">
      {ROLES.filter((r) => r.level >= max).map((r) => (
        <option key={r.id} value={r.id}>{r.code}: {r.label} ({r.body})</option>
      ))}
    </select>
  );
}

function DirectorateSelect({ value }: { value?: string }) {
  return (
    <select name="directorate" defaultValue={value ?? ""} className="field">
      <option value="">None (not scoped)</option>
      {DIRECTORATES.map((d) => <option key={d}>{d}</option>)}
    </select>
  );
}

export default async function TeamPage() {
  const user = await requireUser();
  if (!can(user.role, "team.view")) redirect("/admin");
  const manage = can(user.role, "team.manage");
  const financeManage = can(user.role, "finance.access.manage");
  const myLevel = roleInfo(user.role).level;
  const order = (r: Role) => ROLES.findIndex((x) => x.id === r);
  const users = (await db.all("users")).sort((a, b) => Number(b.owner) - Number(a.owner) || order(a.role) - order(b.role));

  return (
    <>
      <PageHeader title="Admin Team" description="Who can sign in to manage PAHAD, and what each level can do. The level decides access; the title is only a label." />

      <Card title="Access levels" className="mb-8 overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="text-left align-bottom text-xs uppercase tracking-wider text-muted">
              <th className="pb-3">Permission</th>
              {ROLES.map((r) => (
                <th key={r.id} className="px-1 pb-3 text-center">
                  {r.code}
                  <span className="block font-normal normal-case tracking-normal">{r.label}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {MATRIX.map(([label, perm, scoped]) => (
              <tr key={perm}>
                <td className="py-2.5 pr-3 text-ink">{label}</td>
                {ROLES.map((r) => (
                  <td key={r.id} className="py-2.5 text-center">
                    {!can(r.id, perm) ? (
                      <span className="text-line" aria-label="No">—</span>
                    ) : scoped?.[r.id] ? (
                      <span className="text-xs font-semibold text-coral-700">Own</span>
                    ) : (
                      <span className="font-bold text-teal" aria-label="Yes">✓</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="py-2.5 pr-3 text-ink">Finance (default)</td>
              {ROLES.map((r) => (
                <td key={r.id} className="py-2.5 text-center text-xs text-muted">{FIN_SHORT[financeAccess({ role: r.id, finance: "" })]}</td>
              ))}
            </tr>
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">
          “Own” = only their own items or their own directorate. General-level uploads always wait in “Awaiting review”. The Founder account is a
          permanent owner and cannot be removed.
        </p>
      </Card>

      {manage ? (
        <div className="mb-8">
          <Disclosure summary="Add an admin">
            <AdminForm action={createAdmin} submitLabel="Create admin account" resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name *"><input name="name" required className="field" /></Field>
                <Field label="Email *"><input name="email" type="email" required className="field" /></Field>
                <Field label="Access level *"><RoleSelect max={myLevel} /></Field>
                <Field label="Title" hint="Only a label, e.g. Treasurer, Managing Director, Website Head."><input name="designation" className="field" /></Field>
                <Field label="Directorate" hint="Required for Directorate Heads."><DirectorateSelect /></Field>
                <Field label="Temporary password *" hint="At least 10 characters with letters and numbers. Share it privately.">
                  <input name="password" type="text" required minLength={10} autoComplete="new-password" className="field" />
                </Field>
              </div>
            </AdminForm>
          </Disclosure>
        </div>
      ) : (
        <Notice>Only the President can add admins or change access levels.</Notice>
      )}

      <ul className="space-y-3">
        {users.map((u) => {
          const role = roleInfo(u.role);
          const fin = financeAccess(u);
          return (
            <li key={u.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{u.name}{u.id === user.id && " (you)"}</p>
                    <Badge tone={role.level === 1 ? "teal" : role.level === 2 ? "green" : "amber"}>{role.code} {role.label}</Badge>
                    {!u.active && <Badge tone="red">Deactivated</Badge>}
                    {fin !== "none" && <Badge>Finance: {fin}</Badge>}
                  </div>
                  <p className="text-sm text-muted">{[u.email, u.designation, u.directorate].filter(Boolean).join(" · ")}</p>
                  <p className="text-xs text-muted">Last sign-in: {u.last_login ? formatDate(u.last_login, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "never"}</p>
                </div>
                {manage && u.id !== user.id && !u.owner && (
                  <ActionButton variant="danger" confirm={`Remove ${u.name}'s admin access permanently?`} action={deleteAdmin.bind(null, u.id)}>Remove access</ActionButton>
                )}
              </div>
              {(manage || (financeManage && u.id !== user.id)) && (
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  {manage && (
                    <Disclosure summary="Edit access">
                      <AdminForm action={updateAdmin}>
                        <input type="hidden" name="id" value={u.id} />
                        <div className="grid gap-4 sm:grid-cols-2">
                          <Field label="Name"><input name="name" defaultValue={u.name} className="field" /></Field>
                          <Field label="Title"><input name="designation" defaultValue={u.designation} className="field" /></Field>
                          {u.owner ? (
                            <Field label="Access level" hint="The permanent owner always stays President.">
                              <input type="hidden" name="role" value="super_admin" />
                              <span className="block rounded-xl bg-sand px-3 py-2 text-sm text-teal">L1: President (permanent owner)</span>
                            </Field>
                          ) : (
                            <Field label="Access level"><RoleSelect value={u.role} max={myLevel} /></Field>
                          )}
                          <Field label="Directorate"><DirectorateSelect value={u.directorate} /></Field>
                          <Field label="Reset password" hint="Leave empty to keep the current password." className="sm:col-span-2">
                            <input name="password" type="text" autoComplete="new-password" className="field" />
                          </Field>
                          {u.owner ? (
                            <input type="hidden" name="active" value="on" />
                          ) : (
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" name="active" defaultChecked={u.active} className="h-4 w-4 accent-teal" /> Account active (can sign in)
                            </label>
                          )}
                        </div>
                      </AdminForm>
                    </Disclosure>
                  )}
                  {financeManage && u.id !== user.id && (
                    <Disclosure summary="Finance access">
                      <AdminForm action={setFinanceAccess} submitLabel="Save finance access">
                        <input type="hidden" name="id" value={u.id} />
                        <Field label="Finance access" hint="Granted, changed and removed only by the Governing Body. Every change is logged and written to the finance Sheet.">
                          <select name="finance" defaultValue={u.finance} className="field">
                            <option value="">Default for {role.label} ({FIN_SHORT[financeAccess({ role: u.role, finance: "" })]})</option>
                            {FINANCE_ACCESS.filter((f) => f.id !== "approve" || u.role === "super_admin" || u.role === "general_secretary").map((f) => (
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
