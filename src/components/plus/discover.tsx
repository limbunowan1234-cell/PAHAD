"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Search, Shuffle, Volume2, VolumeX, X } from "lucide-react";

export type DiscoverItem = { id: string; href: string; title: string; region: string; hub: string; image: string; summary: string };
export type Spotlight = { youtubeId: string; title: string; text: string; href: string; external: boolean } | null;

function shuffled<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Search with live suggestions, a featured video playing silently, and a shuffled photo grid of posts. */
export function DiscoverExplorer({ items, spotlight }: { items: DiscoverItem[]; spotlight: Spotlight }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [order, setOrder] = useState(items);
  const [muted, setMuted] = useState(true);
  // Shuffle after the first paint so the server and browser render the same list first.
  useEffect(() => {
    const t = setTimeout(() => setOrder(shuffled(items)), 0);
    return () => clearTimeout(t);
  }, [items]);

  const needle = q.trim().toLowerCase();
  const matches = useMemo(
    () => (needle ? items.filter((i) => `${i.title} ${i.region} ${i.hub} ${i.summary}`.toLowerCase().includes(needle)) : []),
    [items, needle],
  );
  const grid = (needle ? matches : order).filter((i) => i.image);

  return (
    <div className="space-y-5">
      <form role="search" onSubmit={(e) => { e.preventDefault(); if (needle) router.push(`/plus?q=${encodeURIComponent(q.trim())}`); }} className="flex items-center gap-2">
        <Link href="/plus" aria-label="Back to the feed" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white"><ArrowLeft className="h-5 w-5" aria-hidden /></Link>
        <div className="relative flex-1">
          <label htmlFor="discover-q" className="sr-only">Search PAHAD+</label>
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="discover-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
            placeholder="Search events, Darjeeling, tea, roam…" className="field !rounded-2xl !py-3 !pl-10 !pr-9" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Clear" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"><X className="h-4 w-4" /></button>}
        </div>
      </form>

      {needle && (
        <div className="divide-y divide-line rounded-2xl border border-line bg-white p-1.5" role="list" aria-label="Suggestions">
          {matches.length === 0 ? <p className="p-3 text-xs text-muted">No matching posts.</p> : matches.slice(0, 6).map((m) => (
            <Link key={m.id} role="listitem" href={m.href} className="flex items-center justify-between gap-3 rounded-xl p-2.5 hover:bg-sand">
              <span className="min-w-0"><span className="block truncate text-xs font-extrabold">{m.title}</span><span className="text-[10px] text-muted">{m.region} • {m.hub}</span></span>
              <span className="shrink-0 text-xs font-extrabold text-teal">Open →</span>
            </Link>
          ))}
          {matches.length > 0 && <button type="button" onClick={() => router.push(`/plus?q=${encodeURIComponent(q.trim())}`)} className="w-full rounded-xl p-2.5 text-left text-xs font-extrabold text-teal hover:bg-sand">See all {matches.length} in the feed →</button>}
        </div>
      )}

      {spotlight && !needle && (
        <section aria-labelledby="spot">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="spot" className="text-xs font-extrabold uppercase tracking-wider text-teal">Video spotlight</h2>
            <button type="button" onClick={() => setMuted((m) => !m)} className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-extrabold">
              {muted ? <><VolumeX className="h-3.5 w-3.5" aria-hidden /> Unmute</> : <><Volume2 className="h-3.5 w-3.5" aria-hidden /> Sound on</>}
            </button>
          </div>
          <div className="relative aspect-video overflow-hidden rounded-3xl bg-black shadow-md">
            <iframe className="pointer-events-none h-full w-full scale-125" tabIndex={-1} aria-hidden title={spotlight.title}
              src={`https://www.youtube-nocookie.com/embed/${spotlight.youtubeId}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${spotlight.youtubeId}&controls=0&modestbranding=1&playsinline=1&rel=0`}
              allow="autoplay; encrypted-media" />
            <Link href={spotlight.href} target={spotlight.external ? "_blank" : undefined} className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/30 to-transparent p-4">
              <span className="mb-1 w-fit rounded-full bg-coral px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-sand">● Spotlight</span>
              <span className="font-display text-base font-bold leading-tight">{spotlight.title}</span>
              {spotlight.text && <span className="mt-1 line-clamp-2 text-xs text-ink/80">{spotlight.text}</span>}
            </Link>
          </div>
        </section>
      )}

      <section aria-labelledby="grid">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="grid" className="text-xs font-extrabold uppercase tracking-wider">{needle ? "Matching posts" : "Around the hills"}</h2>
          {!needle && <button type="button" onClick={() => setOrder(shuffled(items))} className="inline-flex items-center gap-1 text-xs font-extrabold text-teal"><Shuffle className="h-3.5 w-3.5" aria-hidden /> Shuffle</button>}
        </div>
        {grid.length === 0 ? <p className="text-xs text-muted">No photos yet.</p> : (
          <div className="grid grid-cols-2 gap-2.5">
            {grid.slice(0, 12).map((i) => (
              <Link key={i.id} href={i.href} className="relative aspect-square overflow-hidden rounded-2xl shadow-sm">
                <Image src={i.image} alt="" fill sizes="215px" className="object-cover" />
                <span className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/80 via-black/20 to-transparent p-3">
                  <span className="text-[10px] font-extrabold uppercase text-teal">{i.region}</span>
                  <span className="line-clamp-2 text-xs font-bold leading-snug">{i.title}</span>
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
