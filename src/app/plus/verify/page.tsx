import Link from "next/link";
import { Suspense } from "react";
import { PlusForm } from "@/components/plus/client";
import { verifyPlusEmail } from "@/lib/plus/account-actions";

export const metadata = { title: "Confirm your email", robots: { index: false } };

/**
 * The form appears only once the token is known, and the token is bound to the action on the server,
 * so a quick tap can never send an empty form.
 */
async function ConfirmForm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = (await searchParams).token;
  return <PlusForm action={verifyPlusEmail.bind(null, typeof token === "string" ? token : "")} submitLabel="Confirm my email">{null}</PlusForm>;
}

/** The link only opens this page; confirming takes a button press, so link scanners in mail apps can't use it up. */
export default function VerifyPage({ searchParams }: PageProps<"/plus/verify">) {
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line sm:p-6">
      <h1 className="font-display text-2xl text-teal">Confirm your email</h1>
      <p className="mt-1 text-sm text-muted">Press the button to confirm your email address and start posting on PAHAD+.</p>
      <div className="mt-5">
        <Suspense fallback={<div className="h-12 animate-pulse rounded-full bg-sand" role="status" aria-label="Loading" />}>
          <ConfirmForm searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="mt-4 text-center text-sm"><Link href="/plus/me" className="font-semibold text-teal underline">Go to my account</Link></p>
    </div>
  );
}
