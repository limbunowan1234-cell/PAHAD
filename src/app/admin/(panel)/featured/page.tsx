import { redirect } from "next/navigation";
import { deleteFeatured, moveFeatured, saveFeatured, setFeaturedActive, setFeaturedSection } from "../../video-actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { FeaturedKindFields } from "@/components/admin/FeaturedKindFields";
import { PagesPicker } from "@/components/admin/PagesPicker";
import { Badge, Card, Empty, Field, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { FEATURED_SWITCH } from "@/lib/data";
import { db } from "@/lib/db";
import { can, canView } from "@/lib/permissions";
import { pageLabel, pageList, todayInIndia } from "@/lib/placements";
import type { CustomPage, Featured, FeaturedKind } from "@/lib/types";
import { formatDate, POST_TYPE_LABEL } from "@/lib/utils";

export const metadata = { title: "Featured" };

const KIND_LABEL: Record<FeaturedKind, string> = { post: "Post", video: "Video", person: "Team member", announcement: "Announcement" };

function DetailFields({ f, customPages }: { f?: Featured; customPages: CustomPage[] }) {
  const isAnnouncement = !f || f.kind === "announcement";
  return (
    <>
      <Field label={isAnnouncement ? "Title (required for announcements)" : "Title (optional, replaces the original)"} className="sm:col-span-2">
        <input name="title" maxLength={160} defaultValue={f?.title} className="field" />
      </Field>
      <Field label="Short description" hint="Shown on the card. Leave empty to use the original summary." className="sm:col-span-2">
        <textarea name="text" rows={2} maxLength={400} defaultValue={f?.text} className="field" />
      </Field>
      {isAnnouncement && (
        <>
          <Field label="Link" hint="A page on this site (e.g. /membership) or a full https:// address."><input name="link" defaultValue={f?.link} className="field" placeholder="/membership" /></Field>
          <Field label="Image" hint="Upload, or paste a Google Drive / image link below."><input type="file" name="image_file" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm" /></Field>
          <Field label="…or image link" className="sm:col-span-2"><input name="image_link" type="url" className="field" placeholder="https://drive.google.com/file/d/…/view" /></Field>
        </>
      )}
      <PagesPicker value={f?.pages ?? "home"} customPages={customPages} />
      <Field label="Start date (optional)"><input name="starts_on" type="date" defaultValue={f?.starts_on} className="field" /></Field>
      <Field label="End date (optional)"><input name="ends_on" type="date" defaultValue={f?.ends_on} className="field" /></Field>
      <Field label="Display order" hint="Lower numbers show first. You can also use the arrows."><input name="sort" type="number" defaultValue={f?.sort ?? 10} className="field" /></Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input type="checkbox" name="active" defaultChecked={f ? f.active : true} className="h-4 w-4 accent-teal" /> Active
      </label>
    </>
  );
}

export default async function FeaturedPage() {
  const user = await requireUser();
  if (!canView(user.role, "featured.manage")) redirect("/admin");
  const manage = can(user.role, "featured.manage");
  const [items, posts, videos, team, sw, customPages] = await Promise.all([
    db.all("featured"), db.all("posts"), db.all("videos"), db.all("team"), db.get("settings", FEATURED_SWITCH), db.all("pages"),
  ]);
  const customPageLabels = new Map(customPages.filter((p) => p.format !== "html").map((p) => [p.id, p.title]));
  const enabled = sw?.value !== "off";
  const list = items.sort((a, b) => a.sort - b.sort || a.created_at.localeCompare(b.created_at));
  const today = todayInIndia();

  const published = posts.filter((p) => p.status === "published" && p.type !== "document");
  const options = {
    posts: published.map((p) => ({ id: p.id, label: `${POST_TYPE_LABEL[p.type]}: ${p.title}${p.visibility === "members" ? " (members only)" : ""}` })),
    videos: videos.filter((v) => v.status === "approved").map((v) => ({ id: v.id, label: v.title })),
    people: team.sort((a, b) => a.sort - b.sort).map((t) => ({ id: t.id, label: `${t.name}${t.designation ? `, ${t.designation}` : ""}` })),
  };
  const refName = (f: Featured) =>
    f.kind === "post" ? posts.find((p) => p.id === f.ref_id)?.title
    : f.kind === "video" ? videos.find((v) => v.id === f.ref_id)?.title
    : f.kind === "person" ? team.find((t) => t.id === f.ref_id)?.name
    : f.title;
  const problem = (f: Featured) => {
    if (f.kind === "post") {
      const p = posts.find((x) => x.id === f.ref_id);
      if (!p) return "The post was deleted";
      if (p.status !== "published") return "The post is not published, so it is hidden";
      if (p.visibility === "members") return "Members only: shown to signed-in members only";
    }
    if (f.kind === "video") {
      const v = videos.find((x) => x.id === f.ref_id);
      if (!v) return "The video was deleted";
      if (v.status !== "approved" || !v.visible) return "The video is not approved or is switched OFF, so it is hidden";
    }
    if (f.kind === "person" && !team.some((t) => t.id === f.ref_id)) return "This person was removed from Our Team";
    if (f.ends_on && f.ends_on < today) return "Ended";
    if (f.starts_on && f.starts_on > today) return `Starts ${formatDate(f.starts_on)}`;
    return "";
  };

  return (
    <>
      <PageHeader title="Featured" description="Highlight posts, videos, announcements and people across the website. Changes appear on the chosen pages automatically." />

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-ink">Featured section <Badge tone={enabled ? "teal" : "grey"}>{enabled ? "ON" : "OFF"}</Badge></p>
            <p className="text-sm text-muted">{enabled ? "Active items appear on their pages." : "Hidden on every page. Your items are kept."}</p>
          </div>
          {manage && (
            <ActionButton variant={enabled ? "ghost" : "primary"} action={setFeaturedSection.bind(null, !enabled)}>
              {enabled ? "Turn the Featured section OFF" : "Turn the Featured section ON"}
            </ActionButton>
          )}
        </div>
      </Card>

      {!manage && <div className="my-8"><Notice>View only. Featured content is managed by the President.</Notice></div>}
      {manage && <div className="my-8">
        <Disclosure summary="Add featured content">
          <AdminForm action={saveFeatured} submitLabel="Add to featured" resetOnSuccess>
            <div className="grid gap-4 sm:grid-cols-2">
              <FeaturedKindFields {...options} />
              <DetailFields customPages={customPages} />
            </div>
          </AdminForm>
        </Disclosure>
      </div>}

      {list.length === 0 ? (
        <Empty>Nothing featured yet.</Empty>
      ) : (
        <ol className="space-y-3">
          {list.map((f, i) => {
            const issue = problem(f);
            return (
              <li key={f.id} className="rounded-2xl border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted">#{i + 1}</span>
                      <Badge>{KIND_LABEL[f.kind]}</Badge>
                      <p className="font-semibold text-ink">{f.title || refName(f) || "—"}</p>
                      <Badge tone={f.active ? "green" : "grey"}>{f.active ? "Active" : "Inactive"}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {pageList(f.pages).map((key) => pageLabel(key, customPageLabels)).join(", ")}
                      {(f.starts_on || f.ends_on) && ` · ${f.starts_on ? formatDate(f.starts_on) : "now"} – ${f.ends_on ? formatDate(f.ends_on) : "no end"}`}
                    </p>
                    {issue && <p className="mt-1 text-xs font-semibold text-coral-700">{issue}</p>}
                  </div>
                  {manage && <div className="flex flex-wrap gap-1">
                    <ActionButton action={moveFeatured.bind(null, f.id, -1)}><span aria-label="Move up">↑</span></ActionButton>
                    <ActionButton action={moveFeatured.bind(null, f.id, 1)}><span aria-label="Move down">↓</span></ActionButton>
                    <ActionButton action={setFeaturedActive.bind(null, f.id, !f.active)}>{f.active ? "Deactivate" : "Activate"}</ActionButton>
                    <ActionButton variant="danger" confirm="Remove this item from featured?" action={deleteFeatured.bind(null, f.id)}>Remove</ActionButton>
                  </div>}
                </div>
                {manage && <div className="mt-3">
                  <Disclosure summary="Edit">
                    <AdminForm action={saveFeatured}>
                      <input type="hidden" name="id" value={f.id} />
                      <div className="grid gap-4 sm:grid-cols-2"><DetailFields f={f} customPages={customPages} /></div>
                    </AdminForm>
                  </Disclosure>
                </div>}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}
