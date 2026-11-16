import Link from "next/link";
import { redirect } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { can, canPublish } from "@/lib/permissions";

export const metadata = { title: "New content" };

export default async function NewContentPage() {
  const user = await requireUser();
  if (!can(user.role, "content.create")) redirect("/admin");
  return (
    <>
      <PageHeader title="New content" actions={<Link href="/admin/content" className="text-sm font-semibold text-teal">← All content</Link>} />
      <PostEditor canPublish={canPublish(user, { author_id: user.id, directorate: user.directorate })} lockedDirectorate={user.role === "directorate_head" ? user.directorate : undefined} />
    </>
  );
}
