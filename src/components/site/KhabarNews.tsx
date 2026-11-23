import Image from "next/image";
import { ArrowUpRight, MapPin, Star } from "lucide-react";
import { getKhabarNews, KHABAR_REGIONS, KHABAR_URL, type KhabarItem } from "@/lib/khabar";
import { cn, formatDate } from "@/lib/utils";
import { MountainLine } from "./ui";

function NewsCard({ n, big }: { n: KhabarItem; big?: boolean }) {
  return (
    <a href={n.link} target="_blank" rel="noopener" className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-line bg-white transition-shadow hover:shadow-lg">
      <span className={cn("relative block overflow-hidden bg-sage-100", big ? "aspect-[16/9]" : "aspect-[16/10]")}>
        {n.image ? (
          <Image src={n.image} alt="" fill sizes={big ? "(min-width:1024px) 50vw, 100vw" : "(min-width:1024px) 33vw, (min-width:768px) 50vw, 100vw"} className="object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <span className="flex h-full items-center justify-center bg-gradient-to-br from-teal to-teal-700">
            <MountainLine className="absolute bottom-0 w-full text-white/10" />
            <span className="font-display text-2xl text-cream">Khabar Darjeeling</span>
          </span>
        )}
        <span className="absolute left-4 top-4 flex flex-wrap gap-1.5">
          {n.featured && <span className="inline-flex items-center gap-1 rounded-full bg-coral px-3 py-1 text-xs font-bold text-ink"><Star className="h-3.5 w-3.5 fill-current" aria-hidden /> Featured</span>}
          {n.category && <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-teal">{n.category}</span>}
        </span>
      </span>
      <span className="flex flex-1 flex-col p-6">
        <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          <span className="inline-flex items-center gap-1 font-semibold text-coral-700"><MapPin className="h-3.5 w-3.5" aria-hidden /> {n.region}</span>
          {n.date && <span>{formatDate(n.date)}</span>}
        </span>
        <span className={cn("mt-2 font-medium leading-snug text-teal group-hover:underline", big ? "text-2xl" : "text-xl")}>{n.title}</span>
        {n.excerpt && <span className="mt-3 line-clamp-3 text-[15px] leading-relaxed text-muted">{n.excerpt}</span>}
        <span className="mt-auto pt-5 text-sm font-semibold text-teal">
          Read on Khabar Darjeeling <ArrowUpRight className="inline h-4 w-4" aria-hidden />
        </span>
      </span>
    </a>
  );
}

/**
 * Khabar Darjeeling on the News page: Featured stories first, then local news from Darjeeling, Kalimpong, Kurseong
 * and Siliguri (no Sikkim, national or world news). Each card opens the article on khabardarjeeling.in.
 */
export async function KhabarNews({ limit = 12 }: { limit?: number }) {
  const { featured, local } = await getKhabarNews();
  const rest = local.slice(0, limit);
  if (featured.length === 0 && rest.length === 0) return null;
  const places = KHABAR_REGIONS.join(", ").replace(/, (?=[^,]*$)/, " and ");
  return (
    <section aria-labelledby="khabar-heading" className="bg-sand py-16">
      <div className="container-page">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <Image src="/partners/khabar-darjeeling.jpg" alt="" width={56} height={56} className="h-14 w-14 rounded-full bg-white" />
            <div>
              <p className="eyebrow">From our news partner</p>
              <h2 id="khabar-heading" className="mt-1 text-3xl font-medium text-teal">Khabar Darjeeling</h2>
            </div>
          </div>
          <a href={KHABAR_URL} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 font-semibold text-teal hover:text-coral-700">
            More news on khabardarjeeling.in <ArrowUpRight className="h-4 w-4" aria-hidden />
          </a>
        </div>

        {featured.length > 0 && (
          <div className="mt-8">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">Featured</h3>
            <ul className={cn("mt-4 grid gap-6", featured.length === 1 ? "lg:grid-cols-1" : featured.length === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3")}>
              {featured.map((n) => <li key={n.link}><NewsCard n={n} big={featured.length < 3} /></li>)}
            </ul>
          </div>
        )}

        {rest.length > 0 && (
          <div className="mt-12">
            <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-coral-700">News from {places}</h3>
            <ul className="mt-4 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((n) => <li key={n.link}><NewsCard n={n} /></li>)}
            </ul>
          </div>
        )}
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
