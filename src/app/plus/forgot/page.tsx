import Link from "next/link";
import { PlusForm } from "@/components/plus/client";
import { requestPlusReset } from "@/lib/plus/account-actions";

export const metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPage() {
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line sm:p-6">
      <h1 className="font-display text-2xl text-teal">Forgot your password?</h1>
      <p className="mt-1 text-sm text-muted">Enter your PAHAD+ email. We&apos;ll send a link to choose a new password.</p>
      <div className="mt-5">
        <PlusForm action={requestPlusReset} submitLabel="Send reset link">
          <label className="block"><span className="label">Email</span><input name="email" type="email" required autoComplete="email" className="field" /></label>
        </PlusForm>
      </div>
      <p className="mt-4 text-center text-sm"><Link href="/plus/login" className="font-semibold text-teal underline">Back to sign in</Link></p>
    </div>
  );
}
