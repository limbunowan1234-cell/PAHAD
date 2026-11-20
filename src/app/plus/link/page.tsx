import Link from "next/link";
import { Suspense } from "react";
import { PlusForm } from "@/components/plus/client";
import { confirmMemberLink } from "@/lib/plus/account-actions";

export const metadata = { title: "Link your PAHAD membership", robots: { index: false } };

async function ConfirmForm({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = (await searchParams).token;
  return <PlusForm action={confirmMemberLink.bind(null, typeof token === "string" ? token : "")} submitLabel="Confirm">{null}</PlusForm>;
}

export default function LinkPage({ searchParams }: PageProps<"/plus/link">) {
  return (
    <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line sm:p-6">
      <h1 className="font-display text-2xl text-teal">Link your PAHAD membership</h1>
      <p className="mt-1 text-sm text-muted">
        Press Confirm to link this PAHAD membership to the PAHAD+ account that asked. Its posts will show a PAHAD member badge.
        It gives no access to Members Only content, which stays on the PAHAD website.
      </p>
      <div className="mt-5">
        <Suspense fallback={<div className="h-12 animate-pulse rounded-full bg-sand" role="status" aria-label="Loading" />}>
          <ConfirmForm searchParams={searchParams} />
        </Suspense>
      </div>
      <p className="mt-4 text-center text-sm"><Link href="/plus/me" className="font-semibold text-teal underline">Go to PAHAD+</Link></p>
    </div>
  );
}
