import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { PlusButton, PlusForm, PlusSwitch, PushToggle, ShareButton } from "@/components/plus/client";
import { hubLabel, plusDate } from "@/components/plus/ui";
import { deletePlusAccount, requestMemberLink, resendVerification, signOutPlus, unlinkMember, updatePlusProfile } from "@/lib/plus/account-actions";
import { removePushSubscription, savePushSubscription } from "@/lib/plus/push-actions";
import { applyAsOrganiser } from "@/lib/plus/pay-actions";
import { eventMoney, getFeePercent } from "@/lib/plus/payments";
import { paymentsConfigured, rupees } from "@/lib/plus/razorpay";
import { vapidPublicKey } from "@/lib/plus/push";
import { ACCOUNT_TYPES, PLUS_REGIONS, PLUS_RULES, plusAccountId, type PlusAccountType } from "@/lib/plus/config";
import { deleteOwnPlusPost, toggleSave, unblockPlusUser } from "@/lib/plus/post-actions";
import {
  blockFromPicker, linkAdminAccess, markPlusNotificationsRead, setPlusAccountType, setPlusPreference, unlinkAdminAccess, updateCollabContacts,
} from "@/lib/plus/profile-actions";
import { canApprovePublic, canGrantFlagProof, canModeratePlus } from "@/lib/plus/access";
import { isLivePlus, toCard, requestTime } from "@/lib/plus/posts";
import { qrSvg } from "@/lib/plus/passes";
import { getPlusUser } from "@/lib/plus/session";
import { getCurrentUser } from "@/lib/auth/session";
import { roleLabel } from "@/lib/permissions";
import { db } from "@/lib/db";
import { publicUser } from "@/lib/plus/app-admin";
import { site } from "@/lib/site";
import type { PublicUser } from "@/lib/types";
import type { PlusViewer as PlusUser } from "@/lib/plus/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "Profile & E-Passes", robots: { index: false } };

const STATUS: Record<string, { label: string; cls: string }> = {
  unverified: { label: "Unverified: live with limited details", cls: "bg-cream text-teal-900" },
  verified: { label: "Verified", cls: "bg-sage-100 text-teal" },
  flag_proof: { label: "President Flag-Proof", cls: "bg-teal text-white" },
  hold: { label: "On hold: PAHAD is reviewing it", cls: "bg-red-50 text-red-800" },
  rejected: { label: "Not approved", cls: "bg-red-50 text-red-800" },
  removed: { label: "Removed", cls: "bg-sand text-muted" },
};
const PASS_LABEL: Record<string, string> = { pending: "Waiting for approval", active: "Ready", checked_in: "Checked in", revoked: "Revoked" };

function Card({ id, title, kicker, right, children, className }: { id?: string; title: string; kicker?: string; right?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className={cn("rounded-3xl bg-white p-4 ring-1 ring-line", className)}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          {kicker && <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">{kicker}</p>}
          <h2 id={id ? `${id}-h` : undefined} className="text-base font-extrabold">{title}</h2>
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

function SwitchRow({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0"><p className="text-sm font-bold">{label}</p>{hint && <p className="text-xs text-muted">{hint}</p>}</div>
      {children}
    </div>
  );
}

function SignedOut() {
  return (
    <div className="rounded-3xl bg-white p-6 text-center ring-1 ring-line">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Member account</p>
      <h1 className="text-2xl font-extrabold">Profile &amp; E-Passes</h1>
      <p className="mt-1 text-sm text-muted">Sign in to post, keep E-Passes and manage your posts.</p>
      <div className="mt-4 flex justify-center gap-2">
        <Link href="/plus/login?next=/plus/me" className="btn btn-primary">Sign in</Link>
        <Link href="/plus/signup" className="btn bg-white ring-1 ring-line">Create account</Link>
      </div>
      <p className="mt-4 text-xs text-muted"><Link href="/plus/help" className="underline">Help center</Link> · <Link href="/plus/terms" className="underline">Terms</Link></p>
    </div>
  );
}

async function Account({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, viewer, dashboard] = await Promise.all([searchParams, getPlusUser(), getCurrentUser()]);
  if (!viewer) return <SignedOut />;
  const tab = sp.tab === "settings" ? "settings" : "overview";
  const linked = viewer.admin_user_id ? await db.get("users", viewer.admin_user_id) : null;
  const admin: PublicUser | null = linked && linked.active ? publicUser(linked) : null;
  return (
    <div className="space-y-4">
      {sp.welcome === "1" && (
        <p role="status" className="rounded-2xl bg-sage-100 p-4 text-sm text-teal">Welcome to PAHAD+! We sent a link to <strong>{viewer.email}</strong>. Confirm your email to start posting.</p>
      )}
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Member account</p>
          <h1 className="text-2xl font-extrabold leading-tight">Profile &amp; E-Passes</h1>
        </div>
        <ShareButton path={`/plus/u/${viewer.id}`} title={`${viewer.name} on PAHAD+`} label="Share Account" />
      </header>
      <nav aria-label="Profile sections" className="grid grid-cols-2 gap-1 rounded-full bg-white p-1 ring-1 ring-line">
        {([["overview", "Profile Overview"], ["settings", "Settings, Privacy & QR"]] as const).map(([k, l]) => (
          <Link key={k} href={k === "overview" ? "/plus/me" : "/plus/me?tab=settings"} aria-current={tab === k ? "page" : undefined}
            className={cn("rounded-full px-2 py-2 text-center text-xs font-extrabold", tab === k ? "bg-ink text-sand" : "text-ink/70")}>{l}</Link>
        ))}
      </nav>
      {!viewer.email_verified && (
        <div className="rounded-2xl bg-cream p-4 text-sm text-teal-900">
          <p><strong>Email not confirmed yet.</strong> You need to confirm it before you can post.</p>
          <div className="mt-2"><PlusButton action={resendVerification}>Resend confirmation link</PlusButton></div>
        </div>
      )}
      {tab === "overview" ? <Overview viewer={viewer} admin={admin} dashboard={dashboard} /> : <Settings viewer={viewer} admin={admin} />}
    </div>
  );
}

async function Overview({ viewer, admin, dashboard }: { viewer: PlusUser; admin: PublicUser | null; dashboard: PublicUser | null }) {
  const at = requestTime();
  const [posts, myPasses, mySaves, notes, member] = await Promise.all([
    db.findBy("plus_posts", "author_id", viewer.id),
    db.findBy("plus_passes", "user_id", viewer.id),
    db.findBy("plus_saves", "user_id", viewer.id),
    db.findBy("plus_notifications", "user_id", viewer.id),
    viewer.member_id ? db.get("members", viewer.member_id) : null,
  ]);
  const mine = posts.filter((p) => p.status !== "removed").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const supports = mine.reduce((n, p) => n + p.supports, 0), likes = mine.reduce((n, p) => n + p.likes, 0);
  const passRows = (await Promise.all(myPasses.filter((p) => p.status !== "cancelled").map(async (p) => ({ pass: p, post: await db.get("plus_posts", p.post_id) }))))
    .filter((r): r is { pass: typeof r.pass; post: NonNullable<typeof r.post> } => Boolean(r.post))
    .sort((a, b) => a.post.starts_at.localeCompare(b.post.starts_at));
  const savedPosts = (await Promise.all(mySaves.map((s) => db.get("plus_posts", s.post_id)))).filter((p): p is NonNullable<typeof p> => Boolean(p && isLivePlus(p, at)));
  const seller = viewer.account_type !== "individual";
  const [organiser, feePercent] = seller ? await Promise.all([db.get("plus_organisers", viewer.id), getFeePercent()]) : [null, 0];
  const sales = organiser ? await Promise.all(posts.filter((p) => p.price > 0).map(async (p) => ({ post: p, money: await eventMoney(p.id) }))) : [];
  const recent = [...notes].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8);
  const unread = notes.filter((n) => !n.read).length;
  const latest = mine[0];
  const adminOn = Boolean(admin && viewer.admin_mode);

  return (
    <>
      <section className="rounded-3xl bg-gradient-to-br from-[#1D353A] to-[#11181B] p-4 ring-1 ring-line">
        <div className="flex items-center gap-3">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-coral text-lg font-extrabold text-sand">
            {viewer.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-lg font-extrabold">{viewer.name}</p>
            <p className="text-xs text-ink/70">ID: {plusAccountId(viewer)}{adminOn && admin ? ` · ADMIN-${admin.id.slice(-4).toUpperCase()}` : ""}</p>
            <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-extrabold">
              <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-line">{ACCOUNT_TYPES[viewer.account_type as PlusAccountType]}</span>
              {viewer.member_id && <span className="rounded-full bg-sage px-2 py-0.5 text-sand">PAHAD member</span>}
              {adminOn && <span className="rounded-full bg-teal px-2 py-0.5 text-sand">Admin</span>}
            </div>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {([["Posts", mine.length], ["Total support", supports], ["Total likes", likes]] as const).map(([l, n]) => (
            <div key={l} className="rounded-2xl bg-black/30 p-2.5"><dd className="text-xl font-extrabold">{n}</dd><dt className="text-[10px] font-bold uppercase text-ink/70">{l}</dt></div>
          ))}
        </dl>
      </section>

      <Card title="Account type" kicker="Who you post as">
        <div className="grid grid-cols-3 gap-1 rounded-full bg-sand p-1" role="group" aria-label="Account type">
          {(Object.keys(ACCOUNT_TYPES) as PlusAccountType[]).map((k) => (
            viewer.account_type === k
              ? <span key={k} aria-current="true" className="rounded-full bg-ink py-1.5 text-center text-xs font-extrabold text-sand">{ACCOUNT_TYPES[k]}</span>
              : <PlusButton key={k} action={setPlusAccountType.bind(null, k)} className="w-full justify-center !rounded-full !py-1.5 text-xs !ring-0">{ACCOUNT_TYPES[k]}</PlusButton>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">Business and organisation accounts can ask to sell E-Passes. Your posts show the type you choose.</p>
      </Card>

      <Card id="admin" title="Access type" kicker={admin ? "Admin" : "App user"}
        right={admin ? <PlusSwitch on={viewer.admin_mode} action={setPlusPreference.bind(null, "admin_mode")} label="Admin mode" /> : undefined}>
        {admin ? (
          <div className="space-y-2 text-sm">
            <SwitchRow label="Admin Mode" hint={viewer.admin_mode ? "On: the Desk, gate and official circulars are open to you." : "Off: you use PAHAD+ like any app user."}><span className="sr-only">See the switch above</span></SwitchRow>
            <div className="rounded-2xl bg-sand p-3">
              <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Executive authority</p>
              <p className="font-bold">{roleLabel(admin.role)}{admin.plus_region ? ` · ${admin.plus_region}` : ""}</p>
              <ul className="mt-1 text-xs text-ink/80">
                {canModeratePlus(admin) && <li>• Verify posts in the Desk</li>}
                {canGrantFlagProof(admin) && <li>• Make posts Flag-Proof</li>}
                {canApprovePublic(admin) && <li>• Publish official circulars and choose the Executive Spotlight</li>}
              </ul>
            </div>
            <p className="text-xs text-muted">Linked to {admin.name}&apos;s PAHAD dashboard account. Permissions always come from that account.</p>
            <PlusButton confirm="Unlink your PAHAD dashboard account? This becomes an app user account." action={unlinkAdminAccess}>Unlink admin access</PlusButton>
          </div>
        ) : dashboard ? (
          <div className="space-y-2 text-sm">
            <p>You&apos;re signed in to the PAHAD dashboard as <strong>{dashboard.name}</strong> ({roleLabel(dashboard.role)}) on this device.</p>
            <PlusButton action={linkAdminAccess}>Link as Admin</PlusButton>
          </div>
        ) : (
          <p className="text-sm text-muted">App user. PAHAD office bearers and verifiers can link their dashboard account here to use Admin mode: sign in at the PAHAD dashboard on this phone, then come back.</p>
        )}
      </Card>

      <Card id="contacts" title="Collaboration contacts" kicker="Filled into your new posts"
        right={<PlusSwitch on={!viewer.hide_contacts} action={setPlusPreference.bind(null, "public_contacts")} label="Show contacts publicly" />}>
        <PlusForm action={updateCollabContacts} submitLabel="Save contacts">
          <label className="block"><span className="label">WhatsApp / phone</span><input name="phone" type="tel" maxLength={30} defaultValue={viewer.phone} className="field" /></label>
          <label className="block"><span className="label">Instagram</span><input name="instagram" maxLength={60} defaultValue={viewer.instagram} placeholder="@yourname" className="field" /></label>
          <label className="block"><span className="label">Email for collaborations</span><input name="contact_email" type="email" maxLength={160} defaultValue={viewer.contact_email} className="field" /></label>
        </PlusForm>
        <p className="mt-2 text-xs text-muted">The switch sets whether new posts show these publicly by default. Each post can still change it.</p>
      </Card>

      <Card title="Latest post" right={<Link href="/plus/new" className="rounded-full bg-coral px-3 py-1.5 text-xs font-extrabold text-sand">+ Post</Link>}>
        {latest ? (
          <div>
            <Link href={`/plus/${latest.id}`} className="font-bold hover:underline">{latest.title}</Link>
            <p className="mt-1 text-xs text-muted">{hubLabel(toCard(latest))} · {plusDate(latest.created_at)} · {latest.likes} likes · {latest.supports} supports</p>
            <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold", (STATUS[latest.status] ?? STATUS.unverified).cls)}>{(STATUS[latest.status] ?? STATUS.unverified).label}</span>
            {(latest.status === "rejected" || latest.status === "hold") && latest.reject_reason && <p className="mt-1 text-sm text-red-800">Reason: {latest.reject_reason}</p>}
            {mine.length > 1 && <p className="mt-2 text-xs"><Link href="/plus/me?tab=settings#manage" className="font-extrabold text-teal">Manage all {mine.length} posts →</Link></p>}
          </div>
        ) : <p className="text-sm text-muted">You haven&apos;t posted anything yet.</p>}
      </Card>

      <Card id="passes" title="My E-Passes" kicker={`${passRows.filter((r) => r.pass.status === "pending").length} pending · ${passRows.filter((r) => r.pass.status === "active").length} ready`}>
        {passRows.length === 0 ? <p className="text-sm text-muted">No E-Passes yet. Look for events with an E-Pass.</p> : (
          <ul className="divide-y divide-line">
            {passRows.map(({ pass, post }) => {
              const past = !isLivePlus(post, at) && pass.status === "active";
              return (
                <li key={pass.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link href={`/plus/pass/${pass.code}`} className="font-semibold hover:underline">{post.title}</Link>
                    <p className="text-xs text-muted">{plusDate(post.starts_at, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · {post.region}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    past ? "bg-sand text-muted" : pass.status === "active" ? "bg-green-600 text-white" : pass.status === "pending" ? "bg-cream text-teal-900" : pass.status === "revoked" ? "bg-red-50 text-red-800" : "bg-teal text-white")}>
                    {past ? "Ended" : PASS_LABEL[pass.status] ?? pass.status}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card id="saved" title="Saved posts" kicker={viewer.hide_saved ? "Only you can see these" : "Shown on your public profile"}>
        {savedPosts.length === 0 ? <p className="text-sm text-muted">Tap the star on a post to keep it here.</p> : (
          <ul className="divide-y divide-line">
            {savedPosts.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link href={`/plus/${p.id}`} className="font-semibold hover:underline">{p.title}</Link>
                  <p className="text-xs text-muted">{hubLabel(toCard(p))} · {[p.locality, p.region].filter(Boolean).join(", ")}</p>
                </div>
                <PlusButton action={async () => { "use server"; const r = await toggleSave(p.id); return { ok: r.ok, message: r.ok ? "Removed." : r.message }; }} className="text-xs">Remove</PlusButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card id="notifications" title="Profile notifications" kicker={`${unread} unread`}
        right={unread > 0 ? <PlusButton action={markPlusNotificationsRead} className="text-xs">Mark all read</PlusButton> : undefined}>
        {recent.length === 0 ? <p className="text-sm text-muted">Nothing yet. You&apos;ll hear here when someone supports or follows you, and about your posts and E-Passes.</p> : (
          <ul className="divide-y divide-line">
            {recent.map((n) => (
              <li key={n.id} className="py-2.5">
                <Link href={n.url || "/plus/me"} className="flex gap-2">
                  {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-coral" aria-label="Unread" />}
                  <span className="min-w-0"><span className="block text-sm font-bold">{n.title}</span>{n.body && <span className="block text-xs text-muted">{n.body}</span>}
                    <span className="text-[10px] text-muted">{plusDate(n.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {seller && paymentsConfigured && (
        <Card id="sell" title="Wallet · Sell E-Passes">
          {organiser?.status === "approved" ? (
            <div className="space-y-3 text-sm">
              <p>You&apos;re approved to sell E-Passes. Add a price when you post an event. Buyers pay PAHAD through Razorpay; PAHAD pays you after the event{feePercent ? `, less its ${feePercent}% fee` : ""}.</p>
              {sales.length > 0 && (
                <ul className="divide-y divide-line">
                  {sales.map(({ post, money }) => (
                    <li key={post.id} className="py-3">
                      <Link href={`/plus/checkin/${post.id}`} className="font-semibold hover:underline">{post.title}</Link>
                      <p className="text-xs text-muted">
                        {money.sold} sold · {rupees(money.gross)} · fee {rupees(money.fee)} · paid to you {rupees(money.paidOut)} · <strong className="text-ink">owed {rupees(money.owed)}</strong>
                        {money.refunds > 0 && ` · ${money.refunds} refunded`}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : organiser?.status === "pending" ? (
            <p className="text-sm text-muted">Your request is with PAHAD. You&apos;ll be able to add prices once the President approves it.</p>
          ) : (
            <div>
              <p className="text-sm text-muted">
                {organiser?.status === "rejected" || organiser?.status === "revoked" ? `Your earlier request was ${organiser.status}${organiser.note ? `: ${organiser.note}` : ""}. You can ask again.` : "Want to charge for your events? Ask PAHAD to approve you as a paid organiser. Only the President sees your payout details."}
              </p>
              <div className="mt-3">
                <PlusForm action={applyAsOrganiser} submitLabel="Ask to sell E-Passes">
                  <label className="block"><span className="label">Name on the account *</span><input name="account_name" required maxLength={120} className="field" /></label>
                  <label className="block"><span className="label">UPI ID</span><input name="upi" maxLength={100} placeholder="name@okbank" className="field" /></label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block"><span className="label">Bank account number</span><input name="bank_account" inputMode="numeric" maxLength={20} className="field" /></label>
                    <label className="block"><span className="label">IFSC</span><input name="ifsc" maxLength={11} className="field uppercase" /></label>
                  </div>
                  <p className="text-xs text-muted">Give a UPI ID, a bank account, or both.</p>
                </PlusForm>
              </div>
            </div>
          )}
        </Card>
      )}

      <Card id="membership" title="PAHAD membership">
        {viewer.member_id ? (
          <div className="space-y-3 text-sm">
            <p>Linked{member ? ` to membership ${member.member_no || ""}`.trimEnd() : ""}. Your posts show a <strong>PAHAD member</strong> badge and count as Authentic.</p>
            <PlusButton confirm="Unlink your PAHAD membership?" action={unlinkMember}>Unlink</PlusButton>
          </div>
        ) : (
          <div>
            <p className="text-sm text-muted">Are you a PAHAD member? Link your membership to show a PAHAD member badge on your posts.</p>
            <div className="mt-3">
              <PlusForm action={requestMemberLink} submitLabel="Link my membership">
                <label className="block">
                  <span className="label">Email on your PAHAD membership</span>
                  <input name="member_email" type="email" defaultValue={viewer.email} maxLength={160} className="field" />
                  <span className="mt-1 block text-xs text-muted">If it&apos;s different from this account&apos;s email, we&apos;ll send a confirmation link to it.</span>
                </label>
              </PlusForm>
            </div>
          </div>
        )}
      </Card>
      <p className="text-center text-xs text-muted">
        You can post up to {PLUS_RULES.newAccountDailyPosts} times a day in your first {PLUS_RULES.newAccountDays} days, then {PLUS_RULES.dailyPosts}.
      </p>
    </>
  );
}

async function Settings({ viewer, admin }: { viewer: PlusUser; admin: PublicUser | null }) {
  const at = requestTime();
  const [posts, blocks, users] = await Promise.all([db.findBy("plus_posts", "author_id", viewer.id), db.findBy("plus_blocks", "blocker_id", viewer.id), db.all("plus_users")]);
  const byId = new Map(users.map((u) => [u.id, u]));
  const blocked = blocks.map((b) => ({ id: b.blocked_id, name: byId.get(b.blocked_id)?.name ?? "Deleted account" }));
  const blockedIds = new Set(blocked.map((b) => b.id));
  const pickable = users.filter((u) => u.id !== viewer.id && u.status === "active" && !blockedIds.has(u.id)).sort((a, b) => a.name.localeCompare(b.name)).slice(0, 200);
  const mine = posts.filter((p) => p.status !== "removed").sort((a, b) => b.created_at.localeCompare(a.created_at));
  const adminOn = Boolean(admin && viewer.admin_mode);
  const qr = await qrSvg(`${site.url}/plus/u/${viewer.id}`);

  return (
    <>
      <Card id="qr" title="Digital identity QR" kicker={adminOn ? "Admin identity" : "Member identity"}>
        <div className="flex items-center gap-4">
          <div className="w-32 shrink-0 overflow-hidden rounded-2xl bg-white p-1.5 [&_svg]:h-auto [&_svg]:w-full" role="img" aria-label="QR code for your public profile" dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="min-w-0 space-y-1 text-sm">
            <p className="font-extrabold">{viewer.name}</p>
            <p className="text-xs text-muted">{plusAccountId(viewer)} · {ACCOUNT_TYPES[viewer.account_type as PlusAccountType]}</p>
            {adminOn && admin && <p className="text-xs"><strong>{roleLabel(admin.role)}</strong>{canGrantFlagProof(admin) ? " · Flag-Proof" : ""}{canModeratePlus(admin) ? " · Verifier" : ""}</p>}
            <ShareButton path={`/plus/u/${viewer.id}`} title={`${viewer.name} on PAHAD+`} label="Share profile" />
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">Others scan this to open your public profile and follow you.</p>
      </Card>

      <Card title="Visibility & privacy">
        <div className="divide-y divide-line">
          <SwitchRow label="Private mode" hint="Your profile hides your posts list and saved posts from others."><PlusSwitch on={viewer.private_mode} action={setPlusPreference.bind(null, "private_mode")} label="Private mode" /></SwitchRow>
          <SwitchRow label="Public contacts" hint="New posts show your contacts by default."><PlusSwitch on={!viewer.hide_contacts} action={setPlusPreference.bind(null, "public_contacts")} label="Public contacts" /></SwitchRow>
          <SwitchRow label="Show saved posts on profile"><PlusSwitch on={!viewer.hide_saved} action={setPlusPreference.bind(null, "show_saved")} label="Show saved posts on profile" /></SwitchRow>
        </div>
      </Card>

      <Card id="alerts" title="Notifications">
        <div className="divide-y divide-line">
          <SwitchRow label="Supports & followers"><PlusSwitch on={!viewer.mute_support} action={setPlusPreference.bind(null, "notify_support")} label="Notify me about supports and followers" /></SwitchRow>
          <SwitchRow label="E-Passes & events"><PlusSwitch on={!viewer.mute_events} action={setPlusPreference.bind(null, "notify_events")} label="Notify me about E-Passes and events" /></SwitchRow>
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <PushToggle publicKey={vapidPublicKey} regions={PLUS_REGIONS} saveSub={savePushSubscription} removeSub={removePushSubscription} />
        </div>
      </Card>

      <Card id="manage" title="Manage posts" kicker={`${mine.length} post${mine.length === 1 ? "" : "s"}`}>
        {mine.length === 0 ? <p className="text-sm text-muted">No posts yet.</p> : (
          <ul className="divide-y divide-line">
            {mine.map((p) => {
              const expired = ["unverified", "verified", "flag_proof"].includes(p.status) && !isLivePlus(p, at);
              const s = STATUS[p.status] ?? STATUS.unverified;
              return (
                <li key={p.id} className="py-3">
                  <Link href={`/plus/${p.id}`} className="font-semibold hover:underline">{p.title}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted">{hubLabel(toCard(p))} · {plusDate(p.created_at)}</span>
                    <span className={cn("rounded-full px-2 py-0.5 font-semibold", expired ? "bg-sand text-muted" : s.cls)}>{expired ? "Ended / expired" : s.label}</span>
                  </div>
                  {(p.status === "rejected" || p.status === "hold") && p.reject_reason && <p className="mt-1 text-sm text-red-800">Reason: {p.reject_reason}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Link href={`/plus/${p.id}/media`} className="rounded-full px-3 py-1.5 text-xs font-semibold text-teal ring-1 ring-line">Edit media</Link>
                    <PlusButton confirm="Remove this post from PAHAD+?" action={deleteOwnPlusPost.bind(null, p.id)} className="text-xs">Remove</PlusButton>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card id="blocked" title="Blocked accounts">
        {pickable.length > 0 && (
          <PlusForm action={blockFromPicker} submitLabel="Block account">
            <label className="block"><span className="label">Choose an account</span>
              <select name="account" required defaultValue="" className="field">
                <option value="" disabled>Select…</option>
                {pickable.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </label>
          </PlusForm>
        )}
        {blocked.length === 0 ? <p className="mt-2 text-sm text-muted">You haven&apos;t blocked anyone.</p> : (
          <ul className="mt-3 space-y-2">
            {blocked.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{b.name}</span>
                <PlusButton action={unblockPlusUser.bind(null, b.id)}>Unblock</PlusButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Profile">
        <PlusForm action={updatePlusProfile} submitLabel="Save">
          <label className="block"><span className="label">Name</span><input name="name" required maxLength={120} defaultValue={viewer.name} className="field" /></label>
          <label className="block"><span className="label">Phone</span><input name="phone" type="tel" maxLength={30} defaultValue={viewer.phone} className="field" /></label>
        </PlusForm>
        <p className="mt-2 text-xs text-muted">Signed in as {viewer.email}.</p>
      </Card>

      <Card title="Support & About">
        <ul className="divide-y divide-line text-sm font-bold">
          <li><Link href="/plus/help" className="flex justify-between py-2.5">Help center <span aria-hidden>→</span></Link></li>
          <li><Link href="/plus/terms" className="flex justify-between py-2.5">Terms &amp; community guidelines <span aria-hidden>→</span></Link></li>
          <li><Link href="/privacy#pahad-plus" className="flex justify-between py-2.5">Privacy <span aria-hidden>→</span></Link></li>
          <li><a href="#delete" className="flex justify-between py-2.5 text-red-700">Delete account <span aria-hidden>↓</span></a></li>
        </ul>
      </Card>

      <section id="delete" className="rounded-3xl bg-white p-4 ring-1 ring-red-200">
        <h2 className="text-base font-extrabold text-red-700">Delete my account</h2>
        <p className="mt-1 text-sm text-muted">
          This deletes your PAHAD+ account, your sign-in, reports and blocks, and takes all your posts off PAHAD+ with your contact details removed. It can&apos;t be undone.
        </p>
        <div className="mt-3">
          <PlusForm action={deletePlusAccount} submitLabel="Delete my account permanently" danger>
            <label className="block"><span className="label">Type DELETE to confirm</span><input name="confirm" required autoComplete="off" className="field" /></label>
            <label className="block"><span className="label">Your password</span><input name="password" type="password" required autoComplete="current-password" className="field" /></label>
          </PlusForm>
        </div>
      </section>

      <form action={signOutPlus}><button type="submit" className="w-full rounded-full bg-white py-3 text-sm font-extrabold text-red-700 ring-1 ring-line">Log out</button></form>
    </>
  );
}

export default function MePage({ searchParams }: PageProps<"/plus/me">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-white" role="status" aria-label="Loading" />}>
      <Account searchParams={searchParams} />
    </Suspense>
  );
}
