import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { getKhabarHeadlines, KHABAR_URL } from "@/lib/khabar";
import { formatDate } from "@/lib/utils";
import { MountainLine } from "./ui";

/** Latest Khabar Darjeeling headlines; each card opens the article on khabardarjeeling.in. */
export async function KhabarNews({ limit = 12 }: { limit?: number }) {
  const items = (await getKhabarHeadlines()).slice(0, limit);
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="khabar-heading" className="bg-sand py-16">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image src="/partners/khabar-darjeeling.jpg" alt="" width={56} height={56} className="h-14 w-14 rounded-full bg-white" />
            <div>
              <p className="eyebrow">From our news partner</p>
              <h2 id="khabar-heading" className="mt-1 text-3xl font-medium text-teal">Latest from Khabar Darjeeling</h2>
            </div>
          </div>
          <a href={KHABAR_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-semibold text-teal hover:text-coral-700">
            More news on khabardarjeeling.in <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </div>
        <ul className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((n) => (
            <li key={n.link}>
              <a href={n.link} target="_blank" rel="noopener" className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition-shadow hover:shadow-lg">
                <span className="relative block aspect-[16/10] overflow-hidden bg-sage-100">
                  {n.image ? (
                    <Image src={n.image} alt="" fill sizes="(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <span className="flex h-full items-center justify-center bg-gradient-to-br from-teal to-teal-700">
                      <MountainLine className="absolute bottom-0 w-full text-white/10" />
                      <span className="font-display text-2xl text-cream">Khabar Darjeeling</span>
                    </span>
                  )}
                  {n.category && <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-teal">{n.category}</span>}
                </span>
                <span className="flex flex-1 flex-col p-6">
                  {n.date && <span className="text-sm text-muted">{formatDate(n.date)}</span>}
                  <span className="mt-2 text-xl font-medium leading-snug text-teal group-hover:underline">{n.title}</span>
                  {n.excerpt && <span className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-muted">{n.excerpt}</span>}
                  <span className="mt-auto pt-5 text-sm font-semibold text-teal">
                    Read on Khabar Darjeeling <ArrowUpRight className="inline h-4 w-4" aria-hidden />
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function KhabarNewsSkeleton() {
  return (
    <div className="bg-sand py-16">
      <div className="container-page grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-96 animate-pulse rounded-[var(--radius-card)] bg-white" />
        ))}
      </div>
    </div>
  );
}
