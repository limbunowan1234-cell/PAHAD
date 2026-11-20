import Link from "next/link";
import { AUTHENTIC_SUPPORTS } from "@/lib/plus/posts";
import { PLUS_RULES } from "@/lib/plus/config";

export const metadata = { title: "Help center", alternates: { canonical: "/plus/help" } };

const QA: [string, React.ReactNode][] = [
  ["What do Unverified, Verified and Flag-Proof mean?", <>Every post goes live straight away as <strong>Unverified</strong>. A PAHAD verifier then checks it and marks it <strong>Verified</strong>, which unlocks booking and apply links, the map and the registration ID. <strong>Flag-Proof</strong> posts were confirmed by the President or a verifier he chose, and community reports can&apos;t hide them.</>],
  ["What does Authentic mean?", <>A post is <strong>Authentic</strong> when more than {AUTHENTIC_SUPPORTS} people tapped Support to vouch for it, or when the poster&apos;s identity is confirmed (a linked PAHAD member, an approved organiser, or PAHAD itself).</>],
  ["What do 🎨 Creator and H1 Honorary mean?", <><strong>🎨 Creator</strong> marks artists PAHAD has welcomed as C1 Creators. <strong>H1 Honorary</strong> marks Honorary Members: people respected for a speciality, or in senior roles elsewhere, who advise PAHAD. Both are confirmed by PAHAD, so their posts also count as Authentic.</>],
  ["Who sees my phone number?", <>You decide. Each post has a <strong>Show contacts publicly</strong> switch, and your default is under Profile → Collaboration contacts. Posts that aren&apos;t verified yet show a warning next to the contacts.</>],
  ["How do E-Passes work?", <>Organisers choose: <strong>Instant</strong> passes are ready at once; <strong>Needs approval</strong> passes wait until the organiser approves you. Show the QR code at the gate. Find your passes under Profile → My E-Passes.</>],
  ["How do I report a post?", <>Tap <strong>Flag</strong> on the post and give a reason. When {PLUS_RULES.flagsToHold} people report a post it is hidden while PAHAD reviews it.</>],
  ["Can I change my post's photo or video?", <>Yes, for 24 hours after posting: Profile → Settings → Manage posts → Edit media. After that, ask PAHAD.</>],
  ["I'm a PAHAD office bearer. How do I use Admin mode?", <>Sign in to the PAHAD dashboard on your phone, then open PAHAD+ → Profile → Access type → <strong>Link as Admin</strong>. Admin mode opens the Verified Desk with the same permissions as your dashboard account.</>],
  ["How do I block someone?", <>Tap ⋯ on their post and choose Block, or pick them under Profile → Settings → Blocked accounts.</>],
  ["How do I delete my account?", <>Profile → Settings → Delete account. Your posts are taken off PAHAD+ and your contact details are removed. You can also <Link href="/plus/delete-account" className="underline">request deletion here</Link>.</>],
];

export default function PlusHelpPage() {
  return (
    <div className="space-y-4">
      <header>
        <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">Support &amp; About</p>
        <h1 className="text-2xl font-extrabold">Help center</h1>
      </header>
      <div className="space-y-2">
        {QA.map(([q, a]) => (
          <details key={q} className="group rounded-2xl bg-white p-4 ring-1 ring-line">
            <summary className="cursor-pointer list-none text-sm font-extrabold">{q}<span className="float-right text-muted group-open:rotate-45" aria-hidden>+</span></summary>
            <p className="mt-2 text-sm text-ink/85">{a}</p>
          </details>
        ))}
      </div>
      <section className="rounded-2xl bg-white p-4 text-sm ring-1 ring-line">
        <h2 className="font-extrabold">Still need help?</h2>
        <p className="mt-1 text-muted">Write to PAHAD through the <Link href="/contact" className="underline">contact page</Link>.</p>
        <p className="mt-3 text-xs text-muted"><Link href="/plus/terms" className="underline">Terms &amp; community guidelines</Link> · <Link href="/privacy#pahad-plus" className="underline">Privacy</Link></p>
      </section>
    </div>
  );
}
