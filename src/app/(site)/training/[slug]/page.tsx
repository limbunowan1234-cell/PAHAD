import { Suspense } from "react";
import { DetailSkeleton, PostDetail, postMetadata, postStaticParams } from "@/components/site/posts";

export function generateStaticParams() {
  return postStaticParams("training");
}

export function generateMetadata({ params }: PageProps<"/training/[slug]">) {
  return postMetadata(params, "training");
}

export default function Page({ params }: PageProps<"/training/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PostDetail params={params} type="training" />
    </Suspense>
  );
}
