import type { Metadata } from "next";
import { MembershipForm } from "@/components/site/forms";
import { PageHero } from "@/components/site/ui";
import { pageMetadata } from "@/lib/seo";
import { PageFeatures } from "@/components/site/PageFeatures";

export const metadata: Metadata = pageMetadata({
  title: "Membership",
  description:
    "Be part of a shared purpose. Apply to become a member of PAHAD.",
  path: "/membership",
});

const steps = [
  ["Apply", "Complete the application with accurate information."],
  ["Verification", "The membership team reviews your application and may contact you to clarify details."],
  ["Welcome", "Once approved under PAHAD's rules, you receive a member number and ways to take part."],
];

export default function MembershipPage() {
  return (
    <>
      <PageHero
        eyebrow="Membership"
        title="Be part of a shared purpose."
        intro="PAHAD welcomes people interested in community development, knowledge sharing, participation and collective action. People who were part of DSSCOLONY are warmly welcome to join."
        page="membership"
      />
      <section className="container-page grid gap-12 py-20 lg:grid-cols-[1fr_1.6fr]">
        <aside className="space-y-8 lg:sticky lg:top-28 lg:self-start">
          <div>
            <p className="eyebrow">How it works</p>
            <ol className="mt-5 space-y-5">
              {steps.map(([t, d], i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal font-semibold text-white">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-teal">{t}</p>
                    <p className="text-sm text-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="rounded-[var(--radius-card)] bg-sand p-6 text-sm leading-relaxed text-muted">
            <p className="font-semibold text-teal">Good to know</p>
            <p className="mt-2">
              Membership categories, eligibility, rights and voting are set by the Constitution and adopted rules. Applying is an expression of
              interest; it does not by itself confer voting rights or office.
            </p>
            <p className="mt-2">Your information is used only to process your application and is accessible only to authorised PAHAD administrators.</p>
          </div>
        </aside>
        <div className="rounded-[var(--radius-card)] border border-line p-6 sm:p-10">
          <h2 className="text-3xl font-medium text-teal">Membership application</h2>
          <p className="mt-2 mb-8 text-muted">It takes about three minutes.</p>
          <MembershipForm />
        </div>
      </section>
      <PageFeatures page="membership" />
    </>
  );
}
