import type { Metadata } from "next";
import Image from "next/image";
import { ecosystem, workAreas } from "@/lib/content";
import { site } from "@/lib/site";
import { CtaBand, PageHero, SectionHeading, TextLink } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "About PAHAD",
  description: "Rooted in our communities, connected by possibility. Learn who PAHAD is, why it exists and how it works.",
};

export default function AboutPage() {
  return (
    <>
      <PageHero
        eyebrow="About the organisation"
        title={<>Rooted in our communities. Connected by possibility.</>}
        intro="PAHAD brings people, knowledge and collective action together to strengthen communities, recognise local potential and contribute to a more inclusive, capable and self-reliant society."
        image="/images/hills-mural.jpg"
      />

      <section className="container-page grid gap-12 py-20 lg:grid-cols-2 lg:py-24">
        <SectionHeading eyebrow="Who we are" title="A shared purpose. A collective future." />
        <div className="space-y-5 text-lg leading-relaxed text-muted">
          <p>
            <strong className="text-ink">{site.fullName}</strong> is an independent, non-partisan, non-profit community development institution.
          </p>
          <p>
            We bring individuals, communities, professionals, institutions and organisations onto a common platform where knowledge can be shared,
            capabilities strengthened, relationships developed and practical opportunities explored.
          </p>
          <p>
            Our approach begins with people and the realities of the communities they are part of. Meaningful development grows through
            participation, mutual respect, learning, cooperation and purposeful action.
          </p>
        </div>
      </section>

      <section className="bg-sand py-20 lg:py-24">
        <div className="container-page grid items-center gap-12 lg:grid-cols-2">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)]">
            <Image src="/images/hero.jpg" alt="Darjeeling town beneath the Kanchenjunga range" fill sizes="(min-width:1024px) 50vw, 100vw" className="object-cover" />
          </div>
          <div>
            <SectionHeading
              eyebrow="Our geographical roots"
              title="Grounded in the hills and their wider connections."
              intro="PAHAD draws its roots from the diverse communities and landscapes of the Darjeeling and Kalimpong hills, the adjoining Terai and Dooars, and their wider regional connections."
            />
            <p className="mt-5 leading-relaxed text-muted">
              We recognise the different communities, cultures, histories and identities across these areas. Our work is grounded in local realities
              while remaining open to partnership with neighbouring regions, including Sikkim and the wider Himalayan region.
            </p>
            <ul className="mt-6 flex flex-wrap gap-2">
              {site.region.map((r) => (
                <li key={r} className="rounded-full bg-white px-4 py-2 text-sm font-medium text-teal ring-1 ring-line">{r}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="container-page grid gap-12 py-20 lg:grid-cols-2 lg:py-24">
        <SectionHeading eyebrow="Why PAHAD exists" title="Recognising what exists. Building what is possible." />
        <div className="space-y-5 leading-relaxed text-muted">
          <p>
            Every community has strengths, knowledge, skills, resources and people with the potential to contribute. Yet these strengths are not
            always recognised, connected or supported by the opportunities that could help them grow.
          </p>
          <p>
            People may have valuable experience but limited access to networks. Local skills may remain underused. Community initiatives may lack
            support. Institutions working towards similar goals may not know how to connect with one another.
          </p>
          <p>
            PAHAD seeks to bridge these gaps by creating connections, encouraging participation, sharing knowledge and supporting practical
            responses to locally understood needs.
          </p>
        </div>
      </section>

      <section className="bg-teal py-20 text-white lg:py-24">
        <div className="container-page">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cream">The PAHAD ecosystem</p>
          <h2 className="mt-3 max-w-3xl text-3xl font-medium sm:text-4xl">Connections that lead to meaningful action.</h2>
          <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {ecosystem.map((e, i) => (
              <li key={e.title} className="rounded-[var(--radius-card)] bg-white/10 p-6">
                <span className="text-sm font-bold text-coral">0{i + 1}</span>
                <h3 className="mt-2 text-2xl font-medium">{e.title}</h3>
                <p className="mt-2 text-white/85">{e.text}</p>
              </li>
            ))}
          </ol>
          <p className="mt-10 max-w-3xl text-white/85">
            A connection should have the potential to become something useful: a learning opportunity, a mentorship, a livelihood pathway, a
            partnership, a community initiative, a research collaboration or a practical solution.
          </p>
        </div>
      </section>

      <section className="container-page grid gap-12 py-20 lg:grid-cols-2 lg:py-24">
        <div>
          <SectionHeading eyebrow="A human commitment" title="Recognising people. Valuing contributions." />
          <p className="mt-5 leading-relaxed text-muted">
            Every community has people who have dedicated years to their professions, families, traditions and livelihoods, often without the
            recognition they deserve. PAHAD creates space for these contributions to be valued, and for experience to pass between generations.
          </p>
          <blockquote className="mt-8 border-l-4 border-coral pl-5 font-display text-xl italic text-teal">
            Every person should have the opportunity to contribute meaningfully.
          </blockquote>
        </div>
        <div>
          <SectionHeading eyebrow="Our larger purpose" title="Growing towards collective self-reliance." />
          <p className="mt-5 leading-relaxed text-muted">
            Self-reliance does not mean isolation. It means strengthening local capabilities and relationships so people can identify needs, make
            informed choices, mobilise resources and create opportunities, while staying open to cooperation from beyond their communities.
          </p>
          <p className="mt-4 leading-relaxed text-muted">
            PAHAD does not need to own or operate every initiative. Our role is to connect, facilitate, strengthen and support, and to act directly
            with partners where that is useful and appropriate.
          </p>
        </div>
      </section>

      <section className="bg-sand py-20">
        <div className="container-page">
          <SectionHeading eyebrow="Our areas of work" title="Five connected areas." />
          <div className="mt-10 grid gap-4 md:grid-cols-5">
            {workAreas.map((a) => (
              <a key={a.slug} href={`/our-work#${a.slug}`} className="rounded-2xl bg-white p-5 ring-1 ring-line hover:ring-teal">
                <span className="text-xs font-bold text-coral-700">{a.number}</span>
                <p className="mt-1 font-display text-lg leading-snug text-teal">{a.title}</p>
              </a>
            ))}
          </div>
          <div className="mt-8 flex flex-wrap gap-6">
            <TextLink href="/our-work">Explore our work</TextLink>
            <TextLink href="/governance">How we are governed</TextLink>
          </div>
        </div>
      </section>

      <CtaBand title="Your knowledge matters. Your contribution matters." />
    </>
  );
}
