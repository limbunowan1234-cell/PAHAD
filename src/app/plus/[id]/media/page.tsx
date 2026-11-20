import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { PlusForm } from "@/components/plus/client";
import { db } from "@/lib/db";
import { canVerifyPlusPost } from "@/lib/plus/access";
import { appAdmin } from "@/lib/plus/app-admin";
import { updatePlusMedia } from "@/lib/plus/profile-actions";
import { requestTime } from "@/lib/plus/posts";
import { getPlusUser } from "@/lib/plus/session";

export const metadata = { title: "Add media", robots: { index: false } };

/** Add or change a post's photo / video: the poster within 24 hours, or a PAHAD verifier ("Fill Media URL"). */
async function MediaForm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, u, admin] = await Promise.all([db.get("plus_posts", id), getPlusUser(), appAdmin()]);
  if (!p || p.status === "removed") notFound();
  const owner = u?.id === p.author_id && requestTime() - Date.parse(p.created_at) < 24 * 3_600_000;
  const curator = Boolean(admin && canVerifyPlusPost(admin, p));
  return (
    <div className="mx-auto max-w-md space-y-4">
      <Link href={`/plus/${p.id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-teal"><ArrowLeft className="h-4 w-4" aria-hidden /> Post</Link>
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-coral-700">{curator && !owner ? "Media curator" : "Your post"}</p>
        <h1 className="font-display text-2xl font-bold">{p.image || p.youtube_id || p.video_url ? "Edit media" : "Add media"}</h1>
        <p className="mt-1 text-sm text-muted">{p.title}</p>
      </div>
      {!owner && !curator ? (
        <p className="rounded-2xl bg-white p-5 text-sm text-muted ring-1 ring-line">
          {u?.id === p.author_id ? "Photos and videos can be changed within 24 hours of posting." : "Only the poster (within 24 hours) or a PAHAD verifier can change this post's media."}
        </p>
      ) : (
        <div className="rounded-3xl bg-white p-5 ring-1 ring-line">
          <PlusForm action={updatePlusMedia} submitLabel="Save media">
            <input type="hidden" name="post_id" value={p.id} />
            <label className="block"><span className="label">Upload a photo</span><input type="file" name="image" accept="image/jpeg,image/png,image/webp" className="field" /></label>
            <label className="block">
              <span className="label">…or a public image link</span>
              <input name="image_url" type="url" maxLength={500} placeholder="https://…" className="field" />
              <span className="mt-1 block text-xs text-muted">Must start with https://. Leave empty to keep the current photo.</span>
            </label>
            <label className="block">
              <span className="label">YouTube or video link</span>
              <input name="video" maxLength={600} placeholder="YouTube link or a direct .mp4 link" className="field" />
            </label>
            {(p.youtube_id || p.video_url) && <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="clear_video" className="h-4 w-4 accent-teal" /> Remove the current video</label>}
          </PlusForm>
        </div>
      )}
    </div>
  );
}

export default function MediaPage({ params }: PageProps<"/plus/[id]/media">) {
  return <Suspense fallback={<div className="mx-auto h-80 max-w-md animate-pulse rounded-3xl bg-white" role="status" aria-label="Loading" />}><MediaForm params={params} /></Suspense>;
}
