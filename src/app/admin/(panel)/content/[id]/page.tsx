import Link from "next/link";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";

export const metadata = { title: "Edit content" };

export default async function EditContentPage({ params }: PageProps<"/admin/content/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const post = await db.get("posts", id);
  if (!post) notFound();
  const allowed = can(user.role, "content.edit_any") || (post.author_id === user.id && post.status !== "published");
  return (
    <>
      <PageHeader title="Edit content" actions={<Link href="/admin/content" className="text-sm font-semibold text-teal">← All content</Link>} />
      {allowed ? (
        <PostEditor post={post} canPublish={can(user.role, "content.publish")} />
      ) : (
        <Notice tone="warn">You can only edit your own items before they are published. Ask an Admin for changes to this one.</Notice>
      )}
    </>
  );
}
