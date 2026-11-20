import Link from "next/link";
import { PLUS_RULES } from "@/lib/plus/config";

export const metadata = { title: "Terms & community guidelines", alternates: { canonical: "/plus/terms" } };

export default function PlusTermsPage() {
  return (
    <article className="prose-pahad mx-auto max-w-2xl rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line sm:p-8">
      <h1 className="font-display text-3xl text-teal">PAHAD+ terms &amp; community guidelines</h1>
      <p className="text-sm text-muted">PAHAD+ is a community app run by PAHAD (Participatory Action for Holistic Advancement &amp; Development). By creating an account you agree to these terms.</p>

      <h2>What PAHAD+ is for</h2>
      <p>Sharing events, places to visit, local businesses and useful briefs (civic and road alerts, opportunities, jobs and local tips) from Darjeeling, Kalimpong, Siliguri and Sikkim.</p>

      <h2>How posts are checked</h2>
      <ul>
        <li>Posts go live straight away marked <strong>Unverified</strong>. Until PAHAD verifies a post, booking, registration and apply links, the map and the registration ID stay hidden. Contacts show only if the poster chose to show them, with a warning that the post is not verified yet.</li>
        <li>PAHAD&apos;s verifiers may verify, hold, or reject any post, and may give a reason. Unverified posts drop out after {PLUS_RULES.unverifiedDays} days.</li>
        <li>Civic &amp; road alerts expire on their own (at most {PLUS_RULES.alertMaxDays} days). Jobs and opportunities close on their last date.</li>
        <li>When {PLUS_RULES.flagsToHold} people report a post it is hidden while PAHAD reviews it.</li>
        <li>A post is marked <strong>Authentic</strong> when more than 5 people support it, or when the poster&apos;s identity is confirmed (a linked PAHAD member, an approved organiser, or PAHAD). This is the community&apos;s view, not a PAHAD check.</li>
        <li>Verification means PAHAD checked that the post is genuine at the time. It is not an endorsement or guarantee. Use your own judgement before paying anyone.</li>
      </ul>

      <h2>E-Passes</h2>
      <ul>
        <li>E-Passes are one per person per event and open only once PAHAD verifies the event. Organisers can set a limit, and choose whether passes are ready instantly or need their approval; they may revoke a free pass before the event.</li>
        <li>Your E-Pass is your ticket: don&apos;t share or copy its QR code. Each pass can be checked in once.</li>
        <li>The organiser runs the event and may refuse entry. Cancel your free E-Pass if you can&apos;t go, so someone else can.</li>
        <li><strong>Paid E-Passes</strong> are sold by organisers PAHAD has approved. You pay PAHAD through Razorpay; PAHAD keeps a fee and pays the organiser after the event. Paid E-Passes can&apos;t be cancelled in the app: ask the organiser or PAHAD. If an event is cancelled, PAHAD refunds paid E-Passes in full to the original payment method.</li>
        <li>Organisers who sell E-Passes must run the event as described, and agree that PAHAD may refund buyers and hold their payout if an event doesn&apos;t happen or isn&apos;t as described.</li>
      </ul>

      <h2>Community guidelines</h2>
      <ul>
        <li>Post only true, current information about the hills region, and only what you have the right to share (including photos).</li>
        <li>No scams, spam, hate, harassment, threats, adult content, or anything illegal or unsafe.</li>
        <li>No political campaigning or fundraising for individuals.</li>
        <li>Don&apos;t post other people&apos;s personal details without their permission.</li>
        <li>Respect the land, the people and the heritage you write about.</li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>You need a confirmed email address to post. New accounts can post up to {PLUS_RULES.newAccountDailyPosts} times a day.</li>
        <li>You can report posts and block other accounts. PAHAD may suspend accounts that break these rules.</li>
        <li>You can delete your account at any time from <Link href="/plus/me#delete">Me → Delete my account</Link>. See <Link href="/plus/delete-account">how account deletion works</Link>.</li>
      </ul>

      <h2>Privacy</h2>
      <p>How PAHAD+ handles your information is explained in the <Link href="/privacy#pahad-plus">PAHAD+ section of the privacy notice</Link>.</p>

      <h2>Contact</h2>
      <p>Questions or concerns: use the <Link href="/contact">PAHAD contact page</Link>.</p>
    </article>
  );
}
