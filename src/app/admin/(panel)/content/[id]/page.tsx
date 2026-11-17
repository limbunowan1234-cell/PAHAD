import Link from "next/link";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { canEditPost, canPublish } from "@/lib/permissions";
import { loadStructure, pickableUnits } from "@/lib/structure";

export const metadata = { title: "Edit content" };

export default async function EditContentPage({ params }: PageProps<"/admin/content/[id]">) {
  const user = await requireUser();
  const { id } = await params;
  const post = await db.get("posts", id);
  if (!post) notFound();
  const s = await loadStructure();
  const allowed = canEditPost(s, user, post);
  return (
    <>
      <PageHeader title="Edit content" actions={<Link href="/admin/content" className="text-sm font-semibold text-teal">← All content</Link>} />
      {allowed ? (
        <PostEditor post={post} canPublish={canPublish(s, user, post)} units={pickableUnits(s, user)} />
      ) : (
        <Notice tone="warn">You can’t edit this item. Ask the Chief Executive Director, General Secretary or President for changes.</Notice>
      )}
    </>
  );
}
