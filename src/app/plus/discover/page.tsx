import Link from "next/link";
import { BRIEF_TYPES, HUB_KEYS, PLUS_HUBS, PLUS_REGIONS, USER_BRIEF_TYPES } from "@/lib/plus/config";

export const metadata = { title: "Discover" };

export default function DiscoverPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="font-display text-2xl text-teal">Discover</h1>
      <section aria-labelledby="hubs">
        <h2 id="hubs" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Hubs</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {HUB_KEYS.map((h) => (
            <Link key={h} href={`/plus?hub=${h}`} className="flex items-center gap-4 rounded-[var(--radius-card)] bg-white p-4 ring-1 ring-line hover:ring-teal">
              <span className="text-3xl" aria-hidden>{PLUS_HUBS[h].emoji}</span>
              <span><span className="block font-display text-lg text-teal">{PLUS_HUBS[h].label}</span><span className="text-sm text-muted">{PLUS_HUBS[h].blurb}</span></span>
            </Link>
          ))}
        </div>
      </section>
      <section aria-labelledby="briefs">
        <h2 id="briefs" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Briefs</h2>
        <div className="flex flex-wrap gap-2">
          {[...USER_BRIEF_TYPES, "policy" as const].map((t) => (
            <Link key={t} href={`/plus?hub=briefs&type=${t}`} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-teal ring-1 ring-line hover:bg-cream">
              {BRIEF_TYPES[t].emoji} {BRIEF_TYPES[t].label}
            </Link>
          ))}
        </div>
      </section>
      <section aria-labelledby="regions">
        <h2 id="regions" className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Regions</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PLUS_REGIONS.map((r) => (
            <Link key={r} href={`/plus?region=${r}`} className="rounded-[var(--radius-card)] bg-teal p-4 text-center font-display text-lg text-white hover:bg-teal-900">{r}</Link>
          ))}
        </div>
      </section>
      <section className="rounded-[var(--radius-card)] bg-white p-5 text-sm ring-1 ring-line">
        <h2 className="font-display text-lg text-teal">About PAHAD+</h2>
        <p className="mt-1 text-muted">
          A community app by <Link href="/" className="font-semibold text-teal underline">PAHAD</Link>. Anyone can post; PAHAD&apos;s verifiers check posts so contact and booking details are shown only for genuine listings.
        </p>
        <p className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
          <Link href="/plus/terms" className="underline">Terms &amp; guidelines</Link>
          <Link href="/privacy#pahad-plus" className="underline">Privacy</Link>
          <Link href="/plus/delete-account" className="underline">Delete account</Link>
        </p>
      </section>
    </div>
  );
}
