import type { Metadata } from "next";
import { Suspense } from "react";
import { getMedia } from "@/lib/data";
import { GalleryGrid } from "@/components/site/GalleryGrid";
import { GridSkeleton } from "@/components/site/posts";
import { PageHero } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Gallery",
  description: "Photographs from PAHAD's journey, including the DSSCOLONY archive from PAHAD's shared history.",
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
        page="gallery"
      />
      <section className="container-page py-16">
        <Suspense fallback={<GridSkeleton />}>
          <Gallery />
        </Suspense>
      </section>
    </>
  );
}
