import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import type { Post } from "@/lib/types";
import { cn, formatDate, POST_TYPE_PATH } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  intro,
  image,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  image?: string;
  children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-teal-900 text-white">
      {image && (
        <>
          <Image src={image} alt="" fill priority sizes="100vw" className="-z-20 object-cover opacity-40" />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-teal-950 via-teal-900/90 to-teal-900/40" />
        </>
      )}
      <MountainLine className="absolute bottom-0 left-0 -z-10 w-full text-white/[0.06]" />
      <div className="container-page py-20 sm:py-24 lg:py-28">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-cream">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl text-4xl font-medium leading-[1.08] sm:text-5xl lg:text-6xl">{title}</h1>
        {intro && <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/85">{intro}</p>}
        {children && <div className="mt-8 flex flex-wrap gap-3">{children}</div>}
      </div>
    </section>
  );
}

export function MountainLine({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden className={className} fill="currentColor">
      <path d="M0 160V120l120-50 90 30 150-80 110 60 80-30 170 90 140-70 120 40 160-100 130 80 80-30 90 40v80z" />
    </svg>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "left",
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  align?: "left" | "center";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" && "mx-auto text-center", "max-w-3xl", className)}>
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h2 className="mt-3 text-3xl font-medium leading-tight text-teal sm:text-4xl">{title}</h2>
      {intro && <p className="mt-4 text-lg leading-relaxed text-muted">{intro}</p>}
    </div>
  );
}

export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("group inline-flex items-center gap-1.5 font-semibold text-teal hover:text-coral-700", className)}>
      {children}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
    </Link>
  );
}

export function PostCard({ post }: { post: Post }) {
  const href = post.type === "document" && post.file_url ? post.file_url : `${POST_TYPE_PATH[post.type]}/${post.slug}`;
  const isEvent = post.type === "event";
  return (
    <article className="group flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition-shadow hover:shadow-lg">
      <Link href={href} className="relative block aspect-[16/10] overflow-hidden bg-sage-100">
        {post.cover ? (
          <Image src={post.cover} alt="" fill sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-teal to-teal-700">
            <MountainLine className="absolute bottom-0 w-full text-white/10" />
            <span className="font-display text-3xl text-cream">PAHAD</span>
          </div>
        )}
        {post.category && (
          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-teal">{post.category}</span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-6">
        {isEvent ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-medium text-coral-700">
            {post.event_date && (
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" aria-hidden /> {formatDate(post.event_date)}
              </span>
            )}
            {post.location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" aria-hidden /> {post.location}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted">{formatDate(post.published_at || post.created_at)}</p>
        )}
        <h3 className="mt-2 text-xl font-medium leading-snug text-teal">
          <Link href={href} className="hover:underline">
            {post.title}
          </Link>
        </h3>
        {post.excerpt && <p className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-muted">{post.excerpt}</p>}
        <span className="mt-auto pt-5 text-sm font-semibold text-teal">
          {post.type === "document" ? "Open document" : "Read more"} <ArrowUpRight className="inline h-4 w-4" aria-hidden />
        </span>
      </div>
    </article>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-sage bg-sand/60 px-6 py-12 text-center">
      <h3 className="text-xl font-medium text-teal">{title}</h3>
      {children && <div className="mx-auto mt-2 max-w-xl text-muted">{children}</div>}
    </div>
  );
}

export function CtaBand({
  title = "Bring your ideas. Make a contribution.",
  text = "Whether you bring experience, skills, ideas, time or knowledge, there is value in contributing to a stronger and more connected community.",
}: {
  title?: string;
  text?: string;
}) {
  return (
    <section className="container-page py-20">
      <div className="relative isolate overflow-hidden rounded-[2rem] bg-teal px-6 py-14 text-white sm:px-12 lg:flex lg:items-center lg:justify-between lg:gap-10">
        <MountainLine className="absolute bottom-0 left-0 -z-10 w-full text-white/[0.07]" />
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cream">Be part of the journey</p>
          <h2 className="mt-3 text-3xl font-medium sm:text-4xl">{title}</h2>
          <p className="mt-4 text-white/85">{text}</p>
        </div>
        <div className="mt-8 flex flex-wrap gap-3 lg:mt-0 lg:shrink-0">
          <Link href="/membership" className="btn btn-accent">Become a member</Link>
          <Link href="/get-involved" className="btn btn-outline text-white">Ways to get involved</Link>
        </div>
      </div>
    </section>
  );
}
