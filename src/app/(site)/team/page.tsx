import type { Metadata } from "next";
import { Suspense } from "react";
import { getTeam } from "@/lib/data";
import { TEAM_SECTIONS } from "@/lib/types";
import { TeamCard } from "@/components/site/TeamCard";
import { GridSkeleton } from "@/components/site/posts";
import { CtaBand, EmptyState, PageHero, SectionHeading, TextLink } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Our Team",
  description: "The people of PAHAD: Governing Body, Executive Body, Secretariat, Directorates, Departments and Geographical Units.",
};

const SECTION_INTRO: Record<(typeof TEAM_SECTIONS)[number], string> = {
  "Governing Body": "Institutional governance, oversight and strategic direction, elected by the General Assembly.",
  "Executive Body": "Executive leadership responsible for implementing approved plans.",
  Secretariat: "Institutional administration, records, coordination and executive support.",
  Directorate: "The six Directorates that carry out PAHAD's areas of work.",
  Department: "Departments working under the Directorates.",
  "Geographical Unit": "Members coordinating PAHAD's work in specific areas.",
};

async function TeamSections() {
  const team = await getTeam();
  if (team.length === 0)
    return (
      <EmptyState title="Team profiles are being added">
        The people of PAHAD will be listed here by section as their details are confirmed.
      </EmptyState>
    );
  return (
    <div className="space-y-16">
      {TEAM_SECTIONS.map((section) => {
        const people = team.filter((p) => p.section === section);
        if (people.length === 0) return null;
        return (
          <section key={section} aria-labelledby={`sec-${section}`}>
            <SectionHeading eyebrow={`${people.length} ${people.length === 1 ? "person" : "people"}`} title={<span id={`sec-${section}`}>{section}</span>} intro={SECTION_INTRO[section]} />
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {people.map((p) => (
                <TeamCard key={p.id} person={p} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

export default function TeamPage() {
  return (
    <>
      <PageHero
        eyebrow="Our team"
        title="The people of PAHAD."
        intro="Members of the Governing Body, Executive Body, Secretariat, Directorates, Departments and Geographical Units who carry PAHAD's work forward."
        image="/images/general-meeting.jpg"
      />
      <section className="container-page py-16">
        <Suspense fallback={<GridSkeleton />}>
          <TeamSections />
        </Suspense>
        <div className="mt-12">
          <TextLink href="/governance">How PAHAD is governed</TextLink>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
