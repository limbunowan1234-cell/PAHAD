import { redirect } from "next/navigation";
import { decideApproval } from "../../plus-actions";
import { AdminForm } from "@/components/admin/client";
import { Badge, Empty, Field, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canApprovePublic } from "@/lib/plus/access";
import type { Approval } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Approvals" };

const what = (a: Approval) =>
  a.kind === "plus_feature"
    ? "Show in the PAHAD+ app"
    : a.entity === "circular"
      ? "Make public: shows in PAHAD+ under Policy & Assembly Summaries"
      : `Move out of Internal to ${a.target === "members" ? "Members only" : "Public (pahad.org and the PAHAD tab of PAHAD+)"}`;

export default async function ApprovalsPage() {
  const user = await requireUser();
  const approver = canApprovePublic(user);
  if (!approver && user.role !== "sysadmin") redirect("/admin");
  const all = (await db.all("approvals")).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const pending = all.filter((a) => a.status === "pending");
  const decided = all.filter((a) => a.status !== "pending").slice(0, 50);

  return (
    <>
      <PageHeader
        title="Approvals"
        description="Internal content can only become public, and PAHAD content can only appear in the PAHAD+ app, once the President or an approver he assigned agrees."
      />
      {!approver && <Notice>View only. Approvals are decided by the President.</Notice>}
      <h2 className="font-display text-2xl text-teal">Waiting {pending.length > 0 && <Badge tone="amber">{pending.length}</Badge>}</h2>
      {pending.length === 0 ? (
        <Empty>Nothing waiting.</Empty>
      ) : (
        <ul className="mt-4 space-y-3">
          {pending.map((a) => (
            <li key={a.id} className="rounded-2xl border border-amber-200 bg-white p-4">
              <p className="font-semibold text-ink">{a.title}</p>
              <p className="text-sm text-muted">{what(a)}</p>
              <p className="text-xs text-muted">Asked by {a.requested_by_name} · {formatDate(a.created_at)}</p>
              {approver && (
                <div className="mt-3">
                  <AdminForm action={decideApproval} submitLabel="Save decision">
                    <input type="hidden" name="id" value={a.id} />
                    <div className="grid gap-3 sm:grid-cols-[200px_1fr]">
                      <Field label="Decision">
                        <select name="decision" defaultValue="approve" className="field">
                          <option value="approve">Approve</option>
                          <option value="reject">Reject</option>
                        </select>
                      </Field>
                      <Field label="Note (optional)"><input name="note" maxLength={300} className="field" /></Field>
                    </div>
                  </AdminForm>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <h2 className="mt-10 font-display text-2xl text-teal">Decided</h2>
      {decided.length === 0 ? (
        <Empty>No decisions yet.</Empty>
      ) : (
        <ul className="mt-4 space-y-2">
          {decided.map((a) => (
            <li key={a.id} className="rounded-2xl border border-line bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={a.status === "approved" ? "green" : "red"}>{a.status === "approved" ? "Approved" : "Rejected"}</Badge>
                <span className="font-semibold text-ink">{a.title}</span>
              </div>
              <p className="text-muted">{what(a)}</p>
              <p className="text-xs text-muted">Asked by {a.requested_by_name} · decided by {a.decided_by_name} · {formatDate(a.decided_at)}{a.note ? ` · ${a.note}` : ""}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
