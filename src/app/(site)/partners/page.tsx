import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ExternalLink } from "lucide-react";
import { getPartners } from "@/lib/data";
import { PageHero, SectionHeading } from "@/components/site/ui";
import { pageMetadata } from "@/lib/seo";
import { PageFeatures } from "@/components/site/PageFeatures";

export const metadata: Metadata = pageMetadata({
  title: "Partners",
  description:
    "PAHAD's media and news partners, Gorkha TV and Khabar Darjeeling, and how organisations can collaborate with PAHAD.",
  path: "/partners",
});

async function PartnerList() {
  const partners = await getPartners();
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {partners.map((p) => (
        <article key={p.id} className="flex flex-col overflow-hidden rounded-[2rem] border border-line">
          <div className={`flex h-56 items-center justify-center p-10 ${p.dark_logo ? "bg-teal-950" : "bg-white"}`}>
            {p.logo ? (
              <Image src={p.logo} alt={`${p.name} logo`} width={360} height={200} className="max-h-36 w-auto object-contain" />
            ) : (
              <span className="font-display text-3xl text-teal">{p.name}</span>
            )}
          </div>
          <div className="flex flex-1 flex-col border-t border-line p-8">
            <p className="eyebrow">{p.role}</p>
            <h2 className="mt-2 text-3xl font-medium text-teal">{p.name}</h2>
            <p className="mt-3 flex-1 leading-relaxed text-muted">{p.description}</p>
            <a href={p.url} target="_blank" rel="noopener noreferrer" className="btn btn-primary mt-6 self-start">
              Visit {p.url.replace(/^https?:\/\//, "")} <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </article>
      ))}
    </div>
  );
}

export default function PartnersPage() {
  return (
    <>
      <PageHero
        page="partners"
        eyebrow="Partners"
        title="Stronger together."
        intro="PAHAD works with partners who share a commitment to the people, voices and stories of the hills."
      />
      <section className="container-page py-16">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-[2rem] bg-sand" />}>
          <PartnerList />
        </Suspense>
      </section>
      <section className="bg-sand py-20">
        <div className="container-page grid gap-10 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            eyebrow="Partner with PAHAD"
            title="Collaboration, not duplication."
            intro="Community groups, institutions, researchers, media and organisations can explore areas of shared interest with PAHAD."
          />
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link href="/get-involved#share" className="btn btn-primary">Propose a collaboration</Link>
            <Link href="/contact" className="btn btn-outline text-teal">Contact us</Link>
          </div>
        </div>
      </section>
      <PageFeatures page="partners" />
    </>
  );
}
