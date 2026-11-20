import Link from "next/link";
import { Suspense } from "react";
import { NewPostForm } from "@/components/plus/client";
import { createPlusPost } from "@/lib/plus/post-actions";
import { HUB_KEYS, type PlusHub } from "@/lib/plus/config";
import { getPlusUser } from "@/lib/plus/session";
import { getFeePercent, isApprovedOrganiser } from "@/lib/plus/payments";
import { paymentsConfigured } from "@/lib/plus/razorpay";

export const metadata = { title: "Post", robots: { index: false } };

async function Composer({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [sp, viewer] = await Promise.all([searchParams, getPlusUser()]);
  if (!viewer) {
    return (
      <div className="rounded-[var(--radius-card)] bg-white p-6 text-center ring-1 ring-line">
        <p className="font-display text-xl text-teal">Sign in to post</p>
        <p className="mt-1 text-sm text-muted">A free PAHAD+ account lets you share events, places, businesses and briefs.</p>
        <div className="mt-4 flex justify-center gap-2">
          <Link href="/plus/signup" className="btn btn-primary">Create account</Link>
          <Link href="/plus/login?next=/plus/new" className="btn bg-white text-teal ring-1 ring-line">Sign in</Link>
        </div>
      </div>
    );
  }
  if (!viewer.email_verified) {
    return (
      <div className="rounded-[var(--radius-card)] bg-white p-6 text-center ring-1 ring-line">
        <p className="font-display text-xl text-teal">Confirm your email first</p>
        <p className="mt-1 text-sm text-muted">We sent a link to {viewer.email}. Open it to start posting, or ask for a new one on your account page.</p>
        <Link href="/plus/me" className="btn btn-primary mt-4">My account</Link>
      </div>
    );
  }
  const hub = sp.hub as PlusHub;
  const [canSell, feePercent] = await Promise.all([
    paymentsConfigured ? isApprovedOrganiser(viewer.id) : Promise.resolve(false),
    getFeePercent(),
  ]);
  return (
    <div className="rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line sm:p-6">
      <NewPostForm action={createPlusPost} initialHub={HUB_KEYS.includes(hub) ? hub : undefined} canSell={canSell} feePercent={feePercent} />
    </div>
  );
}

export default function NewPlusPostPage({ searchParams }: PageProps<"/plus/new">) {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl text-teal">Post on PAHAD+</h1>
      <p className="mb-4 mt-1 text-sm text-muted">
        Your post goes live straight away as <strong>Unverified</strong>. Contact, booking and registration details show once a PAHAD verifier checks it.
        Please follow the <Link href="/plus/terms" className="font-semibold text-teal underline">community guidelines</Link>.
      </p>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-[var(--radius-card)] bg-white" role="status" aria-label="Loading" />}>
        <Composer searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
