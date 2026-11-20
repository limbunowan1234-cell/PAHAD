import Link from "next/link";
import { Suspense } from "react";
import { PlusForm } from "@/components/plus/client";
import { resetPlusPassword } from "@/lib/plus/account-actions";

export const metadata = { title: "Choose a new password", robots: { index: false } };

async function TokenField({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = (await searchParams).token;
  return <input type="hidden" name="token" value={typeof token === "string" ? token : ""} />;
}

export default function ResetPage({ searchParams }: PageProps<"/plus/reset">) {
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line sm:p-6">
      <h1 className="font-display text-2xl text-teal">Choose a new password</h1>
      <div className="mt-5">
        <PlusForm action={resetPlusPassword} submitLabel="Save new password">
          <Suspense><TokenField searchParams={searchParams} /></Suspense>
          <label className="block">
            <span className="label">New password</span>
            <input name="password" type="password" required minLength={10} autoComplete="new-password" className="field" />
            <span className="mt-1 block text-xs text-muted">At least 10 characters, with letters and numbers.</span>
          </label>
          <label className="block"><span className="label">Repeat it</span><input name="confirm" type="password" required minLength={10} autoComplete="new-password" className="field" /></label>
        </PlusForm>
      </div>
      <p className="mt-4 text-center text-sm"><Link href="/plus/login" className="font-semibold text-teal underline">Sign in</Link></p>
    </div>
  );
}
