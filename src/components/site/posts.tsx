import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, ClipboardList, Download, MapPin } from "lucide-react";
import { googleFormEmbedUrl } from "@/lib/drive";
import { getPostBySlug, getPublishedPosts } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
import type { Post, PostType } from "@/lib/types";
import { formatDate, POST_TYPE_LABEL, POST_TYPE_PATH } from "@/lib/utils";
import { absoluteUrl, JsonLd, organizationId } from "./JsonLd";
import { EmptyState, PostCard } from "./ui";

/** A search-friendly summary: the excerpt, or the start of the body without formatting marks. */
function summary(post: Post, max = 160) {
  const text = (post.excerpt || post.body)
    .replace(/^#+\s|^-\s/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : text;
}

/** Title, description, canonical URL and share card for a post's detail page. */
export async function postMetadata(params: Promise<{ slug: string }>, type: PostType): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.type !== type) return { title: "Not found", robots: { index: false } };
  return pageMetadata({
    title: post.title,
    description: summary(post),
    path: `${POST_TYPE_PATH[type]}/${post.slug}`,
    images: post.cover ? [{ url: post.cover, alt: post.title }] : undefined,
    openGraph:
      type === "event"
        ? undefined
        : {
            type: "article",
            publishedTime: post.published_at || post.created_at,
            modifiedTime: post.updated_at || undefined,
            section: post.category || POST_TYPE_LABEL[type],
          },
  });
}

function postJsonLd(post: Post, type: PostType) {
  const url = absoluteUrl(`${POST_TYPE_PATH[type]}/${post.slug}`);
  const image = post.cover ? [absoluteUrl(post.cover)] : undefined;
  if (type === "event") {
    return {
      "@type": "Event",
      name: post.title,
      description: summary(post, 300),
      url,
      image,
      startDate: post.event_date || undefined,
      eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: post.location ? { "@type": "Place", name: post.location, address: post.location } : undefined,
      organizer: { "@id": organizationId },
    };
  }
  return {
    "@type": type === "news" ? "NewsArticle" : "Article",
    headline: post.title,
    description: summary(post, 300),
    url,
    mainEntityOfPage: url,
    image,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at || post.published_at || post.created_at,
    author: post.author_name ? { "@type": "Person", name: post.author_name } : { "@id": organizationId },
    publisher: { "@id": organizationId },
  };
}

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
      <JsonLd data={postJsonLd(post, type)} />
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
        <div className="mt-8 flex flex-wrap gap-3">
          {post.form_url && !googleFormEmbedUrl(post.form_url) && (
            <a href={post.form_url} target="_blank" rel="noopener noreferrer" className="btn btn-accent">
              <ClipboardList className="h-4 w-4" aria-hidden /> {type === "event" ? "Register for this event" : "Open the form"}
            </a>
          )}
          {post.file_url && (
            <a href={post.file_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
              <Download className="h-4 w-4" aria-hidden /> {type === "event" ? "Event details (PDF)" : "Open attachment"}
            </a>
          )}
        </div>
        {post.form_url && googleFormEmbedUrl(post.form_url) && (
          <section className="mt-12" aria-labelledby="form-heading">
            <h2 id="form-heading" className="text-2xl font-medium text-teal">{type === "event" ? "Register for this event" : "Form"}</h2>
            <iframe
              src={googleFormEmbedUrl(post.form_url)!}
              title={`${post.title}: form`}
              className="mt-4 h-[900px] w-full rounded-[var(--radius-card)] border border-line bg-white"
              loading="lazy"
            />
            <a href={post.form_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-teal underline">
              Open the form in a new tab
            </a>
          </section>
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
