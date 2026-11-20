import Link from "next/link";
import { redirect } from "next/navigation";
import { PostEditor } from "@/components/admin/PostEditor";
import { PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { can, canPublish, canSubmitVideos } from "@/lib/permissions";
import { loadStructure, pickableUnits } from "@/lib/structure";

export const metadata = { title: "New content" };

export default async function NewContentPage() {
  const user = await requireUser();
  if (!can(user.role, "content.create")) redirect("/admin");
  const s = await loadStructure();
  return (
    <>
      <PageHeader title="New content" actions={<Link href="/admin/content" className="text-sm font-semibold text-teal">← All content</Link>} />
      <PostEditor
        canPublish={canPublish(s, user, { author_id: user.id, directorate: user.directorate, unit: user.unit })}
        units={pickableUnits(s, user)}
        // Videos live in their own module; offer it here to the President and members allowed to submit.
        videoHref={canSubmitVideos(user) ? "/admin/videos?new=1" : undefined}
      />
    </>
  );
}
