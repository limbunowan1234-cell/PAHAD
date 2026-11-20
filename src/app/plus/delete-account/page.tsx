import Link from "next/link";

export const metadata = {
  title: "Delete your PAHAD+ account",
  description: "How to delete your PAHAD+ account and what data is deleted.",
  alternates: { canonical: "/plus/delete-account" },
};

/** Public page for Google Play's account-deletion requirement (works without signing in). */
export default function DeleteAccountPage() {
  return (
    <article className="prose-pahad mx-auto max-w-2xl rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line sm:p-8">
      <h1 className="font-display text-3xl text-teal">Delete your PAHAD+ account</h1>
      <p>PAHAD+ is the community app by PAHAD. You can delete your account yourself, at any time, inside the app or on this website.</p>

      <h2>How to delete it</h2>
      <ul>
        <li>Open PAHAD+ and sign in.</li>
        <li>Tap <strong>Me</strong>, scroll to <strong>Delete my account</strong>.</li>
        <li>Type DELETE, enter your password, and press <strong>Delete my account permanently</strong>.</li>
      </ul>
      <p><Link href="/plus/me#delete" className="btn btn-primary !no-underline">Go to Delete my account</Link></p>
      <p>Can&apos;t sign in? Reset your password from <Link href="/plus/forgot">Forgot password</Link>, or ask PAHAD to delete it for you through the <Link href="/contact">contact page</Link> using the email address on the account.</p>

      <h2>What is deleted</h2>
      <ul>
        <li>Your account: name, email address, phone number and password, straight away.</li>
        <li>Your sign-in and email links, the reports you made, and the accounts you blocked.</li>
        <li>Your E-Passes, likes, saved posts, notification subscriptions, any PAHAD membership link, and your payout details if you sold E-Passes.</li>
        <li>Your posts are taken off PAHAD+ at once, and their phone, WhatsApp, email and address details are erased.</li>
      </ul>
      <h2>What is kept</h2>
      <ul>
        <li>Records of paid E-Passes (amount, date and Razorpay payment reference, without your name), which PAHAD must keep for its accounts.</li>
        <li>An entry in PAHAD&apos;s activity log saying that an account was deleted (without your name or email), kept for security.</li>
        <li>The text of removed posts (titles and descriptions, without your contact details or your name), hidden from everyone, so PAHAD can deal with any reports about them. Ask PAHAD through the <Link href="/contact">contact page</Link> to erase it completely.</li>
      </ul>
    </article>
  );
}
