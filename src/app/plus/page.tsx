import Link from "next/link";
import { Suspense } from "react";
import { Search, X } from "lucide-react";
import { PlusEmblem } from "@/components/plus/client";
import { ReelsFeed, type Reel } from "@/components/plus/reels";
import { timing } from "@/components/plus/ui";
import { db } from "@/lib/db";
import { BRIEF_TYPES, HUB_KEYS, PLUS_HUBS, PLUS_REGIONS, type BriefType, type PlusHub } from "@/lib/plus/config";
import { toggleLike, toggleSave } from "@/lib/plus/post-actions";
import { plusFeed, requestTime, type PlusCard, type PlusFilters } from "@/lib/plus/posts";
import { getPlusUser } from "@/lib/plus/session";
import { cn } from "@/lib/utils";

export const metadata = { title: { absolute: "PAHAD+ | Events, places, business and briefs from the hills" }, alternates: { canonical: "/plus" } };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

function filtersFrom(sp: SP): PlusFilters {
  const hub = one(sp.hub) as PlusHub;
  const type = one(sp.type) as BriefType;
  const region = one(sp.region);
  return {
    tab: one(sp.tab) === "pahad" ? "pahad" : "foryou",
    hub: HUB_KEYS.includes(hub) ? hub : undefined,
    region: (PLUS_REGIONS as readonly string[]).includes(region) ? region : undefined,
    type: Object.hasOwn(BRIEF_TYPES, type) ? type : undefined,
    q: one(sp.q).slice(0, 80) || undefined,
  };
}

function hrefWith(f: PlusFilters, change: Partial<PlusFilters>) {
  const next = { ...f, ...change };
  if (next.hub !== "briefs") next.type = undefined;
  if (next.tab === "pahad") next.region = undefined;
  const q: Record<string, string> = {};
  if (next.tab === "pahad") q.tab = "pahad";
  if (next.hub) q.hub = next.hub;
  if (next.type) q.type = next.type;
  if (next.region) q.region = next.region;
  if (next.q) q.q = next.q;
  return { pathname: "/plus", query: q };
}

function toReel(c: PlusCard, at: number, liked: Set<string>, saved: Set<string>): Reel {
  return {
    id: c.id, href: c.href, userPost: c.source === "user",
    hubLabel: c.briefType ? BRIEF_TYPES[c.briefType].label : PLUS_HUBS[c.hub].label,
    emoji: c.briefType ? BRIEF_TYPES[c.briefType].emoji : PLUS_HUBS[c.hub].emoji,
    region: c.region, locality: c.locality, title: c.title, summary: c.summary, image: c.image, youtubeId: c.youtubeId,
    trust: c.source === "pahad" ? "pahad" : c.flagProof ? "flag_proof" : c.verified ? "verified" : "unverified",
    author: c.authorName, authorMember: c.authorMember, likes: c.likes, liked: liked.has(c.id), saved: saved.has(c.id),
    pass: c.passEnabled && c.verified ? (c.price > 0 ? `E-Pass ₹${c.price / 100}` : "Free E-Pass") : "",
    when: timing(c, at), alert: c.briefType === "alert",
  };
}

/** Header drawn over the picture: tabs (For You, PAHAD, regions), search, hub pills and Brief types. */
function ReelsHeader({ f }: { f: PlusFilters }) {
  const tab = (label: string, href: ReturnType<typeof hrefWith>, on: boolean) => (
    <Link href={href} scroll={false} aria-current={on ? "true" : undefined}
      className={cn("shrink-0 border-b-2 pb-1 drop-shadow", on ? "border-teal font-extrabold text-teal" : "border-transparent font-semibold text-ink/70")}>{label}</Link>
  );
  const pill = (label: string, href: ReturnType<typeof hrefWith>, on: boolean) => (
    <Link href={href} scroll={false} aria-current={on ? "true" : undefined}
      className={cn("shrink-0 rounded-full px-2.5 py-1 text-[11px]", on ? "bg-teal font-extrabold text-sand" : "border border-ink/15 bg-white/65 font-bold text-ink/85 backdrop-blur-md")}>{label}</Link>
  );
  return (
    <header className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-[#11181B]/85 via-[#11181B]/45 to-transparent px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.875rem)]">
      <div className="flex items-center justify-between gap-2">
        <Link href="/plus" className="flex shrink-0 items-center gap-1.5">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-ink/25 bg-[#1D353A] shadow"><PlusEmblem className="h-6 w-6" /></span>
          <span className="font-display text-base font-bold tracking-tight">PAHAD+</span>
        </Link>
        <nav aria-label="Feed" className="no-scrollbar flex items-center gap-3 overflow-x-auto px-1 text-xs">
          {tab("For You", hrefWith(f, { tab: "foryou", region: undefined }), f.tab === "foryou" && !f.region)}
          {tab("PAHAD", hrefWith(f, { tab: "pahad" }), f.tab === "pahad")}
          {PLUS_REGIONS.map((r) => <span key={r} className="contents">{tab(r, hrefWith(f, { tab: "foryou", region: r }), f.region === r)}</span>)}
        </nav>
        <Link href="/plus/discover" aria-label="Search" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ink/15 bg-[#1D353A]/70 backdrop-blur-md">
          <Search className="h-4 w-4" aria-hidden />
        </Link>
      </div>
      <nav aria-label="Hubs" className="no-scrollbar mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
        {pill("All hubs", hrefWith(f, { hub: undefined }), !f.hub)}
        {HUB_KEYS.map((h) => <span key={h} className="contents">{pill(`${PLUS_HUBS[h].emoji} ${PLUS_HUBS[h].label}`, hrefWith(f, { hub: h }), f.hub === h)}</span>)}
      </nav>
      {f.hub === "briefs" && (
        <nav aria-label="Brief types" className="no-scrollbar mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {pill("All briefs", hrefWith(f, { type: undefined }), !f.type)}
          {(Object.keys(BRIEF_TYPES) as BriefType[]).map((t) => <span key={t} className="contents">{pill(`${BRIEF_TYPES[t].emoji} ${BRIEF_TYPES[t].label}`, hrefWith(f, { type: t }), f.type === t)}</span>)}
        </nav>
      )}
      {f.q && (
        <Link href={hrefWith(f, { q: undefined })} className="mt-2 inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-[11px] font-extrabold text-sand">
          Results for “{f.q}” <X className="h-3.5 w-3.5" aria-label="Clear search" />
        </Link>
      )}
    </header>
  );
}

async function Feed({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = filtersFrom(sp);
  const viewer = await getPlusUser();
  const [blocks, likes, saves] = viewer
    ? await Promise.all([db.findBy("plus_blocks", "blocker_id", viewer.id), db.findBy("plus_likes", "user_id", viewer.id), db.findBy("plus_saves", "user_id", viewer.id)])
    : [[], [], []];
  const cards = await plusFeed(f, new Set(blocks.map((b) => b.blocked_id)));
  const at = requestTime();
  const liked = new Set(likes.map((l) => l.post_id)), saved = new Set(saves.map((s) => s.post_id));

  return (
    <>
      <ReelsHeader f={f} />
      {one(sp.deleted) === "1" && <p role="status" className="absolute inset-x-4 top-32 z-40 rounded-2xl bg-ink p-3 text-center text-xs font-bold text-sand">Your PAHAD+ account and its details have been deleted.</p>}
      {cards.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
          <p className="text-4xl" aria-hidden>🏔️</p>
          <h1 className="mt-3 font-display text-xl font-bold">{f.q ? "Nothing matches that search" : "Nothing here yet"}</h1>
          <p className="mt-1.5 text-xs text-muted">{f.q ? "Try another word, or clear the search." : `Be the first to share something${f.region ? ` from ${f.region}` : ""}.`}</p>
          <Link href="/plus/new" className="btn btn-primary mt-4 !px-5 !py-2.5 text-xs">+ Post on PAHAD+</Link>
        </div>
      ) : (
        <>
          <h1 className="sr-only">PAHAD+ feed</h1>
          <ReelsFeed reels={cards.map((c) => toReel(c, at, liked, saved))} signedIn={Boolean(viewer)} like={toggleLike} save={toggleSave} />
        </>
      )}
    </>
  );
}

export default function PlusHome({ searchParams }: PageProps<"/plus">) {
  return (
    <div className="fixed inset-y-0 left-1/2 z-10 w-full max-w-[430px] -translate-x-1/2 bg-sand">
      <Suspense fallback={<div className="h-full animate-pulse bg-white" role="status" aria-label="Loading" />}>
        <Feed searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
