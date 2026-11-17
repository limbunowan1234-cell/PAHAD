import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { GridSkeleton, PostGrid, MembersOnlyGrid } from "@/components/site/posts";
import { PageHero } from "@/components/site/ui";
import { pageMetadata } from "@/lib/seo";
import { PageFeatures } from "@/components/site/PageFeatures";

export const metadata: Metadata = pageMetadata({
  title: "News & Stories",
  description:
    "PAHAD announcements, programme updates and community stories.",
  path: "/news",
});

export default function NewsPage() {
  return (
    <>
      <PageHero
        page="news"
        eyebrow="News & media"
        title="Stories, announcements and updates."
        intro="Official PAHAD announcements, programme updates and community stories. Only verified information is published as an official update."
      />
      <section className="container-page py-16">
        <Suspense fallback={<GridSkeleton />}>
          <PostGrid type="news" emptyTitle="No news yet" emptyText="Announcements and stories will appear here." />
        </Suspense>
        <Suspense fallback={null}>
          <MembersOnlyGrid type="news" />
        </Suspense>
      </section>
      <section className="container-page pb-20">
        <div className="grid gap-5 rounded-[var(--radius-card)] bg-sand p-6 sm:grid-cols-2 sm:p-8">
          <p className="sm:col-span-2 eyebrow">More news from the hills</p>
          <a href="https://khabardarjeeling.in" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-line hover:ring-teal">
            <Image src="/partners/khabar-darjeeling.jpg" alt="" width={56} height={56} className="h-14 w-14 rounded-full" />
            <span>
              <span className="block font-display text-lg text-teal">Khabar Darjeeling</span>
              <span className="text-sm text-muted">Our news partner: regional news from Darjeeling and beyond</span>
            </span>
          </a>
          <a href="https://gorkhatv.site" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 rounded-2xl bg-white p-5 ring-1 ring-line hover:ring-teal">
            <span className="flex h-14 w-24 items-center justify-center rounded-xl bg-teal-950 p-2">
              <Image src="/partners/gorkhatv.png" alt="" width={90} height={17} className="h-auto w-full" />
            </span>
            <span>
              <span className="block font-display text-lg text-teal">Gorkha TV</span>
              <span className="text-sm text-muted">Our media partner: video and creators from the hills</span>
            </span>
          </a>
        </div>
      </section>
      <PageFeatures page="news" />
    </>
  );
}
