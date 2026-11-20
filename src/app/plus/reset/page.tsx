import Link from "next/link";
import { Suspense } from "react";
import { PlusForm } from "@/components/plus/client";
import { resetPlusPassword } from "@/lib/plus/account-actions";

export const metadata = { title: "Choose a new password", robots: { index: false } };

/** Rendered once the token is known; the token is bound on the server, not sent as a form field. */
async function ResetForm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = (await searchParams).token;
  return (
    <PlusForm action={resetPlusPassword.bind(null, typeof token === "string" ? token : "")} submitLabel="Save new password">
      <label className="block">
        <span className="label">New password</span>
        <input name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
        <span className="mt-1 block text-xs text-muted">At least 10 characters, with letters and numbers.</span>
      </label>
      <label className="block"><span className="label">Repeat it</span><input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="field" /></label>
    </PlusForm>
  );
}

export default function ResetPage({ searchParams }: PageProps<"/plus/reset">) {
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line sm:p-6">
      <h1 className="font-display text-2xl text-teal">Choose a new password</h1>
      <div className="mt-5">
        <Suspense fallback={<div className="h-48 animate-pulse rounded-2xl bg-sand" role="status" aria-label="Loading" />}>
          <ResetForm searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="mt-4 text-center text-sm"><Link href="/plus/login" className="font-semibold text-teal underline">Sign in</Link></p>
    </div>
  );
}
