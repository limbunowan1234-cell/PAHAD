import { Suspense } from "react";
import { DetailSkeleton, PostDetail } from "@/components/site/posts";

export default function Page({ params }: PageProps<"/news/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PostDetail params={params} type="news" />
    </Suspense>
  );
}
