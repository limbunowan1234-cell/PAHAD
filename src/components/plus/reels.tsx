"use client";

import Image from "next/image";
import { isOptimisable } from "@/lib/plus/media";
import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { Flag, Flame, MapPin, Send, ShieldCheck, Volume2, VolumeX, X } from "lucide-react";
import type { ActionState } from "@/lib/admin-helpers";
import { cn } from "@/lib/utils";

/** What a slide needs: only public fields (the server already left out anything locked). */
export type Reel = {
  id: string;
  href: string;
  userPost: boolean;
  hubKey: string;
  hubLabel: string;
  category: string;
  emoji: string;
  region: string;
  locality: string;
  title: string;
  summary: string;
  image: string;
  youtubeId: string;
  trust: "pahad" | "flag_proof" | "verified" | "unverified";
  authentic: boolean;
  authorBadge: string;
  author: string;
  authorId: string;
  canFollow: boolean;
  following: boolean;
  authorMember: boolean;
  likes: number;
  liked: boolean;
  saved: boolean;
  supports: number;
  supported: boolean;
  flags: number;
  /** Only when verified (empty otherwise). */
  address: string;
  regId: string;
  pass: string;
  cta: string;
  ctaHref: string;
  ctaExternal: boolean;
  videoUrl: string;
  canEditMedia: boolean;
  contactsUnverified: boolean;
  when: string;
  alert: boolean;
};
type Toggle = (id: string) => Promise<{ ok: boolean; message: string; on?: boolean; count?: number }>;
type Actions = { like: Toggle; save: Toggle; support: Toggle; follow: Toggle; report: (prev: ActionState, fd: FormData) => Promise<ActionState> };

const TRUST: Record<Reel["trust"], { label: string; cls: string }> = {
  pahad: { label: "🛡️ PAHAD", cls: "bg-teal text-sand" },
  flag_proof: { label: "🛡️ Flag-Proof", cls: "bg-teal text-sand" },
  verified: { label: "+ Verified", cls: "bg-teal text-sand" },
  unverified: { label: "◷ Unverified", cls: "bg-cream text-ink" },
};
const REASONS = ["Wrong or misleading", "Spam or scam", "Offensive or unsafe", "Not in the hills region", "Other"];

const noSubscribe = () => () => {};
/** Autoplay only when the phone isn't on Data Saver and motion isn't reduced. */
function useAutoplay() {
  return useSyncExternalStore(noSubscribe, () => {
    const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    return !c?.saveData && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, () => false);
}
const bgOrVideo = (r: Reel) => Boolean(r.image || r.youtubeId || r.videoUrl);
const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]!.toUpperCase()).join("");
const short = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n));

function RailButton({ label, children, onClick, pressed, tone }: { label: string; children: React.ReactNode; onClick: () => void; pressed?: boolean; tone?: "flag" }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={pressed} aria-label={label} className="flex flex-col items-center transition active:scale-90">
      <span className={cn("flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1D353A]/90 shadow-lg backdrop-blur-md", tone === "flag" && "text-coral")}>{children}</span>
    </button>
  );
}

export function ReelsFeed({ reels, signedIn, actions, flagsToHold }: { reels: Reel[]; signedIn: boolean; actions: Actions; flagsToHold: number }) {
  const [state, setState] = useState(() => Object.fromEntries(reels.map((r) => [r.id, { liked: r.liked, likes: r.likes, supported: r.supported, supports: r.supports, flags: r.flags, reported: false }])));
  const [follow, setFollow] = useState(() => Object.fromEntries(reels.map((r) => [r.authorId, r.following])));
  const [active, setActive] = useState(0);
  const [muted, setMuted] = useState(true);
  const [burst, setBurst] = useState<string | null>(null);
  const [toast, setToast] = useState("");
  const [reporting, setReporting] = useState<Reel | null>(null);
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

  const needSignIn = (what: string) => (signedIn ? false : (setToast(`Sign in to ${what}.`), true));
  const counter = (r: Reel, kind: "like" | "support", only = false) => {
    if (!r.userPost || needSignIn(kind === "like" ? "like posts" : "support posts")) return;
    const cur = state[r.id];
    const on = kind === "like" ? cur.liked : cur.supported;
    if (only && on) return;
    const key = kind === "like" ? { on: "liked", n: "likes" } : { on: "supported", n: "supports" };
    setState((s) => ({ ...s, [r.id]: { ...cur, [key.on]: !on, [key.n]: (cur as Record<string, number | boolean>)[key.n] as number + (on ? -1 : 1) } }));
    start(async () => {
      const res = await actions[kind](r.id);
      if (!res.ok) setToast(res.message);
      else if (kind === "support" && res.on) setToast(res.message);
      setState((s) => ({ ...s, [r.id]: { ...s[r.id], [key.on]: res.ok ? Boolean(res.on) : on, [key.n]: res.count ?? (cur as Record<string, number | boolean>)[key.n] } }));
    });
  };
  const doFollow = (r: Reel) => {
    if (needSignIn("follow accounts")) return;
    const was = follow[r.authorId];
    setFollow((f) => ({ ...f, [r.authorId]: !was }));
    start(async () => {
      const res = await actions.follow(r.authorId);
      setToast(res.message);
      if (!res.ok) setFollow((f) => ({ ...f, [r.authorId]: was }));
    });
  };
  const share = async (r: Reel) => {
    const url = new URL(r.href, location.origin).toString();
    try {
      if (navigator.share) await navigator.share({ title: r.title, text: `${r.title} · PAHAD+`, url });
      else { await navigator.clipboard.writeText(url); setToast("Link copied."); }
    } catch { /* closed the share sheet */ }
  };
  const sendReport = (r: Reel, reason: string) => {
    const fd = new FormData();
    fd.set("post_id", r.id);
    fd.set("reason", reason);
    setReporting(null);
    start(async () => {
      const res = await actions.report(null, fd);
      setToast(res?.message ?? "Thank you.");
      if (res?.ok) setState((s) => ({ ...s, [r.id]: { ...s[r.id], flags: s[r.id].reported ? s[r.id].flags : s[r.id].flags + 1, reported: true } }));
    });
  };

  return (
    <div ref={feed} className="plus-reels h-full overflow-y-scroll" aria-label="PAHAD+ feed">
      {toast && <p role="status" className="fixed left-1/2 top-32 z-50 w-[88%] max-w-[340px] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-center text-xs font-extrabold text-sand shadow-xl">{toast}</p>}
      {reels.map((r, i) => {
        const s = state[r.id];
        const playing = autoplay && i === active && Boolean(r.youtubeId);
        const playingFile = autoplay && i === active && Boolean(r.videoUrl);
        const bg = r.image || (r.youtubeId ? `https://i.ytimg.com/vi/${r.youtubeId}/hqdefault.jpg` : "");
        return (
          <article key={r.id} data-index={i} className="plus-reel relative h-full w-full overflow-hidden bg-white"
            onDoubleClick={() => { if (r.userPost) { counter(r, "like", true); setBurst(r.id); setTimeout(() => setBurst(null), 800); } }}>
            {bg ? (
              <Image src={bg} unoptimized={!isOptimisable(bg)} alt="" fill priority={i === 0} sizes="430px" className="object-cover" />
            ) : r.videoUrl ? (
              <div className="absolute inset-0 bg-black" aria-hidden />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-[#1D353A] via-[#162024] to-[#11181B] px-10 pb-40 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-3xl shadow" aria-hidden>{r.emoji}</span>
                <p className="mt-3 text-sm font-extrabold text-ink/75">No Media Attached Yet</p>
                {r.canEditMedia && <p className="mt-1 text-xs text-muted">Tap Add Media on the right to attach a photo, YouTube or video link.</p>}
              </div>
            )}
            {playingFile && (
              <video className="absolute inset-0 h-full w-full object-cover" src={r.videoUrl} autoPlay loop playsInline muted={muted} aria-hidden />
            )}
            {playing && (
              <div className="absolute inset-0 overflow-hidden bg-black" aria-hidden>
                {bg && <Image src={bg} unoptimized={!isOptimisable(bg)} alt="" fill sizes="430px" className="object-cover opacity-50" />}
                <iframe className="pointer-events-none absolute -left-full -top-[10%] h-[120%] w-[300%]"
                  src={`https://www.youtube-nocookie.com/embed/${r.youtubeId}?autoplay=1&mute=${muted ? 1 : 0}&loop=1&playlist=${r.youtubeId}&controls=0&modestbranding=1&playsinline=1&rel=0`}
                  title={r.title} tabIndex={-1} allow="autoplay; encrypted-media" />
              </div>
            )}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#11181B] via-[#11181B]/30 to-[#11181B]/55" />
            {burst === r.id && <Flame className="plus-heart-burst pointer-events-none absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 fill-coral text-coral" aria-hidden />}

            {/* Right action rail: 🔥 likes · Support · Flag · Share (· Sound) */}
            <div className="absolute bottom-40 right-3 z-30 flex flex-col items-center gap-3 text-center">
              {r.userPost && (
                <div>
                  <RailButton label={s.liked ? "Unlike" : "Like"} pressed={s.liked} onClick={() => counter(r, "like")}><Flame className={cn("h-6 w-6", s.liked && "fill-coral text-coral")} aria-hidden /></RailButton>
                  <p className="mt-1 text-xs font-extrabold drop-shadow">{short(s.likes)}</p>
                </div>
              )}
              {r.userPost && (
                <div>
                  <RailButton label={s.supported ? "Remove support" : "Support: vouch this is genuine"} pressed={s.supported} onClick={() => counter(r, "support")}><ShieldCheck className={cn("h-6 w-6", s.supported && "fill-teal/30 text-teal")} aria-hidden /></RailButton>
                  <p className="mt-1 text-xs font-extrabold drop-shadow">Support ({short(s.supports)})</p>
                </div>
              )}
              {r.userPost && r.trust !== "flag_proof" && (
                <div>
                  <RailButton label="Flag: report this post" tone="flag" onClick={() => (needSignIn("report posts") ? null : setReporting(r))}><Flag className="h-6 w-6" aria-hidden /></RailButton>
                  <p className="mt-1 text-xs font-extrabold text-coral-700 drop-shadow">Flag ({Math.min(s.flags, flagsToHold)}/{flagsToHold})</p>
                </div>
              )}
              <div>
                <RailButton label="Share" onClick={() => share(r)}><Send className="h-6 w-6" aria-hidden /></RailButton>
                <p className="mt-1 text-xs font-extrabold drop-shadow">Share</p>
              </div>
              {r.canEditMedia && (
                <div>
                  <Link href={`${r.href}/media`} aria-label="Add or change media" className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal text-sand shadow-lg">✎</Link>
                  <p className="mt-1 text-[11px] font-extrabold text-teal drop-shadow">{bgOrVideo(r) ? "Edit Media" : "Add Media"}</p>
                </div>
              )}
              {(r.youtubeId || r.videoUrl) && autoplay && (
                <div>
                  <RailButton label={muted ? "Turn sound on" : "Mute"} onClick={() => setMuted((m) => !m)}>{muted ? <VolumeX className="h-5 w-5" aria-hidden /> : <Volume2 className="h-5 w-5" aria-hidden />}</RailButton>
                  <p className="mt-1 text-[11px] font-extrabold drop-shadow">{muted ? "Muted" : "Sound"}</p>
                </div>
              )}
            </div>

            {/* Caption */}
            <div className="absolute bottom-20 left-4 right-4 z-20">
              <div className="flex items-center gap-2.5 pr-20">
                <Link href={r.authorId ? `/plus/u/${r.authorId}` : r.href} aria-label={`${r.author}: profile`} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-coral text-base font-extrabold text-sand">{initials(r.author)}</Link>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-[15px] font-extrabold drop-shadow">{r.author}</p>
                    {r.canFollow && (
                      <button type="button" onClick={() => doFollow(r)} aria-pressed={follow[r.authorId]}
                        className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-extrabold", follow[r.authorId] ? "border border-ink/40 text-ink" : "bg-ink text-sand")}>
                        {follow[r.authorId] ? "Following" : "+ Follow"}
                      </button>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-extrabold", TRUST[r.trust].cls)}>{TRUST[r.trust].label}</span>
                    {r.authentic && r.trust !== "pahad" && <span className="rounded-md bg-sage px-2 py-0.5 text-[11px] font-extrabold text-sand">✓ Authentic</span>}
                    {r.authorBadge && <span className="rounded-md bg-[#D9A75A]/20 px-2 py-0.5 text-[11px] font-extrabold text-[#E9C27A] ring-1 ring-[#D9A75A]/50">{r.authorBadge}</span>}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5 pr-20">
                <span className={cn("rounded-full px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide text-sand", r.alert ? "bg-teal" : "bg-coral")}>{r.hubLabel}</span>
                {r.category && <span className="rounded-full bg-[#162024]/75 px-3 py-1 text-[11px] font-bold backdrop-blur-md">{r.category}</span>}
              </div>
              <p className="mt-2 pr-20 text-[13px] font-semibold text-ink/85 drop-shadow">
                {!bgOrVideo(r) && r.canEditMedia ? "Blank Media • Needs Admin Help" : <>{[r.locality, r.region].filter(Boolean).join(", ")}{r.trust !== "unverified" ? ` • ${r.trust === "pahad" ? "PAHAD Official" : r.hubKey === "business" ? "Verified Enterprise" : r.category || "Verified"}` : ""}</>}
              </p>
              {(r.address || r.regId) && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 pr-20 text-[12px] font-bold">
                  {r.address && <span className="inline-flex items-center gap-1 text-teal"><MapPin className="h-3.5 w-3.5 text-coral" aria-hidden />{r.address}</span>}
                  {r.regId && <span className="rounded-md border border-teal/40 bg-[#11181B]/70 px-2 py-0.5 font-mono text-[11px] text-teal">ID: {r.regId}</span>}
                </div>
              )}
              {r.contactsUnverified && <p className="mt-1.5 w-fit rounded-md bg-cream/90 px-2 py-0.5 text-[11px] font-bold">◷ Not yet verified by PAHAD: check before you pay</p>}
              <h2 className="mt-2 pr-20 text-[22px] font-extrabold leading-tight drop-shadow"><Link href={r.href}>{r.title}</Link></h2>
              <p className="mt-1 line-clamp-2 pr-20 text-[13px] leading-relaxed text-ink/80 drop-shadow">{r.summary}</p>
              {r.when && <p className={cn("mt-1 text-xs font-bold drop-shadow", r.alert ? "text-coral-700" : "text-teal")}>{r.when}</p>}
              <div className="mt-3 flex items-center gap-2">
                <a href={r.ctaHref} {...(r.ctaExternal ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}
                  className="rounded-full bg-ink px-6 py-3 text-sm font-extrabold text-sand shadow">{r.cta}</a>
                <Link href={r.href} className="rounded-full border border-ink/25 bg-[#11181B]/80 px-5 py-3 text-sm font-extrabold">Details</Link>
              </div>
            </div>
          </article>
        );
      })}

      {reporting && (
        <div role="dialog" aria-modal="true" aria-labelledby="report-title" className="fixed inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setReporting(null)}>
          <div className="w-full max-w-[430px] rounded-t-3xl bg-white p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 id="report-title" className="font-display text-lg font-bold">Flag this post</h2>
              <button type="button" onClick={() => setReporting(null)} aria-label="Close" className="rounded-full p-1 text-muted"><X className="h-5 w-5" /></button>
            </div>
            <p className="mt-1 text-xs text-muted">{flagsToHold} flags hide a post while PAHAD reviews it. You can flag each post once.</p>
            <ul className="mt-3 space-y-2">
              {REASONS.map((reason) => (
                <li key={reason}><button type="button" onClick={() => sendReport(reporting, reason)} className="w-full rounded-2xl bg-sand px-4 py-3 text-left text-sm font-bold ring-1 ring-line hover:ring-teal">{reason}</button></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
