import type { Metadata } from "next";
import { site } from "@/lib/site";
import { PageHero } from "@/components/site/ui";

export const metadata: Metadata = { title: "Privacy Notice" };

export default function PrivacyPage() {
  return (
    <>
      <PageHero eyebrow="Privacy notice" title="Respectful and responsible handling of information." />
      <section className="container-page max-w-3xl py-16 prose-pahad">
        <p className="rounded-xl bg-sand p-4 text-sm">
          This notice describes what this website actually collects. It should be reviewed against PAHAD’s adopted policies and applicable law before
          being treated as a final legal policy.
        </p>
        <h2>What we collect</h2>
        <ul>
          <li>Membership applications: name, email, phone, area, optional address, occupation, interests and motivation.</li>
          <li>Contact and participation messages: name, email, optional phone and organisation, and your message.</li>
          <li>Administrator accounts: name, email, role and sign-in times.</li>
        </ul>
        <p>We do not use advertising trackers. A single essential cookie keeps administrators signed in.</p>
        <h2>Why we use it</h2>
        <p>To respond to enquiries, process and verify membership applications, coordinate participation and share relevant institutional updates.</p>
        <h2>Who can see it</h2>
        <p>
          Only authorised PAHAD administrators, according to their role. Access is limited to the information each role needs. Data is stored with our
          hosting and database providers (Vercel and Neon) and uploaded files with Vercel Blob or Cloudflare R2.
        </p>
        <h2>Your choices</h2>
        <p>
          You can ask to see, correct or delete the information you submitted by writing to <a href={`mailto:${site.email}`} className="underline">{site.email}</a>.
          Please avoid sending sensitive personal information that is not needed.
        </p>
        <h2>Third-party services</h2>
        <p>Links to social platforms and partner websites are governed by their own terms and privacy practices.</p>
      </section>
    </>
  );
}
