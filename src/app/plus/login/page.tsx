import Link from "next/link";
import { Suspense } from "react";
import { PlusForm } from "@/components/plus/client";
import { signInPlus } from "@/lib/plus/account-actions";

export const metadata = { title: "Sign in", robots: { index: false } };

/** Rendered as one piece (with the return path) so the form never submits without it. */
async function SignInForm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = (await searchParams).next;
  return (
    <PlusForm action={signInPlus} submitLabel="Sign in">
      <input type="hidden" name="next" value={typeof next === "string" ? next : "/plus"} />
      <label className="block"><span className="label">Email</span><input name="email" type="email" required autoComplete="email" className="field" /></label>
      <label className="block"><span className="label">Password</span><input name="password" type="password" required autoComplete="current-password" className="field" /></label>
    </PlusForm>
  );
}

export default function LoginPage({ searchParams }: PageProps<"/plus/login">) {
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line sm:p-6">
      <h1 className="font-display text-2xl text-teal">Sign in to PAHAD+</h1>
      <p className="mt-1 text-sm text-muted">PAHAD+ accounts are separate from PAHAD member and admin accounts.</p>
      <div className="mt-5">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-sand" role="status" aria-label="Loading" />}>
          <SignInForm searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="mt-4 text-center text-sm"><Link href="/plus/forgot" className="font-semibold text-teal underline">Forgot password?</Link></p>
      <p className="mt-2 text-center text-sm text-muted">New here? <Link href="/plus/signup" className="font-semibold text-teal underline">Create an account</Link></p>
    </div>
  );
}
