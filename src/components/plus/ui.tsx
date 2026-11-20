import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Clock, Heart, Lock, MapPin, ShieldCheck, Ticket } from "lucide-react";
import { BRIEF_TYPES, PLUS_HUBS, type PlusHub } from "@/lib/plus/config";
import type { PlusCard } from "@/lib/plus/posts";
import { cn } from "@/lib/utils";
import { youTubeThumb } from "@/lib/youtube";

const IST: Intl.DateTimeFormatOptions = { timeZone: "Asia/Kolkata" };
export const plusDate = (v: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) => {
  if (!v) return "";
  const d = new Date(v.length === 10 ? `${v}T00:00:00+05:30` : v.length === 16 ? `${v}:00+05:30` : v);
  return Number.isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("en-IN", { ...IST, ...opts }).format(d);
};

function inWords(ms: number) {
  const h = Math.round(ms / 3_600_000);
  if (h < 1) return "less than an hour";
  if (h < 48) return `${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return `${d} days`;
}

/** "Expires in 5 hours", "Closes in 3 days", "Sat 12 Dec, 10:00". `at` is passed in so pages decide when "now" is. */
export function timing(c: PlusCard, at: number): string {
  if (c.validUntil) return `Expires in ${inWords(Date.parse(c.validUntil) - at)}`;
  if (c.deadline) {
    const left = Date.parse(`${c.deadline}T23:59:59+05:30`) - at;
    return left < 86_400_000 ? "Closes today" : `Closes in ${inWords(left)}`;
  }
  if (c.startsAt) return plusDate(c.startsAt, c.startsAt.length > 10 ? { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" } : { weekday: "short", day: "numeric", month: "short" });
  return "";
}

export function hubLabel(c: Pick<PlusCard, "hub" | "briefType">) {
  const hub = PLUS_HUBS[c.hub];
  return c.briefType ? `${BRIEF_TYPES[c.briefType].emoji} ${BRIEF_TYPES[c.briefType].label}` : `${hub.emoji} ${hub.label}`;
}

export function TrustBadge({ c, size = "sm" }: { c: Pick<PlusCard, "source" | "verified" | "flagProof">; size?: "sm" | "md" }) {
  const cls = cn("inline-flex items-center gap-1 rounded-full font-semibold", size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-3 py-1 text-xs");
  if (c.source === "pahad") return <span className={cn(cls, "bg-teal text-white")}><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> PAHAD</span>;
  if (c.flagProof) return <span className={cn(cls, "bg-teal text-white")}><ShieldCheck className="h-3.5 w-3.5" aria-hidden /> President Flag-Proof</span>;
  if (c.verified) return <span className={cn(cls, "bg-sage-100 text-teal")}><BadgeCheck className="h-3.5 w-3.5" aria-hidden /> Verified</span>;
  return <span className={cn(cls, "bg-cream text-teal-900")}><Clock className="h-3.5 w-3.5" aria-hidden /> Unverified</span>;
}

const HUB_BG: Record<PlusHub, string> = {
  events: "from-coral to-peach",
  roam: "from-teal-700 to-sage",
  business: "from-peach to-cream",
  briefs: "from-teal to-teal-700",
};

export function PlusCardView({ c, at }: { c: PlusCard; at: number }) {
  const when = timing(c, at);
  const alert = c.briefType === "alert";
  const img = c.image || (c.youtubeId ? youTubeThumb(c.youtubeId) : "");
  return (
    <article className={cn("group relative flex snap-start flex-col overflow-hidden rounded-[var(--radius-card)] border bg-white shadow-sm", alert ? "border-coral" : "border-line")}>
      <div className={cn("relative aspect-[16/10] bg-gradient-to-br", HUB_BG[c.hub])}>
        {img ? (
          <Image src={img} alt="" fill sizes="(min-width:1024px) 400px, (min-width:640px) 50vw, 100vw" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center text-5xl" aria-hidden>{c.briefType ? BRIEF_TYPES[c.briefType].emoji : PLUS_HUBS[c.hub].emoji}</span>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-white/95 px-2 py-0.5 text-[11px] font-semibold text-ink">{hubLabel(c)}</span>
          <TrustBadge c={c} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex items-center gap-1 text-xs text-muted">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> {[c.locality, c.region].filter(Boolean).join(", ")}
        </p>
        <h3 className="mt-1 font-display text-lg leading-snug text-teal">
          <Link href={c.href} className="after:absolute after:inset-0">{c.title}</Link>
        </h3>
        <p className="mt-1 line-clamp-3 text-sm text-ink/80">{c.summary}</p>
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-3 text-xs">
          {when && <span className={cn("font-semibold", alert ? "text-coral-700" : "text-teal-700")}>{when}</span>}
          {c.passEnabled && c.verified && <span className="inline-flex items-center gap-1 font-semibold text-teal"><Ticket className="h-3.5 w-3.5" aria-hidden /> {c.price > 0 ? `E-Pass ₹${c.price / 100}` : "Free E-Pass"}</span>}
          {c.likes > 0 && <span className="inline-flex items-center gap-1 text-muted"><Heart className="h-3.5 w-3.5" aria-hidden /> {c.likes}</span>}
          {c.authorMember && <span className="inline-flex items-center gap-1 text-teal"><BadgeCheck className="h-3.5 w-3.5" aria-hidden /> PAHAD member</span>}
        </div>
      </div>
    </article>
  );
}

const LOCKED: Record<PlusHub, string> = {
  events: "registration and forms, the exact venue and the organiser's contact",
  roam: "the map location and booking or contact details",
  business: "phone, WhatsApp, address, website and social links",
  briefs: "the apply or source link, and attachments",
};

export function LockedBox({ hub }: { hub: PlusHub }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-dashed border-teal-700/40 bg-sand p-4 text-sm">
      <Lock className="mt-0.5 h-5 w-5 shrink-0 text-teal" aria-hidden />
      <div>
        <p className="font-semibold text-teal">Full details unlock once PAHAD verifies this post</p>
        <p className="mt-1 text-muted">Hidden for now: {LOCKED[hub]}. This keeps PAHAD+ safe from fake listings and scams.</p>
      </div>
    </div>
  );
}
