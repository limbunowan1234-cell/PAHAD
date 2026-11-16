import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BookOpen, HandHeart, Lightbulb, Users } from "lucide-react";
import { coreValues, cycle, storyMoments, workAreas } from "@/lib/content";
import { getPartners, getPublishedPosts, getUpcomingEvents } from "@/lib/data";
import { site } from "@/lib/site";
import { CtaBand, EmptyState, MountainLine, PostCard, SectionHeading, TextLink } from "@/components/site/ui";

export default function HomePage() {
  return (
    <>
      <Hero />
      <WhoWeAre />
      <WorkAreas />
      <GuidingIdea />
      <Suspense fallback={<FeedSkeleton />}>
        <LatestUpdates />
      </Suspense>
      <Direction />
      <Story />
      <Suspense fallback={null}>
        <PartnersStrip />
      </Suspense>
      <CtaBand />
    </>
  );
}

function Hero() {
  return (
    <section className="relative isolate flex min-h-[calc(100svh-72px)] items-end overflow-hidden bg-teal-950 text-white">
      <Image
        src="/images/hero.jpg"
        alt="Kanchenjunga glowing at sunrise above Darjeeling town"
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-[50%_35%]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-teal-950 via-teal-950/55 to-teal-950/10" />
      <div className="container-page pb-16 pt-32 sm:pb-20">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-cream backdrop-blur">
          A community development institution
        </p>
        <h1 className="mt-6 max-w-4xl text-5xl font-medium leading-[1.02] sm:text-6xl lg:text-7xl">
          People. Knowledge. <span className="text-coral">Action.</span>
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-white/90 sm:text-xl">
          Working with people across the Darjeeling and Kalimpong hills, the Terai, the Dooars and the wider Himalayan region, so communities can shape
          their own future.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link href="/about" className="btn btn-accent">
            Discover PAHAD <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link href="/get-involved" className="btn btn-outline text-white">
            Get involved
          </Link>
        </div>
        <dl className="mt-14 grid max-w-3xl grid-cols-2 gap-6 border-t border-white/20 pt-8 sm:grid-cols-4">
          {[
            ["7", "Development objectives"],
            ["5", "Connected areas of work"],
            ["6", "Directorates"],
            ["Non-profit", "Independent & non-partisan"],
          ].map(([value, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd className="font-display text-3xl text-white">{value}</dd>
              <dd className="mt-1 text-sm text-white/75">{label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function WhoWeAre() {
  return (
    <section className="container-page grid items-center gap-12 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
      <div>
        <SectionHeading
          eyebrow="Who we are"
          title="Working together for community advancement."
          intro="PAHAD — Participatory Action for Holistic Advancement & Development — is an independent, non-partisan, non-profit community development institution."
        />
        <p className="mt-5 text-lg leading-relaxed text-muted">
          We bring individuals, communities, professionals, institutions and organisations onto a common platform where knowledge can be shared,
          capabilities strengthened and practical opportunities explored.
        </p>
        <blockquote className="mt-8 border-l-4 border-coral pl-5 font-display text-xl italic leading-snug text-teal">
          No valuable contribution should go unnoticed. No useful knowledge should go unused.
        </blockquote>
        <div className="mt-8 flex flex-wrap gap-6">
          <TextLink href="/about">About PAHAD</TextLink>
          <TextLink href="/vision-mission">Vision & mission</TextLink>
        </div>
      </div>
      <div className="relative grid grid-cols-5 grid-rows-6 gap-4 sm:h-[520px]">
        <div className="relative col-span-3 row-span-4 min-h-56 overflow-hidden rounded-[var(--radius-card)]">
          <Image src="/images/general-meeting.jpg" alt="PAHAD members together at a general meeting" fill sizes="(min-width:1024px) 30vw, 60vw" className="object-cover" />
        </div>
        <div className="relative col-span-2 row-span-3 min-h-40 overflow-hidden rounded-[var(--radius-card)]">
          <Image src="/images/hills-mural.jpg" alt="A colourful street mural of faces from the hills" fill sizes="(min-width:1024px) 20vw, 40vw" className="object-cover" />
        </div>
        <div className="col-span-2 row-span-3 flex flex-col justify-end rounded-[var(--radius-card)] bg-cream p-5">
          <p className="font-display text-4xl text-teal">5</p>
          <p className="mt-1 text-sm font-medium text-teal">regions we draw our roots from, from the hills to the plains</p>
        </div>
        <div className="col-span-3 row-span-2 flex items-center rounded-[var(--radius-card)] bg-teal p-5 text-white">
          <p className="text-sm leading-relaxed">{site.region.join(" · ")}</p>
        </div>
      </div>
    </section>
  );
}

function WorkAreas() {
  return (
    <section className="bg-sand py-20 lg:py-28">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <SectionHeading eyebrow="Our work" title="Five areas. One shared purpose." intro="These connected areas guide how PAHAD contributes. Progress in one supports progress in the others." />
          <TextLink href="/our-work" className="shrink-0">Explore all our work</TextLink>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {workAreas.map((area, i) => (
            <Link
              key={area.slug}
              href={`/our-work#${area.slug}`}
              className={`group relative isolate flex min-h-80 flex-col justify-end overflow-hidden rounded-[var(--radius-card)] p-6 text-white ${i < 2 ? "lg:col-span-3" : "lg:col-span-2"}`}
            >
              <Image src={area.image} alt="" fill sizes="(min-width:1024px) 40vw, (min-width:640px) 50vw, 100vw" className="-z-20 object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 -z-10 bg-gradient-to-t from-teal-950 via-teal-950/70 to-teal-950/10" />
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cream">
                {area.number} / {area.theme}
              </p>
              <h3 className="mt-2 text-2xl font-medium">{area.title}</h3>
              <p className="mt-2 text-white/85">{area.short}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-coral">
                Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function GuidingIdea() {
  const pillars = [
    { icon: Users, title: "People", tag: "Recognise & connect", text: "Every person has value. We recognise experience, skills, ideas and contributions, and connect people with one another." },
    { icon: BookOpen, title: "Knowledge", tag: "Understand & strengthen", text: "We learn from research, lived experience and local wisdom to understand challenges and discover possibilities." },
    { icon: HandHeart, title: "Action", tag: "Collaborate & create", text: "We turn ideas and connections into collaboration, opportunities, practical solutions and lasting progress." },
  ];
  return (
    <section className="container-page py-20 lg:py-28">
      <SectionHeading align="center" eyebrow="Our guiding idea" title="People. Knowledge. Action." intro="Not just words: they describe how PAHAD understands development and how we intend to work." />
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {pillars.map(({ icon: Icon, title, tag, text }, i) => (
          <div key={title} className="rounded-[var(--radius-card)] border border-line p-8">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cream text-teal">
                <Icon className="h-6 w-6" aria-hidden />
              </span>
              <span className="font-display text-4xl text-line">0{i + 1}</span>
            </div>
            <h3 className="mt-6 text-2xl font-medium text-teal">{title}</h3>
            <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-coral-700">{tag}</p>
            <p className="mt-4 leading-relaxed text-muted">{text}</p>
          </div>
        ))}
      </div>
      <div className="mt-14 rounded-[var(--radius-card)] bg-sage-100 p-6 sm:p-10">
        <p className="eyebrow text-center">A practical development cycle</p>
        <ol className="mt-6 grid gap-4 sm:grid-cols-5">
          {cycle.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl bg-white p-5">
              <span className="text-xs font-bold text-coral-700">0{i + 1}</span>
              <p className="mt-1 font-display text-xl text-teal">{step.title}</p>
              <p className="mt-1 text-sm text-muted">{step.text}</p>
            </li>
          ))}
        </ol>
        <p className="mt-5 text-center text-sm font-medium text-teal">Learn from results · improve · adapt · begin again</p>
      </div>
    </section>
  );
}

async function LatestUpdates() {
  const [news, { upcoming }] = await Promise.all([getPublishedPosts("news", 3), getUpcomingEvents(3)]);
  return (
    <section className="bg-sand py-20 lg:py-28">
      <div className="container-page">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <SectionHeading eyebrow="News & events" title="Latest from PAHAD" intro="Verified announcements, programme updates and community stories." />
          <div className="flex gap-6">
            <TextLink href="/news">All news</TextLink>
            <TextLink href="/events">All events</TextLink>
          </div>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...upcoming, ...news].slice(0, 3).map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
        </div>
        {upcoming.length === 0 && (
          <div className="mt-6">
            <EmptyState title="No upcoming events announced yet">
              Event details are published here once dates, venues and organisers are confirmed. Follow us on social media or join the WhatsApp community to hear first.
            </EmptyState>
          </div>
        )}
      </div>
    </section>
  );
}

function FeedSkeleton() {
  return (
    <section className="bg-sand py-20">
      <div className="container-page grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-96 animate-pulse rounded-[var(--radius-card)] bg-white" />
        ))}
      </div>
    </section>
  );
}

function Direction() {
  return (
    <section className="relative isolate overflow-hidden bg-teal py-20 text-white lg:py-28">
      <MountainLine className="absolute bottom-0 left-0 -z-10 w-full text-white/[0.06]" />
      <div className="container-page grid gap-12 lg:grid-cols-2">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cream">Our vision</p>
          <p className="mt-4 font-display text-2xl leading-snug sm:text-3xl">
            “A self-reliant, knowledgeable, inclusive and thriving society where people and communities can realise their potential, create
            opportunities, contribute meaningfully and shape a sustainable future.”
          </p>
        </div>
        <div className="lg:border-l lg:border-white/20 lg:pl-12">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-cream">Our mission</p>
          <p className="mt-4 text-lg leading-relaxed text-white/90">
            To advance holistic regional development by connecting people, strengthening communities, mobilising local knowledge and resources,
            promoting innovation and enterprise, and fostering collaboration among individuals, communities and institutions for sustainable and
            inclusive progress.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {coreValues.map((v) => (
              <div key={v.title} className="rounded-2xl bg-white/10 p-4">
                <p className="font-display text-lg text-cream">{v.title}</p>
                <p className="mt-1 text-xs text-white/80">{v.text}</p>
              </div>
            ))}
          </div>
          <Link href="/vision-mission" className="btn btn-accent mt-8">
            Read our vision & mission
          </Link>
        </div>
      </div>
    </section>
  );
}

function Story() {
  const picks = storyMoments.slice(0, 4);
  return (
    <section className="container-page py-20 lg:py-28">
      <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:items-center">
        <div>
          <SectionHeading
            eyebrow="Our story · a shared history"
            title="Built on the work that came before."
            intro="PAHAD is an independent organisation. It builds on the work of DSSCOLONY, a student-led group founded on 24 June 2018. The two share a history but are separate organisations."
          />
          <p className="mt-5 leading-relaxed text-muted">
            Meetings, creative events, busking for an old age home, a cloth donation drive: that work showed what people can achieve together,
            and its lessons shape how PAHAD works today.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/our-story" className="btn btn-primary">Read our story</Link>
            <Link href="/gallery" className="btn btn-outline text-teal">View the gallery</Link>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {picks.map((m, i) => (
            <figure key={m.title} className={`relative overflow-hidden rounded-[var(--radius-card)] ${i % 2 ? "mt-8" : ""}`}>
              <div className="relative aspect-[4/5]">
                <Image src={m.image} alt={m.title} fill sizes="(min-width:1024px) 25vw, 50vw" className="object-cover" />
              </div>
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-teal-950/90 to-transparent p-4 pt-10 text-sm font-medium text-white">
                {m.title}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

async function PartnersStrip() {
  const partners = await getPartners();
  if (partners.length === 0) return null;
  return (
    <section className="border-y border-line bg-white py-16">
      <div className="container-page">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <SectionHeading eyebrow="Our partners" title="Working with partners who share our purpose" />
          <TextLink href="/partners">All partners</TextLink>
        </div>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {partners.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-6 rounded-[var(--radius-card)] border border-line p-6 transition-shadow hover:shadow-lg"
            >
              <span className={`flex h-24 w-40 shrink-0 items-center justify-center rounded-2xl p-4 ${p.dark_logo ? "bg-teal-950" : "bg-white ring-1 ring-line"}`}>
                {p.logo ? (
                  <Image src={p.logo} alt={p.name} width={160} height={96} className="max-h-16 w-auto object-contain" />
                ) : (
                  <span className="font-display text-lg text-teal">{p.name}</span>
                )}
              </span>
              <span>
                <span className="text-xs font-bold uppercase tracking-[0.16em] text-coral-700">{p.role}</span>
                <span className="mt-1 block font-display text-2xl text-teal">{p.name}</span>
                <span className="mt-1 block text-sm text-muted">{p.description}</span>
              </span>
            </a>
          ))}
        </div>
        <div className="mt-8 flex items-center gap-3 rounded-2xl bg-sand p-5 text-sm text-teal">
          <Lightbulb className="h-5 w-5 shrink-0 text-coral-700" aria-hidden />
          <p>
            Interested in partnering with PAHAD? Institutions, media and organisations can{" "}
            <Link href="/contact" className="font-semibold underline">start a conversation</Link>.
          </p>
        </div>
      </div>
    </section>
  );
}
