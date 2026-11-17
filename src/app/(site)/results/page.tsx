import type { Metadata } from "next";
import { Suspense } from "react";
import { PollResults } from "@/components/PollResults";
import { EmptyState } from "@/components/site/ui";
import { getPublicPollResults } from "@/lib/data";
import { CATEGORY, formatIst } from "@/lib/polls";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Voting Results",
  description: "Official results of PAHAD votes in the Governing Body, Executive Body and General Assembly, published by the President.",
  path: "/results",
});

export default function ResultsPage() {
  return (
    <>
      <section className="bg-teal-900 text-white">
        <div className="container-page max-w-4xl py-14 sm:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cream">Governance</p>
          <h1 className="mt-3 text-4xl font-medium sm:text-5xl">Voting results</h1>
          <p className="mt-4 max-w-2xl text-lg text-white/85">Results the President has authorised for publication after voting closed. Ballots are secret: only totals are shown.</p>
        </div>
      </section>
      <section className="container-page max-w-4xl py-12" aria-labelledby="published-results">
        <h2 id="published-results" className="sr-only">Published results</h2>
        <Suspense fallback={<p className="text-muted" role="status">Loading results…</p>}>
          <ResultList />
        </Suspense>
      </section>
    </>
  );
}

async function ResultList() {
  const results = await getPublicPollResults();
  if (results.length === 0) return <EmptyState title="No published results yet">Official results appear here once voting closes and the President publishes them.</EmptyState>;
  return (
    <ul className="space-y-10">
      {results
        .sort((a, b) => b.poll.closes_at.localeCompare(a.poll.closes_at))
        .map(({ poll, tally }) => (
          <li key={poll.id} className="rounded-[var(--radius-card)] border border-line bg-white p-6 sm:p-8">
            <p className="eyebrow">{CATEGORY[poll.category].label}</p>
            <h2 className="mt-2 text-2xl font-medium text-teal">{poll.title}</h2>
            {poll.description && <p className="mt-2 whitespace-pre-line text-muted">{poll.description}</p>}
            <p className="mt-1 text-sm text-muted">Voting closed {formatIst(poll.closes_at)}</p>
            <div className="mt-6"><PollResults t={tally} final /></div>
          </li>
        ))}
    </ul>
  );
}
