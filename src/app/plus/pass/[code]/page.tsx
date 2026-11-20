import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import { PlusButton } from "@/components/plus/client";
import { plusDate } from "@/components/plus/ui";
import { db } from "@/lib/db";
import { cancelPass } from "@/lib/plus/pass-actions";
import { PASS_CODE, passUrl, qrSvg } from "@/lib/plus/passes";
import { getPlusUser } from "@/lib/plus/session";
import { cn } from "@/lib/utils";

export const metadata = { title: "E-Pass", robots: { index: false } };

const STATUS = {
  active: { label: "Valid", cls: "bg-green-600 text-white" },
  checked_in: { label: "Checked in", cls: "bg-teal text-white" },
  cancelled: { label: "Cancelled", cls: "bg-red-700 text-white" },
} as const;

/** Only the holder sees their E-Pass (the QR is their ticket). */
async function Pass({ params, searchParams }: { params: Promise<{ code: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [{ code }, sp, viewer] = await Promise.all([params, searchParams, getPlusUser()]);
  if (!PASS_CODE.test(code)) notFound();
  const pass = (await db.findBy("plus_passes", "code", code))[0];
  if (!viewer) {
    return (
      <div className="mx-auto max-w-md rounded-[var(--radius-card)] bg-white p-6 text-center ring-1 ring-line">
        <p className="font-display text-xl text-teal">Sign in to see this E-Pass</p>
        <Link href={`/plus/login?next=/plus/pass/${code}`} className="btn btn-primary mt-4">Sign in</Link>
      </div>
    );
  }
  if (!pass || pass.user_id !== viewer.id) notFound();
  const post = await db.get("plus_posts", pass.post_id);
  if (!post) notFound();
  const svg = await qrSvg(passUrl(pass.code));
  const s = STATUS[pass.status];
  return (
    <div className="mx-auto max-w-sm">
      <Link href={`/plus/${post.id}`} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-teal"><ArrowLeft className="h-4 w-4" aria-hidden /> Event</Link>
      {sp.new === "1" && <p role="status" className="mb-4 rounded-2xl bg-sage-100 p-4 text-sm text-teal">Your free E-Pass is ready. Show this QR at the entrance. It&apos;s also under Me → My E-Passes.</p>}
      <article className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-sm ring-1 ring-line">
        <div className="bg-teal p-5 text-white">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">PAHAD+ E-Pass · Free entry</p>
          <h1 className="mt-1 font-display text-2xl leading-tight">{post.title}</h1>
          <p className="mt-2 flex items-center gap-1 text-sm text-white/85"><CalendarDays className="h-4 w-4" aria-hidden /> {plusDate(post.starts_at, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
          <p className="mt-1 flex items-center gap-1 text-sm text-white/85"><MapPin className="h-4 w-4" aria-hidden /> {[post.venue, post.locality, post.region].filter(Boolean).join(", ")}</p>
        </div>
        <div className="p-5 text-center">
          <span className={cn("inline-block rounded-full px-3 py-1 text-xs font-bold", s.cls)}>{s.label}</span>
          {pass.status !== "cancelled" && (
            <div className="mx-auto mt-4 w-56 [&_svg]:h-auto [&_svg]:w-full" role="img" aria-label={`QR code for E-Pass ${pass.code}`} dangerouslySetInnerHTML={{ __html: svg }} />
          )}
          <p className="mt-3 font-mono text-xl font-bold tracking-[0.2em] text-ink">{pass.code.slice(0, 5)}-{pass.code.slice(5)}</p>
          <p className="mt-1 text-sm text-muted">For {pass.holder_name}</p>
          {pass.status === "checked_in" && <p className="mt-2 text-xs text-muted">Checked in {plusDate(pass.checked_in_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>}
        </div>
      </article>
      {pass.status === "active" && (
        <div className="mt-4 text-center">
          <PlusButton confirm="Cancel your E-Pass? Your place goes to someone else." action={cancelPass.bind(null, pass.code)} className="text-red-700">Cancel my E-Pass</PlusButton>
        </div>
      )}
    </div>
  );
}

export default function PassPage({ params, searchParams }: PageProps<"/plus/pass/[code]">) {
  return (
    <Suspense fallback={<div className="mx-auto h-[32rem] max-w-sm animate-pulse rounded-[var(--radius-card)] bg-white" role="status" aria-label="Loading" />}>
      <Pass params={params} searchParams={searchParams} />
    </Suspense>
  );
}
