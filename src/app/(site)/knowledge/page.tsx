import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GridSkeleton, PostGrid, MembersOnlyGrid } from "@/components/site/posts";
import { PageHero, SectionHeading } from "@/components/site/ui";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Knowledge & Research",
  description:
    "Local knowledge, shared learning and collective action: PAHAD's research, documentation and knowledge resources.",
  path: "/knowledge",
});

const pillars = [
  ["Local knowledge", "Community experience and place-based understanding are valuable resources for identifying priorities and shaping action."],
  ["Research & learning", "Research helps clarify local conditions, understand challenges and identify practical opportunities."],
  ["Documentation", "Stories, records, publications and learning materials help preserve knowledge and make it accessible."],
];

export default function KnowledgePage() {
  return (
    <>
      <PageHero
        eyebrow="Knowledge & research"
        title="Local knowledge. Shared learning. Collective action."
        intro="Useful knowledge comes from lived experience, community memory, research, documentation and exchange."
        page="knowledge"
      />
      <section className="container-page grid gap-6 py-20 md:grid-cols-3">
        {pillars.map(([t, d], i) => (
          <div key={t} className="rounded-[var(--radius-card)] border border-line p-7">
            <span className="text-sm font-bold text-coral-700">0{i + 1}</span>
            <h2 className="mt-2 text-2xl font-medium text-teal">{t}</h2>
            <p className="mt-3 leading-relaxed text-muted">{d}</p>
          </div>
        ))}
      </section>
      <section className="bg-sand py-20">
        <div className="container-page">
          <SectionHeading eyebrow="Resources" title="Reports, publications & learning materials" />
          <div className="mt-10">
            <Suspense fallback={<GridSkeleton />}>
              <PostGrid
                type="resource"
                emptyTitle="Resources are being prepared"
                emptyText="Verified reports, publications and learning resources will be added as they are prepared and approved."
              />
            </Suspense>
            <Suspense fallback={null}>
              <MembersOnlyGrid type="resource" />
            </Suspense>
          </div>
          <div className="mt-12 rounded-[var(--radius-card)] bg-teal p-8 text-white sm:flex sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-medium">Have a local insight or research question?</h2>
              <p className="mt-2 text-white/85">Share it with PAHAD. Community knowledge shapes what we study and document.</p>
            </div>
            <Link href="/get-involved#share" className="btn btn-accent mt-6 sm:mt-0">Share your idea</Link>
          </div>
        </div>
      </section>
    </>
  );
}
