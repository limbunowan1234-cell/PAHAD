import Link from "next/link";
import { redirect } from "next/navigation";
import { setLanguageSwitch } from "../../translation-actions";
import { ActionButton } from "@/components/admin/client";
import { TranslationRow, TranslationTools } from "@/components/admin/TranslationTools";
import { Badge, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { getLanguageSwitchOn } from "@/lib/data";
import { db } from "@/lib/db";
import { BUILT_IN_PAGES, customPagePath } from "@/lib/menu";
import { canManageMenu } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const metadata = { title: "Nepali translation" };

const FILTERS = {
  todo: "To check",
  empty: "Not translated",
  checked: "Checked",
  keep: "Stays in English",
  all: "All",
} as const;
type Filter = keyof typeof FILTERS;
const PER_PAGE = 40;

export default async function TranslationsPage({ searchParams }: PageProps<"/admin/translations">) {
  const user = await requireUser();
  const manage = canManageMenu(user);
  if (!manage && user.role !== "sysadmin") redirect("/admin");
  const sp = await searchParams;
  const show = (String(sp.show ?? "todo") in FILTERS ? String(sp.show ?? "todo") : "todo") as Filter;
  const q = String(sp.q ?? "").trim().toLowerCase();
  const pageNo = Math.max(1, Number(sp.page) || 1);

  const [rows, on, pages] = await Promise.all([db.all("translations"), getLanguageSwitchOn(), db.all("pages")]);
  const counts = {
    todo: rows.filter((r) => r.source === "machine").length,
    empty: rows.filter((r) => !r.ne.trim() && r.source !== "keep").length,
    checked: rows.filter((r) => r.source === "human").length,
    keep: rows.filter((r) => r.source === "keep").length,
    all: rows.length,
  };
  const match = (r: (typeof rows)[number]) =>
    (show === "all" ||
      (show === "todo" && r.source === "machine") ||
      (show === "empty" && !r.ne.trim() && r.source !== "keep") ||
      (show === "checked" && r.source === "human") ||
      (show === "keep" && r.source === "keep")) &&
    (!q || r.en.toLowerCase().includes(q) || r.ne.toLowerCase().includes(q));
  const list = rows.filter(match).sort((a, b) => a.page.localeCompare(b.page) || a.created_at.localeCompare(b.created_at));
  const shown = list.slice((pageNo - 1) * PER_PAGE, pageNo * PER_PAGE);
  const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const href = (o: Record<string, string | number>) => `/admin/translations?${new URLSearchParams({ show, ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(o).map(([k, v]) => [k, String(v)])) })}`;

  const paths = [...BUILT_IN_PAGES.map((p) => p.href).filter((h) => h !== "/search"), ...pages.filter((p) => p.status === "published").map((p) => customPagePath(p.slug))];

  return (
    <>
      <PageHeader
        title="Nepali translation"
        description="The website’s नेपाली version. Each English phrase on the website has a Nepali box. Visitors who choose नेपाली see the Nepali wherever it is filled in, and English elsewhere."
      />

      <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-line bg-white p-5">
        <div>
          <p className="font-semibold text-ink">
            Language switch on the website: {on ? <Badge tone="green">On</Badge> : <Badge>Off</Badge>}
          </p>
          <p className="mt-1 text-sm text-muted">
            {counts.checked} checked · {counts.todo} Google drafts to check · {counts.empty} not translated
          </p>
        </div>
        {manage && (
          <ActionButton variant={on ? "ghost" : "primary"} confirm={on ? "Hide the नेपाली switch from the website?" : "Show the नेपाली switch on the website now?"} action={setLanguageSwitch.bind(null, !on)}>
            {on ? "Hide the switch" : "Show the switch on the website"}
          </ActionButton>
        )}
      </section>

      <Notice>
        How it works: 1. <strong>Scan the website</strong> to collect its English text. 2. <strong>Draft Nepali with Google</strong> to fill the boxes with a
        first draft. 3. Read each draft, correct it and press <strong>Save as checked</strong>. Names and words that should stay as they are can be set to{" "}
        <strong>Keep in English</strong>. After rewriting a page, scan again: only new text is added.
      </Notice>

      {manage && (
        <div className="mb-6">
          <TranslationTools paths={paths} waiting={counts.empty} />
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(Object.keys(FILTERS) as Filter[]).map((f) => (
          <Link key={f} href={`/admin/translations?show=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`} className={cn("rounded-full border px-3 py-1.5 text-sm", f === show ? "border-teal bg-teal text-white" : "border-line bg-white text-ink hover:bg-sand")}>
            {FILTERS[f]} ({counts[f]})
          </Link>
        ))}
        <form className="ml-auto" action="/admin/translations">
          <input type="hidden" name="show" value={show} />
          <input name="q" defaultValue={q} placeholder="Search English or Nepali" className="field w-56 py-2 text-sm" />
        </form>
      </div>

      {shown.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line bg-white p-8 text-center text-muted">
          {rows.length === 0 ? "No text collected yet. Press “Scan the website for text” to begin." : "Nothing here."}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <TranslationRow key={r.id} id={r.id} en={r.en} ne={r.ne} source={r.source} page={r.page} />
          ))}
        </ul>
      )}

      {pageCount > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-3 text-sm" aria-label="Pages">
          {pageNo > 1 && <Link href={href({ page: pageNo - 1 })} className="rounded-full border border-line bg-white px-3 py-1.5">← Previous</Link>}
          <span className="text-muted">Page {pageNo} of {pageCount}</span>
          {pageNo < pageCount && <Link href={href({ page: pageNo + 1 })} className="rounded-full border border-line bg-white px-3 py-1.5">Next →</Link>}
        </nav>
      )}
    </>
  );
}
