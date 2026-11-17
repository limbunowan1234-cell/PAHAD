import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowUpRight, Search } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { searchSite } from "@/lib/search";
import { MembersBadge } from "@/components/site/posts";

export const metadata: Metadata = {
  title: "Search",
  description: "Search the PAHAD website.",
  alternates: { canonical: "/search" },
  robots: { index: false, follow: true },
};

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <section className="bg-teal-900 text-white">
        <div className="container-page max-w-3xl py-14 sm:py-16">
          <h1 className="text-4xl font-medium sm:text-5xl">Search</h1>
          <Suspense fallback={<SearchForm />}>
            <SearchFormWithQuery searchParams={searchParams} />
          </Suspense>
        </div>
      </section>
      <section className="container-page max-w-3xl py-12">
        <Suspense fallback={<p className="text-muted" role="status">Searching…</p>}>
          <Results searchParams={searchParams} />
        </Suspense>
      </section>
    </>
  );
}

async function queryOf(searchParams: PageProps<"/search">["searchParams"]) {
  const q = (await searchParams).q;
  return (Array.isArray(q) ? q[0] : q ?? "").trim().slice(0, 100);
}

async function SearchFormWithQuery({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  return <SearchForm defaultValue={await queryOf(searchParams)} />;
}

function SearchForm({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/search" role="search" className="mt-6 flex gap-2">
      <label htmlFor="search-page-q" className="sr-only">Search the website</label>
      <input
        id="search-page-q"
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder="Programmes, events, membership…"
        className="min-w-0 flex-1 rounded-full border-0 bg-white px-5 py-3 text-ink placeholder:text-muted focus:outline-3 focus:outline-coral"
      />
      <button className="btn btn-accent shrink-0 !px-5" aria-label="Search">
        <Search className="h-5 w-5" aria-hidden />
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}

async function Results({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  const q = await queryOf(searchParams);
  if (!q) return <p className="text-muted">Type a word or two above to search news, events, programmes, documents and pages.</p>;
  // Members Only posts are searched only for a signed-in account, decided here on the server.
  const signedIn = Boolean(await getCurrentUser());
  const results = await searchSite(q, { signedIn });

  if (results.length === 0) {
    return (
      <div>
        <p className="text-lg text-ink">
          No results for <strong>“{q}”</strong>.
        </p>
        <p className="mt-2 text-muted">
          Try fewer or different words, or browse <Link href="/news" className="text-teal underline">news</Link>,{" "}
          <Link href="/programmes" className="text-teal underline">programmes</Link> and{" "}
          <Link href="/events" className="text-teal underline">events</Link>.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-sm text-muted" role="status">
        {results.length} result{results.length === 1 ? "" : "s"} for <strong className="text-ink">“{q}”</strong>
      </p>
      <ol className="mt-6 divide-y divide-line">
        {results.map((r) => (
          <li key={r.href + r.title} className="py-5">
            <p className="flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-coral-700">
              {r.kind}
              {r.membersOnly && <MembersBadge tone="light" />}
            </p>
            <Link
              href={r.href}
              {...(r.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="mt-1 inline-flex items-center gap-1 text-xl font-medium text-teal hover:underline"
            >
              {r.title}
              {r.external && <ArrowUpRight className="h-4 w-4" aria-label="(opens in a new tab)" />}
            </Link>
            {r.snippet && <p className="mt-1 text-muted">{r.snippet}</p>}
          </li>
        ))}
      </ol>
    </div>
  );
}
