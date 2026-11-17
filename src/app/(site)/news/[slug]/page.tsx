import { Suspense } from "react";
import { DetailSkeleton, PostDetail, postMetadata, postStaticParams } from "@/components/site/posts";

export function generateStaticParams() {
  return postStaticParams("news");
}

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
