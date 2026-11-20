import { redirect } from "next/navigation";
import { issueCircular } from "../../gbm-actions";
import { ActionButton, AdminForm, Disclosure } from "@/components/admin/client";
import { makeCircularInternal, requestCircularPublic } from "../../plus-actions";
import { canApprovePublic } from "@/lib/plus/access";
import { Badge, Empty, Field, PageHeader } from "@/components/admin/ui";
import { RichText } from "@/components/site/posts";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { AUDIENCE, canSeeCircular } from "@/lib/circulars";
import { can, UNIT_LABEL, type Structure } from "@/lib/permissions";
import { loadStructure } from "@/lib/structure";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Circulars" };

function geoOptions(s: Structure) {
  const out: { id: string; label: string }[] = [];
  const walk = (parent: string, depth: number) => {
    s.units.filter((u) => ["district", "subdivision", "block", "gp"].includes(u.kind) && u.parent_id === parent && u.active)
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((u) => {
        out.push({ id: u.id, label: `${"— ".repeat(depth)}${u.name} (${UNIT_LABEL[u.kind]})` });
        walk(u.id, depth + 1);
      });
  };
  walk("", 0);
  return out;
}

export default async function CircularsPage() {
  const user = await requireUser();
  if (!can(user.role, "circulars.view")) redirect("/admin");
  const s = await loadStructure();
  const member = (await db.findBy("members", "email", user.email.toLowerCase()))[0];
  const issuer = can(user.role, "circulars.issue");
  const approver = canApprovePublic(user);
  const publicPending = new Set((await db.findBy("approvals", "status", "pending")).filter((a) => a.entity === "circular").map((a) => a.entity_id));
  const circulars = (await db.all("circulars")).filter((c) => canSeeCircular(s, user, member?.geo ?? "", c));

  return (
    <>
      <PageHeader title="Circulars" description="Official circulars and notices. Each one is numbered and kept as a permanent record. Circulars are internal; one approved as public also appears in the PAHAD+ app under Policy & Assembly Summaries." />
      {can(user.role, "circulars.issue") && (
        <div className="mb-8">
          <Disclosure summary="Issue a circular">
            <AdminForm action={issueCircular} submitLabel="Issue circular" resetOnSuccess>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Title *" className="sm:col-span-2"><input name="title" required className="field" /></Field>
                <Field label="For *">
                  <select name="audience" defaultValue="general_assembly" className="field">
                    {Object.entries(AUDIENCE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                </Field>
                <Field label="Only in this area (optional)" hint="Leave empty for everyone in the audience.">
                  <select name="geo" defaultValue="" className="field">
                    <option value="">All areas</option>
                    {geoOptions(s).map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Text *" className="sm:col-span-2" hint="Blank line between paragraphs; “## ” for headings; “- ” for points.">
                  <textarea name="body" rows={8} required className="field" />
                </Field>
              </div>
            </AdminForm>
          </Disclosure>
        </div>
      )}
      {circulars.length === 0 ? (
        <Empty>No circulars yet.</Empty>
      ) : (
        <ul className="space-y-4">
          {circulars.map((c) => (
            <li key={c.id} className="rounded-2xl border border-line bg-white p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold text-teal">{c.number}</span>
                <Badge>{AUDIENCE[c.audience]}</Badge>
                {c.geo && <Badge tone="amber">{s.byId.get(c.geo)?.name ?? "Area"}</Badge>}
                {c.visibility === "public" ? <Badge tone="teal">Public · in PAHAD+</Badge> : <Badge tone="grey">Internal</Badge>}
                {c.visibility !== "public" && publicPending.has(c.id) && <Badge tone="amber">Public requested</Badge>}
                <span className="text-xs text-muted">{formatDate(c.created_at)} · {c.issued_by_name}</span>
              </div>
              <h2 className="mt-2 font-display text-xl text-teal">{c.title}</h2>
              <div className="mt-2 text-sm"><RichText text={c.body} /></div>
              {issuer && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {c.visibility !== "public" && !publicPending.has(c.id) && (
                    <ActionButton confirm={approver ? `Make circular ${c.number} public? It will show in PAHAD+ under Policy & Assembly Summaries.` : undefined} action={requestCircularPublic.bind(null, c.id)}>
                      {approver ? "Make public (PAHAD+)" : "Request public (PAHAD+)"}
                    </ActionButton>
                  )}
                  {c.visibility === "public" && <ActionButton action={makeCircularInternal.bind(null, c.id)}>Make internal</ActionButton>}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
