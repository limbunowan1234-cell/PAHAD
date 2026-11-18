import Link from "next/link";
import { Download, Search } from "lucide-react";
import { createMember, deleteMember, makeMemberAdmin, saveMembershipInterests, setMemberStatus, updateMember } from "../../actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { Badge, Card, Empty, Field, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { getMembershipInterests } from "@/lib/data";
import { db } from "@/lib/db";
import { isMemberCategory, MAX_INTEREST_LENGTH, MAX_INTERESTS, MEMBER_CATEGORIES, normalizeMemberCategory } from "@/lib/membership";
import { can, inGeoScope, inScope, roleInfo, roleLabel, ROLES, type Structure } from "@/lib/permissions";
import { loadStructure, pickableUnits } from "@/lib/structure";
import { ScopePicker } from "@/components/admin/ScopePicker";
import type { Unit } from "@/lib/types";
import type { Member, MemberStatus } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Members" };

const TONE = { active: "green", applicant: "amber", inactive: "grey", rejected: "red" } as const;
const LABEL: Record<MemberStatus, string> = { active: "Active", applicant: "Applicant", inactive: "Inactive", rejected: "Not approved" };

function MemberFields({ m, units }: { m?: Member; units: Unit[] }) {
  // Old names are shown under their new ones; any other unknown value stays selectable so saving keeps it.
  const current = m ? normalizeMemberCategory(m.category, m.former_dsscolony) : null;
  const extra = current && !isMemberCategory(current.category) ? current.category : null;
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full name *"><input name="name" required defaultValue={m?.name} className="field" /></Field>
      <Field label="Email"><input name="email" type="email" defaultValue={m?.email} className="field" /></Field>
      <Field label="Phone"><input name="phone" defaultValue={m?.phone} className="field" /></Field>
      <Field label="Town / area"><input name="area" defaultValue={m?.area} className="field" /></Field>
      <Field label="Occupation"><input name="occupation" defaultValue={m?.occupation} className="field" /></Field>
      <Field label="Category">
        <select name="category" defaultValue={current?.category ?? MEMBER_CATEGORIES[0]} className="field">
          {MEMBER_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          {extra && <option value={extra}>{extra} (older category)</option>}
        </select>
      </Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input type="checkbox" name="former_dsscolony" defaultChecked={current?.formerDsscolony ?? false} className="h-4 w-4 accent-teal" /> Former DSSCOLONY member
      </label>
      <ScopePicker units={units} mode="record" value={m} />
      <Field label="Address" className="sm:col-span-2"><input name="address" defaultValue={m?.address} className="field" /></Field>
      <Field label="Interests" className="sm:col-span-2"><input name="interests" defaultValue={m?.interests} className="field" placeholder="e.g. Research, Youth, Media" /></Field>
      <Field label="Notes (internal)" className="sm:col-span-2"><textarea name="notes" rows={2} defaultValue={m?.notes} className="field" /></Field>
    </div>
  );
}

function place(s: Structure, m: Member) {
  const geo: string[] = [];
  for (let cur = s.byId.get(m.geo); cur; cur = cur.parent_id ? s.byId.get(cur.parent_id) : undefined) geo.unshift(cur.name);
  return [s.byId.get(m.unit || m.directorate)?.name, geo.join(" › ")].filter(Boolean).join(" · ");
}

/** "Areas you'd like to contribute to" on the public membership form. */
async function InterestsEditor() {
  const interests = await getMembershipInterests();
  return (
    <Card title="Membership form: areas to contribute" className="mb-8">
      <AdminForm action={saveMembershipInterests} submitLabel="Save areas">
        <Field
          label={`Areas, one per line (up to ${MAX_INTERESTS}, ${MAX_INTEREST_LENGTH} characters each)`}
          hint="Renaming an area doesn't change what existing members already chose."
        >
          <textarea name="interests" rows={Math.min(14, interests.length + 2)} required defaultValue={interests.join("\n")} className="field" />
        </Field>
      </AdminForm>
    </Card>
  );
}

export default async function MembersPage({ searchParams }: PageProps<"/admin/members">) {
  const user = await requireUser();
  const sp = await searchParams;
  const status = (typeof sp.status === "string" ? sp.status : "") as MemberStatus | "";
  const q = (typeof sp.q === "string" ? sp.q : "").toLowerCase().trim();
  // Scoped leaders see members of their own unit; geo-tagged leaders see members inside their area.
  const s = await loadStructure();
  const all = (await db.all("members")).filter((m) => inScope(s, user, m) && inGeoScope(s, user, m.geo));
  const units = [...pickableUnits(s, user), ...s.units.filter((u) => ["district", "subdivision", "block", "gp"].includes(u.kind))];
  const allUnits = s.units.filter((u) => u.kind !== "designation" && u.kind !== "project");
  // Members who already have an admin account (matched by email).
  const admins = new Map((await db.all("users")).map((u) => [u.email.toLowerCase(), u]));
  const canPromote = can(user.role, "portal.invite");
  const canAppoint = can(user.role, "team.manage");
  const myLevel = roleInfo(user.role).level;
  const rows = all.filter(
    (m) => (!status || m.status === status) && (!q || [m.name, m.email, m.phone, m.area, m.member_no].join(" ").toLowerCase().includes(q)),
  );
  const count = (s: MemberStatus) => all.filter((m) => m.status === s).length;

  return (
    <>
      <PageHeader
        title="Members"
        description="The PAHAD membership register, including applications from the website."
        actions={
          can(user.role, "members.export") && (
            <a href="/admin/members/export" className="btn btn-outline !py-2.5 text-teal">
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
          )
        }
      />

      {can(user.role, "members.create") && (
        <div id="add" className="mb-8 scroll-mt-24">
          <Disclosure summary="Add a member" defaultOpen={all.length === 0}>
            <AdminForm action={createMember} submitLabel="Add member" resetOnSuccess>
              <MemberFields units={units} />
            </AdminForm>
          </Disclosure>
        </div>
      )}

      {can(user.role, "members.approve") && <InterestsEditor />}

      <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {([["", `All (${all.length})`], ["applicant", `Applicants (${count("applicant")})`], ["active", `Active (${count("active")})`], ["inactive", `Inactive (${count("inactive")})`], ["rejected", `Not approved (${count("rejected")})`]] as const).map(([s, label]) => (
            <Link
              key={s}
              href={{ pathname: "/admin/members", query: { ...(s && { status: s }), ...(q && { q }) } }}
              className={cn("rounded-full px-3 py-1.5 text-sm font-medium", status === s ? "bg-teal text-white" : "bg-white text-teal ring-1 ring-line hover:bg-cream")}
            >
              {label}
            </Link>
          ))}
        </div>
        <form className="relative">
          {status && <input type="hidden" name="status" value={status} />}
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Search name, email, area, number" aria-label="Search members" className="field !pl-9 lg:w-80" />
        </form>
      </div>

      {rows.length === 0 ? (
        <Empty>{all.length === 0 ? "No members yet. Add the first member above, or share the website’s membership form." : "No members match this filter."}</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => (
            <li key={m.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{m.name}</p>
                    <Badge tone={TONE[m.status]}>{LABEL[m.status]}</Badge>
                    {normalizeMemberCategory(m.category, m.former_dsscolony).formerDsscolony && <Badge>Former DSSCOLONY</Badge>}
                    {m.member_no && <span className="text-xs font-mono text-muted">{m.member_no}</span>}
                    {m.email && admins.has(m.email.toLowerCase()) && <Badge tone="teal">Admin: {roleLabel(admins.get(m.email.toLowerCase())!.role)}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {[m.email, m.phone, m.area, normalizeMemberCategory(m.category).category, place(s, m)].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {m.source === "website" ? "Applied on the website" : `Added by ${m.added_by}`} · {formatDate(m.created_at)}
                  </p>
                  {m.interests && <p className="mt-2 text-sm text-ink">Interests: {m.interests}</p>}
                  {m.notes && <p className="mt-1 text-sm italic text-muted">“{m.notes}”</p>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {can(user.role, "members.approve") && m.status === "applicant" && (
                    <>
                      <ActionButton variant="primary" action={setMemberStatus.bind(null, m.id, "active")}>Approve</ActionButton>
                      <ActionButton action={setMemberStatus.bind(null, m.id, "rejected")}>Decline</ActionButton>
                    </>
                  )}
                  {can(user.role, "members.approve") && m.status === "active" && (
                    <ActionButton action={setMemberStatus.bind(null, m.id, "inactive")}>Mark inactive</ActionButton>
                  )}
                  {can(user.role, "members.approve") && (m.status === "inactive" || m.status === "rejected") && (
                    <ActionButton action={setMemberStatus.bind(null, m.id, "active")}>Reactivate</ActionButton>
                  )}
                  {can(user.role, "members.delete") && (
                    <ActionButton variant="danger" confirm={`Permanently delete ${m.name}? This cannot be undone.`} action={deleteMember.bind(null, m.id)}>
                      Delete
                    </ActionButton>
                  )}
                </div>
              </div>
              {canPromote && m.status === "active" && !(m.email && admins.has(m.email.toLowerCase())) && (
                <div className="mt-4">
                  <Disclosure summary={canAppoint ? "Make admin / give portal access" : "Give member portal access"}>
                    {m.email ? (
                      <AdminForm action={makeMemberAdmin} submitLabel={`Give ${m.name.split(" ")[0]} admin access`}>
                        <input type="hidden" name="member_id" value={m.id} />
                        <p className="text-sm text-muted">
                          {m.name} will sign in with <strong>{m.email}</strong>. Choose their access level and set a temporary password to share with them privately.
                        </p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {canAppoint ? (
                            <ScopePicker units={allUnits} roles={ROLES.filter((r) => r.level >= myLevel)} defaultRole="editor" value={m} />
                          ) : (
                            <p className="text-sm text-muted sm:col-span-2">They will get an L6 General Assembly portal account: their member card, circulars and events.</p>
                          )}
                          <Field label="Title" hint="Only a label, e.g. Managing Director, Block Coordinator."><input name="designation" className="field" /></Field>
                          <Field label="Temporary password *" hint="At least 10 characters with letters and numbers.">
                            <input name="password" type="text" required minLength={10} autoComplete="new-password" className="field" />
                          </Field>
                        </div>
                      </AdminForm>
                    ) : (
                      <p className="text-sm text-muted">Add an email address to this member first (Edit details): it is what they will sign in with.</p>
                    )}
                  </Disclosure>
                </div>
              )}
              {can(user.role, "members.edit") && (
                <div className="mt-4">
                  <Disclosure summary="Edit details">
                    <AdminForm action={updateMember}>
                      <input type="hidden" name="id" value={m.id} />
                      <MemberFields m={m} units={units} />
                    </AdminForm>
                  </Disclosure>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
