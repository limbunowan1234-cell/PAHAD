import Link from "next/link";
import { Plus } from "lucide-react";
import { deletePost, setPostStatus } from "../../actions";
import { ActionButton } from "@/components/admin/client";
import { Badge, Empty, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, canEditPost, canPublish, inScope } from "@/lib/permissions";
import type { PostStatus, PostType } from "@/lib/types";
import { cn, formatDate, POST_TYPE_LABEL, POST_TYPE_PATH } from "@/lib/utils";

export const metadata = { title: "Content" };

const STATUS_TONE = { published: "green", pending: "amber", draft: "grey" } as const;
const STATUS_LABEL = { published: "Published", pending: "Awaiting review", draft: "Draft" };

export default async function ContentPage({ searchParams }: PageProps<"/admin/content">) {
  const user = await requireUser();
  const sp = await searchParams;
  const type = (typeof sp.type === "string" ? sp.type : "") as PostType | "";
  const status = (typeof sp.status === "string" ? sp.status : "") as PostStatus | "";
  const saved = typeof sp.saved === "string" ? sp.saved : "";

  const all = await db.all("posts");
  // Directorate Heads see their own directorate's content and their own items only.
  const visible = all.filter((p) => user.role !== "directorate_head" || p.author_id === user.id || inScope(user, p.directorate));
  const rows = visible.filter((p) => (!type || p.type === type) && (!status || p.status === status));

  const chip = (label: string, params: Record<string, string>, active: boolean) => (
    <Link
      href={{ pathname: "/admin/content", query: Object.fromEntries(Object.entries({ type, status, ...params }).filter(([, v]) => v)) }}
      className={cn("rounded-full px-3 py-1.5 text-sm font-medium", active ? "bg-teal text-white" : "bg-white text-teal ring-1 ring-line hover:bg-cream")}
    >
      {label}
    </Link>
  );

  return (
    <>
      <PageHeader
        title="Content"
        description="News, events, programmes, knowledge resources and official documents."
        actions={
          <Link href="/admin/content/new" className="btn btn-primary !py-2.5">
            <Plus className="h-4 w-4" aria-hidden /> New content
          </Link>
        }
      />
      {saved && <Notice>{saved}</Notice>}
      {user.role === "editor" && (
        <Notice tone="warn">At General level, what you upload is sent for review and appears on the website once a publisher approves it.</Notice>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {chip("All types", { type: "" }, !type)}
        {(Object.keys(POST_TYPE_LABEL) as PostType[]).map((t) => chip(POST_TYPE_LABEL[t], { type: t }, type === t))}
      </div>
      <div className="mb-6 flex flex-wrap gap-2">
        {chip("Any status", { status: "" }, !status)}
        {(["pending", "published", "draft"] as PostStatus[]).map((s) => chip(STATUS_LABEL[s], { status: s }, status === s))}
      </div>

      {rows.length === 0 ? (
        <Empty>{type || status ? "No items match this filter." : "Nothing here yet. Create the first item with “New content”."}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-line bg-sand/60 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Author</th>
                <th className="px-4 py-3">Updated</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((p) => {
                const editable = canEditPost(user, p);
                const publishable = canPublish(user, p);
                return (
                  <tr key={p.id} className="align-top">
                    <td className="max-w-xs px-4 py-3">
                      <p className="font-medium text-ink">{p.title}</p>
                      {p.status === "published" && (
                        <a href={p.type === "document" ? p.file_url : `${POST_TYPE_PATH[p.type]}/${p.slug}`} target="_blank" className="text-xs text-teal underline">
                          View on site
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted">{POST_TYPE_LABEL[p.type]}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[p.status]}>{STATUS_LABEL[p.status]}</Badge></td>
                    <td className="px-4 py-3 text-muted">
                      {p.author_name}
                      {p.directorate && <span className="block text-xs">{p.directorate}</span>}
                    </td>
                    <td className="px-4 py-3 text-muted">{formatDate(p.updated_at || p.created_at, { day: "numeric", month: "short", year: "numeric" })}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-1">
                        {editable && <Link href={`/admin/content/${p.id}`} className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-teal hover:bg-sand">Edit</Link>}
                        {publishable && p.status !== "published" && (
                          <ActionButton variant="primary" action={setPostStatus.bind(null, p.id, "published")}>Publish</ActionButton>
                        )}
                        {publishable && p.status === "published" && (
                          <ActionButton action={setPostStatus.bind(null, p.id, "draft")}>Unpublish</ActionButton>
                        )}
                        {can(user.role, "content.delete") && (
                          <ActionButton variant="danger" confirm={`Delete “${p.title}”? This cannot be undone.`} action={deletePost.bind(null, p.id)}>
                            Delete
                          </ActionButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
