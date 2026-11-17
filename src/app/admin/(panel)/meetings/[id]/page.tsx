import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  addFollowUp, castVote, decideDraft, decideResolution, issueNotice, proposeResolution, saveDraft, updateMeetingDetails,
} from "../../../gbm-actions";
import { AdminForm, Disclosure } from "@/components/admin/client";
import { Badge, Card, Empty, Field, Notice, PageHeader } from "@/components/admin/ui";
import { RichText } from "@/components/site/posts";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, roleLabel } from "@/lib/permissions";
import type { DraftStatus, Meeting, Vote } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Meeting" };

const STATUS_LABEL: Record<DraftStatus, string> = { draft: "Draft", submitted: "Awaiting the President", approved: "Approved · locked" };
const STATUS_TONE: Record<DraftStatus, "grey" | "amber" | "green"> = { draft: "grey", submitted: "amber", approved: "green" };

function DraftSection({ m, part, canDraft, canApprove }: { m: Meeting; part: "agenda" | "minutes"; canDraft: boolean; canApprove: boolean }) {
  const status = m[`${part}_status`];
  const text = m[part];
  const title = part === "agenda" ? "Agenda" : "Minutes";
  return (
    <Card title={title} className="mb-6">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>
        {status === "approved" && <span className="text-xs text-muted">Approved by {m[`${part}_approved_by`]}</span>}
      </div>
      {canDraft && status !== "approved" ? (
        <AdminForm action={saveDraft} submitLabel={`Save ${part}`}>
          <input type="hidden" name="id" value={m.id} />
          <input type="hidden" name="part" value={part} />
          <textarea name="text" rows={part === "agenda" ? 8 : 14} defaultValue={text} className="field" placeholder={part === "agenda" ? "- Welcome and quorum\n- Confirmation of previous minutes\n- …" : "Present: …\n\n## Item 1\n\nDiscussion and decision…"} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="submit" value="yes" className="h-4 w-4 accent-teal" /> Submit to the President for approval
          </label>
        </AdminForm>
      ) : text ? (
        <div className="rounded-xl bg-sand p-4"><RichText text={text} /></div>
      ) : (
        <p className="text-sm text-muted">Not written yet.</p>
      )}
      {canApprove && status === "submitted" && (
        <div className="mt-4 grid gap-3 rounded-xl border border-line p-4 md:grid-cols-2">
          <AdminForm action={decideDraft} submitLabel={`Approve ${part}`}>
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="part" value={part} />
            <input type="hidden" name="decision" value="approve" />
          </AdminForm>
          <AdminForm action={decideDraft} submitLabel="Return for changes">
            <input type="hidden" name="id" value={m.id} />
            <input type="hidden" name="part" value={part} />
            <input type="hidden" name="decision" value="return" />
            <input name="note" className="field" placeholder="What should change?" />
          </AdminForm>
        </div>
      )}
    </Card>
  );
}

export default async function MeetingPage({ params }: PageProps<"/admin/meetings/[id]">) {
  const user = await requireUser();
  if (!can(user.role, "gbm.view")) redirect("/admin");
  const { id } = await params;
  const m = await db.get("meetings", id);
  if (!m) notFound();
  const [resolutions, tasks, users] = await Promise.all([db.findBy("resolutions", "meeting_id", id), db.findBy("tasks", "meeting_id", id), db.all("users")]);
  const canDraft = can(user.role, "gbm.draft");
  const canApprove = can(user.role, "gbm.approve");
  const canVote = can(user.role, "gbm.vote");
  const name = (uid: string) => users.find((u) => u.id === uid)?.name ?? "—";

  return (
    <>
      <PageHeader
        title={m.title}
        description={`${formatDate(m.meeting_date)}${m.start_time ? ` · ${m.start_time}` : ""}${m.venue ? ` · ${m.venue}` : ""} · prepared by ${m.created_by_name}`}
        actions={<Link href="/admin/meetings" className="text-sm font-semibold text-teal">← All meetings</Link>}
      />
      {m.status === "cancelled" && <Notice tone="warn">This meeting was cancelled.</Notice>}

      {canDraft && (
        <div className="mb-6">
          <Disclosure summary="Meeting details">
            <AdminForm action={updateMeetingDetails}>
              <input type="hidden" name="id" value={m.id} />
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Title" className="lg:col-span-2"><input name="title" defaultValue={m.title} className="field" /></Field>
                <Field label="Date"><input name="meeting_date" type="date" defaultValue={m.meeting_date} className="field" /></Field>
                <Field label="Time"><input name="start_time" type="time" defaultValue={m.start_time} className="field" /></Field>
                <Field label="Venue" className="sm:col-span-2"><input name="venue" defaultValue={m.venue} className="field" /></Field>
                <Field label="Status">
                  <select name="status" defaultValue={m.status} className="field">
                    <option value="scheduled">Scheduled</option>
                    <option value="held">Held</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </Field>
              </div>
            </AdminForm>
          </Disclosure>
        </div>
      )}

      <DraftSection m={m} part="agenda" canDraft={canDraft} canApprove={canApprove} />

      <Card title="Notice" className="mb-6">
        {m.notice_issued_at ? (
          <>
            <Badge tone="green">Issued {formatDate(m.notice_issued_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</Badge>
            <div className="mt-3 rounded-xl bg-sand p-4"><RichText text={m.notice} /></div>
          </>
        ) : canDraft ? (
          <AdminForm action={issueNotice} submitLabel="Issue notice to the Governing Body">
            <input type="hidden" name="id" value={m.id} />
            <textarea
              name="notice"
              rows={5}
              className="field"
              defaultValue={`Notice is hereby given that the ${m.title} of PAHAD will be held on ${formatDate(m.meeting_date)}${m.start_time ? ` at ${m.start_time}` : ""}${m.venue ? ` at ${m.venue}` : ""}. Members are requested to attend.`}
            />
            {m.agenda_status !== "approved" && <p className="text-sm text-coral-700">The President must approve the agenda first.</p>}
          </AdminForm>
        ) : (
          <p className="text-sm text-muted">Not issued yet.</p>
        )}
      </Card>

      <Card title={`Resolutions (${resolutions.length})`} className="mb-6">
        {resolutions.length === 0 && <Empty>No resolutions yet.</Empty>}
        <ul className="space-y-4">
          {resolutions.sort((a, b) => a.number.localeCompare(b.number)).map((r) => {
            const votes = JSON.parse(r.votes || "[]") as Vote[];
            const tally = { for: 0, against: 0, abstain: 0 };
            votes.forEach((v) => tally[v.vote]++);
            const mine = votes.find((v) => v.by === user.id)?.vote;
            return (
              <li key={r.id} className="rounded-xl border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-teal">{r.number}</span>
                  <Badge tone={r.status === "ratified" ? "green" : r.status === "rejected" ? "red" : "amber"}>{r.status}</Badge>
                  <span className="font-medium text-ink">{r.title}</span>
                </div>
                {r.body && <p className="mt-2 whitespace-pre-line text-sm text-ink">{r.body}</p>}
                <p className="mt-2 text-xs text-muted">
                  For {tally.for} · Against {tally.against} · Abstain {tally.abstain}
                  {votes.length > 0 && ` (${votes.map((v) => `${v.name}: ${v.vote}`).join(", ")})`}
                  {r.decided_by_name && ` · ${r.status} by ${r.decided_by_name}`}
                </p>
                {r.status === "proposed" && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canVote &&
                      (["for", "against", "abstain"] as const).map((v) => (
                        <AdminForm key={v} action={castVote} submitLabel={`${mine === v ? "✓ " : ""}${v === "for" ? "Vote for" : v === "against" ? "Vote against" : "Abstain"}`} className="!space-y-0">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="vote" value={v} />
                        </AdminForm>
                      ))}
                    {canApprove && (
                      <>
                        <AdminForm action={decideResolution} submitLabel="Ratify" className="!space-y-0">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="decision" value="ratify" />
                        </AdminForm>
                        <AdminForm action={decideResolution} submitLabel="Reject" className="!space-y-0">
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="decision" value="reject" />
                        </AdminForm>
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        {canDraft && (
          <div className="mt-4">
            <Disclosure summary="Propose a resolution">
              <AdminForm action={proposeResolution} submitLabel="Add resolution" resetOnSuccess>
                <input type="hidden" name="meeting_id" value={m.id} />
                <Field label="Title *"><input name="title" required className="field" placeholder="e.g. Adoption of the Finance Policy 2026" /></Field>
                <Field label="Text"><textarea name="body" rows={4} className="field" placeholder="Resolved that…" /></Field>
              </AdminForm>
            </Disclosure>
          </div>
        )}
      </Card>

      <DraftSection m={m} part="minutes" canDraft={canDraft} canApprove={canApprove} />

      <Card title={`Follow-ups (${tasks.length})`}>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted">No follow-ups yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {tasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="text-ink">{t.title}</span>
                <span className="text-muted">
                  {name(t.assigned_to)}{t.due_date && ` · due ${formatDate(t.due_date, { day: "numeric", month: "short" })}`}{" "}
                  <Badge tone={t.status === "done" ? "green" : t.status === "in_progress" ? "amber" : "grey"}>{t.status.replace("_", " ")}</Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
        {canDraft && (
          <div className="mt-4">
            <Disclosure summary="Add a follow-up">
              <AdminForm action={addFollowUp} submitLabel="Assign follow-up" resetOnSuccess>
                <input type="hidden" name="meeting_id" value={m.id} />
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="What *" className="sm:col-span-3"><input name="title" required className="field" /></Field>
                  <Field label="Who *">
                    <select name="assigned_to" required defaultValue="" className="field">
                      <option value="" disabled>Choose</option>
                      {users.filter((u) => u.active).map((u) => <option key={u.id} value={u.id}>{u.name} ({roleLabel(u.role)})</option>)}
                    </select>
                  </Field>
                  <Field label="Due"><input name="due_date" type="date" className="field" /></Field>
                </div>
              </AdminForm>
            </Disclosure>
          </div>
        )}
      </Card>
    </>
  );
}
