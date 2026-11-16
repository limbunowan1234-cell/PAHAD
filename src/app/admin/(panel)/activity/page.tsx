import { redirect } from "next/navigation";
import { Empty, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { can, inScope } from "@/lib/permissions";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Activity Log" };

export default async function ActivityPage() {
  const user = await requireUser();
  if (!can(user.role, "activity.view")) redirect("/admin");
  // Directorate Heads see their own directorate's activity only.
  const rows = (await db.all("activity")).filter((a) => inScope(user, a.directorate)).slice(0, 300);
  return (
    <>
      <PageHeader title="Activity Log" description="A record of every change made in the admin panel: who did what, and when." />
      {rows.length === 0 ? (
        <Empty>No activity recorded yet.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-line bg-sand/60 text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Who</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(a.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                  <td className="px-4 py-3 font-medium text-teal">{a.actor_name}</td>
                  <td className="px-4 py-3">{a.action} {a.entity}</td>
                  <td className="px-4 py-3 text-ink">
                    {a.summary}
                    {a.details && (
                      <details className="mt-1 text-xs text-muted">
                        <summary className="cursor-pointer text-teal">Before / after</summary>
                        <pre className="mt-1 max-w-md overflow-x-auto whitespace-pre-wrap rounded-lg bg-sand p-2">{JSON.stringify(JSON.parse(a.details), null, 2)}</pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
