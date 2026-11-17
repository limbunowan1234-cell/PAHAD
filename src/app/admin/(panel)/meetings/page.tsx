import Link from "next/link";
import { redirect } from "next/navigation";
import { createMeeting } from "../../gbm-actions";
import { AdminForm, Disclosure } from "@/components/admin/client";
import { Badge, Empty, Field, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { DraftStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "GB Meetings" };

const DRAFT: Record<DraftStatus, { label: string; tone: "grey" | "amber" | "green" }> = {
  draft: { label: "draft", tone: "grey" },
  submitted: { label: "awaiting President", tone: "amber" },
  approved: { label: "approved", tone: "green" },
};

export default async function MeetingsPage() {
  const user = await requireUser();
  if (!can(user.role, "gbm.view")) redirect("/admin");
  const [meetings, resolutions] = await Promise.all([db.all("meetings"), db.all("resolutions")]);
  const sorted = meetings.sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));

  return (
    <>
      <PageHeader
        title="Governing Body Meetings"
        description="The General Secretary prepares notices, agendas and minutes; the President approves agendas and minutes and ratifies resolutions."
      />
      {can(user.role, "gbm.draft") && (
        <div className="mb-8">
          <Disclosure summary="Schedule a meeting" defaultOpen={meetings.length === 0}>
            <AdminForm action={createMeeting} submitLabel="Create meeting">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field label="Title" className="lg:col-span-2"><input name="title" className="field" placeholder="e.g. 3rd Governing Body Meeting" /></Field>
                <Field label="Date *"><input name="meeting_date" type="date" required className="field" /></Field>
                <Field label="Time"><input name="start_time" type="time" className="field" /></Field>
                <Field label="Venue" className="sm:col-span-2 lg:col-span-4"><input name="venue" className="field" placeholder="e.g. PAHAD office, Darjeeling / online" /></Field>
              </div>
            </AdminForm>
          </Disclosure>
        </div>
      )}
      {sorted.length === 0 ? (
        <Empty>No meetings yet.</Empty>
      ) : (
        <ul className="space-y-3">
          {sorted.map((m) => {
            const res = resolutions.filter((r) => r.meeting_id === m.id);
            return (
              <li key={m.id}>
                <Link href={`/admin/meetings/${m.id}`} className="block rounded-2xl border border-line bg-white p-5 hover:border-teal">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-xl text-teal">{m.title}</p>
                    {m.status !== "scheduled" && <Badge tone={m.status === "held" ? "green" : "red"}>{m.status}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatDate(m.meeting_date)}{m.start_time && ` · ${m.start_time}`}{m.venue && ` · ${m.venue}`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <Badge tone={DRAFT[m.agenda_status].tone}>Agenda: {DRAFT[m.agenda_status].label}</Badge>
                    <Badge tone={m.notice_issued_at ? "green" : "grey"}>Notice: {m.notice_issued_at ? "issued" : "not issued"}</Badge>
                    <Badge tone={DRAFT[m.minutes_status].tone}>Minutes: {DRAFT[m.minutes_status].label}</Badge>
                    {res.length > 0 && <Badge>{res.length} resolution{res.length === 1 ? "" : "s"}</Badge>}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
