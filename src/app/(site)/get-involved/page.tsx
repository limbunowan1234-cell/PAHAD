import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, HandHeart, Handshake, Lightbulb, MessageCircle } from "lucide-react";
import { waysToHelp } from "@/lib/content";
import { site } from "@/lib/site";
import { InquiryForm } from "@/components/site/forms";
import { PageHero, SectionHeading } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Get Involved",
  description: "Share an idea, volunteer, collaborate or contribute knowledge. Your ideas can help shape what PAHAD does next.",
};

const icons = { idea: Lightbulb, volunteer: HandHeart, collaborate: Handshake, knowledge: BookOpen } as const;

export default function GetInvolvedPage() {
  return (
    <>
      <PageHero
        eyebrow="Get involved"
        title="Your ideas can help shape what comes next."
        intro="Strong communities grow when people contribute in ways that reflect their interests, knowledge, skills and capacity."
        page="get-involved"
      >
        <Link href="/membership" className="btn btn-accent">Become a member</Link>
        <a href="#share" className="btn btn-outline text-white">Share an idea</a>
      </PageHero>

      <section className="container-page py-20">
        <SectionHeading eyebrow="Ways to contribute" title="Find your way to participate." />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {waysToHelp.map((w) => {
            const Icon = icons[w.kind];
            return (
              <a key={w.kind} href="#share" className="group rounded-[var(--radius-card)] border border-line p-6 transition-shadow hover:shadow-lg">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-cream text-teal">
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="mt-5 text-xl font-medium text-teal group-hover:underline">{w.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{w.text}</p>
              </a>
            );
          })}
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          <Link href="/membership" className="rounded-[var(--radius-card)] bg-teal p-8 text-white hover:bg-teal-900">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-cream">Membership</p>
            <p className="mt-2 font-display text-2xl">Become part of the community →</p>
            <p className="mt-2 text-white/85">Apply online. Applications are verified under PAHAD’s membership rules.</p>
          </Link>
          <a href={site.whatsapp} target="_blank" rel="noopener noreferrer" className="rounded-[var(--radius-card)] bg-cream p-8 text-teal hover:bg-peach">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-700">Stay connected</p>
            <p className="mt-2 flex items-center gap-2 font-display text-2xl"><MessageCircle className="h-6 w-6" aria-hidden /> Join the WhatsApp community →</p>
            <p className="mt-2">Take part in conversations with members.</p>
          </a>
          <a href={site.whatsappChannel} target="_blank" rel="noopener noreferrer" className="rounded-[var(--radius-card)] bg-sage-100 p-8 text-teal hover:bg-cream">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-coral-700">Official updates</p>
            <p className="mt-2 flex items-center gap-2 font-display text-2xl"><MessageCircle className="h-6 w-6" aria-hidden /> Follow the WhatsApp channel →</p>
            <p className="mt-2">Announcements, events and news from PAHAD.</p>
          </a>
        </div>
      </section>

      <section id="share" className="scroll-mt-24 bg-sand py-20">
        <div className="container-page grid gap-12 lg:grid-cols-[1fr_1.3fr]">
          <SectionHeading
            eyebrow="Tell us"
            title="Share an idea, offer your time or propose a collaboration."
            intro="Every message is read by the PAHAD team and routed to the right directorate."
          />
          <div className="rounded-[var(--radius-card)] bg-white p-6 ring-1 ring-line sm:p-8">
            <InquiryForm defaultKind="idea" />
          </div>
        </div>
      </section>
    </>
  );
}
