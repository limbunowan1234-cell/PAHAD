import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { RichText } from "@/components/site/posts";
import { plusDate, TrustBadge } from "@/components/plus/ui";
import { getPublicCircular } from "@/lib/plus/posts";

export const metadata = { title: "Policy & Assembly Summary" };

async function Circular({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await getPublicCircular(id);
  if (!c) notFound();
  return (
    <article className="mx-auto max-w-2xl rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-sand px-2.5 py-0.5 text-xs font-semibold text-ink">🏛️ Policy &amp; Assembly Summary</span>
        <TrustBadge c={{ source: "pahad", verified: true, flagProof: true }} size="md" />
      </div>
      <p className="mt-3 font-mono text-sm text-teal">{c.number}</p>
      <h1 className="mt-1 font-display text-3xl leading-tight text-teal">{c.title}</h1>
      <p className="mt-1 text-sm text-muted">Issued {plusDate(c.created_at)} by PAHAD</p>
      <div className="mt-5"><RichText text={c.body} /></div>
    </article>
  );
}

export default function PlusCircularPage({ params }: PageProps<"/plus/c/[id]">) {
  return (
    <>
      <Link href="/plus?hub=briefs&type=policy" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-teal"><ArrowLeft className="h-4 w-4" aria-hidden /> Briefs</Link>
      <Suspense fallback={<div className="mx-auto h-96 max-w-2xl animate-pulse rounded-[var(--radius-card)] bg-white" role="status" aria-label="Loading" />}>
        <Circular params={params} />
      </Suspense>
    </>
  );
}
