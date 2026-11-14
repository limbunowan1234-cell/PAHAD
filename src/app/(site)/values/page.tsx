import type { Metadata } from "next";
import { principles, values } from "@/lib/content";
import { CtaBand, PageHero, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Values & Principles",
  description: "The values that guide PAHAD and the working principles that shape its decisions, programmes and partnerships.",
};

export default function ValuesPage() {
  return (
    <>
      <PageHero
        eyebrow="The way we work · the standards we uphold"
        title="Values that guide us. Principles that shape our work."
        intro="Meaningful development begins with people, grows through knowledge and becomes real through responsible collective action."
        image="/images/general-meeting.jpg"
      />

      <section className="container-page py-20 lg:py-24">
        <SectionHeading
          eyebrow="What we value"
          title="The values we stand for."
          intro="A shared compass for how PAHAD listens, learns, works with others and contributes to community progress."
        />
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {values.map((v, i) => (
            <article key={v.title} className="flex flex-col rounded-[var(--radius-card)] border border-line p-7">
              <span className="text-sm font-bold text-coral-700">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-2 text-xl font-medium text-teal">{v.title}</h3>
              <p className="mt-3 flex-1 leading-relaxed text-muted">{v.text}</p>
              <p className="mt-5 text-xs font-bold uppercase tracking-[0.14em] text-sage">{v.motto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-sand py-20 lg:py-24">
        <div className="container-page">
          <SectionHeading eyebrow="Putting values into practice" title="Our working principles." intro="These guide how we plan, decide, deliver work and relate to people and institutions." />
          <ol className="mt-12 grid gap-x-10 gap-y-2 md:grid-cols-2">
            {principles.map((p, i) => (
              <li key={p.title} className="flex gap-5 border-b border-line py-6">
                <span className="font-display text-3xl text-coral-700">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-xl font-medium text-teal">{p.title}</h3>
                  <p className="mt-1 leading-relaxed text-muted">{p.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <CtaBand title="Values are meaningful when they shape what we do." text="We invite members, volunteers, partners and communities to help put these values into practice." />
    </>
  );
}
