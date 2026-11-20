import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { moderatePlusPost } from "@/app/admin/plus-actions";
import { PlusForm } from "@/components/plus/client";
import { plusDate } from "@/components/plus/ui";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canGrantFlagProof, canModeratePlus, canVerifyPlusPost } from "@/lib/plus/access";
import { BRIEF_TYPES, PLUS_HUBS, PLUS_RULES, type BriefType, type PlusHub } from "@/lib/plus/config";
import { isLivePlus, requestTime } from "@/lib/plus/posts";
import { cn } from "@/lib/utils";

export const metadata = { title: "Desk", robots: { index: false } };

/**
 * Verifier desk inside the app: the same queue and actions as Dashboard → PAHAD+, using the PAHAD dashboard sign-in
 * (a PAHAD+ account never gets here) and the same permission checks on the server.
 */
async function Desk({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, user] = await Promise.all([searchParams, getCurrentUser()]);
  if (!user || (!canModeratePlus(user) && user.role !== "sysadmin")) {
    return (
      <div className="rounded-3xl bg-white p-6 text-center ring-1 ring-line">
        <h1 className="font-display text-xl font-bold">President &amp; verifier desk</h1>
        <p className="mt-1 text-sm text-muted">{user ? "Your PAHAD account isn't a PAHAD+ verifier. The President can switch it on." : "Sign in with your PAHAD dashboard account (not your PAHAD+ account) to verify posts."}</p>
        {!user && <Link href="/admin/login?next=/plus/desk" className="btn btn-primary mt-4">Sign in to the dashboard</Link>}
      </div>
    );
  }
  const viewOnly = !canModeratePlus(user);
  const flagProof = canGrantFlagProof(user);
  const show = sp.show === "hold" ? "hold" : "queue";
  const at = requestTime();
  const all = (await db.all("plus_posts")).filter((p) => viewOnly || canVerifyPlusPost(user, p));
  const queue = all.filter((p) => p.status === "unverified" && isLivePlus(p, at)).sort((a, b) => a.created_at.localeCompare(b.created_at));
  const held = all.filter((p) => p.status === "hold").sort((a, b) => b.flags - a.flags);
  const rows = show === "hold" ? held : queue;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">President &amp; verifier desk</h1>
        <p className="text-xs text-muted">Signed in as {user.name}{user.plus_region ? ` · verifies ${user.plus_region}` : ""}{viewOnly ? " · view only" : ""}</p>
      </div>
      <div className="rounded-2xl bg-white p-3 text-[11px] leading-relaxed text-muted ring-1 ring-line">
        New posts go live straight away as <b className="text-ink">Unverified</b> with contact and booking details hidden. Verifying shows the details.
        {" "}{PLUS_RULES.flagsToHold} reports put a post on hold unless the President made it <b className="text-ink">Flag-Proof</b>.
      </div>
      <nav className="grid grid-cols-2 rounded-full bg-white p-1 ring-1 ring-line" aria-label="Desk">
        {([["queue", `Waiting (${queue.length})`], ["hold", `On hold (${held.length})`]] as const).map(([k, l]) => (
          <Link key={k} href={k === "queue" ? "/plus/desk" : "/plus/desk?show=hold"} aria-current={show === k ? "page" : undefined}
            className={cn("rounded-full py-2 text-center text-xs font-bold", show === k ? "bg-teal text-sand" : "text-ink/80")}>{l}</Link>
        ))}
      </nav>
      {rows.length === 0 ? (
        <p className="rounded-2xl bg-white p-6 text-center text-sm text-muted ring-1 ring-line">{show === "hold" ? "Nothing on hold." : "All caught up. 🎉"}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => {
            const hub = PLUS_HUBS[p.hub as PlusHub];
            return (
              <li key={p.id} className="rounded-2xl bg-white p-3.5 ring-1 ring-line">
                <div className="flex gap-3">
                  {p.image && <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl"><Image src={p.image} alt="" fill sizes="64px" className="object-cover" /></div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-extrabold uppercase text-muted">{p.region} • {p.brief_type ? BRIEF_TYPES[p.brief_type as BriefType]?.label : hub?.label}</p>
                    <Link href={`/plus/${p.id}`} className="block truncate text-sm font-bold">{p.title}</Link>
                    <p className="text-[11px] text-muted">By {p.author_name} · {plusDate(p.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{p.flags > 0 ? ` · ${p.flags} report${p.flags === 1 ? "" : "s"}` : ""}</p>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-xs text-ink/85">{p.summary}</p>
                {[p.venue, p.contact_phone, p.address, p.website, p.link].some(Boolean) && (
                  <p className="mt-1 text-[11px] text-muted">Details to check: {[p.venue, p.contact_phone, p.address, p.website, p.link].filter(Boolean).join(" · ")}</p>
                )}
                {p.reject_reason && <p className="mt-1 text-[11px] text-coral-700">Note: {p.reject_reason}</p>}
                {!viewOnly && (
                  <div className="mt-3">
                    <PlusForm action={moderatePlusPost} submitLabel="Save decision" className="!space-y-2">
                      <input type="hidden" name="id" value={p.id} />
                      <div className="grid grid-cols-2 gap-2">
                        <select name="status" defaultValue="verified" aria-label="Decision" className="field !py-2 text-sm">
                          <option value="verified">✓ Verify</option>
                          {flagProof && <option value="flag_proof">🛡️ Flag-Proof</option>}
                          <option value="hold">Hold</option>
                          <option value="rejected">Reject</option>
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
