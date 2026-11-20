import Form from "next/form";
import Link from "next/link";
import { Suspense } from "react";
import { Search } from "lucide-react";
import { InstallAppButton } from "@/components/site/InstallApp";
import { PlusCardView } from "@/components/plus/ui";
import { db } from "@/lib/db";
import { BRIEF_TYPES, HUB_KEYS, PLUS_HUBS, PLUS_REGIONS, type BriefType, type PlusHub } from "@/lib/plus/config";
import { plusFeed, type PlusFilters, requestTime } from "@/lib/plus/posts";
import { getPlusUser } from "@/lib/plus/session";
import { cn } from "@/lib/utils";

export const metadata = { title: { absolute: "PAHAD+ | Events, places, business and briefs from the hills" }, alternates: { canonical: "/plus" } };

type SP = Record<string, string | string[] | undefined>;
const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");

function filtersFrom(sp: SP): PlusFilters {
  const hub = one(sp.hub) as PlusHub;
  const type = one(sp.type) as BriefType;
  const region = one(sp.region);
  return {
    tab: one(sp.tab) === "pahad" ? "pahad" : "foryou",
    hub: HUB_KEYS.includes(hub) ? hub : undefined,
    region: (PLUS_REGIONS as readonly string[]).includes(region) ? region : undefined,
    type: Object.hasOwn(BRIEF_TYPES, type) ? type : undefined,
    q: one(sp.q).slice(0, 80) || undefined,
  };
}

function hrefWith(f: PlusFilters, change: Partial<PlusFilters>) {
  const next = { ...f, ...change };
  if (next.hub !== "briefs") next.type = undefined;
  const q: Record<string, string> = {};
  if (next.tab === "pahad") q.tab = "pahad";
  if (next.hub) q.hub = next.hub;
  if (next.type) q.type = next.type;
  if (next.region) q.region = next.region;
  if (next.q) q.q = next.q;
  return { pathname: "/plus", query: q };
}

function Chip({ href, active, children }: { href: ReturnType<typeof hrefWith>; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "true" : undefined} scroll={false}
      className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold", active ? "bg-teal text-white" : "bg-white text-teal ring-1 ring-line hover:bg-cream")}>
      {children}
    </Link>
  );
}

async function Feed({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const f = filtersFrom(sp);
  const viewer = await getPlusUser();
  const blocked = new Set(viewer ? (await db.findBy("plus_blocks", "blocker_id", viewer.id)).map((b) => b.blocked_id) : []);
  const cards = await plusFeed(f, blocked);
  const at = requestTime();

  return (
    <>
      {one(sp.deleted) === "1" && <p role="status" className="mb-4 rounded-2xl bg-sage-100 p-4 text-sm text-teal">Your PAHAD+ account and its details have been deleted.</p>}

      <Form action="/plus" className="relative mb-4">
        {f.tab === "pahad" && <input type="hidden" name="tab" value="pahad" />}
        {f.hub && <input type="hidden" name="hub" value={f.hub} />}
        {f.region && <input type="hidden" name="region" value={f.region} />}
        <label htmlFor="plus-q" className="sr-only">Search PAHAD+</label>
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" aria-hidden />
        <input id="plus-q" name="q" type="search" defaultValue={f.q} placeholder="Search events, places, cafés, jobs…" className="field !rounded-full !py-3 !pl-12" />
      </Form>

      <div role="tablist" aria-label="Feed" className="mb-4 grid grid-cols-2 rounded-full bg-white p-1 ring-1 ring-line sm:inline-grid sm:w-80">
        {(["foryou", "pahad"] as const).map((t) => (
          <Link key={t} role="tab" aria-selected={f.tab === t} href={hrefWith(f, { tab: t })} scroll={false}
            className={cn("rounded-full py-2 text-center text-sm font-semibold", f.tab === t ? "bg-teal text-white" : "text-teal")}>
            {t === "foryou" ? "For You" : "PAHAD"}
          </Link>
        ))}
      </div>

      <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Hubs">
        <Chip href={hrefWith(f, { hub: undefined })} active={!f.hub}>All</Chip>
        {HUB_KEYS.map((h) => <Chip key={h} href={hrefWith(f, { hub: h })} active={f.hub === h}>{PLUS_HUBS[h].emoji} {PLUS_HUBS[h].label}</Chip>)}
      </div>
      {f.hub === "briefs" && (
        <div className="-mx-4 mb-2 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Brief types">
          <Chip href={hrefWith(f, { type: undefined })} active={!f.type}>All briefs</Chip>
          {(Object.keys(BRIEF_TYPES) as BriefType[]).map((t) => <Chip key={t} href={hrefWith(f, { type: t })} active={f.type === t}>{BRIEF_TYPES[t].emoji} {BRIEF_TYPES[t].label}</Chip>)}
        </div>
      )}
      {f.tab === "foryou" && (
        <div className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1" aria-label="Regions">
          <Chip href={hrefWith(f, { region: undefined })} active={!f.region}>All regions</Chip>
          {PLUS_REGIONS.map((r) => <Chip key={r} href={hrefWith(f, { region: r })} active={f.region === r}>{r}</Chip>)}
        </div>
      )}

      {cards.length === 0 ? (
        <div className="rounded-[var(--radius-card)] bg-white p-8 text-center ring-1 ring-line">
          <p className="font-display text-xl text-teal">Nothing here yet</p>
          <p className="mt-1 text-sm text-muted">{f.q ? "Try another search." : "Be the first to share something from your area."}</p>
          <Link href="/plus/new" className="btn btn-primary mt-4">Post on PAHAD+</Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => <PlusCardView key={c.id} c={c} at={at} />)}
        </div>
      )}
    </>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading">
      {Array.from({ length: 6 }, (_, i) => <div key={i} className="aspect-[4/5] animate-pulse rounded-[var(--radius-card)] bg-white" />)}
    </div>
  );
}

export default function PlusHome({ searchParams }: PageProps<"/plus">) {
  return (
    <>
      <h1 className="sr-only">PAHAD+</h1>
      <Suspense fallback={<FeedSkeleton />}>
        <Feed searchParams={searchParams} />
      </Suspense>
      <div className="mt-10 rounded-[var(--radius-card)] bg-teal p-5 text-white">
        <p className="font-display text-lg">Get the PAHAD+ app</p>
        <p className="mt-1 text-sm text-white/80">Events, places, local business and alerts from Darjeeling, Kalimpong, Siliguri and Sikkim.</p>
        <InstallAppButton label="Install PAHAD+" className="btn btn-accent mt-3" />
      </div>
    </>
  );
}
