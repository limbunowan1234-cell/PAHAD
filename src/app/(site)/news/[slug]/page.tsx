import { Suspense } from "react";
import { DetailSkeleton, PostDetail, postMetadata } from "@/components/site/posts";

export function generateMetadata({ params }: PageProps<"/news/[slug]">) {
  return postMetadata(params, "news");
}

export default function Page({ params }: PageProps<"/news/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PostDetail params={params} type="news" />
    </Suspense>
  );
}
