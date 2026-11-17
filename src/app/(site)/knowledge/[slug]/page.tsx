import { Suspense } from "react";
import { DetailSkeleton, PostDetail, postMetadata, postStaticParams } from "@/components/site/posts";

export function generateStaticParams() {
  return postStaticParams("resource");
}

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
