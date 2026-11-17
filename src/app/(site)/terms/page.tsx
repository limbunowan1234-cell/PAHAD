import type { Metadata } from "next";
import { site } from "@/lib/site";
import { PageHero } from "@/components/site/ui";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Terms & Conditions",
  path: "/terms",
});

const sections: [string, string][] = [
  ["About PAHAD", "PAHAD (Participatory Action for Holistic Advancement & Development) provides information about its institutional purpose, activities, programmes and opportunities for public participation. Website content is for general information and community engagement."],
  ["Acceptable use", "Use this website lawfully and respectfully. Do not submit knowingly false, misleading, abusive or unlawful information; attempt to disrupt or gain unauthorised access to the website; use PAHAD's name, logo or materials to suggest endorsement; or use the website to harass, threaten, discriminate against or harm others."],
  ["Membership and participation", "Submitting a membership or participation form is an application or expression of interest. It does not automatically confirm membership, confer voting rights, appoint a person to an office or guarantee selection for a programme. These are subject to PAHAD's constitution, approved policies and procedures."],
  ["Accuracy of information", "You are responsible for ensuring the information you submit is accurate. Do not submit another person's personal information without permission."],
  ["Privacy", "Information submitted through website forms is used as described in our privacy notice. Do not submit passwords, payment details or unnecessary sensitive information through general forms."],
  ["Intellectual property", "Unless otherwise stated, PAHAD's original text, branding, graphics and materials may not be copied, republished or used commercially without permission. If you submit material, you confirm you have the right to share it."],
  ["External websites", "This website links to third-party platforms, including partner and social media sites. PAHAD is not responsible for their content, availability or practices."],
  ["Availability", "Information is provided in good faith and may be updated, corrected or withdrawn. Important decisions should be confirmed through PAHAD's official channels."],
  ["Changes", "PAHAD may revise these terms. The updated version will be published on this page."],
];

export default function TermsPage() {
  return (
    <>
      <PageHero eyebrow="Terms & conditions" title="Using the PAHAD website." />
      <section className="container-page max-w-3xl py-16 prose-pahad">
        <p className="rounded-xl bg-sand p-4 text-sm">
          These general terms should be checked against PAHAD’s approved constitution, membership rules, privacy practices and applicable law.
        </p>
        {sections.map(([t, d], i) => (
          <div key={t}>
            <h2>{i + 1}. {t}</h2>
            <p>{d}</p>
          </div>
        ))}
        <h2>Contact</h2>
        <p>Questions about these terms: <a href={`mailto:${site.email}`} className="underline">{site.email}</a>.</p>
      </section>
    </>
  );
}
