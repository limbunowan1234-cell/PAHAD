import Link from "next/link";
import { Suspense } from "react";
import { PlusForm } from "@/components/plus/client";
import { signInPlus } from "@/lib/plus/account-actions";

export const metadata = { title: "Sign in", robots: { index: false } };

async function NextField({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const next = (await searchParams).next;
  return <input type="hidden" name="next" value={typeof next === "string" ? next : "/plus"} />;
}

export default function LoginPage({ searchParams }: PageProps<"/plus/login">) {
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line sm:p-6">
      <h1 className="font-display text-2xl text-teal">Sign in to PAHAD+</h1>
      <p className="mt-1 text-sm text-muted">PAHAD+ accounts are separate from PAHAD member and admin accounts.</p>
      <div className="mt-5">
        <PlusForm action={signInPlus} submitLabel="Sign in">
          <Suspense><NextField searchParams={searchParams} /></Suspense>
          <label className="block"><span className="label">Email</span><input name="email" type="email" required autoComplete="email" className="field" /></label>
          <label className="block"><span className="label">Password</span><input name="password" type="password" required autoComplete="current-password" className="field" /></label>
        </PlusForm>
      </div>
      <p className="mt-4 text-center text-sm"><Link href="/plus/forgot" className="font-semibold text-teal underline">Forgot password?</Link></p>
      <p className="mt-2 text-center text-sm text-muted">New here? <Link href="/plus/signup" className="font-semibold text-teal underline">Create an account</Link></p>
    </div>
  );
}
