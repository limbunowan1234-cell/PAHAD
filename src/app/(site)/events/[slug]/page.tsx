import { Suspense } from "react";
import { DetailSkeleton, PostDetail } from "@/components/site/posts";

export default function Page({ params }: PageProps<"/events/[slug]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <PostDetail params={params} type="event" />
    </Suspense>
  );
}
