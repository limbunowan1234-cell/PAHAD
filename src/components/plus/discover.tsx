"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Search, Shield, Shuffle, Star, Volume2, VolumeX, X } from "lucide-react";
import { isOptimisable } from "@/lib/plus/media";
import { cn } from "@/lib/utils";

export type DiscoverItem = {
  id: string; href: string; title: string; region: string; hub: string; hubKey: string; image: string; summary: string;
  author: string; verified: boolean; authentic: boolean; supports: number; saved: boolean; userPost: boolean;
};
export type SpotlightItem = { youtubeId: string; title: string; text: string; href: string; external: boolean; label: string; executive: boolean };
export type Creator = { id: string; name: string; hub: string; following: boolean };
type Toggle = (id: string) => Promise<{ ok: boolean; message: string; on?: boolean }>;

const HUBS: [string, string][] = [["", "All Hubs"], ["events", "Events"], ["roam", "Roam"], ["business", "Business"], ["jobs", "Jobs"], ["briefs", "Briefs"]];

function shuffled<T>(xs: T[]) {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");

/** Discover (design): search, hub pills and trust filters, the spotlight carousel, creators to follow, and the photo grid. */
export function DiscoverExplorer({ items, spotlights, creators, signedIn, follow, save }: {
  items: DiscoverItem[]; spotlights: SpotlightItem[]; creators: Creator[]; signedIn: boolean; follow: Toggle; save: Toggle;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hub, setHub] = useState("");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [authenticOnly, setAuthenticOnly] = useState(false);
  const [order, setOrder] = useState(items);
  const [slide, setSlide] = useState(0);
  const [muted, setMuted] = useState(true);
  const [following, setFollowing] = useState(() => Object.fromEntries(creators.map((c) => [c.id, c.following])));
  const [saved, setSaved] = useState(() => Object.fromEntries(items.map((i) => [i.id, i.saved])));
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();
  // Shuffle after the first paint so the server and the browser render the same list first.
  useEffect(() => {
    const t = setTimeout(() => setOrder(shuffled(items)), 0);
    return () => clearTimeout(t);
  }, [items]);
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(""), 2400);
    return () => clearTimeout(t);
  }, [msg]);

  const needle = q.trim().toLowerCase();
  const filtered = useMemo(() => order.filter((i) =>
    (!hub || i.hubKey === hub) && (!verifiedOnly || i.verified) && (!authenticOnly || i.authentic) &&
    (!needle || `${i.title} ${i.region} ${i.hub} ${i.summary} ${i.author}`.toLowerCase().includes(needle))), [order, hub, verifiedOnly, authenticOnly, needle]);
  const suggestions = needle ? filtered.slice(0, 6) : [];
  const spot = spotlights[slide % Math.max(spotlights.length, 1)];
  const go = (d: number) => setSlide((s) => (s + d + spotlights.length) % spotlights.length);

  const doFollow = (c: Creator) => {
    if (!signedIn) return setMsg("Sign in to follow accounts.");
    const was = following[c.id];
    setFollowing((f) => ({ ...f, [c.id]: !was }));
    start(async () => { const r = await follow(c.id); if (!r.ok) { setFollowing((f) => ({ ...f, [c.id]: was })); setMsg(r.message); } });
  };
  const doSave = (i: DiscoverItem) => {
    if (!signedIn) return setMsg("Sign in to save posts.");
    const was = saved[i.id];
    setSaved((s) => ({ ...s, [i.id]: !was }));
    start(async () => { const r = await save(i.id); setMsg(r.message); if (!r.ok) setSaved((s) => ({ ...s, [i.id]: was })); });
  };

  return (
    <div className="space-y-5">
      {msg && <p role="status" className="fixed left-1/2 top-20 z-50 w-[88%] max-w-[340px] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-center text-xs font-extrabold text-sand shadow-xl">{msg}</p>}
      <form role="search" onSubmit={(e) => { e.preventDefault(); if (needle) router.push(`/plus?q=${encodeURIComponent(q.trim())}`); }} className="flex items-center gap-2">
        <Link href="/plus" aria-label="Back to the feed" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white ring-1 ring-line"><ArrowLeft className="h-5 w-5" aria-hidden /></Link>
        <div className="relative flex-1">
          <label htmlFor="discover-q" className="sr-only">Search PAHAD+</label>
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
          <input id="discover-q" type="search" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off"
            placeholder="Search Darjeeling, Siliguri, Sikkim, Kalimpong…" className="field !rounded-full !py-3 !pl-10 !pr-9" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Clear" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted"><X className="h-4 w-4" /></button>}
        </div>
      </form>

      {needle && (
        <div className="divide-y divide-line rounded-2xl border border-line bg-white p-1.5" role="list" aria-label="Suggestions">
          {suggestions.length === 0 ? <p className="p-3 text-xs text-muted">No matching posts.</p> : suggestions.map((m) => (
            <Link key={m.id} role="listitem" href={m.href} className="flex items-center justify-between gap-3 rounded-xl p-2.5 hover:bg-sand">
              <span className="min-w-0"><span className="block truncate text-xs font-extrabold">{m.title}</span><span className="text-[10px] text-muted">{m.region} • {m.hub}</span></span>
              <span className="shrink-0 text-xs font-extrabold text-teal">Open →</span>
            </Link>
          ))}
          {filtered.length > 0 && <button type="button" onClick={() => router.push(`/plus?q=${encodeURIComponent(q.trim())}`)} className="w-full rounded-xl p-2.5 text-left text-xs font-extrabold text-teal hover:bg-sand">See all {filtered.length} in the feed →</button>}
        </div>
      )}

      <div className="space-y-2.5">
        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Hubs">
          {HUBS.map(([k, l]) => (
            <button key={k} type="button" aria-pressed={hub === k} onClick={() => setHub(k)}
              className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold", hub === k ? "bg-ink text-sand" : "bg-white ring-1 ring-line")}>{l}</button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" aria-pressed={verifiedOnly} onClick={() => setVerifiedOnly((v) => !v)} className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1", verifiedOnly ? "bg-teal text-sand ring-teal" : "text-teal ring-teal/40")}>+ Verified Only</button>
          <button type="button" aria-pressed={authenticOnly} onClick={() => setAuthenticOnly((v) => !v)} className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1", authenticOnly ? "bg-sage text-sand ring-sage" : "text-sage ring-sage/40")}>✓ Authentic (5+)</button>
          <span className="ml-auto text-xs font-semibold text-muted">{filtered.length} listing{filtered.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {spot && !needle && (
        <section aria-labelledby="spot">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="spot" className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-teal">Event Spotlight <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-ink ring-1 ring-line">{slide % spotlights.length + 1} / {spotlights.length}</span></h2>
            {spot.executive && <span className="rounded-full bg-teal px-3 py-1 text-[11px] font-extrabold text-sand">+ Executive Spotlight</span>}
          </div>
          <div className="relative aspect-video overflow-hidden rounded-3xl bg-black shadow-md">
            <iframe key={spot.youtubeId} className="pointer-events-none h-full w-full scale-125" tabIndex={-1} aria-hidden title={spot.title}
              src={`https://www.youtube-nocookie.com/embed/${spot.youtubeId}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${spot.youtubeId}&controls=0&modestbranding=1&playsinline=1&rel=0`}
              allow="autoplay; encrypted-media" />
            <Link href={spot.href} target={spot.external ? "_blank" : undefined} className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/30 to-transparent p-4">
              <span className="mb-1 w-fit rounded-full bg-teal px-2.5 py-0.5 text-[10px] font-extrabold uppercase text-sand">{spot.label}</span>
              <span className="text-base font-extrabold leading-tight">{spot.title}</span>
              {spot.text && <span className="mt-1 line-clamp-2 text-xs text-ink/80">{spot.text}</span>}
            </Link>
            <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Turn sound on" : "Mute"} className="absolute right-3 top-3 rounded-full bg-black/70 p-2">{muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}</button>
            {spotlights.length > 1 && (
              <>
                <button type="button" onClick={() => go(-1)} aria-label="Previous" className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2"><ChevronLeft className="h-4 w-4" /></button>
                <button type="button" onClick={() => go(1)} aria-label="Next" className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/70 p-2"><ChevronRight className="h-4 w-4" /></button>
              </>
            )}
          </div>
          {spotlights.length > 1 && (
            <div className="mt-2 flex justify-center gap-1.5" aria-hidden>
              {spotlights.map((_, i) => <span key={i} className={cn("h-1.5 rounded-full", i === slide % spotlights.length ? "w-6 bg-teal" : "w-1.5 bg-ink/30")} />)}
            </div>
          )}
        </section>
      )}

      {creators.length > 0 && !needle && (
        <section aria-labelledby="creators">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="creators" className="text-xs font-extrabold uppercase tracking-wider text-sage">Regional Creators &amp; Guilds</h2>
            <span className="text-[11px] text-muted">Quick Follow</span>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4">
            {creators.map((c) => (
              <div key={c.id} className="flex w-60 shrink-0 items-center gap-2.5 rounded-2xl bg-white p-3 ring-1 ring-line">
                <Link href={`/plus/u/${c.id}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coral text-xs font-extrabold text-sand">{initials(c.name)}</Link>
                <Link href={`/plus/u/${c.id}`} className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{c.name}</span><span className="text-[11px] text-muted">{c.hub}</span></Link>
                <button type="button" onClick={() => doFollow(c)} aria-pressed={following[c.id]} className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px] font-extrabold", following[c.id] ? "bg-[#2b3a3f]" : "bg-ink text-sand")}>{following[c.id] ? "Following" : "+ Follow"}</button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="grid">
        <div className="mb-2 flex items-center justify-between">
          <h2 id="grid" className="text-xs font-extrabold uppercase tracking-wider">{needle ? "Matching posts" : "Explore Visual Grid"}</h2>
          {!needle && <button type="button" onClick={() => setOrder(shuffled(items))} className="inline-flex items-center gap-1 text-xs font-extrabold text-teal"><Shuffle className="h-3.5 w-3.5" aria-hidden /> Shuffle</button>}
        </div>
        {filtered.length === 0 ? <p className="text-xs text-muted">Nothing matches these filters.</p> : (
          <div className="grid grid-cols-2 gap-2.5">
            {filtered.slice(0, 20).map((i) => (
              <article key={i.id} className="relative overflow-hidden rounded-2xl bg-white ring-1 ring-line">
                <div className="relative aspect-[4/3] bg-gradient-to-br from-[#1D353A] to-[#11181B]">
                  {i.image ? <Image src={i.image} unoptimized={!isOptimisable(i.image)} alt="" fill sizes="215px" className="object-cover" /> : <span className="absolute inset-0 flex items-center justify-center text-3xl" aria-hidden>🏔️</span>}
                  <div className="absolute bottom-1.5 left-1.5 flex gap-1 text-[9px] font-extrabold">
                    {i.verified && <span className="rounded bg-teal px-1.5 py-0.5 text-sand">+ Verified</span>}
                    {i.authentic && <span className="rounded bg-sage px-1.5 py-0.5 text-sand">✓ Authentic</span>}
                  </div>
                  {i.userPost && (
                    <button type="button" onClick={() => doSave(i)} aria-pressed={saved[i.id]} aria-label={saved[i.id] ? "Remove from Saved" : "Save"} className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-xl bg-black/70">
                      <Star className={cn("h-4 w-4 text-teal", saved[i.id] && "fill-teal")} aria-hidden />
                    </button>
                  )}
                </div>
                <Link href={i.href} className="block p-2.5">
                  <span className="flex items-center justify-between text-[10px] font-extrabold uppercase"><span className="text-coral-700">{i.hub}</span>{i.supports > 0 && <span className="inline-flex items-center gap-0.5 text-ink/80"><Shield className="h-3 w-3 text-coral" aria-hidden />{i.supports}</span>}</span>
                  <span className="mt-1 line-clamp-2 text-[13px] font-bold leading-snug">{i.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted">{i.author}</span>
                </Link>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
