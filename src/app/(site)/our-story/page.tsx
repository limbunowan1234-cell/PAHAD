import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { storyMoments } from "@/lib/content";
import { PageHero, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Our Story",
  description: "From DSSCOLONY in 2018 to PAHAD: the name has changed, the spirit has not.",
};

export default function OurStoryPage() {
  return (
    <>
      <PageHero
        eyebrow="24 June 2018 · the beginning of DSSCOLONY"
        title="We started this together."
        intro="What began as a group of students with limited resources and plenty of challenges is now growing into PAHAD, a holistic development institution."
        image="/images/first-meet-gdns.jpg"
      >
        <Link href="/membership" className="btn btn-accent">Reconnect & join PAHAD</Link>
      </PageHero>

      <section className="container-page grid gap-12 py-20 lg:grid-cols-2 lg:py-24">
        <SectionHeading eyebrow="Do you remember those days?" title="We gave what we had." />
        <div className="space-y-5 text-lg leading-relaxed text-muted">
          <p>
            The conversations, the meetings, the ideas that sometimes seemed too ambitious, the events we organised, the videos we created and the
            people we met.
          </p>
          <p>We were students. We had no dedicated funding. Yet we found ways to make things happen, and to support people in need.</p>
        </div>
      </section>

      <section className="bg-sand py-20 lg:py-24">
        <div className="container-page">
          <SectionHeading eyebrow="Moments we shared" title="Memories that brought us here." />
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
          <SectionHeading eyebrow="From DSSCOLONY to PAHAD" title="The name has changed. The spirit has not." />
          <p className="mt-5 leading-relaxed text-muted">
            DSSCOLONY was a spirit of togetherness: a willingness to begin, experiment, collaborate and believe that ordinary people could create
            something meaningful for their community.
          </p>
          <p className="mt-4 leading-relaxed text-muted">
            Enthusiasm brings people together, but a lasting institution needs a stronger foundation, responsible leadership and a purpose that
            continues beyond any one person. PAHAD now looks towards education, research, skill development, livelihoods, culture, community
            institutions and enterprise.
          </p>
        </div>
        <div className="flex flex-col justify-center rounded-[2rem] bg-teal p-8 text-white sm:p-12">
          <p className="font-display text-2xl leading-snug">
            “PAHAD is not asking you to forget DSSCOLONY. It is inviting you to be part of what DSSCOLONY helped inspire.”
          </p>
          <p className="mt-6 text-white/85">
            Whether you were a founding member, volunteer, creative contributor or someone who believed in the idea, the door is open. We are not
            trying to recreate 2018. We are inviting you to help build what comes next.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/membership" className="btn btn-accent">Become a PAHAD member</Link>
            <Link href="/gallery" className="btn btn-outline text-white">See the archive</Link>
          </div>
          <p className="mt-8 text-sm text-cream">With gratitude for everything we built together, the PAHAD Founding Team</p>
        </div>
      </section>
    </>
  );
}
