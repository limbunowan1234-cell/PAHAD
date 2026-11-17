import { Suspense } from "react";
import { DetailSkeleton, PostDetail, postMetadata, postStaticParams } from "@/components/site/posts";

export function generateStaticParams() {
  return postStaticParams("event");
}

export function generateMetadata({ params }: PageProps<"/events/[slug]">) {
  return postMetadata(params, "event");
}

export default function Page({ params }: PageProps<"/events/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PostDetail params={params} type="event" />
    </Suspense>
  );
}
