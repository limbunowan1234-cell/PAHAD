import type { Metadata } from "next";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { getPublishedPosts } from "@/lib/data";
import { formatDate } from "@/lib/utils";
import { EmptyState, PageHero, SectionHeading } from "@/components/site/ui";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Transparency & Documents",
  description:
    "PAHAD's constitution, policies and reports, published as they are formally approved.",
  path: "/transparency",
});

const commitments = [
  ["Institutional information", "Basic information about PAHAD's purpose, governance and programmes is kept clear and accessible."],
  ["Policies and procedures", "Policies are published when formally adopted and approved for public release."],
  ["Financial accountability", "Financial information and reports are prepared, reviewed and disclosed under applicable rules."],
  ["Programme reporting", "Updates distinguish completed work, ongoing activities, proposals and future plans."],
  ["Responsible publication", "Drafts are never presented as adopted policies or final legal instruments."],
];

async function DocumentList() {
  const docs = await getPublishedPosts("document");
  if (docs.length === 0)
    return (
      <EmptyState title="Documents will appear here once approved">
        The Constitution, rules and regulations and institutional policies are published here only after formal adoption. Each will show its version,
        status and approval date.
      </EmptyState>
    );
  return (
    <ul className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white">
      {docs.map((d) => (
        <li key={d.id} className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4">
            <FileText className="mt-1 h-6 w-6 shrink-0 text-coral-700" aria-hidden />
            <div>
              <p className="font-display text-lg text-teal">{d.title}</p>
              <p className="text-sm text-muted">
                {[d.category, d.excerpt, d.event_date && `Approved ${formatDate(d.event_date)}`].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          {d.file_url && (
            <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary !py-2 text-sm">
              Open PDF
            </a>
          )}
        </li>
      ))}
    </ul>
  );
}

export default function TransparencyPage() {
  return (
    <>
      <PageHero
        page="transparency"
        eyebrow="Transparency"
        title="Trust through openness and accountability."
        intro="PAHAD makes relevant institutional information accessible as it is formally approved."
      />
      <section className="container-page grid gap-12 py-20 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <SectionHeading eyebrow="Our commitments" title="What we publish, and how." />
          <ul className="mt-8 space-y-5">
            {commitments.map(([t, d]) => (
              <li key={t}>
                <p className="font-semibold text-teal">{t}</p>
                <p className="mt-1 text-muted">{d}</p>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionHeading eyebrow="Constitution & documents" title="Official documents" />
          <div className="mt-8">
            <Suspense fallback={<div className="h-40 animate-pulse rounded-[var(--radius-card)] bg-sand" />}>
              <DocumentList />
            </Suspense>
          </div>
        </div>
      </section>
    </>
  );
}
