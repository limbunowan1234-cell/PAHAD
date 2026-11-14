import { updateAccount } from "../../actions";
import { AdminForm } from "@/components/admin/client";
import { Card, Field, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { roleLabel } from "@/lib/permissions";

export const metadata = { title: "My Account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="My Account" description={`${user.email} · ${roleLabel(user.role)}`} />
      <Card className="max-w-xl">
        <AdminForm action={updateAccount}>
          <Field label="Display name"><input name="name" defaultValue={user.name} className="field" /></Field>
          <hr className="border-line" />
          <p className="text-sm font-semibold text-teal">Change password</p>
          <Field label="Current password"><input name="current_password" type="password" autoComplete="current-password" className="field" /></Field>
          <Field label="New password" hint="At least 10 characters with letters and numbers."><input name="new_password" type="password" autoComplete="new-password" className="field" /></Field>
        </AdminForm>
      </Card>
    </>
  );
}
