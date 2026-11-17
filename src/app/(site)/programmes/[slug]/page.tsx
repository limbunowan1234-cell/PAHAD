import { Suspense } from "react";
import { DetailSkeleton, PostDetail, postMetadata } from "@/components/site/posts";

export function generateMetadata({ params }: PageProps<"/programmes/[slug]">) {
  return postMetadata(params, "programme");
}

export default function Page({ params }: PageProps<"/programmes/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PostDetail params={params} type="programme" />
    </Suspense>
  );
}
