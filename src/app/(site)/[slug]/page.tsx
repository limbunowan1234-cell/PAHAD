import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DetailSkeleton, GridSkeleton, RichText } from "@/components/site/posts";
import { PageFeatures } from "@/components/site/PageFeatures";
import { EmptyState, PageHero, PostCard } from "@/components/site/ui";
import { getStandardCustomPage, getPostsByLabel, getPublishedPageSlugs } from "@/lib/data";
import { customPagePlacementKey } from "@/lib/placements";
import { customPagePath } from "@/lib/menu";
import { pageMetadata } from "@/lib/seo";

/** Standard pages made in Admin → Pages. Cache Components needs at least one entry. */
export async function generateStaticParams() {
  try {
    const slugs = await getPublishedPageSlugs();
    if (slugs.length) return slugs.map((slug) => ({ slug }));
  } catch (error) {
    console.error("pages: could not load slugs", error);
  }
  return [{ slug: "_none" }];
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = await getStandardCustomPage(slug);
  if (!page) return { title: "Not found", robots: { index: false } };
  return pageMetadata({
    title: page.title,
    description: page.intro || `${page.title} from PAHAD.`,
    path: customPagePath(page.slug),
    images: page.cover ? [{ url: page.cover, alt: page.title }] : undefined,
  });
}

export default function CustomPageRoute({ params }: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <CustomPageView params={params} />
    </Suspense>
  );
}

async function CustomPageView({ params }: { params: PageProps<"/[slug]">["params"] }) {
  const { slug } = await params;
  const page = await getStandardCustomPage(slug);
  if (!page) notFound();
  return (
    <>
      <PageHero eyebrow={page.eyebrow || "PAHAD"} title={page.title} intro={page.intro || undefined} image={page.cover || undefined} />
      {page.body && (
        <section className="container-page max-w-4xl py-14 text-lg">
          <RichText text={page.body} />
        </section>
      )}
      {page.collect && (
        <section className={page.body ? "bg-sand py-16" : "py-16"}>
          <div className="container-page">
            <Suspense fallback={<GridSkeleton />}>
              <Collected label={page.collect} />
            </Suspense>
          </div>
        </section>
      )}
      <PageFeatures page={customPagePlacementKey(page.id)} />
    </>
  );
}

async function Collected({ label }: { label: string }) {
  const posts = await getPostsByLabel(label);
  if (posts.length === 0) return <EmptyState title="Nothing here yet">New items will appear here as they are published.</EmptyState>;
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}
