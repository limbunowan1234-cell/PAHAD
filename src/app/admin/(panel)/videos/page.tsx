import Image from "next/image";
import Link from "next/link";
import { deleteVideo, reviewVideo, saveFilmsPage, saveVideo, setVideoVisible, submitVideo, withdrawVideo } from "../../video-actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { OtherPagesToggle } from "@/components/admin/OtherPagesToggle";
import { Badge, Card, Empty, Field, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { getFilmsPage } from "@/lib/data";
import { db } from "@/lib/db";
import { FILMS_DEFAULTS, FILMS_PATH } from "@/lib/films";
import { can, canView } from "@/lib/permissions";
import { pageLabel, pageList } from "@/lib/placements";
import type { Video, VideoStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { youTubeThumb, youTubeWatchUrl } from "@/lib/youtube";

export const metadata = { title: "Videos" };

const STATUS: Record<VideoStatus, { label: string; tone: "amber" | "green" | "red" }> = {
  pending: { label: "Pending Approval", tone: "amber" },
  approved: { label: "Approved", tone: "green" },
  rejected: { label: "Rejected", tone: "red" },
};

function LinkFields({ v }: { v?: Video }) {
  return (
    <>
      <Field label="YouTube link or embed code *" hint="youtube.com, youtu.be or an <iframe> embed code. Video files (MP4 etc.) can't be uploaded." className="sm:col-span-2">
        <input name="url" required defaultValue={v ? youTubeWatchUrl(v.youtube_id) : ""} className="field" placeholder="https://www.youtube.com/watch?v=…" />
      </Field>
      <Field label="Title *" className="sm:col-span-2"><input name="title" required maxLength={160} defaultValue={v?.title} className="field" /></Field>
      <Field label="Description" className="sm:col-span-2"><textarea name="description" rows={2} maxLength={600} defaultValue={v?.description} className="field" /></Field>
    </>
  );
}

function ManageFields({ v, filmsTitle }: { v?: Video; filmsTitle: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {v && <input type="hidden" name="id" value={v.id} />}
      <LinkFields v={v} />
      <OtherPagesToggle value={v?.pages} filmsTitle={filmsTitle} />
      <Field label="Display order" hint="Lower numbers show first."><input name="sort" type="number" defaultValue={v?.sort ?? 10} className="field" /></Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input type="checkbox" name="visible" defaultChecked={v ? v.visible : true} className="h-4 w-4 accent-teal" /> ON: show on the website
      </label>
    </div>
  );
}

/** Where an approved video shows: always the films page, plus any other chosen pages. */
const placesFor = (v: Video, filmsTitle: string) => [filmsTitle, ...pageList(v.pages).map(pageLabel)].join(", ");

function Thumb({ v }: { v: Video }) {
  return (
    <a href={youTubeWatchUrl(v.youtube_id)} target="_blank" rel="noopener noreferrer" className="relative block aspect-video w-full shrink-0 overflow-hidden rounded-xl bg-teal-950 sm:w-48">
      <Image src={youTubeThumb(v.youtube_id)} alt={`Open “${v.title}” on YouTube`} fill sizes="192px" className="object-cover" />
    </a>
  );
}

export default async function VideosPage({ searchParams }: PageProps<"/admin/videos">) {
  const user = await requireUser();
  // Arriving from "New content → Video (YouTube)" opens the add form straight away.
  const openNew = (await searchParams).new === "1";
  const films = await getFilmsPage();
  const manage = can(user.role, "videos.manage");
  // SYS Website Administrator: sees the President's view read-only.
  const viewOnly = !manage && canView(user.role, "videos.manage");
  const mayContribute = manage || user.can_submit_videos;

  if (!mayContribute && !viewOnly) {
    return (
      <>
        <PageHeader title="Videos" />
        <Notice>You don&apos;t have permission to submit YouTube videos. The President can switch it on for your account.</Notice>
      </>
    );
  }

  const all = await db.all("videos");
  const mine = all.filter((v) => v.submitted_by === user.id);

  if (!manage && !viewOnly) {
    return (
      <>
        <PageHeader title="Videos" description={`Share a YouTube video with PAHAD. Once the President approves it, it appears on ${films.title}.`} />
        <Card title="Submit YouTube Video">
          <AdminForm action={submitVideo} submitLabel="Submit for approval" resetOnSuccess>
            <div className="grid gap-4 sm:grid-cols-2"><LinkFields /></div>
          </AdminForm>
        </Card>
        <h2 className="mt-10 font-display text-2xl text-teal">My submissions</h2>
        {mine.length === 0 ? (
          <Empty>Nothing submitted yet.</Empty>
        ) : (
          <ul className="mt-4 space-y-3">
            {mine.map((v) => (
              <li key={v.id} className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:flex-row">
                <Thumb v={v} />
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-ink">{v.title}</p>
                    <Badge tone={STATUS[v.status].tone}>{STATUS[v.status].label}</Badge>
                  </div>
                  <p className="text-xs text-muted">Submitted {formatDate(v.created_at)}{v.reviewed_by_name && v.status !== "pending" ? ` · reviewed by ${v.reviewed_by_name}` : ""}</p>
                  {v.status === "approved" && <p className="mt-1 text-sm text-muted">{v.visible ? `On the website: ${placesFor(v, films.title)}` : "Approved, switched off for now."}</p>}
                  {v.status === "pending" && (
                    <div className="mt-2"><ActionButton variant="danger" confirm="Withdraw this submission?" action={withdrawVideo.bind(null, v.id)}>Withdraw</ActionButton></div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </>
    );
  }

  const pending = all.filter((v) => v.status === "pending");
  const reviewed = all.filter((v) => v.status !== "pending").sort((a, b) => a.sort - b.sort || b.created_at.localeCompare(a.created_at));

  return (
    <>
      <PageHeader
        title="Videos"
        description={`YouTube videos for the website. Every approved video that is ON appears on ${films.title}; tick “Also show on other pages” to place it elsewhere too. The ON/OFF switch hides it everywhere without deleting it. Members can submit videos only when you allow it on Admin Team.`}
      />
      {manage ? (
        <div className="mb-8 space-y-4">
          <Disclosure summary="Add a YouTube video" defaultOpen={openNew}>
            <AdminForm action={saveVideo} submitLabel="Add video" resetOnSuccess>
              <ManageFields filmsTitle={films.title} />
            </AdminForm>
          </Disclosure>
          <Card title="Films page">
            <p className="-mt-2 mb-4 text-sm text-muted">
              The public page listing every video: <Link href={FILMS_PATH} target="_blank" className="font-semibold text-teal underline">{FILMS_PATH}</Link>. Rename it here; the menu and footer follow. Leave a field empty to use the default.
            </p>
            <AdminForm action={saveFilmsPage} submitLabel="Save films page">
              <div className="grid gap-4">
                <Field label="Title"><input name="title" maxLength={80} defaultValue={films.title} placeholder={FILMS_DEFAULTS.title} className="field" /></Field>
                <Field label="Intro"><textarea name="intro" rows={2} maxLength={400} defaultValue={films.intro} placeholder={FILMS_DEFAULTS.intro} className="field" /></Field>
              </div>
            </AdminForm>
          </Card>
        </div>
      ) : (
        <div className="mb-8"><Notice>View only. Videos are managed by the President.</Notice></div>
      )}

      <h2 className="font-display text-2xl text-teal">Pending approval {pending.length > 0 && <Badge tone="amber">{pending.length}</Badge>}</h2>
      {pending.length === 0 ? (
        <Empty>No submissions waiting.</Empty>
      ) : (
        <ul className="mt-4 space-y-3">
          {pending.map((v) => (
            <li key={v.id} className="rounded-2xl border border-amber-200 bg-white p-4">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Thumb v={v} />
                <div className="flex-1">
                  <p className="font-semibold text-ink">{v.title}</p>
                  {v.description && <p className="text-sm text-muted">{v.description}</p>}
                  <p className="mt-1 text-xs text-muted">From {v.submitted_by_name} · {formatDate(v.created_at)}</p>
                  {manage && <div className="mt-3 flex flex-wrap gap-2">
                    <ActionButton variant="primary" action={reviewVideo.bind(null, v.id, "approved")}>Approve</ActionButton>
                    <ActionButton variant="danger" confirm={`Reject “${v.title}”?`} action={reviewVideo.bind(null, v.id, "rejected")}>Reject</ActionButton>
                    <ActionButton variant="danger" confirm={`Delete “${v.title}” permanently?`} action={deleteVideo.bind(null, v.id)}>Delete</ActionButton>
                  </div>}
                </div>
              </div>
              {manage && (
                <div className="mt-3">
                  <Disclosure summary="Edit details and pages before approving">
                    <AdminForm action={saveVideo}><ManageFields v={v} filmsTitle={films.title} /></AdminForm>
                  </Disclosure>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 font-display text-2xl text-teal">All videos</h2>
      {reviewed.length === 0 ? (
        <Empty>No videos yet.</Empty>
      ) : (
        <ul className="mt-4 space-y-3">
          {reviewed.map((v) => {
            // Live = approved and ON: it is on the films page whether or not other pages are chosen.
            const live = v.status === "approved" && v.visible;
            return (
              <li key={v.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Thumb v={v} />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-ink">{v.title}</p>
                      <Badge tone={STATUS[v.status].tone}>{STATUS[v.status].label}</Badge>
                      {v.status === "approved" && <Badge tone={v.visible ? "teal" : "grey"}>{v.visible ? "ON" : "OFF"}</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {`Pages: ${placesFor(v, films.title)}`}
                      {live ? "" : v.status === "approved" ? " · switched off, not showing on the website" : " · not showing on the website"}
                    </p>
                    <p className="text-xs text-muted">Added by {v.submitted_by_name || "—"} · {formatDate(v.created_at)}</p>
                    {manage && <div className="mt-3 flex flex-wrap gap-2">
                      {v.status === "approved" && (
                        <ActionButton variant={v.visible ? "ghost" : "primary"} action={setVideoVisible.bind(null, v.id, !v.visible)}>
                          {v.visible ? "Switch OFF" : "Switch ON"}
                        </ActionButton>
                      )}
                      {v.status === "rejected" && <ActionButton action={reviewVideo.bind(null, v.id, "approved")}>Approve</ActionButton>}
                      <ActionButton variant="danger" confirm={`Delete “${v.title}” permanently?`} action={deleteVideo.bind(null, v.id)}>Delete</ActionButton>
                    </div>}
                  </div>
                </div>
                {manage && (
                  <div className="mt-3">
                    <Disclosure summary="Edit">
                      <AdminForm action={saveVideo}><ManageFields v={v} filmsTitle={films.title} /></AdminForm>
                    </Disclosure>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
