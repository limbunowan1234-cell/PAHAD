import { redirect } from "next/navigation";
import { CloudOff, Download, FileText } from "lucide-react";
import {
  decideFinanceEntry, decideFinanceRequest, requestFinanceChange, retryFinanceSync, saveFinanceSettings, submitFinanceEntry,
} from "../../finance-actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { Badge, Card, Empty, Field, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { approvalsOf, getFinanceSettings, inr } from "@/lib/finance";
import { googleConfigured } from "@/lib/google";
import { can, financeAccess } from "@/lib/permissions";
import type { FinanceEntry } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Finance" };

const TYPE_LABEL = { income: "Income", expense: "Expense", donation: "Donation", dues: "Dues" } as const;
const STATUS = {
  submitted: { label: "Submitted", tone: "amber" },
  approved: { label: "Approved · locked", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
  deleted: { label: "Deleted", tone: "grey" },
} as const;

function Totals({ entries }: { entries: FinanceEntry[] }) {
  const year = new Date().getFullYear().toString();
  const approved = entries.filter((e) => e.status === "approved" && e.entry_date.startsWith(year));
  const sum = (types: FinanceEntry["type"][]) => approved.filter((e) => types.includes(e.type)).reduce((s, e) => s + Number(e.amount), 0);
  const inflow = sum(["income", "donation", "dues"]);
  const outflow = sum(["expense"]);
  return (
    <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {[
        ["Income, donations & dues", inr(inflow)],
        ["Expenses", inr(outflow)],
        ["Balance (approved)", inr(inflow - outflow)],
        ["Waiting for approval", String(entries.filter((e) => e.status === "submitted").length)],
      ].map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-line bg-white p-5">
          <p className="font-display text-2xl text-teal">{value}</p>
          <p className="mt-1 text-sm text-muted">{label} · {year}</p>
        </div>
      ))}
    </div>
  );
}

export default async function FinancePage() {
  const user = await requireUser();
  const access = financeAccess(user);
  if (access === "none") redirect("/admin");
  const [entries, requests, outbox, settings] = await Promise.all([
    db.all("finance"), db.all("finance_requests"), db.all("outbox"), getFinanceSettings(),
  ]);
  const isGB = access === "approve";
  const isTreasurer = access === "record";
  const pending = entries.filter((e) => e.status === "submitted");
  const openRequests = requests.filter((r) => r.status === "pending");
  const myApprovedExport = requests.find((r) => r.kind === "export" && r.requested_by === user.id && r.status === "approved");
  const canExportNow = isGB || (isTreasurer && (settings.exportRule === "direct" || Boolean(myApprovedExport)));
  const entryNo = (id: string) => entries.find((e) => e.id === id)?.entry_no ?? "";

  return (
    <>
      <PageHeader
        title="Finance"
        description={
          isGB ? "Review and approve entries recorded by the Treasurer. Approved entries are locked."
            : isTreasurer ? "Record income, expenses, donations and dues. Every entry needs a receipt and Governing Body approval."
              : "Read-only view of PAHAD's finance records."
        }
        actions={
          canExportNow ? (
            <a href={`/admin/finance/export${myApprovedExport && !isGB ? `?request=${myApprovedExport.id}` : ""}`} className="btn btn-outline !py-2.5 text-teal">
              <Download className="h-4 w-4" aria-hidden /> Export CSV
            </a>
          ) : undefined
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-4 text-sm">
        {googleConfigured ? (
          <span className="text-teal">● Connected to the PAHAD finance Google Sheet and Drive</span>
        ) : (
          <span className="flex items-center gap-2 text-coral-700"><CloudOff className="h-4 w-4" aria-hidden /> Google Sheets is not connected yet. Records are kept here and queued.</span>
        )}
        {outbox.length > 0 && <Badge tone="amber">{outbox.length} waiting to sync</Badge>}
        <span className="flex-1" />
        <ActionButton action={retryFinanceSync}>Retry sync now</ActionButton>
      </div>

      <Totals entries={entries} />

      {isTreasurer && (
        <Card title="Record a finance entry" className="mb-8">
          <AdminForm action={submitFinanceEntry} submitLabel="Submit for approval" resetOnSuccess>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Type *">
                <select name="type" required className="field" defaultValue="">
                  <option value="" disabled>Choose</option>
                  {Object.entries(TYPE_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              <Field label="Amount (₹) *"><input name="amount" inputMode="decimal" required className="field" placeholder="e.g. 2500" /></Field>
              <Field label="Date *"><input name="entry_date" type="date" required className="field" /></Field>
              <Field label="Receipt (photo or PDF) *" hint="Required. Up to 4 MB.">
                <input name="receipt" type="file" required accept="image/jpeg,image/png,image/webp,application/pdf" className="block w-full text-sm" />
              </Field>
              <Field label="Description *" className="sm:col-span-2 lg:col-span-4">
                <input name="description" required className="field" placeholder="e.g. Hall booking for community meeting, 12 Dec" />
              </Field>
            </div>
          </AdminForm>
        </Card>
      )}

      {(isGB || isTreasurer) && openRequests.length > 0 && (
        <Card title={`Requests (${openRequests.length})`} className="mb-8">
          <ul className="divide-y divide-line">
            {openRequests.map((r) => {
              const p = JSON.parse(r.payload) as Record<string, string>;
              return (
                <li key={r.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    <p className="font-semibold text-ink">
                      {r.kind === "export" ? "Export finance report" : `${r.kind === "edit" ? "Edit" : "Delete"} ${entryNo(r.entry_id)}`}
                    </p>
                    <p className="text-muted">
                      {r.requested_by_name} · {p.reason}
                      {r.kind === "edit" && ` · New amount ${inr(p.amount)}, “${p.description}”, ${p.entry_date}`}
                    </p>
                  </div>
                  {isGB && r.requested_by !== user.id && (
                    <div className="flex gap-2">
                      <AdminForm action={decideFinanceRequest} submitLabel="Approve" className="!space-y-0">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="decision" value="approve" />
                      </AdminForm>
                      <AdminForm action={decideFinanceRequest} submitLabel="Reject" className="!space-y-0">
                        <input type="hidden" name="id" value={r.id} />
                        <input type="hidden" name="decision" value="reject" />
                      </AdminForm>
                    </div>
                  )}
                  {!isGB && <Badge tone="amber">Waiting for the Governing Body</Badge>}
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      {isGB && pending.length > 0 && (
        <Notice tone="warn">
          {pending.length} entr{pending.length === 1 ? "y is" : "ies are"} waiting for your approval.
          {settings.threshold > 0 && ` Amounts of ${inr(settings.threshold)} or more need both the President and the General Secretary.`}
        </Notice>
      )}

      {entries.length === 0 ? (
        <Empty>No finance entries yet.{isTreasurer && " Record the first one above."}</Empty>
      ) : (
        <ul className="space-y-3">
          {entries.map((e) => {
            const approvals = approvalsOf(e);
            const needsDual = settings.threshold > 0 && Number(e.amount) >= settings.threshold;
            return (
              <li key={e.id} className="rounded-2xl border border-line bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-sm font-semibold text-teal">{e.entry_no}</span>
                      <Badge tone={STATUS[e.status].tone}>{STATUS[e.status].label}</Badge>
                      <Badge>{TYPE_LABEL[e.type]}</Badge>
                      {!e.synced && <Badge tone="amber">Not yet synced</Badge>}
                    </div>
                    <p className={`mt-2 font-display text-2xl ${e.type === "expense" ? "text-coral-700" : "text-teal"}`}>
                      {e.type === "expense" ? "−" : "+"}{inr(e.amount)}
                    </p>
                    <p className="mt-1 text-ink">{e.description}</p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDate(e.entry_date)} · recorded by {e.submitted_by_name}
                      {approvals.length > 0 && ` · ${approvals.map((a) => `${a.decision} by ${a.name}`).join(", ")}`}
                      {e.status === "submitted" && needsDual && " · needs President and General Secretary"}
                    </p>
                  </div>
                  <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-teal hover:underline">
                    <FileText className="h-4 w-4" aria-hidden /> Receipt
                  </a>
                </div>

                {isGB && e.status === "submitted" && e.submitted_by !== user.id && !approvals.some((a) => a.by === user.id) && (
                  <div className="mt-4 grid gap-3 rounded-xl bg-sand p-4 md:grid-cols-2">
                    <AdminForm action={decideFinanceEntry} submitLabel="Approve and lock">
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="decision" value="approve" />
                      <label className="block">
                        <span className="label">Approval note (optional)</span>
                        <input name="note" className="field" placeholder="e.g. Checked against bank statement" />
                      </label>
                    </AdminForm>
                    <AdminForm action={decideFinanceEntry} submitLabel="Reject">
                      <input type="hidden" name="id" value={e.id} />
                      <input type="hidden" name="decision" value="reject" />
                      <label className="block">
                        <span className="label">Reason for rejecting</span>
                        <input name="note" className="field" placeholder="e.g. Receipt is unreadable" />
                      </label>
                    </AdminForm>
                  </div>
                )}

                {isTreasurer && e.status !== "deleted" && e.submitted_by === user.id && (
                  <div className="mt-4">
                    <Disclosure summary={e.status === "submitted" ? "Request a correction" : "Request a change or deletion"}>
                      <AdminForm action={requestFinanceChange} submitLabel="Send request" resetOnSuccess>
                        <input type="hidden" name="entry_id" value={e.id} />
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Field label="Request">
                            <select name="kind" className="field" defaultValue="edit">
                              <option value="edit">Change this entry</option>
                              <option value="delete">Delete this entry</option>
                            </select>
                          </Field>
                          <Field label="New amount (₹)"><input name="amount" inputMode="decimal" defaultValue={e.amount} className="field" /></Field>
                          <Field label="New date"><input name="entry_date" type="date" defaultValue={e.entry_date} className="field" /></Field>
                          <Field label="New description" className="sm:col-span-3"><input name="description" defaultValue={e.description} className="field" /></Field>
                          <Field label="Reason *" className="sm:col-span-3"><input name="reason" required className="field" placeholder="Why is this change needed?" /></Field>
                        </div>
                      </AdminForm>
                    </Disclosure>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isTreasurer && settings.exportRule === "approval" && !myApprovedExport && (
        <Card title="Export a finance report" className="mt-8">
          <p className="mb-3 text-sm text-muted">Exports by the Treasurer need Governing Body approval. Once approved, the Export button appears at the top of this page.</p>
          <AdminForm action={requestFinanceChange} submitLabel="Request export" resetOnSuccess>
            <input type="hidden" name="kind" value="export" />
            <Field label="Purpose"><input name="reason" className="field" placeholder="e.g. Quarterly report for the General Assembly" /></Field>
          </AdminForm>
        </Card>
      )}

      {can(user.role, "settings.manage") && (
        <Card title="Finance settings" className="mt-8">
          <AdminForm action={saveFinanceSettings} submitLabel="Save settings">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Dual approval from (₹)" hint="Entries of this amount or more need both the President and the General Secretary. 0 = one approval is always enough.">
                <input name="threshold" inputMode="decimal" defaultValue={settings.threshold} className="field" />
              </Field>
              <Field label="Treasurer exports">
                <select name="export_rule" defaultValue={settings.exportRule} className="field">
                  <option value="approval">Always need Governing Body approval</option>
                  <option value="direct">Allowed without approval</option>
                </select>
              </Field>
            </div>
          </AdminForm>
        </Card>
      )}
    </>
  );
}
