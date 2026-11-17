import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft, CalendarDays, ClipboardList, Download, LockKeyhole, MapPin } from "lucide-react";
import { googleFormEmbedUrl } from "@/lib/drive";
import { getMembersOnlyPosts, getPostBySlug, getPublishedPosts, isPublicPost } from "@/lib/data";
import { pageMetadata } from "@/lib/seo";
import type { Post, PostType } from "@/lib/types";
import { formatDate, POST_TYPE_LABEL, POST_TYPE_PATH } from "@/lib/utils";
import { absoluteUrl, JsonLd, organizationId } from "./JsonLd";
import { MembersOnly, MembersOnlySkeleton } from "./MembersOnly";
import { EmptyState, PostCard } from "./ui";

/** A search-friendly summary: the excerpt, or the start of the body without formatting marks. */
function summary(post: Post, max = 160) {
  const text = (post.excerpt || post.body)
    .replace(/^#+\s|^-\s/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).replace(/\s+\S*$/, "")}…` : text;
}

/**
 * Posts to prerender at build time. Others are rendered on their first visit and then cached.
 * Cache Components needs at least one entry, so a type with no posts yet returns a placeholder
 * slug that renders the not-found page.
 */
export async function postStaticParams(type: PostType): Promise<{ slug: string }[]> {
  try {
    const slugs = (await getPublishedPosts(type)).map((p) => p.slug).filter(Boolean);
    if (slugs.length) return slugs.map((slug) => ({ slug }));
  } catch (error) {
    console.error(`generateStaticParams(${type}): could not load posts`, error);
  }
  return [{ slug: "_none" }];
}

/** Title, description, canonical URL and share card for a post's detail page. */
export async function postMetadata(params: Promise<{ slug: string }>, type: PostType): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post || post.type !== type) return { title: "Not found", robots: { index: false } };
  if (!isPublicPost(post)) {
    // Members Only: keep the content out of search engines and link previews.
    return {
      ...pageMetadata({ title: post.title, description: "A post for PAHAD members. Sign in to read it.", path: `${POST_TYPE_PATH[type]}/${post.slug}` }),
      robots: { index: false, follow: false },
    };
  }
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
  const membersOnly = !isPublicPost(post);
  return (
    <article>
      {!membersOnly && <JsonLd data={postJsonLd(post, type)} />}
      <header className="bg-teal-900 text-white">
        <div className="container-page max-w-4xl py-16 sm:py-20">
          <Link href={back} className="inline-flex items-center gap-2 text-sm text-cream hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to {type === "training" ? "training" : `${POST_TYPE_LABEL[type].toLowerCase()}s`}
          </Link>
          <p className="mt-6 flex flex-wrap items-center gap-3 text-xs font-bold uppercase tracking-[0.18em] text-cream">
            {post.category || POST_TYPE_LABEL[type]}
            {membersOnly && <MembersBadge />}
          </p>
          <h1 className="mt-3 text-4xl font-medium leading-tight sm:text-5xl">{post.title}</h1>
          {post.excerpt && !membersOnly && <p className="mt-5 text-lg text-white/85">{post.excerpt}</p>}
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
        {membersOnly ? (
          <Suspense fallback={<MembersOnlySkeleton />}>
            <MembersOnly next={`${back}/${post.slug}`} post={post}>
              {post.excerpt && <p className="mb-8 text-xl text-muted">{post.excerpt}</p>}
              <PostBody post={post} type={type} />
            </MembersOnly>
          </Suspense>
        ) : (
          <PostBody post={post} type={type} />
        )}
      </div>
    </article>
  );
}

export function MembersBadge({ tone = "dark" }: { tone?: "dark" | "light" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
        tone === "dark" ? "bg-white/15 text-cream" : "bg-cream text-teal-900"
      }`}
    >
      <LockKeyhole className="h-3 w-3" aria-hidden /> Members only
    </span>
  );
}

/** The readable part of a post. For Members Only posts this renders only inside <MembersOnly>. */
function PostBody({ post, type }: { post: Post; type: PostType }) {
  return (
    <>
      {post.cover && (
        <div className="relative -mt-4 mb-10 aspect-[16/9] overflow-hidden rounded-[var(--radius-card)]">
          <Image src={post.cover} alt="" fill preload sizes="(min-width:1024px) 900px, 100vw" className="object-cover" />
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
    </>
  );
}

/** Members Only posts of a type, listed for signed-in visitors only. Wrap in <Suspense>. */
export async function MembersOnlyGrid({ type }: { type: PostType }) {
  return (
    <MembersOnly next={POST_TYPE_PATH[type]} fallback={null}>
      <MembersOnlyList type={type} />
    </MembersOnly>
  );
}

async function MembersOnlyList({ type }: { type: PostType }) {
  const posts = await getMembersOnlyPosts(type);
  if (posts.length === 0) return null;
  return (
    <section aria-labelledby={`members-${type}`} className="mt-14">
      <h2 id={`members-${type}`} className="flex items-center gap-3 text-2xl font-medium text-teal">
        For members <MembersBadge tone="light" />
      </h2>
      <p className="mt-1 text-muted">Only visible because you are signed in.</p>
      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </section>
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
