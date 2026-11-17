import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/session";
import { getTrainingPosts } from "@/lib/data";
import { canSeePost, TRAINING_AUDIENCE, trainingAudience } from "@/lib/training";
import { GridSkeleton } from "@/components/site/posts";
import { MembersOnlyPrompt } from "@/components/site/MembersOnly";
import { EmptyState, PageHero, PostCard } from "@/components/site/ui";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = {
  ...pageMetadata({
    title: "Training Material",
    description: "Training and learning material for PAHAD members. Sign in to open it.",
    path: "/training",
  }),
  robots: { index: false, follow: false },
};

export default function TrainingPage() {
  return (
    <>
      <PageHero
        eyebrow="For members"
        title="Training material"
        intro="Guides, orientation notes and learning material for PAHAD members. What you see depends on your role in PAHAD."
      />
      <section className="container-page py-16">
        <Suspense fallback={<GridSkeleton />}>
          <TrainingList />
        </Suspense>
      </section>
    </>
  );
}

/** Checked on the server for every request: signed-out visitors see only the sign-in prompt. */
async function TrainingList() {
  const user = await getCurrentUser();
  if (!user) return <MembersOnlyPrompt next="/training" />;
  const posts = (await getTrainingPosts()).filter((p) => canSeePost(user, p));
  if (posts.length === 0) {
    return <EmptyState title="No training material yet">Training material for your level will appear here once it is published.</EmptyState>;
  }
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <div key={p.id} className="flex flex-col">
          <PostCard post={p} />
          {p.audience && <p className="mt-2 px-1 text-xs font-semibold text-coral-700">{TRAINING_AUDIENCE[trainingAudience(p.audience)]}</p>}
        </div>
      ))}
    </div>
  );
}
