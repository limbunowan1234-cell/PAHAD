import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { storyMoments } from "@/lib/content";
import { PageHero, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Our Story",
  description:
    "PAHAD is an independent organisation that builds on the work of DSSCOLONY. The two share a history that began on 24 June 2018, but they are separate organisations.",
};

export default function OurStoryPage() {
  return (
    <>
      <PageHero
        eyebrow="A shared history · since 24 June 2018"
        title="Built on the work that came before."
        intro="PAHAD is a separate, independent organisation. It builds on the work and experience of DSSCOLONY, a student-led group founded on 24 June 2018. The two share a history; they are different organisations."
        page="our-story"
      >
        <Link href="/membership" className="btn btn-accent">Join PAHAD</Link>
      </PageHero>

      <section className="container-page grid gap-12 py-20 lg:grid-cols-2 lg:py-24">
        <SectionHeading eyebrow="Where the work began" title="DSSCOLONY: students who gave what they had." />
        <div className="space-y-5 text-lg leading-relaxed text-muted">
          <p>
            DSSCOLONY began on 24 June 2018 as a group of students with limited resources, no dedicated funding and plenty of challenges. Through
            meetings, creative events, videos and community care, they found ways to make things happen and to support people in need.
          </p>
          <p>
            That work, and the experience and relationships it created, is part of the history PAHAD draws on today.
          </p>
        </div>
      </section>

      <section className="bg-sand py-20 lg:py-24">
        <div className="container-page">
          <SectionHeading eyebrow="Moments from the shared history" title="The work that inspired PAHAD." />
          <ol className="relative mt-14 space-y-12 before:absolute before:left-[15px] before:top-2 before:h-full before:w-0.5 before:bg-line md:before:left-1/2">
            {storyMoments.map((m, i) => (
              <li key={m.title} className="relative grid gap-6 pl-12 md:grid-cols-2 md:gap-12 md:pl-0">
                <span className="absolute left-0 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-coral text-xs font-bold text-ink md:left-1/2 md:-translate-x-1/2">
                  {i + 1}
                </span>
                <div className={i % 2 ? "md:order-2 md:pl-12" : "md:pr-12 md:text-right"}>
                  <h3 className="text-2xl font-medium text-teal">{m.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{m.text}</p>
                </div>
                <div className={`relative aspect-[16/10] overflow-hidden rounded-[var(--radius-card)] ${i % 2 ? "md:order-1 md:mr-12" : "md:ml-12"}`}>
                  <Image src={m.image} alt={m.title} fill sizes="(min-width:768px) 40vw, 100vw" className="object-cover" />
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="container-page grid gap-12 py-20 lg:grid-cols-2 lg:py-24">
        <div>
          <SectionHeading eyebrow="PAHAD and DSSCOLONY" title="One shared history. Two separate organisations." />
          <p className="mt-5 leading-relaxed text-muted">
            DSSCOLONY showed what a willingness to begin, experiment and collaborate could achieve. PAHAD is a new and independent organisation,
            with its own constitution, governance and membership, built on the lessons of that work.
          </p>
          <p className="mt-4 leading-relaxed text-muted">
            A lasting institution needs a strong foundation, responsible leadership and a purpose that continues beyond any one person. PAHAD looks
            towards education, research, skill development, livelihoods, culture, community institutions and enterprise.
          </p>
        </div>
        <div className="flex flex-col justify-center rounded-[2rem] bg-teal p-8 text-white sm:p-12">
          <p className="font-display text-2xl leading-snug">
            Everyone who shares PAHAD’s purpose is welcome, including people who were part of DSSCOLONY.
          </p>
          <p className="mt-6 text-white/85">
            Whether you bring experience, skills, ideas or simply a willingness to take part, there is a place for you in PAHAD’s work.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/membership" className="btn btn-accent">Become a PAHAD member</Link>
            <Link href="/gallery" className="btn btn-outline text-white">See the archive</Link>
          </div>
        </div>
      </section>
    </>
  );
}
