import { Suspense } from "react";
import { DetailSkeleton, PostDetail, postMetadata, postStaticParams } from "@/components/site/posts";

export function generateStaticParams() {
  return postStaticParams("programme");
}

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
