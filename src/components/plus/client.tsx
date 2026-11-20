"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";
import { Bell, BellOff, Bookmark, Camera, Compass, Flame, Home, Loader2, Mountain, Search, ShieldCheck, UserRound } from "lucide-react";
import type { ActionState } from "@/lib/admin-helpers";
import { keepValuesOnSubmit } from "@/lib/use-form-submit";
import { BRIEF_TYPES, PLUS_HUBS, PLUS_REGIONS, PLUS_RULES, ROAM_STAGES, USER_BRIEF_TYPES, type BriefType, type PlusHub } from "@/lib/plus/config";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------ app chrome: emblem, top bar, bottom bar
/** The PAHAD+ emblem: clay disc, ivory ridge and a pine peak (from the approved prototype). */
export function PlusEmblem({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="18" fill="#C86D51" />
      <path d="M5 29 L15 14 L22 23 L28 16 L36 29 Z" fill="#F4F1EA" />
      <path d="M12 29 L20 18 L29 29 Z" fill="#1D353A" />
    </svg>
  );
}

/** Slim top bar on every screen except the full-screen feed, which draws its own over the picture. */
export function PlusTopBar() {
  const pathname = usePathname();
  if (pathname === "/plus") return null;
  return <PlusTopBarView />;
}
export function PlusTopBarView() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-sand/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
      <div className="flex h-14 items-center justify-between px-4">
        <Link href="/plus" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-ink/25 bg-[#1D353A]"><PlusEmblem className="h-6 w-6" /></span>
          <span className="font-display text-lg font-bold tracking-tight">PAHAD+</span>
        </Link>
        <Link href="/plus/discover" aria-label="Search" className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 bg-white">
          <Search className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </header>
  );
}

type NavInfo = { unread: number; desk: boolean };

export function PlusNav(info: NavInfo) {
  return <PlusNavView pathname={usePathname()} {...info} />;
}

/** Bottom bar (design): Valley · Discover · + Post · Desk (PAHAD admins) · Profile. Also the prerendered fallback. */
export function PlusNavView({ pathname, unread, desk }: NavInfo & { pathname: string }) {
  const item = (href: string, label: string, Icon: typeof Home, active: boolean, badge = 0) => (
    <li>
      <Link href={href} aria-current={active ? "page" : undefined}
        className={cn("relative flex flex-col items-center gap-0.5 py-2 text-[11px]", active ? "font-extrabold text-ink" : "font-semibold text-muted hover:text-ink")}>
        <Icon className="h-5 w-5" aria-hidden />
        {label}
        {badge > 0 && <span className="absolute right-[18%] top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 text-[10px] font-extrabold text-sand" aria-label={`${badge} new`}>{badge > 9 ? "9+" : badge}</span>}
      </Link>
    </li>
  );
  const onPost = pathname.startsWith("/plus/new");
  return (
    <nav aria-label="PAHAD+" className="fixed bottom-0 left-1/2 z-40 w-full max-w-[430px] -translate-x-1/2 border-t border-ink/10 bg-[#141C1F]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <ul className={cn("grid items-center px-2", desk ? "grid-cols-5" : "grid-cols-4")}>
        {item("/plus", "Valley", Mountain, pathname === "/plus" || /^\/plus\/(?!new|me|discover|desk|signup|login|pass)/.test(pathname))}
        {item("/plus/discover", "Discover", Compass, pathname.startsWith("/plus/discover"))}
        <li className="flex justify-center">
          <Link href="/plus/new" aria-current={onPost ? "page" : undefined}
            className="inline-flex items-center gap-1 rounded-2xl bg-gradient-to-r from-coral to-[#d98b5c] px-4 py-2 text-sm font-extrabold text-sand shadow-lg transition active:scale-95">
            <span className="text-lg leading-none" aria-hidden>+</span> Post
          </Link>
        </li>
        {desk && item("/plus/desk", "Desk", ShieldCheck, pathname.startsWith("/plus/desk"))}
        {item("/plus/me", "Profile", UserRound, pathname.startsWith("/plus/me") || pathname.startsWith("/plus/pass") || pathname.startsWith("/plus/login") || pathname.startsWith("/plus/signup"), unread)}
      </ul>
    </nav>
  );
}

// ------------------------------------------------------------------ forms
export function PlusForm({
  action,
  children,
  submitLabel = "Save",
  className,
  resetOnSuccess = false,
  danger = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  resetOnSuccess?: boolean;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      if (resetOnSuccess) ref.current?.reset();
      router.refresh();
    }
  }, [state, resetOnSuccess, router]);
  return (
    <form ref={ref} method="post" onSubmit={keepValuesOnSubmit(formAction)} className={cn("space-y-4", className)}>
      {children}
      {state && (
        <p role={state.ok ? "status" : "alert"} className={cn("rounded-xl p-3 text-sm", state.ok ? "bg-sage-100 text-teal" : "bg-red-50 text-red-800")}>
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className={cn("btn w-full disabled:opacity-60 sm:w-auto", danger ? "bg-red-700 text-white hover:bg-red-800" : "btn-primary")}>
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {submitLabel}
      </button>
    </form>
  );
}

export function PlusButton({
  action,
  children,
  confirm,
  className,
}: {
  action: () => Promise<ActionState>;
  children: ReactNode;
  confirm?: string;
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionState>(null);
  const router = useRouter();
  return (
    <span className="inline-flex flex-col items-start">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          start(async () => {
            const res = await action();
            setMsg(res);
            router.refresh();
          });
        }}
        className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-teal ring-1 ring-line hover:bg-sand disabled:opacity-50", className)}
      >
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
        {children}
      </button>
      {msg && <span role={msg.ok ? "status" : "alert"} className={cn("mt-1 text-xs", msg.ok ? "text-teal" : "text-red-700")}>{msg.message}</span>}
    </span>
  );
}

// ------------------------------------------------------------------ post composer
function F({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export type ComposerDefaults = { phone: string; instagram: string; email: string; showContacts: boolean };

/** New Community Post (design): one form for every hub, with hub-specific extras appearing as needed. */
export function NewPostForm({
  action,
  initialHub,
  canSell = false,
  feePercent = 0,
  defaults = { phone: "", instagram: "", email: "", showContacts: true },
  canOfficial = false,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initialHub?: PlusHub;
  /** Approved paid organiser (and payments switched on): may set a price. */
  canSell?: boolean;
  feePercent?: number;
  defaults?: ComposerDefaults;
  /** PAHAD admin in Admin mode with approval rights: may publish a regulated circular. */
  canOfficial?: boolean;
}) {
  const [hub, setHub] = useState<PlusHub>(initialHub ?? "events");
  const [brief, setBrief] = useState<BriefType>("alert");
  const [pass, setPass] = useState(false);
  const contactOptional = hub === "briefs" && (brief === "alert" || brief === "tip");
  const sub: Record<PlusHub, string> = { events: "e.g. Folk Music, Workshop, Competition", roam: "e.g. Eco-Trail, Viewpoint, Heritage homestay", business: "e.g. Café, Cooperative, Handloom", briefs: "e.g. Road Advisory, Cold-Chain, Scholarship" };

  return (
    <PlusForm action={action} submitLabel="Publish now" className="[&>button[type=submit]]:w-full [&>button[type=submit]]:!bg-coral [&>button[type=submit]]:!text-sand">
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Hub category *">
          <select name="hub" value={hub} onChange={(e) => setHub(e.target.value as PlusHub)} className="field">
            {(Object.keys(PLUS_HUBS) as PlusHub[]).map((h) => <option key={h} value={h}>{PLUS_HUBS[h].label}</option>)}
          </select>
        </F>
        {hub === "briefs" ? (
          <F label="Type of brief *">
            <select name="brief_type" value={brief} onChange={(e) => setBrief(e.target.value as BriefType)} className="field">
              {USER_BRIEF_TYPES.map((t) => <option key={t} value={t}>{BRIEF_TYPES[t].emoji} {BRIEF_TYPES[t].label}</option>)}
            </select>
          </F>
        ) : (
          <F label="Subcategory"><input name="kind" maxLength={60} placeholder={sub[hub]} className="field" /></F>
        )}
      </div>
      {hub === "briefs" && <F label="Subcategory"><input name="kind" maxLength={60} placeholder={sub.briefs} className="field" /></F>}
      <F label="Title *"><input name="title" required minLength={4} maxLength={120} placeholder="Enter title…" className="field" /></F>
      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Region *">
          <select name="region" required defaultValue="" className="field">
            <option value="" disabled>Choose…</option>
            {PLUS_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </F>
        <F label="Locality" hint="Town, village or area."><input name="locality" maxLength={80} placeholder="e.g. Mirik, Lava, Sevoke Road" className="field" /></F>
      </div>
      <F label="YouTube or other video link (optional)" hint="A YouTube link or id, or a direct .mp4 / .webm link.">
        <input name="youtube" maxLength={600} placeholder="YouTube URL, ID, or direct video link (.mp4)" className="field" />
      </F>
      <div className="grid gap-3 sm:grid-cols-2">
        <F label="Public image URL (optional)" hint="https:// link. You can also change media within 24 hours."><input name="image_url" type="url" maxLength={500} placeholder="Paste any public image URL" className="field" /></F>
        <F label="…or upload a photo" hint="JPG, PNG or WebP, up to 4 MB."><input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="field" /></F>
      </div>
      <F label="Summary *" hint="Shown on the feed. Up to 280 characters."><textarea name="summary" required minLength={10} maxLength={280} rows={2} placeholder="Share what is happening…" className="field" /></F>
      <F label="Details"><textarea name="body" rows={4} maxLength={4000} className="field" /></F>
      <div className="grid gap-4 sm:grid-cols-2">
        <F label={hub === "events" ? "Starting date & time *" : "Starting date & time"}><input type="datetime-local" name="starts_at" required={hub === "events"} className="field" /></F>
        <F label="Ending date & time"><input type="datetime-local" name="ends_at" className="field" /></F>
      </div>
      <F label="External action link (website, social or form, optional)" hint="Shown once PAHAD verifies the post.">
        <input name="link" maxLength={500} placeholder="https://forms.gle/… or Instagram / website URL" className="field" />
      </F>

      {hub === "events" && (
        <fieldset className="space-y-3 rounded-2xl bg-sand p-4">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="pass_enabled" checked={pass} onChange={(e) => setPass(e.target.checked)} className="mt-1 h-4 w-4 accent-teal" />
            <span><strong>Offer E-Passes</strong> with a QR code. They open once PAHAD verifies the event; you check people in at the gate.</span>
          </label>
          {pass && (
            <div className="grid gap-3 sm:grid-cols-2">
              <F label="How many E-Passes?" hint="Leave empty for no limit."><input type="number" name="pass_capacity" min={0} max={100000} className="field" /></F>
              <F label="Who gets a pass?">
                <select name="pass_mode" defaultValue="" className="field">
                  <option value="">Instant: anyone who asks</option>
                  <option value="approval">Needs approval: I approve each one</option>
                </select>
              </F>
              {canSell && (
                <F label="Price per E-Pass (₹)" hint={`Leave empty for free. ₹10–₹50,000. Paid passes are issued on payment${feePercent ? `; PAHAD keeps ${feePercent}%` : ""}.`}>
                  <input type="number" name="price" min={10} max={50000} step="1" inputMode="numeric" className="field" />
                </F>
              )}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <F label="Venue"><input name="venue" maxLength={160} className="field" /></F>
            <F label="Organiser"><input name="organiser" maxLength={120} className="field" /></F>
          </div>
        </fieldset>
      )}
      {hub === "roam" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Stage *">
            <select name="stage" defaultValue="open" className="field">
              {Object.entries(ROAM_STAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </F>
          <F label="Best season"><input name="best_season" maxLength={80} placeholder="e.g. October to March" className="field" /></F>
          <F label="Map link" hint="Google Maps link. Shown once verified." className="sm:col-span-2"><input name="map_link" maxLength={500} className="field" /></F>
        </div>
      )}
      {hub === "business" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Opening hours"><input name="hours" maxLength={120} placeholder="e.g. 9am–7pm, closed Tuesday" className="field" /></F>
          <F label="Registration / licence number" hint="Optional. Shown once verified."><input name="reg_id" maxLength={40} placeholder="e.g. UDYAM-WB-…" className="field" /></F>
          <F label="Website / social page" hint="Shown once verified." className="sm:col-span-2"><input name="website" maxLength={500} className="field" /></F>
        </div>
      )}
      {hub === "briefs" && brief === "alert" && (
        <F label="Show this alert for" hint={`Alerts disappear on their own. Longest: ${PLUS_RULES.alertMaxDays} days.`}>
          <select name="alert_hours" defaultValue={String(PLUS_RULES.alertDefaultHours)} className="field">
            <option value="6">6 hours</option>
            <option value="12">12 hours</option>
            <option value="24">1 day</option>
            <option value="48">2 days</option>
            <option value="72">3 days</option>
            <option value={String(PLUS_RULES.alertMaxDays * 24)}>{PLUS_RULES.alertMaxDays} days</option>
          </select>
        </F>
      )}
      {hub === "briefs" && (brief === "opportunity" || brief === "job") && (
        <F label="Last date to apply *"><input type="date" name="deadline" required className="field" /></F>
      )}

      <fieldset className="space-y-3 rounded-2xl border border-line bg-[#11181B]/60 p-4">
        <div className="flex items-center justify-between gap-3">
          <legend className="text-xs font-extrabold uppercase tracking-wider text-sage">Collaboration contact details</legend>
          <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" name="show_contacts" defaultChecked={defaults.showContacts} className="h-4 w-4 accent-teal" /> Show publicly</label>
        </div>
        <p className="text-xs text-muted">Show publicly: people see these straight away. Otherwise they show once PAHAD verifies the post.</p>
        <F label={contactOptional ? "Contact / WhatsApp number" : "Contact / WhatsApp number (needed to post) *"}>
          <input name="contact_whatsapp" type="tel" required={!contactOptional} maxLength={30} defaultValue={defaults.phone} placeholder="+91 …" className="field" />
        </F>
        <div className="grid gap-3 sm:grid-cols-2">
          <F label="Instagram (optional)"><input name="contact_instagram" maxLength={60} defaultValue={defaults.instagram} placeholder="@yourpage" className="field" /></F>
          <F label="Email (optional)"><input name="contact_email" type="email" maxLength={160} defaultValue={defaults.email} className="field" /></F>
        </div>
        {(hub === "business" || hub === "roam") && <F label="Address"><input name="address" maxLength={240} className="field" /></F>}
      </fieldset>

      {canOfficial && (
        <label className="flex items-start gap-3 rounded-2xl border border-teal/40 bg-[#1D353A] p-4 text-sm">
          <span className="flex-1"><strong className="text-teal">📢 Publish as Regulated Admin Circular</strong><br /><span className="text-muted">Appears as PAHAD Official in For You and ⭐ PAHAD&apos;s picks, already Verified.</span></span>
          <input type="checkbox" name="official" className="mt-1 h-5 w-5 accent-teal" />
        </label>
      )}
    </PlusForm>
  );
}

// ------------------------------------------------------------------ likes and saves
type Toggle = (postId: string) => Promise<{ ok: boolean; message: string; on?: boolean; count?: number }>;

export function LikeSaveBar({
  postId, likes, liked, saved, signedIn, like, save, support, follow,
}: {
  postId: string; likes: number; liked: boolean; saved: boolean; signedIn: boolean; like: Toggle; save: Toggle;
  /** Optional: "Support" (vouch this is genuine) and following the poster. */
  support?: { count: number; on: boolean; action: Toggle };
  follow?: { authorId: string; on: boolean; action: Toggle };
}) {
  const [state, setState] = useState({ likes, liked, saved, supports: support?.count ?? 0, supported: support?.on ?? false, following: follow?.on ?? false });
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  const run = (kind: "like" | "save" | "support" | "follow") =>
    start(async () => {
      if (!signedIn) return setMsg({ like: "Sign in to like posts.", save: "Sign in to save posts.", support: "Sign in to support posts.", follow: "Sign in to follow accounts." }[kind]);
      const r = kind === "like" ? await like(postId) : kind === "save" ? await save(postId) : kind === "support" ? await support!.action(postId) : await follow!.action(follow!.authorId);
      if (!r.ok) return setMsg(r.message);
      setMsg(kind === "like" ? "" : r.message);
      setState((s) =>
        kind === "like" ? { ...s, liked: Boolean(r.on), likes: r.count ?? s.likes }
          : kind === "save" ? { ...s, saved: Boolean(r.on) }
            : kind === "support" ? { ...s, supported: Boolean(r.on), supports: r.count ?? s.supports }
              : { ...s, following: Boolean(r.on) });
    });
  const btn = (on: boolean) => cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1", on ? "bg-coral/20 text-coral-700 ring-coral" : "bg-white text-teal ring-line hover:bg-sand");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" disabled={pending} onClick={() => run("like")} aria-pressed={state.liked} className={btn(state.liked)}>
        <Flame className={cn("h-4 w-4", state.liked && "fill-current")} aria-hidden /> {state.liked ? "Liked" : "Like"}{state.likes > 0 && <span aria-label={`${state.likes} likes`}> · {state.likes}</span>}
      </button>
      {support && (
        <button type="button" disabled={pending} onClick={() => run("support")} aria-pressed={state.supported} className={btn(state.supported)}>
          <ShieldCheck className="h-4 w-4" aria-hidden /> {state.supported ? "Supported" : "Support"} ({state.supports})
        </button>
      )}
      <button type="button" disabled={pending} onClick={() => run("save")} aria-pressed={state.saved}
        className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold ring-1", state.saved ? "bg-sage-100 text-teal ring-teal" : "bg-white text-teal ring-line hover:bg-sand")}>
        <Bookmark className={cn("h-4 w-4", state.saved && "fill-current")} aria-hidden /> {state.saved ? "Saved" : "Save"}
      </button>
      {follow && (
        <button type="button" disabled={pending} onClick={() => run("follow")} aria-pressed={state.following}
          className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-extrabold", state.following ? "ring-1 ring-ink/40" : "bg-ink text-sand")}>
          {state.following ? "Following" : "+ Follow"}
        </button>
      )}
      {msg && <span role="status" className="text-xs text-muted">{msg}</span>}
    </div>
  );
}

// ------------------------------------------------------------------ push notifications
function keyBytes(base64: string) {
  const s = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

export function PushToggle({
  publicKey, regions, saveSub, removeSub,
}: {
  publicKey: string;
  regions: readonly string[];
  saveSub: (sub: PushSubscriptionJSON, regions: string[]) => Promise<ActionState>;
  removeSub: (endpoint: string) => Promise<ActionState>;
}) {
  const [support, setSupport] = useState<"checking" | "no" | "blocked" | "yes">("checking");
  const [sub, setSub] = useState<PushSubscription | null>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [msg, setMsg] = useState<ActionState>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setSupport("no");
      if (Notification.permission === "denied") return setSupport("blocked");
      try {
        const reg = await navigator.serviceWorker.register("/plus-sw.js", { scope: "/plus" });
        setSub(await reg.pushManager.getSubscription());
        setSupport("yes");
      } catch {
        setSupport("no");
      }
    })();
  }, []);

  if (!publicKey) return <p className="text-sm text-muted">Phone notifications aren&apos;t switched on for PAHAD+ yet.</p>;
  if (support === "checking") return <p className="text-sm text-muted">Checking this device…</p>;
  if (support === "no") return <p className="text-sm text-muted">This browser can&apos;t show notifications. Install the PAHAD+ app or use Chrome.</p>;
  if (support === "blocked") return <p className="text-sm text-muted">Notifications are blocked for PAHAD+ in this browser&apos;s settings. Allow them there, then come back.</p>;

  const turnOn = () => start(async () => {
    try {
      if ((await Notification.requestPermission()) !== "granted") return setMsg({ ok: false, message: "Notifications weren't allowed." });
      const reg = await navigator.serviceWorker.ready;
      const s = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
      const r = await saveSub(s.toJSON(), chosen);
      setMsg(r);
      if (r?.ok) setSub(s);
    } catch {
      setMsg({ ok: false, message: "Couldn't turn on notifications on this device." });
    }
  });
  const turnOff = () => start(async () => {
    if (!sub) return;
    const r = await removeSub(sub.endpoint);
    await sub.unsubscribe().catch(() => false);
    setSub(null);
    setMsg(r);
  });

  return (
    <div className="space-y-3 text-sm">
      <p className="text-muted">Get a notification when your post is verified, a reminder before events you have an E-Pass for, and verified alerts for the regions you choose.</p>
      <fieldset>
        <legend className="label">Alerts for</legend>
        <div className="flex flex-wrap gap-2">
          {regions.map((r) => (
            <label key={r} className="flex items-center gap-1.5 rounded-full px-3 py-1.5 ring-1 ring-line has-[:checked]:bg-sage-100 has-[:checked]:ring-teal">
              <input type="checkbox" name="alert_region" value={r} checked={chosen.includes(r)} onChange={(e) => setChosen((c) => (e.target.checked ? [...c, r] : c.filter((x) => x !== r)))} className="accent-teal" /> {r}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={pending} onClick={turnOn} className="btn btn-primary !px-4 !py-2 text-sm disabled:opacity-60">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Bell className="h-4 w-4" aria-hidden />} {sub ? "Save alert regions" : "Turn on notifications"}
        </button>
        {sub && (
          <button type="button" disabled={pending} onClick={turnOff} className="btn bg-white !px-4 !py-2 text-sm text-teal ring-1 ring-line">
            <BellOff className="h-4 w-4" aria-hidden /> Turn off on this device
          </button>
        )}
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={cn("text-sm", msg.ok ? "text-teal" : "text-red-700")}>{msg.message}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ gate check-in
type GateResult = { ok: boolean; message: string; name?: string; at?: string } | null;
const noSubscribe = () => () => {};
type Detector = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

export function GateScanner({ action }: { action: (prev: GateResult, fd: FormData) => Promise<GateResult> }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [scanning, setScanning] = useState(false);
  // Camera scanning needs the browser's QR reader (Chrome on Android); typing the code always works.
  const canScan = useSyncExternalStore(noSubscribe, () => "BarcodeDetector" in window && Boolean(navigator.mediaDevices?.getUserMedia), () => false);
  const video = useRef<HTMLVideoElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const last = useRef("");

  useEffect(() => {
    if (state) {
      router.refresh();
      if (input.current) input.current.value = "";
    }
  }, [state, router]);

  useEffect(() => {
    if (!scanning) return;
    let stream: MediaStream | null = null;
    let stop = false;
    const Ctor = (window as unknown as { BarcodeDetector: new (o: { formats: string[] }) => Detector }).BarcodeDetector;
    const detector = new Ctor({ formats: ["qr_code"] });
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (!video.current) return;
        video.current.srcObject = stream;
        await video.current.play();
        while (!stop) {
          const codes = await detector.detect(video.current).catch(() => []);
          const raw = codes[0]?.rawValue;
          if (raw && raw !== last.current && input.current && form.current) {
            last.current = raw;
            input.current.value = raw;
            form.current.requestSubmit();
            setTimeout(() => { last.current = ""; }, 4000);
          }
          await new Promise((r) => setTimeout(r, 350));
        }
      } catch {
        setScanning(false);
      }
    })();
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [scanning]);

  const time = state?.at ? new Date(state.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "";
  return (
    <div className="space-y-4">
      {state && (
        <div role={state.ok ? "status" : "alert"} className={cn("rounded-2xl p-5 text-center", state.ok ? "bg-green-600 text-white" : "bg-red-700 text-white")}>
          <p className="text-2xl font-bold">{state.ok ? "✓ " : "✕ "}{state.message}</p>
          {state.name && <p className="mt-1 text-lg">{state.name}{time && ` · ${state.ok ? "" : "at "}${time}`}</p>}
        </div>
      )}
      {canScan && (
        <div>
          {scanning ? (
            <div className="space-y-2">
              <video ref={video} playsInline muted className="aspect-square w-full rounded-2xl bg-black object-cover" />
              <button type="button" onClick={() => setScanning(false)} className="btn w-full bg-white text-teal ring-1 ring-line">Stop camera</button>
            </div>
          ) : (
            <button type="button" onClick={() => setScanning(true)} className="btn btn-primary w-full"><Camera className="h-5 w-5" aria-hidden /> Scan E-Pass QR</button>
          )}
        </div>
      )}
      <form ref={form} method="post" onSubmit={keepValuesOnSubmit(formAction)} className="flex gap-2">
        <label htmlFor="gate-code" className="sr-only">E-Pass code</label>
        <input ref={input} id="gate-code" name="code" required autoComplete="off" autoCapitalize="characters" placeholder="E-Pass code" className="field flex-1 font-mono uppercase" />
        <button type="submit" disabled={pending} className="btn btn-primary disabled:opacity-60">{pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : "Check in"}</button>
      </form>
    </div>
  );
}

// ------------------------------------------------------------------ paid E-Pass (Razorpay Checkout)
type CheckoutStart = { ok: false; message: string } | { ok: true; done?: string; key: string; orderId: string; amount: number; name: string; description: string; prefill: { name: string; email: string } };
type RazorpayCtor = new (o: Record<string, unknown>) => { open: () => void; on: (e: string, f: (r: { error?: { description?: string } }) => void) => void };

function loadCheckout(): Promise<RazorpayCtor | null> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(w.Razorpay ?? null);
    s.onerror = () => resolve(null);
    document.body.appendChild(s);
  });
}

export function BuyPassButton({
  postId, label, start, confirm,
}: {
  postId: string;
  label: string;
  start: (postId: string) => Promise<CheckoutStart>;
  confirm: (r: { orderId: string; paymentId: string; signature: string }) => Promise<{ ok: boolean; message: string; code?: string }>;
}) {
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState("");
  const router = useRouter();
  const buy = async () => {
    setPending(true);
    setMsg("");
    const s = await start(postId);
    if (!s.ok) { setPending(false); return setMsg(s.message); }
    if (s.done) return router.push(`/plus/pass/${s.done}`);
    const Razorpay = await loadCheckout();
    if (!Razorpay) { setPending(false); return setMsg("Couldn't open the payment window. Check your connection and try again."); }
    const rz = new Razorpay({
      key: s.key, order_id: s.orderId, amount: s.amount, currency: "INR", name: s.name, description: s.description, prefill: s.prefill,
      theme: { color: "#164d58" },
      modal: { ondismiss: () => setPending(false) },
      handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const done = await confirm({ orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature });
        if (done.ok && done.code) router.push(`/plus/pass/${done.code}?new=1`);
        else { setPending(false); setMsg(done.message); }
      },
    });
    rz.on("payment.failed", (r) => { setPending(false); setMsg(r.error?.description || "The payment didn't go through. No money was taken."); });
    rz.open();
  };
  return (
    <div>
      <button type="button" onClick={buy} disabled={pending} className="btn btn-primary !px-5 !py-2.5 disabled:opacity-60">
        {pending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />} {label}
      </button>
      {msg && <p role="alert" className="mt-2 text-sm text-red-700">{msg}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ small shared controls (design: ON/OFF pills, Share)
/** ON/OFF pill that saves straight away. */
export function PlusSwitch({ on, action, label }: { on: boolean; action: (on: boolean) => Promise<ActionState>; label: string }) {
  const [value, setValue] = useState(on);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" role="switch" aria-checked={value} aria-label={label} disabled={pending}
      onClick={() => start(async () => { const next = !value; setValue(next); const r = await action(next); if (!r?.ok) setValue(!next); router.refresh(); })}
      className={cn("min-w-[3.5rem] shrink-0 rounded-full px-3.5 py-1.5 text-xs font-extrabold transition disabled:opacity-60", value ? "bg-sage text-sand" : "bg-[#2b3a3f] text-ink/80")}>
      {value ? "ON" : "OFF"}
    </button>
  );
}

/** Share a link with the phone's share sheet, or copy it. */
export function ShareButton({ path, title, label = "Share", className }: { path: string; title: string; label?: string; className?: string }) {
  const [msg, setMsg] = useState("");
  return (
    <span className="inline-flex flex-col items-start">
      <button type="button" className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold ring-1 ring-ink/20", className)}
        onClick={async () => {
          const url = new URL(path, location.origin).toString();
          try {
            if (navigator.share) await navigator.share({ title, url });
            else { await navigator.clipboard.writeText(url); setMsg("Link copied."); }
          } catch { /* closed */ }
        }}>
        ↗ {label}
      </button>
      {msg && <span role="status" className="mt-1 text-[11px] text-muted">{msg}</span>}
    </span>
  );
}

/** Follow / Following on a public profile. */
export function FollowButton({ on, action, signedIn }: { on: boolean; action: () => Promise<{ ok: boolean; message: string; on?: boolean }>; signedIn: boolean }) {
  const [value, setValue] = useState(on);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  return (
    <span className="inline-flex flex-col items-end">
      <button type="button" aria-pressed={value} disabled={pending}
        onClick={() => {
          if (!signedIn) return setMsg("Sign in to follow accounts.");
          start(async () => { const r = await action(); if (r.ok) setValue(Boolean(r.on)); setMsg(r.ok ? "" : r.message); });
        }}
        className={cn("rounded-full px-4 py-2 text-xs font-extrabold disabled:opacity-60", value ? "bg-[#2b3a3f]" : "bg-coral text-sand")}>
        {value ? "Following" : "+ Follow"}
      </button>
      {msg && <span role="alert" className="mt-1 text-[11px] text-muted">{msg}</span>}
    </span>
  );
}

// ------------------------------------------------------------------ opening animation
const SPLASH_KEY = "pahad-plus-splash";
const noSub = () => () => {};
/**
 * Opening animation, once per app session. Server HTML includes it (so nothing flashes before it), and CSS fades it
 * out by itself; after hydration it is dropped straight away if it already played this session. Tap to skip.
 */
export function PlusSplash() {
  const seen = useSyncExternalStore(noSub, () => {
    try { return sessionStorage.getItem(SPLASH_KEY) === "1"; } catch { return true; }
  }, () => false);
  const [gone, setGone] = useState(false);
  useEffect(() => {
    if (seen) return;
    try { sessionStorage.setItem(SPLASH_KEY, "1"); } catch { /* private mode */ }
    const t = setTimeout(() => setGone(true), 2900);
    return () => clearTimeout(t);
  }, [seen]);
  if (seen || gone) return null;
  return (
    <div className="plus-splash fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-[#11181B]" onClick={() => setGone(true)} aria-hidden>
      <div className="relative flex h-44 w-44 items-center justify-center">
        <span className="plus-splash-glow absolute -inset-6 rounded-full bg-[radial-gradient(circle,rgba(233,132,94,0.6)_0%,rgba(233,132,94,0)_70%)]" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/plus-512.png" alt="" width={176} height={176} className="plus-splash-sun relative h-44 w-44" />
      </div>
      <svg className="plus-splash-ridge mt-2 w-[min(88vw,380px)]" viewBox="0 0 380 60" fill="none">
        <path d="M0 52 L48 30 L78 40 L122 10 L160 34 L196 20 L236 44 L276 16 L318 38 L346 28 L380 46" stroke="#F4F1EA" strokeOpacity=".55" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <p className="plus-splash-name mt-3 font-display text-5xl font-bold tracking-tight text-[#F4F1EA]">PAHAD<span className="text-[#E9845E]">+</span></p>
      <p className="plus-splash-tag mt-2 text-xs font-extrabold uppercase tracking-[0.25em] text-[#D9A75A]">Events · Places · Entertainment</p>
      <p className="plus-splash-tag absolute bottom-10 text-[11px] text-[#F4F1EA]/50">Tap to skip</p>
    </div>
  );
}
