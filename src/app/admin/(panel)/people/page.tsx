import Image from "next/image";
import { redirect } from "next/navigation";
import { deleteTeamMember, saveTeamMember } from "../../actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { Badge, Empty, Field, Notice, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, canView } from "@/lib/permissions";
import { TEAM_SECTIONS, type TeamMember } from "@/lib/types";

export const metadata = { title: "Our Team" };

function PersonFields({ p }: { p?: TeamMember }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {p && <input type="hidden" name="id" value={p.id} />}
      <input type="hidden" name="photo_url" value={p?.photo_url ?? ""} />
      <Field label="Name *"><input name="name" required defaultValue={p?.name} className="field" /></Field>
      <Field label="Section *">
        <select name="section" required defaultValue={p?.section ?? ""} className="field">
          <option value="" disabled>Choose a section</option>
          {TEAM_SECTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </Field>
      <Field label="Designation"><input name="designation" defaultValue={p?.designation} className="field" placeholder="e.g. Chairman, Managing Director" /></Field>
      <Field label="Department"><input name="department" defaultValue={p?.department} className="field" placeholder="e.g. Research, Knowledge and Innovation" /></Field>
      <Field label="Additional charge" hint="Any additional responsibility. Leave empty if not applicable; it won’t be shown." className="sm:col-span-2">
        <input name="additional_charge" defaultValue={p?.additional_charge} className="field" />
      </Field>
      <Field label="Profile picture: Google Drive link" hint="In Drive: Share → General access: “Anyone with the link” → Copy link, then paste here." className="sm:col-span-2">
        <input name="photo_link" type="url" className="field" placeholder={p?.photo_url ? "Paste a new link to replace the current photo" : "https://drive.google.com/file/d/…/view"} />
      </Field>
      <Field label="…or upload a photo"><input type="file" name="photo_file" accept="image/jpeg,image/png,image/webp" className="block w-full text-sm" /></Field>
      <Field label="Order within section" hint="Lower numbers appear first."><input name="sort" type="number" defaultValue={p?.sort ?? 10} className="field" /></Field>
    </div>
  );
}

export default async function PeoplePage() {
  const user = await requireUser();
  if (!canView(user.role, "people.manage")) redirect("/admin");
  const manage = can(user.role, "people.manage");
  const team = (await db.all("team")).sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader title="Our Team" description="People shown on the public Our Team page, grouped by section." />
      <Notice>
        Profile pictures can come straight from Google Drive. The photo must be shared as “Anyone with the link”, otherwise visitors will see initials
        instead.
      </Notice>
      {manage && (
        <div className="mb-8">
          <Disclosure summary="Add a person" defaultOpen={team.length === 0}>
            <AdminForm action={saveTeamMember} submitLabel="Add to Our Team" resetOnSuccess>
              <PersonFields />
            </AdminForm>
          </Disclosure>
        </div>
      )}

      {team.length === 0 ? (
        <Empty>No one added yet.</Empty>
      ) : (
        TEAM_SECTIONS.map((section) => {
          const people = team.filter((p) => p.section === section);
          if (!people.length) return null;
          return (
            <section key={section} className="mb-8">
              <h2 className="mb-3 font-display text-xl text-teal">{section}</h2>
              <ul className="space-y-3">
                {people.map((p) => (
                  <li key={p.id} className="rounded-2xl border border-line bg-white p-5">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-cream">
                        {p.photo_url && <Image src={p.photo_url} alt="" fill sizes="56px" className="object-cover" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-ink">{p.name}</p>
                        <p className="text-sm text-muted">{[p.designation, p.department].filter(Boolean).join(" · ")}</p>
                        {p.additional_charge && <p className="text-xs text-muted">Additional charge: {p.additional_charge}</p>}
                      </div>
                      {!p.photo_url && <Badge tone="amber">No photo</Badge>}
                      {manage && <ActionButton variant="danger" confirm={`Remove ${p.name} from Our Team?`} action={deleteTeamMember.bind(null, p.id)}>Remove</ActionButton>}
                    </div>
                    {manage && (
                      <div className="mt-4">
                        <Disclosure summary="Edit">
                          <AdminForm action={saveTeamMember}>
                            <PersonFields p={p} />
                          </AdminForm>
                        </Disclosure>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
