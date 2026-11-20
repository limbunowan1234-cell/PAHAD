"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Bookmark, ChevronRight, Heart, Info, Ticket, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";

/** What a reel needs: only public fields (the server already left out anything locked). */
export type Reel = {
  id: string;
  href: string;
  userPost: boolean;
  hubLabel: string;
  emoji: string;
  region: string;
  locality: string;
  title: string;
  summary: string;
  image: string;
  youtubeId: string;
  trust: "pahad" | "flag_proof" | "verified" | "unverified";
  author: string;
  authorMember: boolean;
  likes: number;
  liked: boolean;
  saved: boolean;
  pass: string; // "", "Free E-Pass" or "E-Pass ₹150"
  when: string;
  alert: boolean;
};
type Toggle = (postId: string) => Promise<{ ok: boolean; message: string; on?: boolean; count?: number }>;

const TRUST: Record<Reel["trust"], { label: string; cls: string }> = {
  pahad: { label: "🛡️ PAHAD", cls: "bg-teal text-white" },
  flag_proof: { label: "🛡️ Flag-Proof", cls: "bg-teal text-white" },
  verified: { label: "✓ Verified", cls: "bg-[#1D353A]/80 text-ink backdrop-blur-md" },
  unverified: { label: "◷ Unverified", cls: "bg-cream/90 text-ink backdrop-blur-md" },
};

const noSubscribe = () => () => {};
/** Autoplay only when the phone isn't on Data Saver and motion isn't reduced. */
function useAutoplay() {
  return useSyncExternalStore(noSubscribe, () => {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return !c?.saveData && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, () => false);
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]!.toUpperCase()).join("");
}

export function ReelsFeed({ reels, signedIn, like, save }: { reels: Reel[]; signedIn: boolean; like: Toggle; save: Toggle }) {
  const [state, setState] = useState(() => Object.fromEntries(reels.map((r) => [r.id, { liked: r.liked, likes: r.likes, saved: r.saved }])));
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [burst, setBurst] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [, start] = useTransition();
  const autoplay = useAutoplay();
  const feed = useRef<HTMLDivElement>(null);

  // The slide on screen is the "active" one: only it may play video.
  useEffect(() => {
    const root = feed.current;
    if (!root) return;
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) setActive(Number((e.target as HTMLElement).dataset.index));
    }, { root, threshold: 0.6 });
    root.querySelectorAll("[data-index]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [reels.length]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const doLike = (r: Reel, only = false) => {
    if (!r.userPost) return;
    if (!signedIn) return setToast("Sign in to like posts.");
    const cur = state[r.id];
    if (only && cur.liked) return;
    setState((s) => ({ ...s, [r.id]: { ...cur, liked: !cur.liked, likes: cur.likes + (cur.liked ? -1 : 1) } }));
    start(async () => {
      const res = await like(r.id);
      if (!res.ok) setToast(res.message);
      setState((s) => ({ ...s, [r.id]: { ...s[r.id], liked: Boolean(res.on ?? cur.liked), likes: res.count ?? cur.likes } }));
    });
  };
  const doSave = (r: Reel) => {
    if (!signedIn) return setToast("Sign in to save posts.");
    const cur = state[r.id];
    setState((s) => ({ ...s, [r.id]: { ...cur, saved: !cur.saved } }));
    start(async () => {
      const res = await save(r.id);
      setToast(res.message);
      if (!res.ok) setState((s) => ({ ...s, [r.id]: cur }));
    });
  };

  return (
    <div ref={feed} className="plus-reels h-full overflow-y-scroll" aria-label="PAHAD+ feed">
      {toast && <p role="status" className="fixed left-1/2 top-28 z-50 w-[88%] max-w-[340px] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-center text-xs font-extrabold text-sand shadow-xl">{toast}</p>}
      {reels.map((r, i) => {
        const s = state[r.id];
        const playing = autoplay && i === active && Boolean(r.youtubeId);
        const bg = r.image || (r.youtubeId ? `https://i.ytimg.com/vi/${r.youtubeId}/hqdefault.jpg` : "");
        return (
          <article key={r.id} data-index={i} className="plus-reel relative h-full w-full overflow-hidden bg-white"
            onDoubleClick={() => { if (r.userPost) { doLike(r, true); setBurst(r.id); setTimeout(() => setBurst(null), 800); } }}>
            {bg ? (
              <Image src={bg} alt="" fill priority={i === 0} sizes="430px" className="object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-[#1D353A] via-[#162024] to-[#11181B] text-7xl" aria-hidden>{r.emoji}</div>
            )}
            {playing && (
              <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden>
                {bg && <Image src={bg} alt="" fill sizes="430px" className="object-cover opacity-50" />}
                <iframe
                  className="pointer-events-none absolute -left-full -top-[10%] h-[120%] w-[300%]"
                  src={`https://www.youtube-nocookie.com/embed/${r.youtubeId}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${r.youtubeId}&controls=0&modestbranding=1&playsinline=1&rel=0`}
                  title={r.title}
                  tabIndex={-1}
                  allow="autoplay; encrypted-media"
                />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#11181B]/95 via-[#11181B]/25 to-[#11181B]/55" />
            {burst === r.id && <Heart className="plus-heart-burst pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 fill-coral text-coral" aria-hidden />}

            {/* Right action rail */}
            <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-4">
              <Link href={r.href} aria-label={`Open ${r.title}`} className="relative mb-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-ink bg-[#1D353A] text-xs font-extrabold shadow-lg">{initials(r.author)}</span>
                <span className="absolute -bottom-1.5 left-1/2 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-coral text-xs font-black text-sand shadow">+</span>
              </Link>
              {r.userPost && (
                <button type="button" onClick={() => doLike(r)} aria-pressed={s.liked} aria-label={s.liked ? "Unlike" : "Like"} className="flex flex-col items-center transition active:scale-90">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#162024]/60 backdrop-blur-md"><Heart className={cn("h-6 w-6", s.liked && "fill-coral text-coral")} aria-hidden /></span>
                  <span className="mt-0.5 text-[11px] font-bold drop-shadow">{s.likes}</span>
                </button>
              )}
              <Link href={r.href} className="flex flex-col items-center transition active:scale-90">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#162024]/60 backdrop-blur-md"><Info className="h-5 w-5" aria-hidden /></span>
                <span className="mt-0.5 text-[11px] font-bold drop-shadow">Open</span>
              </Link>
              {r.pass ? (
                <Link href={`${r.href}#epass`} className="flex flex-col items-center transition active:scale-90">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#162024]/60 backdrop-blur-md"><Ticket className="h-5 w-5" aria-hidden /></span>
                  <span className="mt-0.5 text-[11px] font-bold drop-shadow">Pass</span>
                </Link>
              ) : r.userPost ? (
                <button type="button" onClick={() => doSave(r)} aria-pressed={s.saved} aria-label={s.saved ? "Remove from Saved" : "Save"} className="flex flex-col items-center transition active:scale-90">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#162024]/60 backdrop-blur-md"><Bookmark className={cn("h-5 w-5", s.saved && "fill-teal text-teal")} aria-hidden /></span>
                  <span className="mt-0.5 text-[11px] font-bold drop-shadow">{s.saved ? "Saved" : "Save"}</span>
                </button>
              ) : null}
              {r.youtubeId && autoplay && (
                <button type="button" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Turn sound on" : "Mute"} className="flex flex-col items-center transition active:scale-90">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#162024]/60 backdrop-blur-md">{muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}</span>
                  <span className="mt-0.5 text-[10px] font-bold drop-shadow">{muted ? "Muted" : "Sound"}</span>
                </button>
              )}
            </div>

            {/* Caption */}
            <div className="absolute bottom-20 left-4 right-20 z-20">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-sand", r.alert ? "bg-teal" : "bg-coral")}>{r.region} • {r.hubLabel}</span>
                <span className={cn("rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase", TRUST[r.trust].cls)}>{TRUST[r.trust].label}</span>
              </div>
              <p className="text-xs font-extrabold drop-shadow">
                @{r.author.toLowerCase().replace(/[^a-z0-9]+/g, "")}{r.authorMember && <span className="ml-1 rounded-full bg-sage-100 px-1.5 py-px text-[10px] text-teal">PAHAD member</span>}
                {r.locality && <span className="text-teal"> • {r.locality}</span>}
              </p>
              <h2 className="mt-1 font-display text-xl font-bold leading-snug drop-shadow"><Link href={r.href}>{r.title}</Link></h2>
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-ink/85 drop-shadow">{r.summary}</p>
              <div className="mt-3 flex items-center gap-2">
                <Link href={r.href} className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-ink px-3.5 py-1.5 text-[11px] font-extrabold text-sand shadow">
                  {r.pass ? "Open & get E-Pass" : "Open"} <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
                {r.when && <span className={cn("truncate text-[11px] font-bold drop-shadow", r.alert ? "text-coral-700" : "text-ink/85")}>{r.when}</span>}
                {!r.when && r.pass && <span className="truncate text-[11px] font-bold text-teal drop-shadow">{r.pass}</span>}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
