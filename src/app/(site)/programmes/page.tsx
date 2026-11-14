import type { Metadata } from "next";
import { Suspense } from "react";
import { BookOpen, Briefcase, Megaphone, Search } from "lucide-react";
import { GridSkeleton, PostGrid } from "@/components/site/posts";
import { CtaBand, PageHero, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Programmes",
  description: "PAHAD programmes connect community needs, local knowledge, partnerships and achievable action.",
};

const streams = [
  { icon: BookOpen, title: "Community learning", text: "Learning activities, discussions and workshops that strengthen knowledge and participation." },
  { icon: Megaphone, title: "Youth & civic participation", text: "Opportunities for young people and community members to contribute ideas, skills and voluntary effort." },
  { icon: Briefcase, title: "Livelihood & enterprise", text: "Initiatives that explore skills, local enterprise, livelihoods and economic opportunity." },
  { icon: Search, title: "Research & documentation", text: "Community-based research, local knowledge documentation and practical learning." },
];

export default function ProgrammesPage() {
  return (
    <>
      <PageHero
        eyebrow="Programmes"
        title="Turning shared priorities into practical work."
        intro="Programmes connect community needs, local knowledge, partnerships and achievable action. Specific projects are announced here once approved and resourced."
        image="/images/drawing-svda-1.jpg"
      />
      <section className="container-page py-20">
        <SectionHeading eyebrow="Programme streams" title="Where our programmes focus" />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {streams.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-[var(--radius-card)] border border-line p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-cream text-teal">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <h3 className="mt-4 text-xl font-medium text-teal">{title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-sand py-20">
        <div className="container-page">
          <SectionHeading eyebrow="Current programmes" title="Programme updates" />
          <div className="mt-10">
            <Suspense fallback={<GridSkeleton />}>
              <PostGrid
                type="programme"
                emptyTitle="Programme details coming soon"
                emptyText="Project descriptions, timelines, partners and participation details are published only once confirmed."
              />
            </Suspense>
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
