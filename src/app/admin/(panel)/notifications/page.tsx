import Link from "next/link";
import { markNotificationsRead } from "../../actions";
import { ActionButton } from "@/components/admin/client";
import { Empty, PageHeader } from "@/components/admin/ui";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { cn, formatDate } from "@/lib/utils";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const user = await requireUser();
  const notes = (await db.findBy("notifications", "user_id", user.id)).slice(0, 200);
  const unread = notes.filter((n) => !n.read).length;
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Changes to your content, tasks assigned to you, approvals and access changes."
        actions={unread > 0 ? <ActionButton variant="primary" action={markNotificationsRead}>Mark all as read</ActionButton> : undefined}
      />
      {notes.length === 0 ? (
        <Empty>Nothing yet. You’ll be told here when someone edits your content, assigns you a task or approves your work.</Empty>
      ) : (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-white">
          {notes.map((n) => (
            <li key={n.id} className={cn("flex gap-3 p-4", !n.read && "bg-cream/40")}>
              <span className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", n.read ? "bg-line" : "bg-coral-700")} aria-label={n.read ? "Read" : "Unread"} />
              <div className="min-w-0 flex-1">
                <p className="text-ink">{n.message}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatDate(n.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {n.link && (
                    <>
                      {" · "}
                      <Link href={n.link} className="font-semibold text-teal underline">Open</Link>
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
