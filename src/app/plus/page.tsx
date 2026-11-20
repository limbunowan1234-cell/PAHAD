import Link from "next/link";
import { Suspense } from "react";
import { Star, X } from "lucide-react";
import { PlusEmblem } from "@/components/plus/client";
import { ReelsFeed, type Reel } from "@/components/plus/reels";
import { timing } from "@/components/plus/ui";
import { db } from "@/lib/db";
import { BRIEF_TYPES, HUB_KEYS, PLUS_HUBS, PLUS_REGIONS, PLUS_RULES, type BriefType, type PlusHub } from "@/lib/plus/config";
import { reportPlusPost, toggleFollow, toggleLike, toggleSave, toggleSupport } from "@/lib/plus/post-actions";
import { plusFeed, requestTime, type PlusCard, type PlusFilters, type PlusTab } from "@/lib/plus/posts";
import { getPlusUser } from "@/lib/plus/session";
import { appAdmin } from "@/lib/plus/app-admin";
import { canModeratePlus } from "@/lib/plus/access";
import { cn } from "@/lib/utils";

export const metadata = { title: { absolute: "PAHAD+ | Events, places, business and briefs from the hills" }, alternates: { canonical: "/plus" } };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

const TABS: { key: PlusTab; label: string }[] = [
  { key: "community", label: "Community" },
  { key: "following", label: "Following" },
  { key: "foryou", label: "For You" },
];
const PILLS: { key: PlusHub | "jobs"; label: string }[] = [
  { key: "events", label: "Events" },
  { key: "roam", label: "Roam" },
  { key: "business", label: "Business" },
  { key: "jobs", label: "Jobs" },
  { key: "briefs", label: "Briefs" },
];

function filtersFrom(sp: SP): PlusFilters {
  const tab = one(sp.tab) as PlusTab;
  const hub = one(sp.hub) as PlusHub | "jobs";
  const type = one(sp.type) as BriefType;
  const region = one(sp.region);
  return {
    tab: ["following", "foryou", "pahad"].includes(tab) ? tab : "community",
    hub: hub === "jobs" || HUB_KEYS.includes(hub as PlusHub) ? hub : undefined,
    region: (PLUS_REGIONS as readonly string[]).includes(region) ? region : undefined,
    type: Object.hasOwn(BRIEF_TYPES, type) ? type : undefined,
    q: one(sp.q).slice(0, 80) || undefined,
  };
}

function hrefWith(f: PlusFilters, change: Partial<PlusFilters>) {
  const next = { ...f, ...change };
  if (next.hub !== "briefs") next.type = undefined;
  const q: Record<string, string> = {};
  if (next.tab !== "community") q.tab = next.tab;
  if (next.hub) q.hub = next.hub;
  if (next.type) q.type = next.type;
  if (next.region) q.region = next.region;
  if (next.q) q.q = next.q;
  return { pathname: "/plus", query: q };
}

/** The main button, per hub (design): links that leave PAHAD+ only once the post is verified. */
function ctaFor(c: PlusCard, pass: string): { label: string; href: string; external: boolean } {
  const l = c.locked;
  if (pass) return { label: `Get ${pass}`, href: `${c.href}#epass`, external: false };
  if (c.briefType === "job") return l?.link ? { label: "Apply for Role ↗", href: l.link, external: true } : { label: "Apply for Role", href: c.href, external: false };
  if (c.official || c.source === "pahad") return { label: "Read Official Directive", href: c.href, external: false };
  if (c.hub === "roam") return l?.mapLink ? { label: "Explore Trail ↗", href: l.mapLink, external: true } : { label: "Explore Trail", href: c.href, external: false };
  if (c.hub === "business") return { label: "Connect with Business", href: l ? `${c.href}#contact` : c.href, external: false };
  if (c.hub === "events") return { label: "Event details", href: c.href, external: false };
  return { label: "Read", href: c.href, external: false };
}

function toReel(c: PlusCard, at: number, liked: Set<string>, saved: Set<string>, supported: Set<string>, followed: Set<string>, viewerId: string, mediaEditable: (c: PlusCard) => boolean): Reel {
  const pass = c.passEnabled && c.verified ? (c.price > 0 ? `E-Pass ₹${c.price / 100}` : "Free E-Pass") : "";
  const cta = ctaFor(c, pass);
  return {
    id: c.id, href: c.href, userPost: c.source === "user",
    hubKey: c.briefType === "job" ? "jobs" : c.hub,
    hubLabel: c.briefType ? BRIEF_TYPES[c.briefType].label : PLUS_HUBS[c.hub].label,
    category: c.kind,
    emoji: c.briefType ? BRIEF_TYPES[c.briefType].emoji : PLUS_HUBS[c.hub].emoji,
    region: c.region, locality: c.locality, title: c.title, summary: c.summary, image: c.image, youtubeId: c.youtubeId,
    trust: c.source === "pahad" || c.official ? "pahad" : c.flagProof ? "flag_proof" : c.verified ? "verified" : "unverified",
    videoUrl: c.videoUrl, canEditMedia: c.source === "user" && mediaEditable(c), contactsUnverified: c.contactsUnverified,
    authentic: c.authentic,
    author: c.authorName, authorId: c.authorId, canFollow: c.source === "user" && Boolean(c.authorId) && c.authorId !== viewerId,
    following: followed.has(c.authorId), authorMember: c.authorMember,
    likes: c.likes, liked: liked.has(c.id), saved: saved.has(c.id), supports: c.supports, supported: supported.has(c.id),
    flags: c.flags,
    address: c.locked?.address || "", regId: c.locked?.regId || "",
    pass, cta: cta.label, ctaHref: cta.href, ctaExternal: cta.external,
    when: timing(c, at), alert: c.briefType === "alert",
  };
}

/** Header drawn over the picture: Community · Following · For You, PAHAD's picks (⭐), then the hub pills. */
function ReelsHeader({ f }: { f: PlusFilters }) {
  const pill = (label: string, href: ReturnType<typeof hrefWith>, on: boolean) => (
    <Link href={href} scroll={false} aria-current={on ? "true" : undefined}
      className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-xs", on ? "bg-ink font-extrabold text-sand" : "bg-[#162024]/70 font-bold text-ink/90 backdrop-blur-md")}>{label}</Link>
  );
  return (
    <header className="absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-[#11181B]/85 via-[#11181B]/45 to-transparent px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.875rem)]">
      <div className="flex items-center justify-between gap-2">
        <Link href="/plus" className="flex shrink-0 items-center gap-1.5">
          <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-coral shadow"><PlusEmblem className="h-9 w-9" /></span>
          <span className="font-display text-base font-bold tracking-tight">PAHAD+</span>
        </Link>
        <nav aria-label="Feed" className="no-scrollbar flex items-center gap-3 overflow-x-auto px-1 text-[13px]">
          {TABS.map((t) => (
            <Link key={t.key} href={hrefWith(f, { tab: t.key })} scroll={false} aria-current={f.tab === t.key ? "true" : undefined}
              className={cn("shrink-0 border-b-2 pb-1 drop-shadow", f.tab === t.key ? "border-teal font-extrabold text-ink" : "border-transparent font-semibold text-ink/65")}>{t.label}</Link>
          ))}
        </nav>
        <Link href={hrefWith(f, { tab: f.tab === "pahad" ? "community" : "pahad" })} aria-label="PAHAD's picks" aria-current={f.tab === "pahad" ? "true" : undefined}
          className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl backdrop-blur-md", f.tab === "pahad" ? "bg-teal text-sand" : "bg-[#1D353A]/80 text-teal")}>
          <Star className={cn("h-5 w-5", f.tab === "pahad" && "fill-current")} aria-hidden />
        </Link>
      </div>
      <nav aria-label="Hubs" className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto pb-0.5">
        {pill("All", hrefWith(f, { hub: undefined }), !f.hub)}
        {PILLS.map((h) => <span key={h.key} className="contents">{pill(h.label, hrefWith(f, { hub: h.key }), f.hub === h.key)}</span>)}
      </nav>
      {f.hub === "briefs" && (
        <nav aria-label="Brief types" className="no-scrollbar mt-1.5 flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {pill("All briefs", hrefWith(f, { type: undefined }), !f.type)}
          {(Object.keys(BRIEF_TYPES) as BriefType[]).filter((t) => t !== "job").map((t) => <span key={t} className="contents">{pill(`${BRIEF_TYPES[t].emoji} ${BRIEF_TYPES[t].label}`, hrefWith(f, { type: t }), f.type === t)}</span>)}
        </nav>
      )}
      {(f.q || f.region || f.tab === "pahad") && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {f.tab === "pahad" && <span className="rounded-full bg-teal px-3 py-1 text-[11px] font-extrabold text-sand">⭐ PAHAD&apos;s picks</span>}
          {f.region && <Link href={hrefWith(f, { region: undefined })} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-[11px] font-extrabold text-sand">{f.region} <X className="h-3.5 w-3.5" aria-label="Clear region" /></Link>}
          {f.q && <Link href={hrefWith(f, { q: undefined })} className="inline-flex items-center gap-1 rounded-full bg-ink px-3 py-1 text-[11px] font-extrabold text-sand">Results for “{f.q}” <X className="h-3.5 w-3.5" aria-label="Clear search" /></Link>}
        </div>
      )}
    </header>
  );
}

async function Feed({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = filtersFrom(sp);
  const viewer = await getPlusUser();
  const [blocks, likes, saves, follows, supports] = viewer
    ? await Promise.all([
        db.findBy("plus_blocks", "blocker_id", viewer.id), db.findBy("plus_likes", "user_id", viewer.id), db.findBy("plus_saves", "user_id", viewer.id),
        db.findBy("plus_follows", "follower_id", viewer.id), (await db.all("plus_supports")).filter((x) => x.user_id === viewer.id),
      ])
    : [[], [], [], [], []];
  const followed = new Set(follows.map((x) => x.followee_id));
  const cards = await plusFeed(f, new Set(blocks.map((b) => b.blocked_id)), followed);
  const at = requestTime();
  const liked = new Set(likes.map((l) => l.post_id)), saved = new Set(saves.map((s) => s.post_id)), supported = new Set(supports.map((x) => x.post_id));
  // Add Media: the poster within 24 hours, or a PAHAD verifier for that post (Admin mode).
  const admin = await appAdmin();
  const mediaEditable = (c: PlusCard) => (viewer?.id === c.authorId && at - Date.parse(c.createdAt) < 24 * 3_600_000) || Boolean(admin && canModeratePlus(admin));

  return (
    <>
      <ReelsHeader f={f} />
      {one(sp.deleted) === "1" && <p role="status" className="absolute inset-x-4 top-32 z-40 rounded-2xl bg-ink p-3 text-center text-xs font-bold text-sand">Your PAHAD+ account and its details have been deleted.</p>}
      {cards.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
          <p className="text-4xl" aria-hidden>🏔️</p>
          <h1 className="mt-3 font-display text-xl font-bold">{f.q ? "Nothing matches that search" : f.tab === "following" ? (viewer ? "No posts from people you follow yet" : "Sign in to follow accounts") : "Nothing here yet"}</h1>
          <p className="mt-1.5 text-xs text-muted">{f.q ? "Try another word, or clear the search." : f.tab === "following" ? "Tap + Follow on a post to see that account's posts here." : `Be the first to share something${f.region ? ` from ${f.region}` : ""}.`}</p>
          <Link href="/plus/new" className="btn btn-primary mt-4 !px-5 !py-2.5 text-xs">+ Post on PAHAD+</Link>
        </div>
      ) : (
        <>
          <h1 className="sr-only">PAHAD+ feed</h1>
          <ReelsFeed reels={cards.map((c) => toReel(c, at, liked, saved, supported, followed, viewer?.id ?? "", mediaEditable))} signedIn={Boolean(viewer)}
            actions={{ like: toggleLike, save: toggleSave, support: toggleSupport, follow: toggleFollow, report: reportPlusPost }} flagsToHold={PLUS_RULES.flagsToHold} />
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
