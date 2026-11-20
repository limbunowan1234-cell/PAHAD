import Link from "next/link";
import { Suspense } from "react";
import { PlusButton, PlusForm } from "@/components/plus/client";
import { hubLabel, plusDate } from "@/components/plus/ui";
import { deletePlusAccount, resendVerification, signOutPlus, updatePlusProfile } from "@/lib/plus/account-actions";
import { unblockPlusUser } from "@/lib/plus/post-actions";
import { ACCOUNT_TYPES, PLUS_RULES, type PlusAccountType } from "@/lib/plus/config";
import { isLivePlus, toCard, requestTime } from "@/lib/plus/posts";
import { getPlusUser } from "@/lib/plus/session";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata = { title: "My account", robots: { index: false } };

const STATUS: Record<string, { label: string; cls: string }> = {
  unverified: { label: "Unverified: live with limited details", cls: "bg-cream text-teal-900" },
  verified: { label: "Verified", cls: "bg-sage-100 text-teal" },
  flag_proof: { label: "President Flag-Proof", cls: "bg-teal text-white" },
  hold: { label: "On hold: PAHAD is reviewing it", cls: "bg-red-50 text-red-800" },
  rejected: { label: "Not approved", cls: "bg-red-50 text-red-800" },
  removed: { label: "Removed", cls: "bg-sand text-muted" },
};

async function Account({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, viewer] = await Promise.all([searchParams, getPlusUser()]);
  if (!viewer) {
    return (
      <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-white p-6 text-center ring-1 ring-line">
        <h1 className="font-display text-2xl text-teal">Your PAHAD+</h1>
        <p className="mt-1 text-sm text-muted">Sign in to post and manage your posts.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/plus/login?next=/plus/me" className="btn btn-primary">Sign in</Link>
          <Link href="/plus/signup" className="btn bg-white text-teal ring-1 ring-line">Create account</Link>
        </div>
      </div>
    );
  }
  const at = requestTime();
  const [posts, blocks] = await Promise.all([db.findBy("plus_posts", "author_id", viewer.id), db.findBy("plus_blocks", "blocker_id", viewer.id)]);
  const blockedUsers = (await Promise.all(blocks.map(async (b) => ({ id: b.blocked_id, name: (await db.get("plus_users", b.blocked_id))?.name ?? "Deleted account" })))).filter(Boolean);
  const mine = posts.filter((p) => p.status !== "removed").sort((a, b) => b.created_at.localeCompare(a.created_at));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {sp.welcome === "1" && (
        <p role="status" className="rounded-2xl bg-sage-100 p-4 text-sm text-teal">Welcome to PAHAD+! We sent a link to <strong>{viewer.email}</strong>. Confirm your email to start posting.</p>
      )}
      <section className="rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl text-teal">{viewer.name}</h1>
            <p className="text-sm text-muted">{viewer.email} · {ACCOUNT_TYPES[viewer.account_type as PlusAccountType] ?? viewer.account_type} account</p>
          </div>
          <form action={signOutPlus}><button type="submit" className="rounded-full px-3 py-1.5 text-sm font-semibold text-teal ring-1 ring-line hover:bg-sand">Sign out</button></form>
        </div>
        {!viewer.email_verified && (
          <div className="mt-4 rounded-2xl bg-cream p-4 text-sm text-teal-900">
            <p><strong>Email not confirmed yet.</strong> You need to confirm it before you can post.</p>
            <div className="mt-2"><PlusButton action={resendVerification}>Resend confirmation link</PlusButton></div>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">
          You can post up to {PLUS_RULES.newAccountDailyPosts} times a day in your first {PLUS_RULES.newAccountDays} days, then {PLUS_RULES.dailyPosts}.
        </p>
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-teal">My posts</h2>
          <Link href="/plus/new" className="btn btn-primary !px-4 !py-2 text-sm">New post</Link>
        </div>
        {mine.length === 0 ? (
          <p className="mt-3 text-sm text-muted">You haven&apos;t posted anything yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {mine.map((p) => {
              const c = toCard(p);
              const expired = ["unverified", "verified", "flag_proof"].includes(p.status) && !isLivePlus(p, at);
              const s = STATUS[p.status] ?? STATUS.unverified;
              return (
                <li key={p.id} className="py-3">
                  <Link href={`/plus/${p.id}`} className="font-semibold text-ink hover:underline">{p.title}</Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-muted">{hubLabel(c)} · {plusDate(p.created_at)}</span>
                    <span className={cn("rounded-full px-2 py-0.5 font-semibold", expired ? "bg-sand text-muted" : s.cls)}>{expired ? "Ended / expired" : s.label}</span>
                  </div>
                  {(p.status === "rejected" || p.status === "hold") && p.reject_reason && <p className="mt-1 text-sm text-red-800">Reason: {p.reject_reason}</p>}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line">
        <h2 className="font-display text-xl text-teal">Profile</h2>
        <div className="mt-3">
          <PlusForm action={updatePlusProfile} submitLabel="Save">
            <label className="block"><span className="label">Name</span><input name="name" required maxLength={120} defaultValue={viewer.name} className="field" /></label>
            <label className="block"><span className="label">Phone</span><input name="phone" type="tel" maxLength={30} defaultValue={viewer.phone} className="field" /></label>
          </PlusForm>
        </div>
      </section>

      {blockedUsers.length > 0 && (
        <section className="rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line">
          <h2 className="font-display text-xl text-teal">Blocked accounts</h2>
          <ul className="mt-3 space-y-2">
            {blockedUsers.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
                <span>{b.name}</span>
                <PlusButton action={unblockPlusUser.bind(null, b.id)}>Unblock</PlusButton>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section id="delete" className="rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-red-200">
        <h2 className="font-display text-xl text-red-800">Delete my account</h2>
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

      <p className="text-center text-xs text-muted">
        <Link href="/plus/terms" className="underline">Terms &amp; community guidelines</Link> · <Link href="/privacy#pahad-plus" className="underline">Privacy</Link>
      </p>
    </div>
  );
}

export default function MePage({ searchParams }: PageProps<"/plus/me">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-2xl animate-pulse rounded-[var(--radius-card)] bg-white" role="status" aria-label="Loading" />}>
      <Account searchParams={searchParams} />
    </Suspense>
  );
}
