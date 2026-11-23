import { redirect } from "next/navigation";
import { deleteCustomPage, saveCustomPage } from "../../menu-actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { CustomPageFields } from "@/components/admin/CustomPageFields";
import { MenuEditor } from "@/components/admin/MenuEditor";
import { Badge, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { getFilmsPage, getMenu } from "@/lib/data";
import { db } from "@/lib/db";
import { BUILT_IN_PAGES, customPagePath } from "@/lib/menu";
import { canManageMenu } from "@/lib/permissions";
import { FILMS_PATH } from "@/lib/films";

export const metadata = { title: "Pages" };

export default async function MenuPage() {
  const user = await requireUser();
  const manage = canManageMenu(user);
  if (!manage && user.role !== "sysadmin") redirect("/admin");
  const [menu, pages, films] = await Promise.all([getMenu(), db.all("pages"), getFilmsPage()]);
  pages.sort((a, b) => a.title.localeCompare(b.title));
  const options = [
    ...BUILT_IN_PAGES.map((p) => (p.href === FILMS_PATH ? { ...p, label: films.title } : p)),
    ...pages.map((p) => ({ label: `${p.title}${p.status === "draft" ? " (draft)" : ""}`, href: customPagePath(p.slug, p.format === "html" ? "html" : "standard") })),
  ];
  const sections = menu.map((g) => g.label);

  return (
    <>
      <PageHeader
        title="Pages"
        description="Create standard website pages or independent custom HTML pages, and arrange the website menu, dropdowns and footer. The Governing Body (L1) can edit these; the President can allow others from Admin Team."
      />

      <h2 className="mb-3 text-xl font-medium text-teal">Website menu</h2>
      {manage ? (
        <MenuEditor initial={menu} pages={options} />
      ) : (
        <p className="rounded-2xl border border-line bg-white p-5 text-sm text-muted">View only. Ask the President for menu editing permission.</p>
      )}

      <h2 className="mb-3 mt-12 text-xl font-medium text-teal">Pages</h2>
      {manage && (
        <div className="mb-6">
          <Disclosure summary="Create a new page" defaultOpen={pages.length === 0}>
            <AdminForm action={saveCustomPage} submitLabel="Create page" resetOnSuccess>
              <CustomPageFields sections={sections} />
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
                  <a href={customPagePath(p.slug, p.format === "html" ? "html" : "standard")} target="_blank" className="font-mono text-xs text-muted underline">{customPagePath(p.slug, p.format === "html" ? "html" : "standard")}</a>
                  <p className="mt-1 text-xs text-muted">{p.format === "html" ? "Custom HTML page" : "Standard page"}</p>
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
                      <CustomPageFields p={p} sections={sections} />
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
