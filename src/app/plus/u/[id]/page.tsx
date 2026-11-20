import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FollowButton, ShareButton } from "@/components/plus/client";
import { TrustBadge, hubLabel } from "@/components/plus/ui";
import { db } from "@/lib/db";
import { ACCOUNT_TYPES, plusAccountId, type PlusAccountType } from "@/lib/plus/config";
import { isOptimisable } from "@/lib/plus/media";
import { toggleFollow } from "@/lib/plus/post-actions";
import { isLivePlus, requestTime, toCard, withAuthentic } from "@/lib/plus/posts";
import { getPlusUser } from "@/lib/plus/session";
import { youTubeThumb } from "@/lib/youtube";

export const metadata = { title: "Profile", robots: { index: false } };

async function Profile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [u, viewer] = await Promise.all([db.get("plus_users", id), getPlusUser()]);
  if (!u || u.status !== "active") notFound();
  const at = requestTime();
  const [posts, followers, following, mine] = await Promise.all([
    db.findBy("plus_posts", "author_id", u.id),
    db.findBy("plus_follows", "followee_id", u.id),
    db.findBy("plus_follows", "follower_id", u.id),
    viewer ? db.get("plus_follows", `${viewer.id}:${u.id}`) : null,
  ]);
  const live = posts.filter((p) => ["unverified", "verified", "flag_proof"].includes(p.status) && isLivePlus(p, at) && !p.official)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const cards = await withAuthentic(live.map(toCard));
  const saves = !u.private_mode && !u.hide_saved ? await db.findBy("plus_saves", "user_id", u.id) : [];
  const saved = (await Promise.all(saves.slice(0, 12).map((s) => db.get("plus_posts", s.post_id))))
    .filter((p): p is NonNullable<typeof p> => Boolean(p && ["verified", "flag_proof"].includes(p.status) && isLivePlus(p, at)));
  const self = viewer?.id === u.id;
  const hidden = u.private_mode && !self;
  const supports = live.reduce((n, p) => n + p.supports, 0);

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-gradient-to-br from-[#1D353A] to-[#11181B] p-4 ring-1 ring-line">
        <div className="flex items-start gap-3">
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-coral text-xl font-extrabold text-sand">
            {u.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("")}
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold">{u.name}</h1>
            <p className="text-xs text-ink/70">{plusAccountId(u)}</p>
            <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-extrabold">
              <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-line">{ACCOUNT_TYPES[u.account_type as PlusAccountType]}</span>
              {u.member_id && <span className="rounded-full bg-sage px-2 py-0.5 text-sand">PAHAD member</span>}
              {u.private_mode && <span className="rounded-full bg-white px-2 py-0.5 ring-1 ring-line">🔒 Private</span>}
            </div>
          </div>
          {self ? <Link href="/plus/me" className="rounded-full px-3 py-2 text-xs font-extrabold ring-1 ring-ink/20">Edit</Link>
            : <FollowButton on={Boolean(mine)} signedIn={Boolean(viewer)} action={toggleFollow.bind(null, u.id)} />}
        </div>
        <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
          {([["Posts", hidden ? "—" : live.length], ["Support", hidden ? "—" : supports], ["Followers", followers.length], ["Following", following.length]] as const).map(([l, n]) => (
            <div key={l} className="rounded-2xl bg-black/30 p-2"><dd className="text-lg font-extrabold">{n}</dd><dt className="text-[10px] font-bold uppercase text-ink/70">{l}</dt></div>
          ))}
        </dl>
        <div className="mt-3"><ShareButton path={`/plus/u/${u.id}`} title={`${u.name} on PAHAD+`} label="Share profile" /></div>
      </section>

      {hidden ? (
        <p className="rounded-3xl bg-white p-5 text-center text-sm text-muted ring-1 ring-line">This account is private. Their posts still appear in the feed, but not as a list here.</p>
      ) : (
        <section aria-labelledby="posts-h">
          <h2 id="posts-h" className="mb-2 text-xs font-extrabold uppercase tracking-wider">Posts</h2>
          {cards.length === 0 ? <p className="text-sm text-muted">No live posts right now.</p> : (
            <div className="grid grid-cols-2 gap-2.5">
              {cards.map((c) => {
                const img = c.image || (c.youtubeId ? youTubeThumb(c.youtubeId) : "");
                return (
                  <Link key={c.id} href={c.href} className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-[#1D353A] to-[#11181B]">
                      {img ? <Image src={img} unoptimized={!isOptimisable(img)} alt="" fill sizes="215px" className="object-cover" /> : <span className="absolute inset-0 flex items-center justify-center text-3xl" aria-hidden>🏔️</span>}
                      <span className="absolute bottom-1.5 left-1.5"><TrustBadge c={c} /></span>
                    </div>
                    <span className="block p-2.5">
                      <span className="block text-[10px] font-extrabold uppercase text-coral-700">{hubLabel(c)}</span>
                      <span className="line-clamp-2 text-[13px] font-bold leading-snug">{c.title}</span>
                      {c.authentic && <span className="mt-1 block text-[10px] font-extrabold text-sage">✓ Authentic</span>}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      )}

      {!hidden && saved.length > 0 && (
        <section aria-labelledby="saved-h" className="rounded-3xl bg-white p-4 ring-1 ring-line">
          <h2 id="saved-h" className="mb-2 text-xs font-extrabold uppercase tracking-wider">Saved by {u.name.split(" ")[0]}</h2>
          <ul className="divide-y divide-line">
            {saved.map((p) => <li key={p.id} className="py-2"><Link href={`/plus/${p.id}`} className="text-sm font-bold hover:underline">{p.title}</Link><span className="block text-xs text-muted">{hubLabel(toCard(p))} · {p.region}</span></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

export default function PublicProfilePage({ params }: PageProps<"/plus/u/[id]">) {
  return (
    <Suspense fallback={<div className="h-80 animate-pulse rounded-3xl bg-white" role="status" aria-label="Loading" />}>
      <Profile params={params} />
    </Suspense>
  );
}
