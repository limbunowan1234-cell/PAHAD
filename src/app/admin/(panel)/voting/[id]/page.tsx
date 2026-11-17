import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Download, ShieldCheck, TriangleAlert } from "lucide-react";
import { archivePoll, authorisePublicResults, deletePoll, savePoll, setPollStatus } from "../../../poll-actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { PHASE_TONE, PollFields } from "@/components/admin/PollFields";
import { Badge, Card, Notice, PageHeader } from "@/components/admin/ui";
import { PollResults } from "@/components/PollResults";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, canView } from "@/lib/permissions";
import { CATEGORY, canSeeResults, formatIst, phaseOf, PHASE_LABEL, tally, VISIBILITY, voterKey } from "@/lib/polls";

export const metadata = { title: "Poll" };

export default async function PollPage({ params }: PageProps<"/admin/voting/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const poll = await db.get("polls", id);
  if (!poll) notFound();
  const manager = can(user.role, "polls.manage");
  // SYS Website Administrator sees what administrators see, without any controls.
  const viewer = canView(user.role, "polls.manage");
  const eligible = Boolean(await db.get("poll_voters", voterKey(id, user.id)));
  if (!viewer && !(poll.status !== "draft" && canSeeResults(poll, { manager, eligible }))) redirect("/admin/voting");

  const [voters, receipts, ballots] = await Promise.all([db.findBy("poll_voters", "poll_id", id), db.findBy("poll_receipts", "poll_id", id), db.findBy("ballots", "poll_id", id)]);
  const t = tally(poll, voters, receipts, ballots);
  const phase = phaseOf(poll);
  const final = phase === "closed";

  return (
    <>
      <Link href="/admin/voting" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-teal hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Voting
      </Link>
      <PageHeader
        title={poll.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge>{CATEGORY[poll.category].short}: {CATEGORY[poll.category].label}</Badge>
            <Badge tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</Badge>
            {poll.archived && <Badge>Archived</Badge>}
            <span>{formatIst(poll.opens_at)} – {formatIst(poll.closes_at)}</span>
          </span>
        }
      />
      {poll.description && <p className="-mt-2 mb-6 whitespace-pre-line text-muted">{poll.description}</p>}

      {viewer && !manager && <Notice>View only. Polls are managed by the President and General Secretary.</Notice>}
      {manager && (
        <Card>
          <div className="flex flex-wrap items-center gap-2">
            {(poll.status === "draft" || poll.status === "paused") && !final && (
              <ActionButton variant="primary" confirm={poll.status === "draft" ? `Open “${poll.title}” for voting? Eligible members will be notified.` : undefined} action={setPollStatus.bind(null, id, "active")}>
                {poll.status === "draft" ? "Open voting" : "Resume voting"}
              </ActionButton>
            )}
            {poll.status === "active" && !final && <ActionButton action={setPollStatus.bind(null, id, "paused")}>Pause</ActionButton>}
            {poll.status !== "draft" && poll.status !== "closed" && (
              <ActionButton variant="danger" confirm="Close voting now? Closed polls can't be reopened." action={setPollStatus.bind(null, id, "closed")}>Close voting</ActionButton>
            )}
            {final && <ActionButton action={archivePoll.bind(null, id, !poll.archived)}>{poll.archived ? "Unarchive" : "Archive"}</ActionButton>}
            {poll.status === "draft" && t.cast === 0 && (
              <ActionButton variant="danger" confirm="Delete this draft?" action={deletePoll.bind(null, id)}>Delete draft</ActionButton>
            )}
            <a href={`/admin/voting/${id}/export`} className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-sand">
              <Download className="h-3.5 w-3.5" aria-hidden /> Export results (CSV)
            </a>
          </div>
          <p className="mt-3 text-sm text-muted">Results: {VISIBILITY[poll.results_visibility]}.</p>
          {poll.results_visibility === "public" && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <Badge tone={poll.public_authorized ? "teal" : "grey"}>{poll.public_authorized ? "Published on the website" : "Not published"}</Badge>
              {can(user.role, "polls.publish_results") && final && (
                <ActionButton
                  variant={poll.public_authorized ? "ghost" : "primary"}
                  confirm={poll.public_authorized ? undefined : "Publish these results on the public website?"}
                  action={authorisePublicResults.bind(null, id, !poll.public_authorized)}
                >
                  {poll.public_authorized ? "Remove from website" : "Authorise public results"}
                </ActionButton>
              )}
              {!final && <span className="text-muted">Can be published after voting closes.</span>}
            </div>
          )}
        </Card>
      )}

      <section className="mt-8" aria-labelledby="results">
        <h2 id="results" className="font-display text-2xl text-teal">{final ? "Final results" : "Live results"}</h2>
        {!final && <p className="text-sm text-muted">Visible only to the President and authorised administrators while voting is open.</p>}
        <div className="mt-4"><PollResults t={t} final={final} /></div>
        {viewer && (
          t.consistent ? (
            <p className="mt-4 flex items-center gap-2 text-xs text-muted"><ShieldCheck className="h-4 w-4 text-teal" aria-hidden /> Integrity check: {t.ballots} anonymous ballots match {t.cast} “has voted” records.</p>
          ) : (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-800"><TriangleAlert className="h-4 w-4" aria-hidden /> Integrity check failed: {t.ballots} ballots but {t.cast} “has voted” records. Do not publish; check the Activity Log.</p>
          )
        )}
      </section>

      {viewer && (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <Card title={`Not voted yet (${t.notVoted.length})`}>
            {t.notVoted.length === 0 ? (
              <p className="text-sm text-muted">{t.eligible ? "Everyone eligible has voted." : "No eligible voters chosen yet."}</p>
            ) : (
              <ul className="columns-2 text-sm text-ink">{t.notVoted.map((v) => <li key={v.id}>{v.user_name}</li>)}</ul>
            )}
            <p className="mt-3 text-xs text-muted">Shows who has not voted, never how anyone voted.</p>
          </Card>
          {manager && !final && !poll.archived && (
            <Disclosure summary={t.cast > 0 ? "Change closing time (options and voters are locked)" : "Edit poll"}>
              <AdminForm action={savePoll}>
                <PollFields poll={poll} voterIds={voters.map((v) => v.user_id)} locked={t.cast > 0} />
              </AdminForm>
            </Disclosure>
          )}
        </section>
      )}
      {!viewer && <Notice>Individual votes are secret. These are the combined results.</Notice>}
    </>
  );
}
