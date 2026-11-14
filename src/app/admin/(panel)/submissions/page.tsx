import Link from "next/link";
import { redirect } from "next/navigation";
import { Mail, Phone } from "lucide-react";
import { deleteSubmission, setSubmissionStatus } from "../../actions";
import { ActionButton } from "@/components/admin/client";
import { Badge, Empty, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Submission } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Messages" };

const KIND: Record<Submission["kind"], string> = {
  contact: "General enquiry", idea: "Idea / local need", volunteer: "Volunteer", collaborate: "Collaboration", knowledge: "Knowledge contribution",
};
const TONE = { new: "amber", in_progress: "teal", closed: "grey" } as const;
const LABEL = { new: "New", in_progress: "In progress", closed: "Closed" };

export default async function SubmissionsPage({ searchParams }: PageProps<"/admin/submissions">) {
  const user = await requireUser();
  if (!can(user.role, "submissions.view")) redirect("/admin");
  const sp = await searchParams;
  const status = typeof sp.status === "string" ? sp.status : "open";
  const all = await db.all("submissions");
  const rows = all.filter((s) => (status === "open" ? s.status !== "closed" : status === "all" ? true : s.status === status));

  return (
    <>
      <PageHeader title="Messages" description="Enquiries, ideas, volunteer offers and collaboration proposals sent through the website." />
      <div className="mb-6 flex flex-wrap gap-2">
        {[["open", "Open"], ["new", "New"], ["closed", "Closed"], ["all", "All"]].map(([s, label]) => (
          <Link key={s} href={`/admin/submissions?status=${s}`} className={cn("rounded-full px-3 py-1.5 text-sm font-medium", status === s ? "bg-teal text-white" : "bg-white text-teal ring-1 ring-line hover:bg-cream")}>
            {label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <Empty>No messages here.</Empty>
      ) : (
        <ul className="space-y-3">
          {rows.map((s) => (
            <li key={s.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={TONE[s.status]}>{LABEL[s.status]}</Badge>
                <span className="text-sm font-semibold text-coral-700">{KIND[s.kind]}</span>
                <span className="text-xs text-muted">{formatDate(s.created_at, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="mt-3 font-semibold text-ink">{s.name}{s.organisation && <span className="font-normal text-muted"> · {s.organisation}</span>}</p>
              <p className="mt-2 whitespace-pre-line text-ink">{s.message}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                <a href={`mailto:${s.email}?subject=${encodeURIComponent("Re: your message to PAHAD")}`} className="inline-flex items-center gap-1.5 font-semibold text-teal hover:underline">
                  <Mail className="h-4 w-4" aria-hidden /> {s.email}
                </a>
                {s.phone && <a href={`tel:${s.phone}`} className="inline-flex items-center gap-1.5 text-teal"><Phone className="h-4 w-4" aria-hidden /> {s.phone}</a>}
                <span className="flex-1" />
                {s.status !== "in_progress" && <ActionButton action={setSubmissionStatus.bind(null, s.id, "in_progress")}>Mark in progress</ActionButton>}
                {s.status !== "closed" && <ActionButton action={setSubmissionStatus.bind(null, s.id, "closed")}>Close</ActionButton>}
                {s.status === "closed" && <ActionButton action={setSubmissionStatus.bind(null, s.id, "new")}>Reopen</ActionButton>}
                {can(user.role, "submissions.delete") && (
                  <ActionButton variant="danger" confirm="Delete this message permanently?" action={deleteSubmission.bind(null, s.id)}>Delete</ActionButton>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
