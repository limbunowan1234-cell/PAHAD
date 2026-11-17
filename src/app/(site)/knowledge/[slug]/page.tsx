import { Suspense } from "react";
import { DetailSkeleton, PostDetail, postMetadata } from "@/components/site/posts";

export function generateMetadata({ params }: PageProps<"/knowledge/[slug]">) {
  return postMetadata(params, "resource");
}

export default function Page({ params }: PageProps<"/knowledge/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PostDetail params={params} type="resource" />
    </Suspense>
  );
}
