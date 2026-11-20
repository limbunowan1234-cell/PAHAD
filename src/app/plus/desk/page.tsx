import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { CloseLink, PlusButton, PlusForm, PlusSwitch } from "@/components/plus/client";
import { plusDate } from "@/components/plus/ui";
import { db } from "@/lib/db";
import { canApprovePublic, canGrantFlagProof, canModeratePlus, canVerifyPlusPost } from "@/lib/plus/access";
import { appAdmin } from "@/lib/plus/app-admin";
import { BRIEF_TYPES, PLUS_HUBS, PLUS_RULES, type BriefType, type PlusHub } from "@/lib/plus/config";
import { isOptimisable } from "@/lib/plus/media";
import { decidePass } from "@/lib/plus/pass-actions";
import { AUTHENTIC_SUPPORTS, isLivePlus, requestTime } from "@/lib/plus/posts";
import { deskModerate, setPlusSpotlight } from "@/lib/plus/profile-actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "Verified Desk", robots: { index: false } };

const STATUS: Record<string, { label: string; cls: string }> = {
  unverified: { label: "WAITING", cls: "bg-cream text-ink" },
  verified: { label: "ACTIVE", cls: "bg-sage-100 text-sage" },
  flag_proof: { label: "ACTIVE", cls: "bg-sage-100 text-sage" },
  hold: { label: "ON HOLD", cls: "bg-red-50 text-red-700" },
};

/**
 * Verified Desk (design): the trust rules, E-Pass approvals and the listings queue, inside the app. Works for the
 * dashboard account signed in on the device or a linked PAHAD+ account in Admin mode; permissions are that dashboard
 * account's, checked again on the server for every action.
 */
async function Desk({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, user] = await Promise.all([searchParams, appAdmin()]);
  if (!user || (!canModeratePlus(user) && user.role !== "sysadmin")) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center ring-1 ring-line">
        <h1 className="font-display text-xl font-bold">+ Verified Desk</h1>
        <p className="mt-1 text-sm text-muted">{user ? "Your PAHAD account isn't a PAHAD+ verifier. The President can switch it on." : "Sign in with your PAHAD dashboard account (not your PAHAD+ account) to verify posts, or link it in Profile and switch Admin mode on."}</p>
        {!user && <Link href="/admin/login?next=/plus/desk" className="btn btn-primary mt-4">Sign in to the dashboard</Link>}
      </div>
    );
  }
  const viewOnly = !canModeratePlus(user);
  const flagProof = canGrantFlagProof(user);
  const spotlights = canApprovePublic(user);
  const show = sp.show === "hold" ? "hold" : sp.show === "live" ? "live" : "queue";
  const at = requestTime();
  const all = (await db.all("plus_posts")).filter((p) => viewOnly || canVerifyPlusPost(user, p));
  const queue = all.filter((p) => p.status === "unverified" && isLivePlus(p, at)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const held = all.filter((p) => p.status === "hold").sort((a, b) => b.flags - a.flags);
  const live = all.filter((p) => (p.status === "verified" || p.status === "flag_proof") && isLivePlus(p, at)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const rows = show === "hold" ? held : show === "live" ? live : queue;

  // E-Pass governance: passes for live events this person may run the gate for.
  const events = new Map(all.filter((p) => p.hub === "events" && p.pass_enabled).map((p) => [p.id, p]));
  const passes = (await db.all("plus_passes")).filter((x) => events.has(x.post_id) && ["pending", "active"].includes(x.status))
    .sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1) || b.created_at.localeCompare(a.created_at)).slice(0, 30);
  const pendingCount = passes.filter((x) => x.status === "pending").length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-teal">Trust &amp; moderation</p>
          <h1 className="font-display text-2xl font-bold">+ Verified Desk</h1>
          <p className="text-xs text-muted">{user.name}{user.plus_region ? ` · verifies ${user.plus_region}` : ""}{viewOnly ? " · view only" : ""}</p>
        </div>
        <CloseLink />
      </div>
      <ul className="space-y-1.5 rounded-2xl bg-white p-4 text-[13px] leading-relaxed text-ink/85 ring-1 ring-line">
        <li>• <b>+ Verified</b> appears only when a PAHAD verifier checks the post. Booking and apply links unlock then.</li>
        <li>• <b>🛡️ Flag-Proof</b>, given by the President or verifiers he allows, protects a post from community flags.</li>
        <li>• <b>✓ Authentic</b> appears automatically once more than {AUTHENTIC_SUPPORTS} people tap Support, or when PAHAD knows the poster (member or approved organiser).</li>
        <li>• Other listings with <b>{PLUS_RULES.flagsToHold} or more flags</b> go <b>On Hold</b> automatically.</li>
      </ul>

      <section aria-labelledby="passes" className="rounded-2xl border border-teal/30 bg-[#1D353A] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-wider text-teal">E-Pass governance</p>
            <h2 id="passes" className="text-base font-extrabold">Issued &amp; pending E-Passes</h2>
          </div>
          <span className="shrink-0 rounded-full bg-[#11181B]/60 px-3 py-1 text-[11px] font-bold">{passes.length} total · {pendingCount} pending</span>
        </div>
        {passes.length === 0 ? <p className="mt-3 text-xs text-muted">No E-Passes yet.</p> : (
          <ul className="mt-3 space-y-2.5">
            {passes.map((x) => {
              const ev = events.get(x.post_id)!;
              return (
                <li key={x.id} className="rounded-xl bg-[#11181B]/70 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-muted">{x.code.slice(0, 5)}-{x.code.slice(5)} · {x.holder_name}</p>
                      <p className="truncate text-sm font-bold">{ev.title}</p>
                    </div>
                    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold", x.status === "pending" ? "bg-cream text-teal" : "bg-sage-100 text-sage")}>{x.status === "pending" ? "PENDING" : "APPROVED"}</span>
                  </div>
                  {!viewOnly && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {x.status === "pending" && <PlusButton action={decidePass.bind(null, x.code, "approve")} className="!bg-sage !text-sand !ring-0">✓ Approve</PlusButton>}
                      <Link href={`/plus/checkin/${ev.id}`} className="rounded-full px-3 py-1.5 text-sm font-semibold ring-1 ring-line">Gate Check-In</Link>
                      {!x.order_id && <PlusButton confirm={`Revoke ${x.holder_name}'s E-Pass?`} action={decidePass.bind(null, x.code, "revoke")} className="!text-coral-700">Revoke</PlusButton>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <nav className="grid grid-cols-3 rounded-full bg-white p-1 ring-1 ring-line" aria-label="Desk">
        {([["queue", `Waiting (${queue.length})`], ["hold", `On hold (${held.length})`], ["live", `Active (${live.length})`]] as const).map(([k, l]) => (
          <Link key={k} href={k === "queue" ? "/plus/desk" : `/plus/desk?show=${k}`} aria-current={show === k ? "page" : undefined}
            className={cn("rounded-full py-2 text-center text-xs font-bold", show === k ? "bg-teal text-sand" : "text-ink/80")}>{l}</Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-muted ring-1 ring-line">{show === "hold" ? "Nothing on hold." : show === "live" ? "No active listings." : "All caught up. 🎉"}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const hub = PLUS_HUBS[p.hub as PlusHub];
            const st = STATUS[p.status] ?? STATUS.unverified;
            const authentic = p.author_member || p.supports > AUTHENTIC_SUPPORTS || p.official;
            return (
              <li key={p.id} className="rounded-2xl bg-white p-4 ring-1 ring-line">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[11px] font-extrabold uppercase tracking-wide text-coral-700">{p.brief_type === "job" ? "Jobs" : p.brief_type ? BRIEF_TYPES[p.brief_type as BriefType]?.label : hub?.label} • {p.author_name}</p>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-extrabold", st.cls)}>{st.label}</span>
                </div>
                <div className="mt-1 flex gap-3">
                  {p.image && <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"><Image src={p.image} unoptimized={!isOptimisable(p.image)} alt="" fill sizes="56px" className="object-cover" /></div>}
                  <div className="min-w-0">
                    <Link href={`/plus/${p.id}`} className="text-[15px] font-bold leading-snug">{p.title}</Link>
                    <p className="text-[11px] text-muted">{p.region}{p.locality ? ` · ${p.locality}` : ""} · {plusDate(p.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-extrabold">
                  {p.status === "verified" || p.status === "flag_proof" ? <span className="rounded-full bg-teal px-2.5 py-1 text-sand">+ Verified ✓</span> : <span className="rounded-full bg-cream px-2.5 py-1">◷ Unverified</span>}
                  {p.status === "flag_proof" && <span className="rounded-full bg-teal/20 px-2.5 py-1 text-teal">🛡️ Flag-Proof</span>}
                  <span className={cn("rounded-full px-2.5 py-1", authentic ? "bg-sage-100 text-sage" : "bg-[#2b3a3f] text-muted")}>✓ Authentic ({p.supports})</span>
                  <span className="rounded-full bg-[#2b3a3f] px-2.5 py-1">{p.hub === "events" && p.pass_enabled ? `🎟️ Pass: ${p.pass_mode === "approval" ? "Needs approval" : "Instant"}` : "External Post • No E-Pass"}</span>
                  {p.official && <span className="rounded-full bg-teal/20 px-2.5 py-1 text-teal">PAHAD Official</span>}
                </div>
                {[p.venue, p.contact_whatsapp || p.contact_phone, p.address, p.reg_id, p.website, p.link].some(Boolean) && (
                  <p className="mt-2 text-[11px] text-muted">Details to check: {[p.venue, p.contact_whatsapp || p.contact_phone, p.address, p.reg_id && `ID ${p.reg_id}`, p.website, p.link].filter(Boolean).join(" · ")}</p>
                )}
                {p.reject_reason && <p className="mt-1 text-[11px] text-coral-700">Note: {p.reject_reason}</p>}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  {!viewOnly ? <Link href={`/plus/${p.id}/media`} className="rounded-full bg-sage px-3 py-1.5 text-xs font-extrabold text-sand">✎ {p.image || p.youtube_id || p.video_url ? "Change Media" : "Fill Media URL"}</Link> : <span />}
                  <span className="text-[11px] font-bold text-muted">Flags: {Math.min(p.flags, PLUS_RULES.flagsToHold)}/{PLUS_RULES.flagsToHold}</span>
                </div>
                {spotlights && (p.status === "verified" || p.status === "flag_proof") && (
                  <div className="mt-2 flex items-center justify-between gap-3 rounded-xl bg-sand px-3 py-2 text-xs font-bold">
                    <span>⭐ Executive Spotlight on Discover</span>
                    <PlusSwitch on={p.spotlight} label="Executive Spotlight" action={setPlusSpotlight.bind(null, p.id)} />
                  </div>
                )}
                {!viewOnly && (p.status !== "flag_proof" || flagProof) && (
                  <div className="mt-3">
                    <PlusForm action={deskModerate} submitLabel="Save decision" className="!space-y-2">
                      <input type="hidden" name="id" value={p.id} />
                      <div className="grid grid-cols-2 gap-2">
                        <select name="status" defaultValue={p.status === "unverified" || p.status === "hold" ? "verified" : p.status} aria-label="Decision" className="field !py-2 text-sm">
                          <option value="verified">+ Verify</option>
                          {flagProof && <option value="flag_proof">+ Verify &amp; Flag-Proof</option>}
                          <option value="hold">Hold</option>
                          <option value="rejected">Reject</option>
                          {p.status !== "unverified" && <option value="unverified">Back to Unverified</option>}
                        </select>
                        <input name="reason" maxLength={300} placeholder="Reason (to reject)" aria-label="Reason" className="field !py-2 text-sm" />
                      </div>
                    </PlusForm>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-center text-xs text-muted"><Link href="/admin/plus" className="underline">Open the full dashboard queue</Link></p>
    </div>
  );
}

export default function DeskPage({ searchParams }: PageProps<"/plus/desk">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-white" role="status" aria-label="Loading" />}>
      <Desk searchParams={searchParams} />
    </Suspense>
  );
}
