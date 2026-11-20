import Form from "next/form";
import { redirect } from "next/navigation";
import { reinstatePlusUser, suspendPlusUser } from "../../../plus-actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { PlusTabs } from "@/components/admin/PlusTabs";
import { Badge, Empty, Field, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canModeratePlus } from "@/lib/plus/access";
import { ACCOUNT_TYPES, type PlusAccountType } from "@/lib/plus/config";
import { can } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "PAHAD+ accounts" };

/** PAHAD+ (PP) accounts: find people, see their posts and reports, suspend or reinstate. */
export default async function PlusAccountsPage({ searchParams }: PageProps<"/admin/plus/accounts">) {
  const user = await requireUser();
  const moderator = canModeratePlus(user);
  if (!moderator && user.role !== "sysadmin") redirect("/admin");
  const president = can(user.role, "plus.permission");
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").toLowerCase().trim().slice(0, 80);
  const status = sp.status === "suspended" ? "suspended" : "";

  const [users, posts, flags, organisers] = await Promise.all([db.all("plus_users"), db.all("plus_posts"), db.all("plus_flags"), db.all("plus_organisers")]);
  const postsBy = new Map<string, number>(), reportsBy = new Map<string, number>(), author = new Map<string, string>();
  for (const p of posts) { postsBy.set(p.author_id, (postsBy.get(p.author_id) ?? 0) + 1); author.set(p.id, p.author_id); }
  for (const f of flags) { const a = author.get(f.post_id); if (a) reportsBy.set(a, (reportsBy.get(a) ?? 0) + 1); }
  const org = new Map(organisers.map((o) => [o.id, o.status]));
  const rows = users
    .filter((u) => (!status || u.status === status) && (!q || `${u.name} ${u.email} ${u.phone}`.toLowerCase().includes(q)))
    .sort((a, b) => (reportsBy.get(b.id) ?? 0) - (reportsBy.get(a.id) ?? 0) || b.created_at.localeCompare(a.created_at))
    .slice(0, 200);

  return (
    <>
      <PageHeader title="PAHAD+" description="PAHAD+ app accounts. These are public app users, not PAHAD members or admins." />
      <PlusTabs user={user} active="accounts" />
      {!moderator && <Notice>View only.</Notice>}
      <Form action="/admin/plus/accounts" className="mb-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search name, email or phone" className="field max-w-sm" aria-label="Search accounts" />
        <select name="status" defaultValue={status} className="field w-auto" aria-label="Status">
          <option value="">All accounts</option>
          <option value="suspended">Suspended only</option>
        </select>
        <button className="btn btn-primary !py-2.5">Search</button>
      </Form>
      <p className="mb-3 text-sm text-muted">{users.length} accounts · {users.filter((u) => u.status === "suspended").length} suspended. Most reported first.</p>
      {rows.length === 0 ? (
        <Empty>No accounts match.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((u) => (
            <li key={u.id} className="rounded-2xl border border-line bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold text-ink">{u.name}</p>
                <Badge>{ACCOUNT_TYPES[u.account_type as PlusAccountType] ?? u.account_type}</Badge>
                {u.status === "suspended" && <Badge tone="red">Suspended</Badge>}
                {!u.email_verified && <Badge tone="amber">Email not confirmed</Badge>}
                {u.member_id && <Badge tone="green">PAHAD member</Badge>}
                {org.get(u.id) === "approved" && <Badge tone="teal">Paid organiser</Badge>}
                {(reportsBy.get(u.id) ?? 0) > 0 && <Badge tone="red">{reportsBy.get(u.id)} report{reportsBy.get(u.id) === 1 ? "" : "s"} on their posts</Badge>}
              </div>
              <p className="text-sm text-muted">{[u.email, u.phone].filter(Boolean).join(" · ")}</p>
              <p className="text-xs text-muted">Joined {formatDate(u.created_at)} · {postsBy.get(u.id) ?? 0} posts · last sign-in {u.last_login ? formatDate(u.last_login) : "never"}</p>
              {u.status === "suspended" && <p className="mt-1 text-sm text-red-800">Suspended by {u.suspended_by}: {u.suspend_reason}</p>}
              {moderator && (
                <div className="mt-3">
                  {u.status === "suspended" ? (
                    president ? <ActionButton variant="primary" confirm={`Reinstate ${u.name}?`} action={reinstatePlusUser.bind(null, u.id)}>Reinstate</ActionButton>
                      : <p className="text-xs text-muted">Only the President can reinstate.</p>
                  ) : (
                    <Disclosure summary="Suspend this account">
                      <AdminForm action={suspendPlusUser} submitLabel="Suspend">
                        <input type="hidden" name="id" value={u.id} />
                        <Field label="Reason *" hint="Kept in the Activity Log. The account is signed out and its live posts go on hold.">
                          <input name="reason" required maxLength={300} className="field" />
                        </Field>
                      </AdminForm>
                    </Disclosure>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
