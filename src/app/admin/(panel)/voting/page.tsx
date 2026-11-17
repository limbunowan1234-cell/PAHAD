import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { savePoll } from "../../poll-actions";
import { AdminForm, Disclosure } from "@/components/admin/client";
import { VoteForm } from "@/components/admin/PollClient";
import { PHASE_TONE, PollFields } from "@/components/admin/PollFields";
import { Badge, Card, Empty, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, canView } from "@/lib/permissions";
import { CATEGORY, canSeeResults, formatIst, parseOptions, pct, phaseOf, PHASE_LABEL, type PollPhase } from "@/lib/polls";
import type { Poll, PollCategory, PublicUser } from "@/lib/types";

export const metadata = { title: "Voting" };

async function MyBallots({ user, manager }: { user: PublicUser; manager: boolean }) {
  const [mine, receipts] = await Promise.all([db.findBy("poll_voters", "user_id", user.id), db.findBy("poll_receipts", "user_id", user.id)]);
  const voted = new Set(receipts.map((r) => r.poll_id));
  const polls = (await Promise.all(mine.map((v) => db.get("polls", v.poll_id)))).filter((p): p is Poll => !!p && p.status !== "draft" && !p.archived);
  const order: PollPhase[] = ["active", "upcoming", "paused", "closed"];
  polls.sort((a, b) => order.indexOf(phaseOf(a)) - order.indexOf(phaseOf(b)) || b.opens_at.localeCompare(a.opens_at));
  if (polls.length === 0) return <Empty>There are no polls for you right now. You&apos;ll be notified when one opens.</Empty>;
  return (
    <ul className="space-y-4">
      {polls.map((p) => {
        const phase = phaseOf(p);
        const hasVoted = voted.has(p.id);
        const results = canSeeResults(p, { manager, eligible: true });
        return (
          <li key={p.id}>
            <Card>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>{CATEGORY[p.category].short}</Badge>
                <Badge tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</Badge>
                {hasVoted && <Badge tone="teal">Vote Submitted</Badge>}
              </div>
              <h3 className="mt-2 font-display text-xl text-teal">{p.title}</h3>
              {p.description && <p className="mt-1 whitespace-pre-line text-sm text-muted">{p.description}</p>}
              <p className="mt-1 text-xs text-muted">{formatIst(p.opens_at)} – {formatIst(p.closes_at)}</p>
              <div className="mt-4">
                {hasVoted ? (
                  <p className="flex items-center gap-2 rounded-xl bg-sage-100 p-3 text-sm font-semibold text-teal"><CheckCircle2 className="h-5 w-5" aria-hidden /> Vote Submitted. Thank you.</p>
                ) : phase === "active" ? (
                  <VoteForm pollId={p.id} options={parseOptions(p)} />
                ) : (
                  <ul className="list-inside list-disc text-sm text-muted">{parseOptions(p).map((o) => <li key={o.id}>{o.label}</li>)}</ul>
                )}
              </div>
              {results && phase === "closed" && <Link href={`/admin/voting/${p.id}`} className="mt-3 inline-block text-sm font-semibold text-teal underline">See the results</Link>}
            </Card>
          </li>
        );
      })}
    </ul>
  );
}

async function ManagePolls({ manage }: { manage: boolean }) {
  const [polls, voters, receipts] = await Promise.all([db.all("polls"), db.all("poll_voters"), db.all("poll_receipts")]);
  const count = (rows: { poll_id: string }[], id: string) => rows.filter((r) => r.poll_id === id).length;
  const active = polls.filter((p) => !p.archived);
  const archived = polls.filter((p) => p.archived);
  const row = (p: Poll) => {
    const phase = phaseOf(p);
    const e = count(voters, p.id);
    const c = count(receipts, p.id);
    return (
      <li key={p.id}>
        <Link href={`/admin/voting/${p.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-white p-4 hover:border-teal">
          <span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-semibold text-ink">{p.title}</span>
              <Badge tone={PHASE_TONE[phase]}>{PHASE_LABEL[phase]}</Badge>
            </span>
            <span className="text-xs text-muted">{formatIst(p.opens_at)} – {formatIst(p.closes_at)}</span>
          </span>
          <span className="text-sm text-muted">{c}/{e} voted · turnout {pct(e ? (c / e) * 100 : 0)}</span>
        </Link>
      </li>
    );
  };
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl text-teal">{manage ? "Manage polls" : "All polls (view only)"}</h2>
      {manage && (
        <div className="my-4">
          <Disclosure summary="Create a poll">
            <AdminForm action={savePoll} submitLabel="Create poll" resetOnSuccess>
              <PollFields />
            </AdminForm>
          </Disclosure>
        </div>
      )}
      {(Object.keys(CATEGORY) as PollCategory[]).map((c) => {
        const list = active.filter((p) => p.category === c);
        return (
          <div key={c} className="mt-6">
            <h3 className="font-semibold text-ink">{CATEGORY[c].short}: {CATEGORY[c].label}</h3>
            {list.length ? <ul className="mt-2 space-y-2">{list.map(row)}</ul> : <p className="mt-1 text-sm text-muted">No polls.</p>}
          </div>
        );
      })}
      {archived.length > 0 && (
        <div className="mt-8">
          <Disclosure summary={`Archive (${archived.length})`}>
            <ul className="space-y-2">{archived.map(row)}</ul>
          </Disclosure>
        </div>
      )}
    </section>
  );
}

export default async function VotingPage() {
  const user = await requireUser();
  const manager = can(user.role, "polls.manage");
  return (
    <>
      <PageHeader title="Voting" description="Polls for the Governing Body (GB), Executive Body (EB) and General Assembly. Ballots are secret and each eligible member can vote once." />
      <h2 className="mb-3 font-display text-2xl text-teal">My ballots</h2>
      <MyBallots user={user} manager={manager} />
      {canView(user.role, "polls.manage") && <ManagePolls manage={manager} />}
    </>
  );
}
