import Image from "next/image";
import { redirect } from "next/navigation";
import { deleteCustomPage, saveCustomPage } from "../../menu-actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { MenuEditor } from "@/components/admin/MenuEditor";
import { Badge, Field, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { getFilmsPage, getMenu } from "@/lib/data";
import { db } from "@/lib/db";
import { BUILT_IN_PAGES, customPagePath } from "@/lib/menu";
import { canManageMenu } from "@/lib/permissions";
import { FILMS_PATH } from "@/lib/films";
import type { CustomPage } from "@/lib/types";

export const metadata = { title: "Menu & Pages" };

function PageFields({ p, sections }: { p?: CustomPage; sections: string[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <input type="hidden" name="cover" value={p?.cover ?? ""} />
      <Field label="Page title *"><input name="title" required defaultValue={p?.title} className="field" placeholder="e.g. Features" /></Field>
      <Field label="Web address" hint={`The page opens at ${customPagePath("…")}. Leave blank to use the title.`}>
        <input name="slug" defaultValue={p?.slug} className="field font-mono text-sm" placeholder="features" />
      </Field>
      <Field label="Small label above the title"><input name="eyebrow" defaultValue={p?.eyebrow} className="field" placeholder="e.g. Media" /></Field>
      <Field label="Status">
        <select name="status" defaultValue={p?.status ?? "published"} className="field">
          <option value="published">Published: visible on the website</option>
          <option value="draft">Draft: hidden</option>
        </select>
      </Field>
      <Field label="Introduction" className="sm:col-span-2"><textarea name="intro" rows={2} maxLength={400} defaultValue={p?.intro} className="field" placeholder="One or two sentences under the title." /></Field>
      <Field label="Main text (optional)" className="sm:col-span-2" hint="Leave a blank line between paragraphs. Start a line with “## ” for a heading or “- ” for a bullet point.">
        <textarea name="body" rows={8} defaultValue={p?.body} className="field" />
      </Field>
      <Field label="Show content labelled" hint="Lists every published post whose Category / label is exactly this, e.g. “Feature”. Leave blank for none.">
        <input name="collect" defaultValue={p?.collect} className="field" placeholder="e.g. Feature" />
      </Field>
      {!p && (
        <Field label="Add to the menu under">
          <select name="add_to" defaultValue="" className="field">
            <option value="">Don’t add to the menu yet</option>
            {sections.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </Field>
      )}
      <Field label="Banner photo" hint="JPG, PNG or WebP up to 4 MB. Wide photos look best.">
        <input type="file" name="cover_file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" />
      </Field>
      <Field label="…or banner photo from Google Drive"><input name="cover_link" type="url" className="field" placeholder="https://drive.google.com/file/d/…/view" /></Field>
      {p?.cover && (
        <div className="relative aspect-[16/7] overflow-hidden rounded-xl bg-sand sm:col-span-2">
          <Image src={p.cover} alt="" fill sizes="600px" className="object-cover" />
        </div>
      )}
    </div>
  );
}

export default async function MenuPage() {
  const user = await requireUser();
  const manage = canManageMenu(user);
  if (!manage && user.role !== "sysadmin") redirect("/admin");
  const [menu, pages, films] = await Promise.all([getMenu(), db.all("pages"), getFilmsPage()]);
  pages.sort((a, b) => a.title.localeCompare(b.title));
  const options = [
    ...BUILT_IN_PAGES.map((p) => (p.href === FILMS_PATH ? { ...p, label: films.title } : p)),
    ...pages.map((p) => ({ label: `${p.title}${p.status === "draft" ? " (draft)" : ""}`, href: customPagePath(p.slug) })),
  ];
  const sections = menu.map((g) => g.label);

  return (
    <>
      <PageHeader
        title="Menu & Pages"
        description="Arrange the website’s top menu, its dropdowns and the footer, and create new pages such as Features. The Governing Body (L1) can edit this; the President can allow others from Admin Team."
      />

      <h2 className="mb-3 text-xl font-medium text-teal">Website menu</h2>
      {manage ? (
        <MenuEditor initial={menu} pages={options} />
      ) : (
        <p className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">View only. Ask the President for menu editing permission.</p>
      )}

      <h2 className="mb-3 mt-12 text-xl font-medium text-teal">Pages made here</h2>
      {manage && (
        <div className="mb-6">
          <Disclosure summary="Create a new page" defaultOpen={pages.length === 0}>
            <AdminForm action={saveCustomPage} submitLabel="Create page" resetOnSuccess>
              <PageFields sections={sections} />
            </AdminForm>
          </Disclosure>
        </div>
      )}
      {pages.length === 0 ? (
        <p className="text-sm text-muted">No pages yet.</p>
      ) : (
        <ul className="space-y-4">
          {pages.map((p) => (
            <li key={p.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="flex flex-wrap items-center gap-2 font-display text-xl text-teal">
                    {p.title} {p.status === "draft" && <Badge tone="amber">Draft</Badge>}
                  </p>
                  <a href={customPagePath(p.slug)} target="_blank" className="font-mono text-xs text-muted underline">{customPagePath(p.slug)}</a>
                  {p.collect && <p className="mt-1 text-xs text-muted">Lists posts labelled “{p.collect}”</p>}
                </div>
                {manage && (
                  <ActionButton variant="danger" confirm={`Delete the page “${p.title}”? Its menu links are removed too. This cannot be undone.`} action={deleteCustomPage.bind(null, p.id)}>
                    Delete
                  </ActionButton>
                )}
              </div>
              {manage && (
                <div className="mt-4">
                  <Disclosure summary="Edit">
                    <AdminForm action={saveCustomPage}>
                      <PageFields p={p} sections={sections} />
                    </AdminForm>
                  </Disclosure>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
