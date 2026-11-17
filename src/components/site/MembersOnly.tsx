import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { canSeePost, TRAINING_AUDIENCE, trainingAudience, type TrainingAudience } from "@/lib/training";
import type { Post } from "@/lib/types";

/**
 * Renders its children only for a signed-in account, checked on the server for every request.
 * Children are never rendered (or sent to the browser) for anyone else.
 * Always wrap in <Suspense>: reading the session makes this part of the page dynamic.
 */
export async function MembersOnly({
  children,
  next,
  fallback,
  post,
}: {
  children: React.ReactNode;
  next: string;
  fallback?: React.ReactNode;
  /** For Training Material: also check the account's level against the post's audience. */
  post?: Pick<Post, "audience" | "author_id">;
}) {
  const user = await getCurrentUser();
  if (user && (!post || canSeePost(user, post))) return <>{children}</>;
  if (user) return fallback === undefined ? <RestrictedPrompt audience={trainingAudience(post?.audience ?? "")} /> : <>{fallback}</>;
  return fallback === undefined ? <MembersOnlyPrompt next={next} /> : <>{fallback}</>;
}

/** Shown to signed-out visitors instead of Members Only content. */
export function MembersOnlyPrompt({ next }: { next: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-sand p-8 text-center sm:p-10">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-cream text-teal">
        <LockKeyhole className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-2xl font-medium text-teal">For PAHAD members</h2>
      <p className="mx-auto mt-2 max-w-md text-muted">This post is only available to registered members. Sign in to read it, or apply to become a member.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={`/admin/login?next=${encodeURIComponent(next)}`} className="btn btn-primary">
          Sign in to read
        </Link>
        <Link href="/membership" className="btn btn-outline text-teal">
          Become a member
        </Link>
      </div>
    </div>
  );
}

export function MembersOnlySkeleton() {
  return <div className="h-64 animate-pulse rounded-[var(--radius-card)] bg-sand" aria-hidden />;
}

/** Shown to signed-in members whose level doesn't include this material. */
function RestrictedPrompt({ audience }: { audience: TrainingAudience }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-sand p-8 text-center sm:p-10">
      <span className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-cream text-teal">
        <LockKeyhole className="h-6 w-6" aria-hidden />
      </span>
      <h2 className="mt-4 text-2xl font-medium text-teal">Not available for your level</h2>
      <p className="mx-auto mt-2 max-w-md text-muted">This material is for: {TRAINING_AUDIENCE[audience]}.</p>
      <Link href="/training" className="btn btn-primary mt-6">Back to training</Link>
    </div>
  );
}
