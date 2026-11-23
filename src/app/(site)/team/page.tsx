import type { Metadata } from "next";
import { Suspense } from "react";
import { getTeam } from "@/lib/data";
import { TeamCarousel } from "@/components/site/TeamCarousel";
import { GridSkeleton } from "@/components/site/posts";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Our Team",
  description:
    "The people of PAHAD: Governing Body, Executive Body, Secretariat, Directorates, Departments and Geographical Units.",
  path: "/team",
});

async function TeamCarouselContent() {
  const team = await getTeam();
  const people = team.sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));
  return <TeamCarousel people={people} />;
}

export default function TeamPage() {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <TeamCarouselContent />
    </Suspense>
  );
}
