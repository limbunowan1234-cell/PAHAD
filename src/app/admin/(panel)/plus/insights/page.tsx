import { redirect } from "next/navigation";
import { PlusTabs } from "@/components/admin/PlusTabs";
import { Card, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canModeratePlus } from "@/lib/plus/access";
import { ACCOUNT_TYPES, BRIEF_TYPES, HUB_KEYS, PLUS_HUBS, PLUS_REGIONS, PLUS_RULES, type BriefType, type PlusAccountType } from "@/lib/plus/config";
import { isLivePlus, requestTime } from "@/lib/plus/posts";
import { rupees } from "@/lib/plus/razorpay";

export const metadata = { title: "PAHAD+ insights" };

const DAY = 86_400_000;
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
function hours(ms: number) {
  if (!Number.isFinite(ms)) return "—";
  const h = ms / 3_600_000;
  return h < 1 ? `${Math.max(1, Math.round(h * 60))} min` : h < 48 ? `${h.toFixed(1)} h` : `${(h / 24).toFixed(1)} days`;
}
const median = (xs: number[]) => {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b), m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Labelled horizontal bars: one colour, the value written beside each bar. */
function Bars({ rows }: { rows: { label: string; value: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <ul className="space-y-2 text-sm">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[8rem_1fr_3rem] items-center gap-3">
          <span className="truncate text-muted">{r.label}</span>
          <span className="h-3 rounded-full bg-sand" aria-hidden><span className="block h-3 rounded-full bg-teal" style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <span className="text-right font-semibold tabular-nums text-ink">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-2xl bg-white p-4 ring-1 ring-line">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums text-ink">{value}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  );
}

export default async function PlusInsightsPage() {
  const user = await requireUser();
  if (!canModeratePlus(user) && user.role !== "sysadmin") redirect("/admin");
  const [users, posts, flags, passes, likes, saves, push, orders] = await Promise.all([
    db.all("plus_users"), db.all("plus_posts"), db.all("plus_flags"), db.all("plus_passes"), db.all("plus_likes"), db.all("plus_saves"), db.all("plus_push"), db.all("plus_orders"),
  ]);
  const at = requestTime();
  const since = (iso: string, days: number) => at - Date.parse(iso) < days * DAY;

  const live = posts.filter((p) => isLivePlus(p, at));
  const queue = posts.filter((p) => p.status === "unverified" && isLivePlus(p, at));
  const oldest = queue.reduce((m, p) => Math.max(m, at - Date.parse(p.created_at)), 0);
  const recentVerified = posts.filter((p) => p.verified_at && since(p.created_at, 30));
  const waits = recentVerified.map((p) => Date.parse(p.verified_at) - Date.parse(p.created_at)).filter((x) => x >= 0);
  const expiredUnverified = posts.filter((p) => p.status === "unverified" && at - Date.parse(p.created_at) > PLUS_RULES.unverifiedDays * DAY).length;
  const reportsPerPost = new Map<string, number>();
  for (const f of flags) reportsPerPost.set(f.post_id, (reportsPerPost.get(f.post_id) ?? 0) + 1);
  const topReported = [...reportsPerPost].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id, n]) => ({ p: posts.find((x) => x.id === id), n })).filter((x) => x.p);
  const topLiked = [...live].filter((p) => p.likes > 0).sort((a, b) => b.likes - a.likes).slice(0, 5);
  const issued = passes.filter((p) => p.status !== "cancelled");
  const checkedIn = issued.filter((p) => p.status === "checked_in");
  const paidOrders = orders.filter((o) => o.status === "paid");

  return (
    <>
      <PageHeader title="PAHAD+" description="How the PAHAD+ app is doing. Numbers are worked out live from the app's data." />
      <PlusTabs user={user} active="insights" />

      <h2 className="mb-3 font-display text-xl text-teal">People</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Accounts" value={users.length} note={`${users.filter((u) => since(u.created_at, 7)).length} new this week · ${users.filter((u) => since(u.created_at, 30)).length} this month`} />
        <Stat label="Email confirmed" value={pct(users.filter((u) => u.email_verified).length, users.length)} />
        <Stat label="PAHAD members linked" value={users.filter((u) => u.member_id).length} />
        <Stat label="Suspended" value={users.filter((u) => u.status === "suspended").length} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Account types"><Bars rows={(Object.keys(ACCOUNT_TYPES) as PlusAccountType[]).map((k) => ({ label: ACCOUNT_TYPES[k], value: users.filter((u) => u.account_type === k).length }))} /></Card>
        <Card title="Notifications"><p className="text-sm">{push.length} device{push.length === 1 ? "" : "s"} signed up · {new Set(push.map((s) => s.user_id)).size} people</p>
          <div className="mt-3"><Bars rows={PLUS_REGIONS.map((r) => ({ label: `Alerts: ${r}`, value: push.filter((s) => s.regions.split(",").includes(r)).length }))} /></div>
        </Card>
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl text-teal">Posts</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Live now" value={live.length} note={`${posts.filter((p) => since(p.created_at, 7)).length} posted this week`} />
        <Stat label="Waiting for verification" value={queue.length} note={queue.length ? `oldest waiting ${hours(oldest)}` : "queue is clear"} />
        <Stat label="Time to verify (median)" value={hours(median(waits))} note={`last 30 days · ${pct(waits.filter((w) => w <= DAY).length, waits.length)} within 24 h`} />
        <Stat label="Dropped unverified" value={expiredUnverified} note={`not verified within ${PLUS_RULES.unverifiedDays} days`} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card title="Live posts by hub"><Bars rows={HUB_KEYS.map((h) => ({ label: PLUS_HUBS[h].label, value: live.filter((p) => p.hub === h).length }))} /></Card>
        <Card title="Live posts by region"><Bars rows={PLUS_REGIONS.map((r) => ({ label: r, value: live.filter((p) => p.region === r).length }))} /></Card>
        <Card title="Live briefs by type"><Bars rows={(Object.keys(BRIEF_TYPES) as BriefType[]).filter((t) => t !== "policy").map((t) => ({ label: BRIEF_TYPES[t].label, value: live.filter((p) => p.brief_type === t).length }))} /></Card>
      </div>
      <div className="mt-4">
        <Card title="All posts by status"><Bars rows={[["Unverified", "unverified"], ["Verified", "verified"], ["Flag-Proof", "flag_proof"], ["On hold", "hold"], ["Rejected", "rejected"], ["Removed", "removed"]].map(([l, s]) => ({ label: l, value: posts.filter((p) => p.status === s).length }))} /></Card>
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl text-teal">Safety and engagement</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Reports" value={flags.length} note={`${flags.filter((f) => since(f.created_at, 7)).length} this week`} />
        <Stat label="On hold from reports" value={posts.filter((p) => p.status === "hold" && p.flags >= PLUS_RULES.flagsToHold).length} />
        <Stat label="Likes" value={likes.length} />
        <Stat label="Saves" value={saves.length} />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card title="Most reported">
          {topReported.length === 0 ? <p className="text-sm text-muted">No reports.</p> : (
            <ul className="space-y-1 text-sm">{topReported.map(({ p, n }) => <li key={p!.id}><a href={`/admin/plus?tab=${p!.status === "hold" ? "hold" : p!.status === "rejected" ? "rejected" : p!.status === "unverified" ? "queue" : "verified"}`} className="text-teal underline">{p!.title}</a> · {n} report{n === 1 ? "" : "s"} · {p!.status}</li>)}</ul>
          )}
        </Card>
        <Card title="Most liked (live)">
          {topLiked.length === 0 ? <p className="text-sm text-muted">No likes yet.</p> : (
            <ul className="space-y-1 text-sm">{topLiked.map((p) => <li key={p.id}><a href={`/plus/${p.id}`} target="_blank" className="text-teal underline">{p.title}</a> · {p.likes} ♥</li>)}</ul>
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-10 font-display text-xl text-teal">E-Passes</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Issued" value={issued.length} note={`${posts.filter((p) => p.pass_enabled).length} events with E-Passes`} />
        <Stat label="Checked in" value={checkedIn.length} note={`${pct(checkedIn.length, issued.length)} attendance`} />
        <Stat label="Paid E-Passes sold" value={paidOrders.length} note={rupees(paidOrders.reduce((s, o) => s + o.amount, 0))} />
        <Stat label="PAHAD fees" value={rupees(paidOrders.reduce((s, o) => s + o.fee, 0))} />
      </div>
    </>
  );
}
