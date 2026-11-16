import type { Metadata } from "next";
import Image from "next/image";
import { Check } from "lucide-react";
import { workAreas } from "@/lib/content";
import { CtaBand, PageHero, SectionHeading, TextLink } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Our Work",
  description: "People-led action across human development, livelihoods, community development, research and Himalayan sustainability and heritage.",
};

export default function OurWorkPage() {
  return (
    <>
      <PageHero
        eyebrow="Our work"
        title="People-led action for stronger communities."
        intro="PAHAD works across five connected areas. Progress in one supports progress in the others, and our work responds to the needs, capacities and opportunities identified with communities."
        page="our-work"
      />

      <nav aria-label="Areas of work" className="sticky top-[72px] z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="container-page flex gap-2 overflow-x-auto py-3">
          {workAreas.map((a) => (
            <a key={a.slug} href={`#${a.slug}`} className="shrink-0 rounded-full bg-sand px-4 py-2 text-sm font-medium text-teal hover:bg-cream">
              {a.number} {a.title}
            </a>
          ))}
        </div>
      </nav>

      <div className="container-page divide-y divide-line">
        {workAreas.map((a, i) => (
          <section key={a.slug} id={a.slug} className="grid scroll-mt-40 items-center gap-10 py-16 lg:grid-cols-2 lg:gap-16 lg:py-20">
            <div className={i % 2 ? "lg:order-2" : ""}>
              <p className="eyebrow">{a.number} / {a.theme}</p>
              <h2 className="mt-3 text-3xl font-medium text-teal sm:text-4xl">{a.title}</h2>
              <p className="mt-5 text-lg leading-relaxed text-muted">{a.long}</p>
              <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                {a.focus.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cream text-teal">
                      <Check className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <span className="text-ink">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className={`relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] ${i % 2 ? "lg:order-1" : ""}`}>
              <Image src={a.image} alt="" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
            </div>
          </section>
        ))}
      </div>

      <section className="bg-sand py-20">
        <div className="container-page">
          <SectionHeading
            eyebrow="A shared approach"
            title="Collaboration, not duplication."
            intro="We recognise existing community initiatives and institutional efforts, seek practical cooperation and add value where we can."
          />
          <div className="mt-8 flex flex-wrap gap-6">
            <TextLink href="/programmes">See our programmes</TextLink>
            <TextLink href="/knowledge">Knowledge & research</TextLink>
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
