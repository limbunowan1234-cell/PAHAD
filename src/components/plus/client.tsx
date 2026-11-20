"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Compass, Home, Loader2, PlusCircle, UserRound } from "lucide-react";
import type { ActionState } from "@/lib/admin-helpers";
import { keepValuesOnSubmit } from "@/lib/use-form-submit";
import { BRIEF_TYPES, PLUS_HUBS, PLUS_REGIONS, PLUS_RULES, ROAM_KINDS, ROAM_STAGES, USER_BRIEF_TYPES, type BriefType, type PlusHub } from "@/lib/plus/config";
import { cn } from "@/lib/utils";

// ------------------------------------------------------------------ bottom navigation (phone) / top links (desktop)
const TABS = [
  { href: "/plus", label: "Home", icon: Home, match: (p: string) => p === "/plus" || /^\/plus\/(?!new|me|discover|signup|login)/.test(p) },
  { href: "/plus/discover", label: "Discover", icon: Compass, match: (p: string) => p.startsWith("/plus/discover") },
  { href: "/plus/new", label: "Post", icon: PlusCircle, match: (p: string) => p.startsWith("/plus/new") },
  { href: "/plus/me", label: "Me", icon: UserRound, match: (p: string) => p.startsWith("/plus/me") || p.startsWith("/plus/login") || p.startsWith("/plus/signup") },
];

export function PlusNav({ variant }: { variant: "bottom" | "top" }) {
  return <PlusNavView variant={variant} pathname={usePathname()} />;
}

/** Also rendered without a path as the prerendered fallback (see the PAHAD+ layout). */
export function PlusNavView({ variant, pathname }: { variant: "bottom" | "top"; pathname: string }) {
  if (variant === "top") {
    return (
      <nav aria-label="PAHAD+" className="hidden items-center gap-1 md:flex">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href} aria-current={t.match(pathname) ? "page" : undefined}
            className={cn("rounded-full px-3 py-1.5 text-sm font-semibold", t.match(pathname) ? "bg-white text-teal" : "text-white/90 hover:bg-white/10")}>
            {t.label}
          </Link>
        ))}
      </nav>
    );
  }
  return (
    <nav aria-label="PAHAD+" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {TABS.map((t) => {
          const active = t.match(pathname);
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link href={t.href} aria-current={active ? "page" : undefined}
                className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-semibold", active ? "text-teal" : "text-muted")}>
                <Icon className={cn("h-6 w-6", t.href === "/plus/new" && "text-coral-700")} aria-hidden />
                {t.label}
              </Link>
            </li>
          );
        })}
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

const LOCKED_NOTE = "Shown only after PAHAD verifies your post.";

export function NewPostForm({
  action,
  initialHub,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>;
  initialHub?: PlusHub;
}) {
  const [hub, setHub] = useState<PlusHub>(initialHub ?? "events");
  const [brief, setBrief] = useState<BriefType>("alert");

  return (
    <PlusForm action={action} submitLabel="Post to PAHAD+">
      <fieldset>
        <legend className="label">Hub *</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(Object.keys(PLUS_HUBS) as PlusHub[]).map((h) => (
            <label key={h} className={cn("cursor-pointer rounded-2xl border p-3 text-sm", hub === h ? "border-teal bg-sage-100" : "border-line bg-white")}>
              <input type="radio" name="hub" value={h} checked={hub === h} onChange={() => setHub(h)} className="sr-only" />
              <span className="block text-xl" aria-hidden>{PLUS_HUBS[h].emoji}</span>
              <span className="font-semibold text-ink">{PLUS_HUBS[h].label}</span>
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">{PLUS_HUBS[hub].blurb}.</p>
      </fieldset>

      {hub === "briefs" && (
        <F label="Type of brief *">
          <select name="brief_type" value={brief} onChange={(e) => setBrief(e.target.value as BriefType)} className="field">
            {USER_BRIEF_TYPES.map((t) => <option key={t} value={t}>{BRIEF_TYPES[t].emoji} {BRIEF_TYPES[t].label}</option>)}
          </select>
        </F>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <F label="Region *">
          <select name="region" required defaultValue="" className="field">
            <option value="" disabled>Choose…</option>
            {PLUS_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </F>
        <F label="Locality" hint="Town, village or area, e.g. Mirik, Lava, Sevoke Road.">
          <input name="locality" maxLength={80} className="field" />
        </F>
      </div>

      <F label="Title *"><input name="title" required minLength={4} maxLength={120} className="field" /></F>
      <F label="Short summary *" hint="Shown to everyone straight away. Up to 280 characters.">
        <textarea name="summary" required minLength={10} maxLength={280} rows={2} className="field" />
      </F>
      <F label="Photo" hint="JPG, PNG or WebP, up to 4 MB.">
        <input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="field" />
      </F>

      {hub === "events" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Starts *"><input type="datetime-local" name="starts_at" required className="field" /></F>
          <F label="Ends"><input type="datetime-local" name="ends_at" className="field" /></F>
        </div>
      )}
      {hub === "roam" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Kind of place *">
            <select name="kind" required defaultValue="" className="field">
              <option value="" disabled>Choose…</option>
              {ROAM_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </F>
          <F label="Stage *">
            <select name="stage" required defaultValue="open" className="field">
              {Object.entries(ROAM_STAGES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </F>
          <F label="Best season"><input name="best_season" maxLength={80} placeholder="e.g. October to March" className="field" /></F>
        </div>
      )}
      {hub === "business" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <F label="Kind of business"><input name="kind" maxLength={60} placeholder="e.g. Café, Tea estate shop, Weavers' collective" className="field" /></F>
          <F label="Opening hours"><input name="hours" maxLength={120} placeholder="e.g. 9am–7pm, closed Tuesday" className="field" /></F>
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

      <F label={hub === "briefs" && brief === "alert" ? "Details" : "Full description"} hint={hub === "briefs" && brief === "alert" ? "Alerts are shown in full straight away." : LOCKED_NOTE}>
        <textarea name="body" rows={5} maxLength={4000} className="field" />
      </F>
      <F label="YouTube video (optional)"><input name="youtube" maxLength={600} placeholder="https://youtu.be/…" className="field" /></F>

      <fieldset className="space-y-4 rounded-2xl border border-dashed border-line p-4">
        <legend className="px-1 text-sm font-semibold text-teal">🔒 Contact and booking details</legend>
        <p className="text-xs text-muted">{LOCKED_NOTE} Until then people see the title, photo, place and summary.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {hub === "events" && <F label="Exact venue"><input name="venue" maxLength={160} className="field" /></F>}
          {hub === "events" && <F label="Organiser"><input name="organiser" maxLength={120} className="field" /></F>}
          {hub === "business" && <F label="Address" className="sm:col-span-2"><input name="address" maxLength={240} className="field" /></F>}
          {hub !== "briefs" && <F label="Phone"><input name="contact_phone" type="tel" maxLength={30} className="field" /></F>}
          {hub !== "briefs" && <F label="WhatsApp"><input name="contact_whatsapp" type="tel" maxLength={30} className="field" /></F>}
          {hub !== "briefs" && <F label="Email"><input name="contact_email" type="email" maxLength={160} className="field" /></F>}
          {(hub === "business" || hub === "roam") && <F label="Website / social page"><input name="website" maxLength={500} className="field" /></F>}
          {hub === "roam" && <F label="Map link" hint="Google Maps link to the place."><input name="map_link" maxLength={500} className="field" /></F>}
          <F label={hub === "events" ? "Registration / form link" : hub === "briefs" ? "Apply / source link" : "Booking link"}>
            <input name="link" maxLength={500} className="field" />
          </F>
        </div>
      </fieldset>
    </PlusForm>
  );
}
