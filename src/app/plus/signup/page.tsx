import Link from "next/link";
import { PlusForm } from "@/components/plus/client";
import { signUpPlus } from "@/lib/plus/account-actions";
import { ACCOUNT_TYPES } from "@/lib/plus/config";

export const metadata = { title: "Create your PAHAD+ account", robots: { index: false } };

export default function SignUpPage() {
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line sm:p-6">
      <h1 className="font-display text-2xl text-teal">Join PAHAD+</h1>
      <p className="mt-1 text-sm text-muted">Share events, places, local businesses and briefs with the hills. Free.</p>
      <div className="mt-5">
        <PlusForm action={signUpPlus} submitLabel="Create account">
          <div aria-hidden className="hidden"><label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label></div>
          <label className="block"><span className="label">Name *</span><input name="name" required maxLength={120} autoComplete="name" className="field" /></label>
          <label className="block"><span className="label">Email *</span><input name="email" type="email" required maxLength={160} autoComplete="email" className="field" /></label>
          <label className="block"><span className="label">Phone (optional)</span><input name="phone" type="tel" maxLength={30} autoComplete="tel" className="field" /></label>
          <fieldset>
            <legend className="label">Account type *</legend>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(ACCOUNT_TYPES).map(([k, v], i) => (
                <label key={k} className="flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-line p-2.5 text-sm has-[:checked]:border-teal has-[:checked]:bg-sage-100">
                  <input type="radio" name="account_type" value={k} defaultChecked={i === 0} className="accent-teal" /> {v}
                </label>
              ))}
            </div>
          </fieldset>
          <label className="block">
            <span className="label">Password *</span>
            <input name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
            <span className="mt-1 block text-xs text-muted">At least 10 characters, with letters and numbers.</span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" name="terms" required className="mt-1 h-4 w-4 accent-teal" />
            <span>I agree to the <Link href="/plus/terms" target="_blank" className="font-semibold text-teal underline">PAHAD+ terms and community guidelines</Link> and the <Link href="/privacy#pahad-plus" target="_blank" className="font-semibold text-teal underline">privacy notice</Link>.</span>
          </label>
        </PlusForm>
      </div>
      <p className="mt-5 text-center text-sm text-muted">Already have an account? <Link href="/plus/login" className="font-semibold text-teal underline">Sign in</Link></p>
    </div>
  );
}
