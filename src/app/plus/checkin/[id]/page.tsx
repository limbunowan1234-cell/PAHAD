import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft } from "lucide-react";
import { GateScanner } from "@/components/plus/client";
import { plusDate } from "@/components/plus/ui";
import { db } from "@/lib/db";
import { checkInPass } from "@/lib/plus/pass-actions";
import { gateAccess } from "@/lib/plus/passes";
import { cn } from "@/lib/utils";

export const metadata = { title: "Check-in", robots: { index: false } };

/** The gate: the organiser (PAHAD+ account) or a PAHAD verifier (dashboard account) scans E-Passes here. */
async function Gate({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await db.get("plus_posts", id);
  if (!post || post.hub !== "events" || !post.pass_enabled) notFound();
  const who = await gateAccess(post);
  if (!who) {
    return (
      <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-white p-6 text-center ring-1 ring-line">
        <p className="font-display text-xl text-teal">Only the organiser or a PAHAD verifier can open the check-in</p>
        <Link href={`/plus/login?next=/plus/checkin/${id}`} className="btn btn-primary mt-4">Sign in</Link>
      </div>
    );
  }
  const passes = (await db.findBy("plus_passes", "post_id", id)).filter((p) => p.status !== "cancelled").sort((a, b) => a.holder_name.localeCompare(b.holder_name));
  const inCount = passes.filter((p) => p.status === "checked_in").length;
  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href={`/plus/${id}`} className="inline-flex items-center gap-1 text-sm font-semibold text-teal"><ArrowLeft className="h-4 w-4" aria-hidden /> Event</Link>
      <header className="rounded-[var(--radius-card)] bg-teal p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/70">Check-in</p>
        <h1 className="mt-1 font-display text-2xl leading-tight">{post.title}</h1>
        <p className="mt-1 text-sm text-white/85">{plusDate(post.starts_at, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
        <p className="mt-3 text-3xl font-bold">{inCount} <span className="text-base font-normal text-white/80">checked in of {passes.length}{post.pass_capacity ? ` (limit ${post.pass_capacity})` : ""}</span></p>
        <p className="mt-1 text-xs text-white/70">You: {who.name}</p>
      </header>
      {!["verified", "flag_proof"].includes(post.status) && <p className="rounded-2xl bg-cream p-4 text-sm text-teal-900">This event isn&apos;t verified, so no E-Passes can be issued yet.</p>}
      {who.canAct ? (
        <section className="rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line"><GateScanner action={checkInPass.bind(null, id)} /></section>
      ) : (
        <p className="rounded-2xl bg-sand p-4 text-sm text-muted">View only.</p>
      )}
      <section className="rounded-[var(--radius-card)] bg-white p-5 ring-1 ring-line">
        <h2 className="font-display text-lg text-teal">Registrations ({passes.length})</h2>
        {passes.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No E-Passes yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line text-sm">
            {passes.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2">
                <span>{p.holder_name} <span className="font-mono text-xs text-muted">…{p.code.slice(-4)}</span></span>
                <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", p.status === "checked_in" ? "bg-teal text-white" : "bg-sand text-muted")}>
                  {p.status === "checked_in" ? `In · ${plusDate(p.checked_in_at, { hour: "2-digit", minute: "2-digit" })}` : "Not yet"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function CheckInPage({ params }: PageProps<"/plus/checkin/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-96 max-w-xl animate-pulse rounded-[var(--radius-card)] bg-white" role="status" aria-label="Loading" />}>
      <Gate params={params} />
    </Suspense>
  );
}
