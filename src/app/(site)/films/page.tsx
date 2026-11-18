import type { Metadata } from "next";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/site/posts";
import { EmptyState, PageHero } from "@/components/site/ui";
import { VideoPlayer } from "@/components/site/VideoPlayer";
import { WatchOnYouTube } from "@/components/site/WatchOnYouTube";
import { getFilmsPage, getFilmVideos } from "@/lib/data";
import { FILMS_PATH } from "@/lib/films";
import { pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const { title, intro } = await getFilmsPage();
  return pageMetadata({ title, description: intro, path: FILMS_PATH });
}

export default async function FilmsPage() {
  const { title, intro } = await getFilmsPage();
  return (
    <>
      <PageHero eyebrow="Media" title={title} intro={intro} page="films" />
      <section className="container-page py-16">
        <Suspense fallback={<GridSkeleton />}>
          <FilmList />
        </Suspense>
      </section>
    </>
  );
}

/** Every approved video that is switched ON (Admin → Videos). */
async function FilmList() {
  const videos = await getFilmVideos();
  if (videos.length === 0) {
    return <EmptyState title="No films yet">Films and documentaries will appear here as they are added.</EmptyState>;
  }
  return (
    <ul className="grid gap-10 md:grid-cols-2">
      {videos.map((v) => (
        <li key={v.id} id={`film-${v.id}`} className="scroll-mt-28">
          <VideoPlayer id={v.youtube_id} title={v.title} />
          <h2 className="mt-4 text-2xl font-medium text-teal">{v.title}</h2>
          {v.description && <p className="mt-1 text-muted">{v.description}</p>}
          <WatchOnYouTube id={v.youtube_id} title={v.title} />
        </li>
      ))}
    </ul>
  );
}
