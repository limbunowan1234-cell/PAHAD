import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { getPageFeatured, getPageVideos, type FeaturedCard } from "@/lib/data";
import type { PagePlacementKey } from "@/lib/types";
import { MembersOnly } from "./MembersOnly";
import { MembersBadge } from "./posts";
import { VideoPlayer } from "./VideoPlayer";
import { WatchOnYouTube } from "./WatchOnYouTube";

/**
 * Featured content and YouTube videos for one page, all managed from the dashboard
 * (Admin → Featured and Admin → Videos). Renders nothing when there is nothing to show.
 */
export function PageFeatures({ page }: { page: PagePlacementKey }) {
  return (
    <Suspense fallback={null}>
      <Featured page={page} />
      <Videos page={page} />
    </Suspense>
  );
}

async function Featured({ page }: { page: PagePlacementKey }) {
  const { public: items, members } = await getPageFeatured(page);
  if (items.length === 0 && members.length === 0) return null;
  return (
    <section aria-labelledby={`featured-${page}`} className="bg-sand">
      <div className="container-page py-14 sm:py-16">
        <p className="eyebrow flex items-center gap-2"><Sparkles className="h-4 w-4" aria-hidden /> Featured</p>
        <h2 id={`featured-${page}`} className="mt-2 text-3xl font-medium text-teal sm:text-4xl">Highlights from PAHAD</h2>
        {items.length > 0 && <CardGrid cards={items} />}
        {members.length > 0 && (
          // Members Only posts: rendered on the server only for a signed-in account.
          <Suspense fallback={null}>
            <MembersOnly next="/" fallback={null}>
              <CardGrid cards={members} membersOnly />
            </MembersOnly>
          </Suspense>
        )}
      </div>
    </section>
  );
}

function CardGrid({ cards, membersOnly = false }: { cards: FeaturedCard[]; membersOnly?: boolean }) {
  return (
    <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <li key={c.id}>
          <FeatureCard card={c} membersOnly={membersOnly} />
        </li>
      ))}
    </ul>
  );
}

/** next/image only optimises hosts listed in next.config; other images load as they are. */
const optimisable = (src: string) => src.startsWith("/") || /^https:\/\/(lh3\.googleusercontent\.com|i\.ytimg\.com|[^/]+\.public\.blob\.vercel-storage\.com)\//.test(src);

function FeatureCard({ card, membersOnly }: { card: FeaturedCard; membersOnly: boolean }) {
  const inner = (
    <>
      <div className="relative aspect-[16/10] overflow-hidden bg-teal-900">
        {card.image ? (
          <Image src={card.image} alt="" fill sizes="(min-width:1024px) 400px, (min-width:640px) 50vw, 100vw" unoptimized={!optimisable(card.image)} className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center text-cream"><Sparkles className="h-10 w-10" aria-hidden /></div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-coral-700">
          {card.label}
          {membersOnly && <MembersBadge tone="light" />}
        </p>
        <h3 className="mt-2 text-xl font-medium text-teal group-hover:underline">
          {card.title}
          {card.external && <ArrowUpRight className="ml-1 inline h-4 w-4" aria-label="(opens in a new tab)" />}
        </h3>
        {card.text && <p className="mt-2 line-clamp-3 text-muted">{card.text}</p>}
      </div>
    </>
  );
  const cls = "group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-line transition-shadow hover:shadow-xl";
  if (!card.href) return <div className={cls}>{inner}</div>;
  return card.external ? (
    <a href={card.href} target="_blank" rel="noopener noreferrer" className={cls}>{inner}</a>
  ) : (
    <Link href={card.href} className={cls}>{inner}</Link>
  );
}

async function Videos({ page }: { page: PagePlacementKey }) {
  const videos = await getPageVideos(page);
  if (videos.length === 0) return null;
  return (
    <section aria-labelledby={`videos-${page}`} className="container-page py-14 sm:py-16">
      <p className="eyebrow">Watch</p>
      <h2 id={`videos-${page}`} className="mt-2 text-3xl font-medium text-teal sm:text-4xl">Videos</h2>
      <ul className={`mt-8 grid gap-8 ${videos.length > 1 ? "md:grid-cols-2" : "max-w-3xl"}`}>
        {videos.map((v) => (
          <li key={v.id}>
            <VideoPlayer id={v.youtube_id} title={v.title} />
            <h3 className="mt-4 text-xl font-medium text-teal">{v.title}</h3>
            {v.description && <p className="mt-1 text-muted">{v.description}</p>}
            <WatchOnYouTube id={v.youtube_id} title={v.title} />
          </li>
        ))}
      </ul>
    </section>
  );
}
