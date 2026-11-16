import type { Metadata } from "next";
import { Mail, MessageCircle, Users } from "lucide-react";
import Link from "next/link";
import { site } from "@/lib/site";
import { InquiryForm } from "@/components/site/forms";
import { SocialIcon } from "@/components/site/SocialIcon";
import { PageHero } from "@/components/site/ui";

export const metadata: Metadata = {
  title: "Contact",
  description: "General enquiries, collaboration proposals, ideas, media requests or questions about participation.",
};

export default function ContactPage() {
  return (
    <>
      <PageHero
        page="contact"
        eyebrow="Contact PAHAD"
        title="Start a conversation."
        intro="For general enquiries, collaboration proposals, ideas, media requests or questions about participation."
      />
      <section className="container-page grid gap-12 py-20 lg:grid-cols-[1fr_1.4fr]">
        <div className="space-y-4">
          <a href={`mailto:${site.email}`} className="flex gap-4 rounded-[var(--radius-card)] border border-line p-6 hover:border-teal">
            <Mail className="h-6 w-6 shrink-0 text-coral-700" aria-hidden />
            <span>
              <span className="block font-semibold text-teal">Email</span>
              <span className="text-muted">{site.email}</span>
            </span>
          </a>
          <a href={site.whatsapp} target="_blank" rel="noopener noreferrer" className="flex gap-4 rounded-[var(--radius-card)] border border-line p-6 hover:border-teal">
            <MessageCircle className="h-6 w-6 shrink-0 text-coral-700" aria-hidden />
            <span>
              <span className="block font-semibold text-teal">WhatsApp community</span>
              <span className="text-muted">Stay connected and join conversations</span>
            </span>
          </a>
          <a href={site.whatsappChannel} target="_blank" rel="noopener noreferrer" className="flex gap-4 rounded-[var(--radius-card)] border border-line p-6 hover:border-teal">
            <SocialIcon name="WhatsApp" className="h-6 w-6 shrink-0 text-coral-700" />
            <span>
              <span className="block font-semibold text-teal">WhatsApp channel</span>
              <span className="text-muted">Official announcements and updates</span>
            </span>
          </a>
          <Link href="/membership" className="flex gap-4 rounded-[var(--radius-card)] border border-line p-6 hover:border-teal">
            <Users className="h-6 w-6 shrink-0 text-coral-700" aria-hidden />
            <span>
              <span className="block font-semibold text-teal">Membership</span>
              <span className="text-muted">Apply online to become a member</span>
            </span>
          </Link>
          <div className="rounded-[var(--radius-card)] bg-sand p-6">
            <p className="font-semibold text-teal">Follow PAHAD</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {site.socials.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-teal ring-1 ring-line hover:bg-teal hover:text-white">
                  <SocialIcon name={s.label} />
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line p-6 sm:p-10">
          <h2 className="mb-6 text-3xl font-medium text-teal">Send us a message</h2>
          <InquiryForm />
        </div>
      </section>
    </>
  );
}
