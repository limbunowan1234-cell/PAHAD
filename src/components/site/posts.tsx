import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Download, MapPin } from "lucide-react";
import { getPostBySlug, getPublishedPosts } from "@/lib/data";
import type { PostType } from "@/lib/types";
import { formatDate, POST_TYPE_LABEL, POST_TYPE_PATH } from "@/lib/utils";
import { EmptyState, PostCard } from "./ui";

/** Renders plain-text bodies safely: blank lines = paragraphs, "## " = heading, "- " = bullet. */
export function RichText({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="prose-pahad">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) return <h2 key={i}>{block.slice(3)}</h2>;
        const lines = block.split("\n");
        if (lines.every((l) => l.trim().startsWith("- ")))
          return (
            <ul key={i}>
              {lines.map((l, j) => (
                <li key={j}>{l.trim().slice(2)}</li>
              ))}
            </ul>
          );
        return <p key={i}>{block}</p>;
      })}
    </div>
  );
}

export async function PostGrid({ type, emptyTitle, emptyText }: { type: PostType; emptyTitle: string; emptyText: string }) {
  const posts = await getPublishedPosts(type);
  if (posts.length === 0) return <EmptyState title={emptyTitle}>{emptyText}</EmptyState>;
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} />
      ))}
    </div>
  );
}

export function GridSkeleton() {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-96 animate-pulse rounded-[var(--radius-card)] bg-sand" />
      ))}
    </div>
  );
}

export async function PostDetail({ params, type }: { params: Promise<{ slug: string }>; type: PostType }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.type !== type) notFound();
  const back = POST_TYPE_PATH[type];
  return (
    <article>
      <header className="bg-teal-900 text-white">
        <div className="container-page max-w-4xl py-16 sm:py-20">
          <Link href={back} className="inline-flex items-center gap-2 text-sm text-cream hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to {POST_TYPE_LABEL[type].toLowerCase()}s
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-cream">{post.category || POST_TYPE_LABEL[type]}</p>
          <h1 className="mt-3 text-4xl font-medium leading-tight sm:text-5xl">{post.title}</h1>
          {post.excerpt && <p className="mt-5 text-lg text-white/85">{post.excerpt}</p>}
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/80">
            {type === "event" && post.event_date && (
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" aria-hidden /> {formatDate(post.event_date)}</span>
            )}
            {post.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" aria-hidden /> {post.location}</span>}
            {type !== "event" && <span>{formatDate(post.published_at || post.created_at)}</span>}
            {post.author_name && <span>By {post.author_name}</span>}
          </div>
        </div>
      </header>
      <div className="container-page max-w-4xl py-12">
        {post.cover && (
          <div className="relative -mt-4 mb-10 aspect-[16/9] overflow-hidden rounded-[var(--radius-card)]">
            <Image src={post.cover} alt="" fill priority sizes="(min-width:1024px) 900px, 100vw" className="object-cover" />
          </div>
        )}
        <div className="text-lg">
          <RichText text={post.body} />
        </div>
        {post.file_url && (
          <a href={post.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-8">
            <Download className="h-4 w-4" aria-hidden /> Download attachment
          </a>
        )}
      </div>
    </article>
  );
}

export function DetailSkeleton() {
  return (
    <div>
      <div className="h-72 animate-pulse bg-teal-900" />
      <div className="container-page max-w-4xl space-y-4 py-12">
        <div className="h-6 w-3/4 animate-pulse rounded bg-sand" />
        <div className="h-6 w-full animate-pulse rounded bg-sand" />
        <div className="h-6 w-2/3 animate-pulse rounded bg-sand" />
      </div>
    </div>
  );
}
