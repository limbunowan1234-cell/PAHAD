import Image from "next/image";
import { redirect } from "next/navigation";
import { deletePartner, savePartner } from "../../actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { Field, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can } from "@/lib/permissions";
import type { Partner } from "@/lib/types";

export const metadata = { title: "Partners" };

function PartnerFields({ p }: { p?: Partner }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <input type="hidden" name="logo" value={p?.logo ?? ""} />
      <Field label="Name *"><input name="name" required defaultValue={p?.name} className="field" /></Field>
      <Field label="Partnership type"><input name="role" defaultValue={p?.role} className="field" placeholder="e.g. Media Partner, News Partner" /></Field>
      <Field label="Website"><input name="url" type="url" defaultValue={p?.url} className="field" placeholder="https://" /></Field>
      <Field label="Display order"><input name="sort" type="number" defaultValue={p?.sort ?? 10} className="field" /></Field>
      <Field label="Description" className="sm:col-span-2"><textarea name="description" rows={2} defaultValue={p?.description} className="field" /></Field>
      <Field label="Logo" hint="PNG with transparent background works best."><input type="file" name="logo_file" accept="image/png,image/jpeg,image/webp" className="block w-full text-sm" /></Field>
      <Field label="…or logo from Google Drive"><input name="logo_link" type="url" className="field" placeholder="https://drive.google.com/file/d/…/view" /></Field>
      <label className="flex items-center gap-2 self-end pb-3 text-sm">
        <input type="checkbox" name="dark_logo" defaultChecked={p?.dark_logo} className="h-4 w-4 accent-teal" /> Logo is light: show on a dark background
      </label>
    </div>
  );
}

export default async function AdminPartnersPage() {
  const user = await requireUser();
  if (!can(user.role, "partners.manage")) redirect("/admin");
  const partners = (await db.all("partners")).sort((a, b) => a.sort - b.sort);
  return (
    <>
      <PageHeader title="Partners" description="Partners shown on the home page, footer and Partners page." />
      <div className="mb-8">
        <Disclosure summary="Add a partner">
          <AdminForm action={savePartner} submitLabel="Add partner" resetOnSuccess>
            <PartnerFields />
          </AdminForm>
        </Disclosure>
      </div>
      <ul className="space-y-4">
        {partners.map((p) => (
          <li key={p.id} className="rounded-2xl border border-line bg-white p-5">
            <div className="flex flex-wrap items-center gap-5">
              <span className={`flex h-16 w-32 items-center justify-center rounded-xl p-2 ${p.dark_logo ? "bg-teal-950" : "bg-sand"}`}>
                {p.logo && <Image src={p.logo} alt="" width={120} height={60} className="max-h-12 w-auto object-contain" />}
              </span>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wider text-coral-700">{p.role}</p>
                <p className="font-display text-xl text-teal">{p.name}</p>
                <a href={p.url} target="_blank" className="text-sm text-muted underline">{p.url}</a>
              </div>
              <ActionButton variant="danger" confirm={`Remove ${p.name} from partners?`} action={deletePartner.bind(null, p.id)}>Remove</ActionButton>
            </div>
            <div className="mt-4">
              <Disclosure summary="Edit">
                <AdminForm action={savePartner}>
                  <PartnerFields p={p} />
                </AdminForm>
              </Disclosure>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
