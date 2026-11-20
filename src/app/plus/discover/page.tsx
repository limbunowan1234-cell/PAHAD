import Link from "next/link";
import { Suspense } from "react";
import { DiscoverExplorer, type DiscoverItem, type Spotlight } from "@/components/plus/discover";
import { InstallAppButton } from "@/components/site/InstallApp";
import { getPublishedVideos } from "@/lib/data";
import { BRIEF_TYPES, HUB_KEYS, PLUS_HUBS, PLUS_REGIONS, USER_BRIEF_TYPES } from "@/lib/plus/config";
import { plusFeed } from "@/lib/plus/posts";

export const metadata = { title: "Discover" };

/** Search, a featured video (a verified PAHAD+ post with a video, or PAHAD's latest film), and the photo grid. */
async function Explorer() {
  const [cards, videos] = await Promise.all([plusFeed({ tab: "community" }), getPublishedVideos()]);
  const items: DiscoverItem[] = cards.map((c) => ({
    id: c.id, href: c.href, title: c.title, region: c.region, summary: c.summary,
    hub: c.briefType ? BRIEF_TYPES[c.briefType].label : PLUS_HUBS[c.hub].label,
    image: c.image || (c.youtubeId ? `https://i.ytimg.com/vi/${c.youtubeId}/hqdefault.jpg` : ""),
  }));
  const withVideo = cards.find((c) => c.youtubeId && c.verified);
  const film = [...videos].sort((a, b) => a.sort - b.sort || b.created_at.localeCompare(a.created_at))[0];
  const spotlight: Spotlight = withVideo
    ? { youtubeId: withVideo.youtubeId, title: withVideo.title, text: withVideo.summary, href: withVideo.href, external: false }
    : film ? { youtubeId: film.youtube_id, title: film.title, text: film.description, href: `/films#film-${film.id}`, external: true } : null;
  return <DiscoverExplorer items={items} spotlight={spotlight} />;
}

export default function DiscoverPage() {
  return (
    <div className="space-y-7">
      <h1 className="sr-only">Discover</h1>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-white" role="status" aria-label="Loading" />}><Explorer /></Suspense>
      <section aria-labelledby="hubs">
        <h2 id="hubs" className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted">Hubs</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {HUB_KEYS.map((h) => (
            <Link key={h} href={`/plus?hub=${h}`} className="rounded-2xl bg-white p-3 ring-1 ring-line hover:ring-teal">
              <span className="text-2xl" aria-hidden>{PLUS_HUBS[h].emoji}</span>
              <span className="block font-display text-base font-bold">{PLUS_HUBS[h].label}</span>
              <span className="line-clamp-2 text-[11px] text-muted">{PLUS_HUBS[h].blurb}</span>
            </Link>
          ))}
        </div>
      </section>
      <section aria-labelledby="briefs">
        <h2 id="briefs" className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted">Briefs</h2>
        <div className="flex flex-wrap gap-2">
          {[...USER_BRIEF_TYPES, "policy" as const].map((t) => (
            <Link key={t} href={`/plus?hub=briefs&type=${t}`} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-line hover:ring-teal">{BRIEF_TYPES[t].emoji} {BRIEF_TYPES[t].label}</Link>
          ))}
        </div>
      </section>
      <section aria-labelledby="regions">
        <h2 id="regions" className="mb-2 text-xs font-extrabold uppercase tracking-wider text-muted">Regions</h2>
        <div className="grid grid-cols-2 gap-2.5">
          {PLUS_REGIONS.map((r) => <Link key={r} href={`/plus?region=${r}`} className="rounded-2xl bg-[#1D353A] p-3 text-center font-display text-base font-bold hover:bg-[#243f45]">{r}</Link>)}
        </div>
      </section>
      <section className="rounded-3xl bg-white p-4 text-sm ring-1 ring-line">
        <h2 className="font-display text-base font-bold">About PAHAD+</h2>
        <p className="mt-1 text-xs text-muted">A community app by <Link href="/" className="font-semibold text-teal underline">PAHAD</Link>. Anyone can post; PAHAD&apos;s verifiers check posts, so contact and booking details show only for genuine listings.</p>
        <InstallAppButton label="Install PAHAD+" className="btn btn-primary mt-3 !px-4 !py-2 text-xs" />
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <Link href="/plus/terms" className="underline">Terms &amp; guidelines</Link>
          <Link href="/privacy#pahad-plus" className="underline">Privacy</Link>
          <Link href="/plus/delete-account" className="underline">Delete account</Link>
        </p>
      </section>
    </div>
  );
}
