import type { Metadata } from "next";
import { coreValues, cycle, objectives } from "@/lib/content";
import { CtaBand, PageHero, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Vision & Mission",
  description: "From local potential to regional progress: PAHAD's vision, mission and development objectives.",
};

export default function VisionMissionPage() {
  return (
    <>
      <PageHero
        eyebrow="Our direction · our purpose"
        title="From local potential to regional progress."
        intro="A stronger future begins when people, knowledge and resources come together, and communities have the power to shape what happens next."
        image="/images/hero.jpg"
      />

      <section className="container-page py-20 lg:py-24">
        <div className="grid gap-8 lg:grid-cols-2">
          <article className="rounded-[2rem] bg-cream p-8 sm:p-12">
            <p className="eyebrow">01 · The future we seek</p>
            <h2 className="mt-3 text-3xl font-medium text-teal">Our Vision</h2>
            <p className="mt-6 font-display text-2xl leading-snug text-teal">
              “A self-reliant, knowledgeable, inclusive and thriving society where people and communities can realise their potential, create
              opportunities, contribute meaningfully and shape a sustainable future.”
            </p>
          </article>
          <article className="rounded-[2rem] bg-teal p-8 text-white sm:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cream">02 · What we do</p>
            <h2 className="mt-3 text-3xl font-medium">Our Mission</h2>
            <p className="mt-6 text-lg leading-relaxed text-white/90">
              To advance holistic regional development by connecting people, strengthening communities, mobilising local knowledge and resources,
              promoting innovation and enterprise, and fostering collaboration among individuals, communities and institutions for sustainable and
              inclusive progress.
            </p>
            <p className="mt-8 text-sm font-semibold tracking-[0.14em] text-cream">CONNECT → STRENGTHEN → MOBILISE → ADVANCE</p>
          </article>
        </div>
        <p className="mx-auto mt-14 max-w-3xl text-center font-display text-2xl leading-snug text-teal">
          Our region’s greatest strength is not only what it has, but what its people can achieve together.
        </p>
      </section>

      <section className="bg-sand py-20 lg:py-24">
        <div className="container-page">
          <SectionHeading
            eyebrow="Where we focus"
            title="Development is connected."
            intro="Progress in one area affects many others. Our seven development objectives bring these dimensions together rather than treating them as separate challenges."
          />
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {objectives.map((o, i) => (
              <div key={o.title} className="rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-line">
                <span className="text-sm font-bold text-coral-700">0{i + 1}</span>
                <h3 className="mt-2 text-xl font-medium text-teal">{o.title}</h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-sage">{o.tag}</p>
                <p className="mt-3 text-[15px] leading-relaxed text-muted">{o.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page py-20 lg:py-24">
        <SectionHeading align="center" eyebrow="How we work" title="Connect. Build. Move forward." intro="We start with what people and communities already have, then work together to turn potential into progress." />
        <ol className="mt-12 grid gap-4 md:grid-cols-5">
          {cycle.map((c, i) => (
            <li key={c.title} className="rounded-[var(--radius-card)] border border-line p-6 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal font-display text-lg text-white">{i + 1}</span>
              <p className="mt-4 font-display text-xl text-teal">{c.title}</p>
              <p className="mt-2 text-sm text-muted">{c.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-center text-sm font-semibold uppercase tracking-[0.14em] text-coral-700">Learn from results · improve · adapt · begin again</p>
      </section>

      <section className="bg-teal py-20 text-white">
        <div className="container-page grid gap-10 lg:grid-cols-[1fr_2fr] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-cream">What we stand for</p>
            <h2 className="mt-3 text-3xl font-medium sm:text-4xl">Four values guide us.</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {coreValues.map((v) => (
              <div key={v.title} className="rounded-2xl bg-white/10 p-5">
                <p className="font-display text-2xl text-cream">{v.title}</p>
                <p className="mt-2 text-sm text-white/85">{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CtaBand title="Stronger communities. Advancing together." />
    </>
  );
}
