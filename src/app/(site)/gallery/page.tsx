import type { Metadata } from "next";
import { Suspense } from "react";
import { getMedia } from "@/lib/data";
import { GalleryGrid } from "@/components/site/GalleryGrid";
import { GridSkeleton } from "@/components/site/posts";
import { PageHero } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photographs from PAHAD's journey, from the DSSCOLONY archive to today's community work.",
};

async function Gallery() {
  const media = await getMedia();
  return <GalleryGrid items={media} />;
}

export default function GalleryPage() {
  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="Moments from our journey."
        intro="Meetings, creative initiatives, community work and milestones. Photographs are shared with appropriate context, permission and captions."
        image="/images/naksha-3.jpg"
      />
      <section className="container-page py-16">
        <Suspense fallback={<GridSkeleton />}>
          <Gallery />
        </Suspense>
      </section>
    </>
  );
}
