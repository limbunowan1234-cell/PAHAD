import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CalendarDays, ExternalLink, Globe, Mail, MapPin, Phone } from "lucide-react";
import { VideoPlayer } from "@/components/site/VideoPlayer";
import { PlusButton, PlusForm } from "@/components/plus/client";
import { hubLabel, LockedBox, plusDate, timing, TrustBadge } from "@/components/plus/ui";
import { blockPlusUser, deleteOwnPlusPost, reportPlusPost } from "@/lib/plus/post-actions";
import { ROAM_STAGES } from "@/lib/plus/config";
import { getPlusPost, isLivePlus, toCard, requestTime } from "@/lib/plus/posts";
import { getPlusUser } from "@/lib/plus/session";

export const metadata = { title: "Post", robots: { index: false } };

const STATUS_NOTE: Record<string, string> = {
  hold: "This post is on hold while PAHAD reviews it. Only you can see it.",
  rejected: "PAHAD did not approve this post. Only you can see it.",
  removed: "You removed this post. Only you can see it.",
};

function waLink(n: string) {
  const digits = n.replace(/\D/g, "");
  return `https://wa.me/${digits.length === 10 ? `91${digits}` : digits}`;
}

async function Detail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ id }, sp, viewer] = await Promise.all([params, searchParams, getPlusUser()]);
  const post = await getPlusPost(id);
  const at = requestTime();
  const mine = Boolean(viewer && post && post.author_id === viewer.id);
  if (!post || (!isLivePlus(post, at) && !mine)) notFound();
  // Never pass the raw post to the page: toCard leaves out the locked fields until it is verified.
  const c = toCard(post);
  const when = timing(c, at);
  const l = c.locked;

  return (
    <article className="mx-auto max-w-2xl">
      <Link href="/plus" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-teal"><ArrowLeft className="h-4 w-4" aria-hidden /> PAHAD+</Link>
      {sp.posted === "1" && mine && (
        <p role="status" className="mb-4 rounded-2xl bg-sage-100 p-4 text-sm text-teal">
          Posted! It&apos;s live now as <strong>Unverified</strong>: people see the title, photo, place and summary. Contact and booking details unlock once a PAHAD verifier checks it.
        </p>
      )}
      {mine && STATUS_NOTE[post.status] && (
        <p className="mb-4 rounded-2xl bg-cream p-4 text-sm text-teal-900">
          {STATUS_NOTE[post.status]}{post.reject_reason ? ` Reason: ${post.reject_reason}` : ""}
        </p>
      )}

      <div className="overflow-hidden rounded-[var(--radius-card)] bg-white ring-1 ring-line">
        {c.image && (
          <div className="relative aspect-[16/10] bg-sand">
            <Image src={c.image} alt="" fill priority sizes="(min-width:672px) 672px, 100vw" className="object-cover" />
          </div>
        )}
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-ink">{hubLabel(c)}</span>
            <TrustBadge c={c} size="md" />
          </div>
          <h1 className="mt-3 font-display text-3xl leading-tight text-teal">{c.title}</h1>
          <p className="mt-2 flex items-center gap-1 text-sm text-muted"><MapPin className="h-4 w-4" aria-hidden /> {[c.locality, c.region].filter(Boolean).join(", ")}</p>
          {when && <p className="mt-1 flex items-center gap-1 text-sm font-semibold text-teal-700"><CalendarDays className="h-4 w-4" aria-hidden /> {when}</p>}
          <p className="mt-4 text-ink">{c.summary}</p>

          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            {c.kind && <div><dt className="text-muted">Kind</dt><dd className="font-medium">{c.kind}</dd></div>}
            {c.stage && <div><dt className="text-muted">Stage</dt><dd className="font-medium">{ROAM_STAGES[c.stage as keyof typeof ROAM_STAGES]}</dd></div>}
            {c.bestSeason && <div><dt className="text-muted">Best season</dt><dd className="font-medium">{c.bestSeason}</dd></div>}
            {c.hours && <div><dt className="text-muted">Hours</dt><dd className="font-medium">{c.hours}</dd></div>}
            {c.endsAt && <div><dt className="text-muted">Ends</dt><dd className="font-medium">{plusDate(c.endsAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</dd></div>}
            {c.deadline && <div><dt className="text-muted">Last date</dt><dd className="font-medium">{plusDate(c.deadline)}</dd></div>}
          </dl>

          {c.body && <p className="mt-5 whitespace-pre-line leading-relaxed text-ink">{c.body}</p>}
          {c.youtubeId && <div className="mt-5"><VideoPlayer id={c.youtubeId} title={c.title} /></div>}

          <div className="mt-6">
            {l ? (
              <section aria-label="Contact and details" className="space-y-2 rounded-2xl bg-sage-100 p-4 text-sm">
                {l.venue && <p><span className="text-muted">Venue:</span> <strong>{l.venue}</strong></p>}
                {l.organiser && <p><span className="text-muted">Organiser:</span> <strong>{l.organiser}</strong></p>}
                {l.address && <p><span className="text-muted">Address:</span> <strong>{l.address}</strong></p>}
                <div className="flex flex-wrap gap-2 pt-1">
                  {l.phone && <a href={`tel:${l.phone}`} className="btn btn-primary !px-4 !py-2 text-sm"><Phone className="h-4 w-4" aria-hidden /> Call</a>}
                  {l.whatsapp && <a href={waLink(l.whatsapp)} target="_blank" rel="noopener noreferrer" className="btn btn-primary !px-4 !py-2 text-sm">WhatsApp</a>}
                  {l.email && <a href={`mailto:${l.email}`} className="btn btn-primary !px-4 !py-2 text-sm"><Mail className="h-4 w-4" aria-hidden /> Email</a>}
                  {l.link && <a href={l.link} target="_blank" rel="noopener noreferrer nofollow" className="btn btn-accent !px-4 !py-2 text-sm"><ExternalLink className="h-4 w-4" aria-hidden /> {c.hub === "events" ? "Register" : c.hub === "briefs" ? "Apply / source" : "Book"}</a>}
                  {l.website && <a href={l.website} target="_blank" rel="noopener noreferrer nofollow" className="btn bg-white !px-4 !py-2 text-sm text-teal ring-1 ring-line"><Globe className="h-4 w-4" aria-hidden /> Website</a>}
                  {l.mapLink && <a href={l.mapLink} target="_blank" rel="noopener noreferrer nofollow" className="btn bg-white !px-4 !py-2 text-sm text-teal ring-1 ring-line"><MapPin className="h-4 w-4" aria-hidden /> Map</a>}
                </div>
              </section>
            ) : (
              <LockedBox hub={c.hub} />
            )}
          </div>

          <p className="mt-6 text-xs text-muted">
            Posted by {c.authorName} · {plusDate(c.createdAt)}
            {post.verified_by_name && c.verified && ` · verified by PAHAD`}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {mine ? (
          post.status !== "removed" && (
            <PlusButton confirm="Remove this post from PAHAD+?" action={deleteOwnPlusPost.bind(null, post.id)} className="text-red-700">Remove my post</PlusButton>
          )
        ) : viewer ? (
          <details className="rounded-2xl bg-white p-4 ring-1 ring-line">
            <summary className="cursor-pointer text-sm font-semibold text-teal">Report or block</summary>
            <div className="mt-3 space-y-4">
              <PlusForm action={reportPlusPost} submitLabel="Report post">
                <input type="hidden" name="post_id" value={post.id} />
                <label className="block">
                  <span className="label">What&apos;s wrong?</span>
                  <select name="reason" required defaultValue="" className="field">
                    <option value="" disabled>Choose…</option>
                    {["Wrong or misleading", "Spam or scam", "Offensive or unsafe", "Not in the hills region", "Other"].map((r) => <option key={r}>{r}</option>)}
                  </select>
                </label>
                <label className="block"><span className="label">More detail (optional)</span><input name="note" maxLength={300} className="field" /></label>
              </PlusForm>
              {c.authorId && (
                <PlusButton confirm={`Block ${c.authorName}? You won't see their posts.`} action={blockPlusUser.bind(null, c.authorId)}>Block {c.authorName}</PlusButton>
              )}
            </div>
          </details>
        ) : (
          <p className="text-sm text-muted"><Link href={`/plus/login?next=/plus/${post.id}`} className="font-semibold text-teal underline">Sign in</Link> to report or block.</p>
        )}
      </div>
    </article>
  );
}

export default function PlusPostPage({ params, searchParams }: PageProps<"/plus/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto aspect-[4/5] max-w-2xl animate-pulse rounded-[var(--radius-card)] bg-white" role="status" aria-label="Loading" />}>
      <Detail params={params} searchParams={searchParams} />
    </Suspense>
  );
}
