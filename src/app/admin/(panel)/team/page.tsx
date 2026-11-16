import { redirect } from "next/navigation";
import { createAdmin, deleteAdmin, updateAdmin } from "../../actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { Badge, Card, Field, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, PERMISSIONS, ROLES, type Permission } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Admin Team" };

const MATRIX: [string, Permission][] = [
  ["Upload content (news, events, documents)", "content.create"],
  ["Publish and approve content", "content.publish"],
  ["Delete content", "content.delete"],
  ["Upload gallery photos", "media.upload"],
  ["Add members", "members.create"],
  ["Edit, approve and export members", "members.edit"],
  ["Delete members", "members.delete"],
  ["Assign tasks", "tasks.assign"],
  ["Read and handle messages", "submissions.view"],
  ["Manage partners", "partners.manage"],
  ["Manage the Our Team page", "people.manage"],
  ["Change page banner photos", "site.images"],
  ["View activity log", "activity.view"],
  ["Create admins and change roles", "team.manage"],
];

function RoleSelect({ value }: { value?: string }) {
  return (
    <select name="role" defaultValue={value ?? "editor"} className="field">
      {ROLES.map((r) => (
        <option key={r.id} value={r.id}>Level {r.level}: {r.label} ({r.body})</option>
      ))}
    </select>
  );
}

export default async function TeamPage() {
  const user = await requireUser();
  if (!can(user.role, "team.view")) redirect("/admin");
  const manage = can(user.role, "team.manage");
  const users = (await db.all("users")).sort((a, b) => ROLES.findIndex((r) => r.id === a.role) - ROLES.findIndex((r) => r.id === b.role));

  return (
    <>
      <PageHeader title="Admin Team" description="People who can sign in to manage the website, and what each level can do." />

      <Card title="Access levels" className="mb-8 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted">
              <th className="pb-3">Permission</th>
              {ROLES.map((r) => (
                <th key={r.id} className="pb-3 text-center">
                  L{r.level} {r.label}
                  <span className="block font-normal normal-case tracking-normal">{r.body}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {MATRIX.map(([label, perm]) => (
              <tr key={perm}>
                <td className="py-2.5 text-ink">{label}</td>
                {ROLES.map((r) => (
                  <td key={r.id} className="py-2.5 text-center">
                    {(PERMISSIONS[perm] as readonly string[]).includes(r.id) ? <span className="font-bold text-teal" aria-label="Yes">✓</span> : <span className="text-line" aria-label="No">—</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted">Uploads from the General level go to “Awaiting review” until a Super Admin or Executive Admin publishes them.</p>
      </Card>

      {manage ? (
        <div className="mb-8">
          <Disclosure summary="Add an admin">
            <AdminForm action={createAdmin} submitLabel="Create admin account" resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full name *"><input name="name" required className="field" /></Field>
                <Field label="Email *"><input name="email" type="email" required className="field" /></Field>
                <Field label="Access level *"><RoleSelect /></Field>
                <Field label="Designation"><input name="designation" className="field" placeholder="e.g. Chairman, Chief Executive Director, Member" /></Field>
                <Field label="Temporary password *" hint="At least 10 characters with letters and numbers. Share it privately." className="sm:col-span-2">
                  <input name="password" type="text" required minLength={10} autoComplete="new-password" className="field" />
                </Field>
              </div>
            </AdminForm>
          </Disclosure>
        </div>
      ) : (
        <Notice>Only a Super Admin can add admins or change access levels.</Notice>
      )}

      <ul className="space-y-3">
        {users.map((u) => {
          const role = ROLES.find((r) => r.id === u.role)!;
          return (
            <li key={u.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{u.name}{u.id === user.id && " (you)"}</p>
                    <Badge tone={u.role === "super_admin" ? "teal" : u.role === "admin" ? "green" : "amber"}>L{role.level} {role.label}</Badge>
                    {!u.active && <Badge tone="red">Deactivated</Badge>}
                  </div>
                  <p className="text-sm text-muted">{[u.email, u.designation].filter(Boolean).join(" · ")}</p>
                  <p className="text-xs text-muted">Last sign-in: {u.last_login ? formatDate(u.last_login, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "never"}</p>
                </div>
                {manage && u.id !== user.id && (
                  <ActionButton variant="danger" confirm={`Remove ${u.name}'s admin access permanently?`} action={deleteAdmin.bind(null, u.id)}>Remove access</ActionButton>
                )}
              </div>
              {manage && (
                <div className="mt-4">
                  <Disclosure summary="Edit access">
                    <AdminForm action={updateAdmin}>
                      <input type="hidden" name="id" value={u.id} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Name"><input name="name" defaultValue={u.name} className="field" /></Field>
                        <Field label="Designation"><input name="designation" defaultValue={u.designation} className="field" /></Field>
                        <Field label="Access level"><RoleSelect value={u.role} /></Field>
                        <Field label="Reset password" hint="Leave empty to keep the current password."><input name="password" type="text" autoComplete="new-password" className="field" /></Field>
                        <label className="flex items-center gap-2 text-sm">
                          <input type="checkbox" name="active" defaultChecked={u.active} className="h-4 w-4 accent-teal" /> Account active (can sign in)
                        </label>
                      </div>
                    </AdminForm>
                  </Disclosure>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
