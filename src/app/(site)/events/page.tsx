import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getUpcomingEvents } from "@/lib/data";
import { site } from "@/lib/site";
import { GridSkeleton, MembersOnlyGrid } from "@/components/site/posts";
import { EmptyState, PageHero, PostCard, SectionHeading } from "@/components/site/ui";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Live Events",
  description:
    "Community conversations, learning sessions, public programmes and activities connected with PAHAD.",
  path: "/events",
});

async function EventLists() {
  const { today: happening, upcoming: all, past } = await getUpcomingEvents();
  const upcoming = all.filter((e) => !happening.includes(e));
  return (
    <>
      {happening.length > 0 && (
        <div className="mb-16">
          <SectionHeading eyebrow="● Happening today" title="Live today" />
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{happening.map((e) => <PostCard key={e.id} post={e} />)}</div>
        </div>
      )}
      <SectionHeading eyebrow="Upcoming" title="Upcoming events" />
      <div className="mt-8">
        {upcoming.length ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{upcoming.map((e) => <PostCard key={e.id} post={e} />)}</div>
        ) : (
          <EmptyState title="No upcoming events announced yet">
            Event details are published once dates, venues and organisers are confirmed.{" "}
            <a href={site.whatsappChannel} target="_blank" rel="noopener noreferrer" className="font-semibold text-teal underline">Follow the WhatsApp channel</a> to hear first.
          </EmptyState>
        )}
      </div>
      {past.length > 0 && (
        <div className="mt-16">
          <SectionHeading eyebrow="Archive" title="Past events" />
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">{past.map((e) => <PostCard key={e.id} post={e} />)}</div>
        </div>
      )}
    </>
  );
}

export default function EventsPage() {
  return (
    <>
      <PageHero
        eyebrow="Live events"
        title="Meet, learn and take part."
        intro="A shared calendar for community conversations, learning sessions, workshops and public programmes connected with PAHAD."
        page="events"
      >
        <Link href="/get-involved" className="btn btn-accent">Propose an event</Link>
      </PageHero>
      <section className="container-page py-16">
        <Suspense fallback={<GridSkeleton />}>
          <EventLists />
        </Suspense>
        <Suspense fallback={null}>
          <MembersOnlyGrid type="event" />
        </Suspense>
        <p className="mt-10 rounded-2xl bg-sand p-5 text-sm text-muted">
          Check each event announcement for eligibility, venue, timing and registration instructions. Please do not rely on unconfirmed event information.
        </p>
      </section>
    </>
  );
}
