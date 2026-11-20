import Link from "next/link";
import type { Metadata } from "next";
import { site } from "@/lib/site";
import { PageHero } from "@/components/site/ui";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Notice",
  path: "/privacy",
});

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

        <h2 id="pahad-plus" className="scroll-mt-24">PAHAD+ app</h2>
        <p>PAHAD+ is PAHAD&apos;s community app (at <Link href="/plus" className="underline">/plus</Link> and on Google Play). PAHAD+ accounts are separate from PAHAD member and administrator accounts.</p>
        <ul>
          <li><strong>Account:</strong> your name, email address, optional phone number, account type (individual, business or organisation), a securely hashed password, when you accepted the terms, and sign-in times.</li>
          <li><strong>Posts:</strong> what you post (title, summary, description, photo, place, dates, optional YouTube link) and any contact details you add (phone, WhatsApp, email, address, website, booking or registration link).</li>
          <li><strong>Safety:</strong> the reports you make and the accounts you block.</li>
          <li><strong>E-Passes:</strong> the events you take a free E-Pass for, the name on the pass, and when you were checked in. The organiser and PAHAD&apos;s verifiers see the names on the passes for their event; nobody else does.</li>
          <li><strong>Likes and saves:</strong> the posts you like (only the total number is public) and the posts you save (only you see them).</li>
          <li><strong>Notifications:</strong> if you turn them on, your browser&apos;s push subscription (a device address from Google, Apple or Mozilla) and the regions you chose. Turn them off in Me at any time.</li>
          <li><strong>PAHAD membership link:</strong> if you link your membership, which membership it is, so your posts show a PAHAD member badge.</li>
          <li><strong>Cookie:</strong> one essential cookie keeps you signed in for up to 30 days. No advertising or analytics trackers.</li>
        </ul>
        <p>
          <strong>Who sees what:</strong> anyone can see a post&apos;s title, photo, place, summary and your display name. Contact, booking and registration
          details are shown only after a PAHAD verifier checks the post. PAHAD&apos;s President and the verifiers he assigns can see everything you post,
          to verify it. Your email address and phone number on your account are never shown publicly. We don&apos;t sell or share your data for advertising.
        </p>
        <p>
          <strong>Emails:</strong> we email you only to confirm your address and to reset your password (sent through Google).
        </p>
        <p>
          <strong>Deleting your data:</strong> delete your account at any time in the app (Me → Delete my account). Your account and sign-in data are deleted
          at once, along with your E-Passes, likes, saves and notification subscriptions, and your posts are removed with their contact details erased. See <Link href="/plus/delete-account" className="underline">how account deletion works</Link>.
        </p>
      </section>
    </>
  );
}
